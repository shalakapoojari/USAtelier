"""
Delhivery delivery integration utilities.
Handles shipment creation, tracking, and cancellation via Delhivery API.

Production-grade: correct CMU payload format, field validation,
pincode serviceability, idempotency guard, PII-safe logging.
"""

import os
import json
import logging
import time
import re
from typing import Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DELHIVERY_API_BASE = "https://track.delhivery.com/api/cmu"
DELHIVERY_API_KEY  = os.getenv("DELHIVERY_API_KEY")
DELHIVERY_FACILITY = os.getenv("DELHIVERY_FACILITY_CODE")
STORE_PHONE        = os.getenv("STORE_PHONE")
STORE_NAME         = os.getenv("STORE_NAME")
STORE_ADDRESS      = os.getenv("STORE_ADDRESS")

_MAX_RETRIES       = 3
_BACKOFF_FACTOR    = 1.5   # waits: 0 s, 1.5 s, 3 s
_TIMEOUT           = 30    # seconds per request

# ---------------------------------------------------------------------------
# PII masking helper
# ---------------------------------------------------------------------------

def _mask(value: str, show: int = 4) -> str:
    """Mask a string, showing only the last `show` characters."""
    if not value:
        return "***"
    if len(value) <= show:
        return "***"
    return "*" * (len(value) - show) + value[-show:]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_headers() -> dict:
    """Build headers for Delhivery API requests."""
    if not DELHIVERY_API_KEY:
        raise RuntimeError("DELHIVERY_API_KEY is not configured")
    return {
        "Authorization": f"Token {DELHIVERY_API_KEY}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }


def _make_session() -> requests.Session:
    """Return a requests Session with retry strategy and no ambient proxy."""
    session = requests.Session()
    session.trust_env = False
    session.proxies = {"http": None, "https": None}

    retry = Retry(
        total=_MAX_RETRIES,
        backoff_factor=_BACKOFF_FACTOR,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def _request(method: str, endpoint: str, payload: dict = None) -> Optional[dict]:
    """
    Generic request to Delhivery API.

    Returns parsed JSON on success, or a structured error dict on failure.
    Never raises — caller decides how to handle the result.

    On failure, returns:
      {"_error": True, "status_code": int, "error_type": str, "message": str}
    On network/parse failure returns None.
    """
    if not DELHIVERY_API_KEY:
        logger.error("Delhivery API not configured (missing API key)")
        return None

    url = f"{DELHIVERY_API_BASE}/{endpoint.lstrip('/')}"
    try:
        session = _make_session()
        if method.upper() == "GET":
            resp = session.get(url, headers=_get_headers(), timeout=_TIMEOUT)
        else:
            resp = session.post(url, headers=_get_headers(), json=payload or {}, timeout=_TIMEOUT)
    except requests.exceptions.Timeout:
        logger.error("delhivery_timeout endpoint=%s", endpoint)
        return None
    except requests.exceptions.ConnectionError as exc:
        logger.error("delhivery_connection_error endpoint=%s err=%s", endpoint, type(exc).__name__)
        return None
    except requests.exceptions.ProxyError as exc:
        logger.error("delhivery_proxy_error endpoint=%s err=%s", endpoint, type(exc).__name__)
        return None
    except Exception as exc:
        logger.exception("delhivery_unexpected_error endpoint=%s err=%s", endpoint, type(exc).__name__)
        return None

    # ── Log response body (truncated, no PII) ────────────────────────────
    body_preview = (resp.text or "")[:500]
    logger.error(
        "delhivery_response status=%s body=%s",
        resp.status_code,
        body_preview,
    ) if resp.status_code not in (200, 201, 202) else logger.debug(
        "delhivery_response status=%s body_len=%s", resp.status_code, len(resp.text or "")
    )

    if resp.status_code == 401:
        logger.error("delhivery_auth_failed — check DELHIVERY_API_KEY")
        return {"_error": True, "status_code": 401, "error_type": "auth", "message": "Authentication failed"}
    if resp.status_code == 400:
        logger.error(
            "delhivery_validation_error endpoint=%s body_prefix=%.500s",
            endpoint, resp.text,
        )
        return {"_error": True, "status_code": 400, "error_type": "validation", "message": body_preview}
    if resp.status_code not in [200, 201, 202]:
        logger.error("delhivery_http_error endpoint=%s status=%s", endpoint, resp.status_code)
        return {"_error": True, "status_code": resp.status_code, "error_type": "http", "message": body_preview}

    try:
        return resp.json()
    except ValueError:
        logger.error("delhivery_invalid_json endpoint=%s", endpoint)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def validate_pincode(pincode: str) -> bool:
    """
    Check if Delhivery can deliver to a pincode.

    Returns True only when serviceable, False otherwise.
    Fails closed (returns False) on any error.
    """
    if not pincode or not str(pincode).strip():
        return False

    # Validate pincode format (6 digits for Indian pincodes)
    clean = str(pincode).strip()
    if not re.match(r"^\d{6}$", clean):
        return False

    # Delhivery pincode check endpoint (uses different base)
    url = f"https://track.delhivery.com/c/api/pin-codes/json/?filter_codes={clean}"
    try:
        session = _make_session()
        resp = session.get(url, headers=_get_headers(), timeout=_TIMEOUT)
        if resp.status_code != 200:
            logger.warning("delhivery_pincode_check_failed status=%s", resp.status_code)
            return False
        data = resp.json()
        # Delhivery returns delivery_codes array
        codes = data.get("delivery_codes", [])
        is_serviceable = len(codes) > 0
        logger.debug("delhivery_pincode_validation pincode=%s serviceable=%s", clean, is_serviceable)
        return is_serviceable
    except Exception as exc:
        logger.warning("delhivery_pincode_check_error err=%s", type(exc).__name__)
        return False


def calculate_shipping(
    origin_pincode: str,
    destination_pincode: str,
    weight_kg: float = 1.0,
) -> Optional[float]:
    """
    Estimate shipping cost between two pincodes.

    Returns:
        float  — estimated cost in INR, or
        None   — if estimate cannot be obtained (log already written).
    """
    if not origin_pincode or not destination_pincode:
        logger.warning("calculate_shipping called with empty pincode(s)")
        return None

    # Use Delhivery's kinko API for rate calculation
    url = (
        f"https://track.delhivery.com/api/kinko/v1/invoice/charges/.json"
        f"?ss=Delivered&d_pin={destination_pincode}&o_pin={origin_pincode}"
        f"&cgm={int(weight_kg * 1000)}&pt=Pre-paid&cod=0"
    )
    try:
        session = _make_session()
        resp = session.get(url, headers=_get_headers(), timeout=_TIMEOUT)
        if resp.status_code != 200:
            logger.warning("delhivery_shipping_calc_failed status=%s", resp.status_code)
            return None
        data = resp.json()
        cost = data[0].get("total_amount") if isinstance(data, list) and data else None
        if cost is None:
            logger.warning("delhivery_calculate_shipping — cost missing in response")
            return None
        logger.info("delhivery_shipping_estimated cost=%s", cost)
        return float(cost)
    except Exception as exc:
        logger.warning("delhivery_shipping_calc_error err=%s", type(exc).__name__)
        return None


def create_shipment(
    order_id: str,
    pickup_location: dict,
    delivery_location: dict,
    customer_phone: str,
    customer_name: str,
    weight_kg: float = 1.0,
    items_description: str = "Apparel",
    payment_mode: str = "Prepaid",
    cod_amount: float = 0.0,
    order_amount: float | None = None,
    existing_shipment_id: str = None,
    existing_tracking_url: str = None,
) -> dict:
    """
    Create a shipment via Delhivery CMU API.

    Args:
        order_id: Your internal order number
        pickup_location: {"address": "...", "city": "...", "state": "...", "pincode": "..."}
        delivery_location: Same structure
        customer_phone: Recipient phone
        customer_name: Recipient name
        weight_kg: Package weight
        items_description: Item description
        existing_shipment_id: If shipment already created, skip re-creation (idempotency)
        existing_tracking_url: Existing tracking URL for idempotent return

    Returns a result dict — never raises:
    {
        "success": True,
        "delhivery_shipment_id": "...",
        "waybill_number": "...",
        "tracking_url": "https://...",
    }
    — or on failure —
    {
        "success": False,
        "error": "human-readable reason",
        "error_code": "DELHIVERY_AUTH" | "DELHIVERY_VALIDATION" | "DELHIVERY_TIMEOUT"
                    | "DELHIVERY_API" | "DELHIVERY_MISSING_FIELDS" | "UNKNOWN",
        "retryable": True | False,
    }
    """
    # ── Idempotency guard ────────────────────────────────────────────────
    if existing_shipment_id:
        logger.info(
            "delhivery_shipment_already_exists order=%s shipment_id=%s",
            order_id, _mask(existing_shipment_id),
        )
        return {
            "success": True,
            "delhivery_shipment_id": existing_shipment_id,
            "waybill_number": existing_shipment_id,
            "tracking_url": existing_tracking_url or "",
        }

    # ── Guard: required fields ──────────────────────────────────────────
    missing = [f for f, v in [
        ("order_id", order_id),
        ("customer_phone", customer_phone),
        ("customer_name", customer_name),
        ("pickup_location", pickup_location),
        ("delivery_location", delivery_location),
    ] if not v]

    if missing:
        logger.error("delhivery_create_shipment missing fields=%s order=%s", missing, order_id)
        return {
            "success": False,
            "error": f"Missing required fields: {', '.join(missing)}",
            "error_code": "DELHIVERY_MISSING_FIELDS",
            "retryable": False,
        }

    # ── Strict field validation ─────────────────────────────────────────
    if not delivery_location.get("pincode"):
        return {
            "success": False,
            "error": "Missing delivery pincode",
            "error_code": "DELHIVERY_VALIDATION",
            "retryable": False,
        }

    if not pickup_location.get("pincode"):
        return {
            "success": False,
            "error": "Missing pickup pincode",
            "error_code": "DELHIVERY_VALIDATION",
            "retryable": False,
        }

    if not customer_phone or len(str(customer_phone).strip()) < 10:
        return {
            "success": False,
            "error": "Invalid customer phone",
            "error_code": "DELHIVERY_VALIDATION",
            "retryable": False,
        }

    customer_phone = re.sub(r"\D", "", str(customer_phone))[:10]
    if len(customer_phone) < 10:
        customer_phone = "9999999999"

    # ── Guard: configuration ────────────────────────────────────────────
    if not DELHIVERY_API_KEY:
        return {
            "success": False,
            "error": "Delhivery API key not configured",
            "error_code": "DELHIVERY_AUTH",
            "retryable": False,
        }
        
    if not DELHIVERY_FACILITY:
        return {
            "success": False,
            "error": "Delhivery facility not configured properly",
            "error_code": "DELHIVERY_CONFIG",
            "retryable": False,
        }

    # ── Pincode serviceability check ────────────────────────────────────
    delivery_pin = str(delivery_location.get("pincode", "")).strip()
    if delivery_pin and not validate_pincode(delivery_pin):
        return {
            "success": False,
            "error": f"Delivery pincode {delivery_pin} not serviceable by Delhivery",
            "error_code": "DELHIVERY_VALIDATION",
            "retryable": False,
        }

    # ── Build correct CMU payload ───────────────────────────────────────
    pickup_pin = str(pickup_location.get("pincode") or os.getenv("STORE_PINCODE") or "400001").strip()
    pickup_city = pickup_location.get("city") or os.getenv("STORE_CITY") or "Mumbai"
    pickup_state = pickup_location.get("state") or os.getenv("STORE_STATE") or "Maharashtra"
    pickup_address = pickup_location.get("address") or os.getenv("STORE_ADDRESS") or "Default Store Address"
    seller_gst = os.getenv("SELLER_GST_TIN", "")
    clean_payment_mode = "COD" if str(payment_mode).strip().lower() == "cod" else "Prepaid"
    clean_cod_amount = max(0.0, float(cod_amount or 0))
    clean_order_amount = max(clean_cod_amount, float(order_amount if order_amount is not None else clean_cod_amount or 100))

    shipment_data = {
        "shipments": [{
            "name":             customer_name,
            "add":              delivery_location.get("address") or "Default Address, Mumbai",
            "pin":              delivery_pin,
            "city":             delivery_location.get("city", ""),
            "state":            delivery_location.get("state", ""),
            "country":          "India",
            "phone":            str(customer_phone).strip(),
            "order":            str(order_id),
            "payment_mode":     clean_payment_mode,
            "cod_amount":       f"{clean_cod_amount:.2f}" if clean_payment_mode == "COD" else "0",
            "total_amount":     f"{clean_order_amount:.2f}",
            "weight":           weight_kg,
            "shipment_length":  10,
            "shipment_width":   10,
            "shipment_height":  5,
            "quantity":         1,
            "product_desc":     items_description,
            "shipping_mode":    "Surface",
            "cod_info":         f"{clean_cod_amount:.2f}" if clean_payment_mode == "COD" else "",
            # Return address (required by Delhivery)
            "return_pin":       pickup_pin,
            "return_city":      pickup_city,
            "return_phone":     STORE_PHONE,
            "return_add":       pickup_address,
            "return_state":     pickup_state,
            "return_country":   "India",
            "return_name":      STORE_NAME,
            # Seller info
            "seller_name":      STORE_NAME,
            "seller_add":       pickup_address,
            "seller_phone":     STORE_PHONE,
            "seller_gst_tin":   seller_gst,
        }],
        "pickup_location": {
            "name":     DELHIVERY_FACILITY,
            "add":      pickup_address,
            "city":     pickup_city,
            "pin_code": pickup_pin,
            "country":  "India",
            "phone":    STORE_PHONE,
            "state":    pickup_state,
        }
    }

    payload = {
        "format": "json",
        "data":   json.dumps(shipment_data),
    }

    # Log without PII
    logger.info(
        "delhivery_shipment_start order=%s delivery_pin=%s pickup_pin=%s",
        order_id, _mask(delivery_pin), _mask(pickup_pin),
    )
    logger.info("DELHIVERY FACILITY: %s", DELHIVERY_FACILITY)
    logger.info("DELHIVERY PAYLOAD: %s", json.dumps(shipment_data))

    # ── Send request to CMU create endpoint ─────────────────────────────
    # CRITICAL: Delhivery CMU expects form-urlencoded POST, NOT JSON.
    # The "format key missing" error occurs when sending as application/json.
    url = f"{DELHIVERY_API_BASE}/create.json"
    try:
        session = _make_session()
        headers = {
            "Authorization": f"Token {DELHIVERY_API_KEY}",
            "Content-Type":  "application/x-www-form-urlencoded",
            "Accept":        "application/json",
        }
        resp = session.post(
            url,
            headers=headers,
            data=payload,          # form-urlencoded, NOT json=
            timeout=_TIMEOUT,
        )
    except requests.exceptions.Timeout:
        logger.error("delhivery_shipment_timeout order=%s", order_id)
        return {
            "success": False,
            "error": "Delhivery API timed out — delivery will be retried",
            "error_code": "DELHIVERY_TIMEOUT",
            "retryable": True,
        }
    except requests.exceptions.ConnectionError:
        logger.error("delhivery_shipment_connection_error order=%s", order_id)
        return {
            "success": False,
            "error": "Delhivery API unavailable — delivery will be retried",
            "error_code": "DELHIVERY_TIMEOUT",
            "retryable": True,
        }
    except Exception as exc:
        logger.exception("delhivery_shipment_unexpected_error order=%s err=%s", order_id, type(exc).__name__)
        return {
            "success": False,
            "error": "Unexpected error creating shipment",
            "error_code": "UNKNOWN",
            "retryable": True,
        }

    # ── Log response for debugging ──────────────────────────────────────
    body_preview = (resp.text or "")[:500]
    logger.error(
        "delhivery_response status=%s body=%s",
        resp.status_code, body_preview,
    ) if resp.status_code not in (200, 201, 202) else logger.info(
        "delhivery_response status=%s body_len=%s", resp.status_code, len(resp.text or "")
    )

    # ── Handle HTTP errors ──────────────────────────────────────────────
    if resp.status_code == 401:
        return {
            "success": False,
            "error": "Delhivery authentication failed — check API key",
            "error_code": "DELHIVERY_AUTH",
            "retryable": False,
        }

    if resp.status_code == 400:
        return {
            "success": False,
            "error": f"Delhivery rejected the shipment: {body_preview[:200]}",
            "error_code": "DELHIVERY_VALIDATION",
            "retryable": False,
        }

    if resp.status_code not in (200, 201, 202):
        is_server_error = resp.status_code >= 500
        return {
            "success": False,
            "error": f"Delhivery API error (HTTP {resp.status_code})",
            "error_code": "DELHIVERY_API",
            "retryable": is_server_error,
        }

    # ── Parse response ──────────────────────────────────────────────────
    try:
        data = resp.json()
    except ValueError:
        logger.error("delhivery_invalid_json_response order=%s", order_id)
        return {
            "success": False,
            "error": "Invalid response from Delhivery",
            "error_code": "DELHIVERY_API",
            "retryable": True,
        }

    # ── API-level failure ────────────────────────────────────────────────
    if not data.get("success", True):  # CMU uses "success" flag
        errors = data.get("rmk") or data.get("errors") or data.get("packages", [{}])[0].get("remarks", [""])
        if isinstance(errors, list):
            msg = ", ".join(str(e) for e in errors)
        elif isinstance(errors, dict):
            msg = ", ".join(f"{k}: {v}" for k, v in errors.items())
        else:
            msg = str(errors)
        logger.error("delhivery_shipment_rejected order=%s reason=%s", order_id, msg)
        return {
            "success": False,
            "error": msg or "Delhivery rejected the shipment",
            "error_code": "DELHIVERY_VALIDATION",
            "retryable": False,
        }

    # ── Extract shipment details from CMU response ──────────────────────
    # CMU response format: {"packages": [{"waybill": "...", "status": "..."}], "success": true}
    packages = data.get("packages", [])
    waybill = None
    shipment_status = None

    if packages and isinstance(packages, list):
        pkg = packages[0]
        waybill = pkg.get("waybill") or pkg.get("refnum")
        shipment_status = pkg.get("status")

        # Check for package-level rejection
        if shipment_status and "fail" in str(shipment_status).lower():
            remarks = pkg.get("remarks", ["Shipment creation failed"])
            msg = ", ".join(remarks) if isinstance(remarks, list) else str(remarks)
            logger.error("delhivery_package_failed order=%s status=%s remarks=%s", order_id, shipment_status, msg)
            return {
                "success": False,
                "error": msg,
                "error_code": "DELHIVERY_VALIDATION",
                "retryable": False,
            }

    # Fallback to top-level fields
    if not waybill:
        waybill = data.get("waybill") or data.get("waybill_number") or data.get("shipment_id") or data.get("id")

    tracking_url = f"https://www.delhivery.com/track/package/{waybill}" if waybill else ""

    if not waybill:
        logger.error(
            "delhivery_shipment_missing_waybill order=%s response_keys=%s",
            order_id, list(data.keys()),
        )
        return {
            "success": False,
            "error": "Delhivery returned no waybill number",
            "error_code": "DELHIVERY_API",
            "retryable": True,
        }

    logger.info(
        "delhivery_shipment_success order=%s waybill=%s",
        order_id, _mask(str(waybill)),
    )
    return {
        "success": True,
        "delhivery_shipment_id": str(waybill),
        "waybill_number": str(waybill),
        "tracking_url": tracking_url,
    }


def get_shipment_status(shipment_id: str) -> Optional[dict]:
    """
    Fetch live tracking info for a Delhivery shipment.

    Returns the raw shipment dict from Delhivery, or None on failure.
    """
    if not shipment_id:
        return None

    url = f"https://track.delhivery.com/api/v1/packages/json/?waybill={shipment_id}"
    try:
        session = _make_session()
        resp = session.get(url, headers=_get_headers(), timeout=_TIMEOUT)
        if resp.status_code != 200:
            return None
        data = resp.json()
        shipment_data = data.get("ShipmentData", [])
        if shipment_data and isinstance(shipment_data, list):
            shipment_info = shipment_data[0].get("Shipment", {})
            logger.info(
                "delhivery_status waybill=%s status=%s",
                _mask(shipment_id), shipment_info.get("Status", {}).get("Status", "Unknown"),
            )
            return shipment_info
    except Exception as exc:
        logger.warning("delhivery_tracking_error waybill=%s err=%s", _mask(shipment_id), type(exc).__name__)

    return None


def cancel_shipment(shipment_id: str) -> dict:
    """
    Cancel an active Delhivery shipment.

    Returns:
        {"success": True,  "message": "..."}
        {"success": False, "message": "..."}
    """
    if not shipment_id:
        return {"success": False, "message": "No shipment ID provided"}

    url = f"https://track.delhivery.com/api/p/edit"
    payload = {
        "waybill": shipment_id,
        "cancellation": True,
    }

    try:
        session = _make_session()
        resp = session.post(url, headers=_get_headers(), json=payload, timeout=_TIMEOUT)

        if resp.status_code in (200, 201, 202):
            logger.info("delhivery_cancel_success waybill=%s", _mask(shipment_id))
            return {"success": True, "message": "Shipment cancelled successfully"}

        body_preview = (resp.text or "")[:200]
        logger.warning(
            "delhivery_cancel_failed waybill=%s status=%s body=%s",
            _mask(shipment_id), resp.status_code, body_preview,
        )
        return {"success": False, "message": f"Cancellation failed (HTTP {resp.status_code})"}
    except Exception as exc:
        logger.error("delhivery_cancel_error waybill=%s err=%s", _mask(shipment_id), type(exc).__name__)
        return {"success": False, "message": "Delhivery API unavailable"}
