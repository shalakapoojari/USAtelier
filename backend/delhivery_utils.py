"""
Delhivery delivery integration utilities.
Handles shipment creation, tracking, and cancellation via Delhivery API.
"""

import os
import logging
import time
from typing import Optional
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DELHIVERY_API_BASE = "https://api.delhivery.com/api"
DELHIVERY_API_KEY  = os.getenv("DELHIVERY_API_KEY", "")
DELHIVERY_FACILITY = os.getenv("DELHIVERY_FACILITY_CODE", "")  # e.g., "DELHI_HUB"
STORE_PHONE        = os.getenv("STORE_PHONE", "")
STORE_NAME         = os.getenv("STORE_NAME", "U.S Atelier")
STORE_ADDRESS      = os.getenv("STORE_ADDRESS", "")

_MAX_RETRIES       = 3
_BACKOFF_FACTOR    = 1.5   # waits: 0 s, 1.5 s, 3 s
_TIMEOUT           = 30    # seconds per request

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_headers() -> dict:
    """Build headers for Delhivery API requests."""
    if not DELHIVERY_API_KEY:
        raise RuntimeError("DELHIVERY_API_KEY is not configured")
    return {
        "Authorization": f"Token {DELHIVERY_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
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
    Returns parsed JSON on success, None on any error.
    Never raises — caller decides how to handle None.
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

    if resp.status_code == 401:
        logger.error("delhivery_auth_failed — check DELHIVERY_API_KEY")
        return None
    if resp.status_code == 400:
        # Log body but truncate to avoid PII spill
        logger.error("delhivery_validation_error endpoint=%s body_prefix=%.200s", endpoint, resp.text)
        return None
    if resp.status_code not in [200, 201, 202]:
        logger.error("delhivery_http_error endpoint=%s status=%s", endpoint, resp.status_code)
        return None

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

    # Delhivery serviceability check endpoint
    data = _request("GET", f"v1/pin-codes/{pincode}/")
    if data is None:
        return False

    is_serviceable = bool(data.get("is_serviceable", False))
    logger.debug("delhivery_pincode_validation pincode=%s serviceable=%s", pincode, is_serviceable)
    return is_serviceable


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

    payload = {
        "origin_pincode": origin_pincode,
        "destination_pincode": destination_pincode,
        "weight": weight_kg,
    }

    data = _request("POST", "v1/shipping-rates/", payload)
    if data is None:
        return None

    cost = data.get("shipping_cost") or data.get("charge")
    if cost is None:
        logger.warning("delhivery_calculate_shipping — cost missing in response")
        return None

    logger.info("delhivery_shipping_estimated cost=%s", cost)
    return float(cost)


def create_shipment(
    order_id: str,
    pickup_location: dict,
    delivery_location: dict,
    customer_phone: str,
    customer_name: str,
    weight_kg: float = 1.0,
    items_description: str = "Apparel",
) -> dict:
    """
    Create a shipment via Delhivery API.

    Args:
        order_id: Your internal order number
        pickup_location: {"address": "...", "city": "...", "state": "...", "pincode": "..."}
        delivery_location: Same structure
        customer_phone: Recipient phone
        customer_name: Recipient name
        weight_kg: Package weight
        items_description: Item description

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
    }
    """
    # ── Guard: required fields ──────────────────────────────────────────────
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
        }

    # ── Guard: configuration ────────────────────────────────────────────────
    if not DELHIVERY_API_KEY:
        return {
            "success": False,
            "error": "Delhivery API key not configured",
            "error_code": "DELHIVERY_AUTH",
        }

    payload = {
        "name": customer_name,
        "phone": customer_phone,
        "email": "support@usatelier.com",
        "address": delivery_location.get("address", ""),
        "city": delivery_location.get("city", ""),
        "state": delivery_location.get("state", ""),
        "pincode": delivery_location.get("pincode", ""),
        "return_address": pickup_location.get("address", ""),
        "return_city": pickup_location.get("city", ""),
        "return_state": pickup_location.get("state", ""),
        "return_pincode": pickup_location.get("pincode", ""),
        "order_id": order_id,
        "weight": weight_kg,
        "package_description": items_description,
        "payment_type": "prepaid",  # We pay shipping upfront
    }

    logger.info("delhivery_shipment_start order=%s customer=%s", order_id, customer_name)
    data = _request("POST", "v1/shipments/", payload)

    # ── Network / HTTP failure ───────────────────────────────────────────────
    if data is None:
        return {
            "success": False,
            "error": "Delhivery API unavailable — delivery will be retried",
            "error_code": "DELHIVERY_TIMEOUT",
        }

    # ── API-level failure ────────────────────────────────────────────────────
    if not data.get("success", False):
        errors = data.get("errors", [])
        if isinstance(errors, dict):
            errors = [f"{k}: {v}" for k, v in errors.items()]
        msg = ", ".join(errors) if errors else "Delhivery rejected the shipment"
        logger.error("delhivery_shipment_rejected order=%s reason=%s", order_id, msg)
        return {
            "success": False,
            "error": msg,
            "error_code": "DELHIVERY_VALIDATION",
        }

    # ── Success ──────────────────────────────────────────────────────────────
    shipment_id = data.get("shipment_id") or data.get("id")
    waybill = data.get("waybill_number") or data.get("waybill")
    tracking_url = f"https://track.delhivery.com/tracking/shipments/{waybill}" if waybill else ""

    if not shipment_id:
        logger.error("delhivery_shipment_missing_id order=%s response_keys=%s",
                     order_id, list(data.keys()))
        return {
            "success": False,
            "error": "Delhivery returned no shipment ID",
            "error_code": "DELHIVERY_API",
        }

    logger.info("delhivery_shipment_success order=%s shipment_id=%s waybill=%s",
                order_id, shipment_id, waybill)
    return {
        "success": True,
        "delhivery_shipment_id": str(shipment_id),
        "waybill_number": str(waybill) if waybill else "",
        "tracking_url": tracking_url,
    }


def get_shipment_status(shipment_id: str) -> Optional[dict]:
    """
    Fetch live tracking info for a Delhivery shipment.

    Returns the raw shipment dict from Delhivery, or None on failure.
    """
    if not shipment_id:
        return None

    data = _request("GET", f"v1/shipments/{shipment_id}/")
    if data is None:
        return None

    if data.get("shipment"):
        shipment_info = data.get("shipment")
        logger.info("delhivery_status shipment_id=%s status=%s",
                    shipment_id, shipment_info.get("status"))
        return shipment_info
    
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

    payload = {"status": "cancelled"}
    data = _request("POST", f"v1/shipments/{shipment_id}/cancel/", payload)
    if data is None:
        return {"success": False, "message": "Delhivery API unavailable"}

    if data.get("success"):
        logger.info("delhivery_cancel_success shipment_id=%s", shipment_id)
        return {"success": True, "message": "Shipment cancelled successfully"}

    msg = data.get("message", "Unknown cancellation error")
    logger.warning("delhivery_cancel_failed shipment_id=%s reason=%s", shipment_id, msg)
    return {"success": False, "message": f"Cancellation failed: {msg}"}
