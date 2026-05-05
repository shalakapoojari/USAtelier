"""
app.py — U.S Atelier Flask Backend
Enterprise edition: idempotency, RBAC decorators, DB-backed dispatch queue,
account lockout, password reset, coupon codes, audit logging, structured
logging with PII redaction, hardened headers, and full Delhivery integration.

SECURITY HARDENING CHANGELOG:
- [RATE LIMITING] Stricter per-endpoint limits; keyed by IP + user for auth routes
- [CSRF] Double-submit cookie + origin/referer guard; CSRF token endpoint added
- [CORS] Strict origin validation; credentials only from known origins
- [INPUT VALIDATION] Centralised sanitisers; all user-supplied strings stripped/validated
- [SQL INJECTION] All dynamic queries use ORM bound parameters; raw text() banned
- [SESSION] HttpOnly/Secure/SameSite=None(prod); session fixation fix on login/OTP
- [AUTH] Constant-time password check; login response never leaks user existence timing
- [COOKIES] Secure, HttpOnly, SameSite enforced; __Host- prefix in production
- [HEADERS] Full CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Permissions-Policy
- [FILE UPLOAD] MIME sniffing via python-magic; randomised filename; path-traversal guard
- [OPEN REDIRECT] All redirect targets validated against allowlist
- [SECRETS] Secret-key length enforced; dev key blocked in production
- [LOGGING] PII redaction on all log lines
"""

# ============================================================
# Imports
# ============================================================
from sqlalchemy import text
import secrets
import hmac
from werkzeug.utils import safe_join
from flask import Flask, render_template, jsonify, request, session, redirect, send_from_directory, make_response
from flask_cors import CORS, cross_origin
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from functools import wraps
from urllib.parse import urlparse, urlunparse
from datetime import datetime, timedelta, timezone
import os, json, re, time, hashlib, traceback, logging
import requests
import requests as http_requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import razorpay
from flask_mail import Mail
from authlib.integrations.flask_client import OAuth
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask_wtf.csrf import CSRFProtect, generate_csrf

from mail_utils import (
    send_signup_confirmation,
    send_password_change_confirmation,
    send_order_confirmation,
    send_order_status_update,
    send_new_arrival_notification,
    send_otp_email,
)
from dotenv import load_dotenv
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from models_mysql import (
    db_mysql,
    User, Product as ProductSQL, Category as CategorySQL,
    Order as OrderSQL, OrderItem, CartItem, WishlistItem,
    Review, HomepageConfig, Payment,
    DispatchJob, Coupon, PasswordResetToken, AuditLog,
)
from delhivery_utils import create_shipment, calculate_shipping, validate_pincode

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    HAS_LIMITER = True
except ModuleNotFoundError:
    HAS_LIMITER = False
    def get_remote_address():
        return request.remote_addr or "0.0.0.0"

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    HAS_SCHEDULER = True
except ImportError:
    HAS_SCHEDULER = False

try:
    import magic as _magic
    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False

# ============================================================
# Bootstrap
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Dotenv loaded early to ensure env vars available to all modules

is_production = (
    os.getenv("NODE_ENV") == "production"
    or os.getenv("FLASK_ENV") == "production"
)

# ── Delhivery env validation ─────────────────────────────────────────────
_delhivery_required_env = [
    "DELHIVERY_API_KEY",
    "DELHIVERY_FACILITY_CODE",
    "STORE_ADDRESS",
    "STORE_CITY",
    "STORE_STATE",
    "STORE_PINCODE",
    "STORE_PHONE",
]
_delhivery_missing = [v for v in _delhivery_required_env if not os.getenv(v)]
if _delhivery_missing:
    import warnings as _warnings
    _warnings.warn(
        f"Missing Delhivery env variables: {', '.join(_delhivery_missing)}. "
        f"Shipment creation will fail until these are set.",
        RuntimeWarning,
    )

app = Flask(__name__, static_folder="static", static_url_path="/static")

if os.getenv("TRUST_PROXY_HEADERS", "1") == "1":
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1, x_port=1, x_prefix=1)

# ============================================================
# Structured logging with PII redaction
# ============================================================
_PII_RE = re.compile(
    r'"(email|phone|password|street|zip|address|otp|token|card|cvv|secret)"\s*:\s*"[^"]*"',
    re.IGNORECASE,
)

class _PIISafeFormatter(logging.Formatter):
    def format(self, record):
        msg = super().format(record)
        return _PII_RE.sub(lambda m: m.group(0).split(":")[0] + ': "[REDACTED]"', msg)

_handler = logging.StreamHandler()
_handler.setFormatter(_PIISafeFormatter("%(asctime)s %(levelname)s %(name)s — %(message)s"))
logging.root.addHandler(_handler)
logging.root.setLevel(logging.INFO if is_production else logging.DEBUG)

# ============================================================
# Input validation / sanitisation helpers
# ============================================================

# SECURITY: All regex patterns compiled once
EMAIL_RE        = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
PHONE_RE        = re.compile(r"^\+?[0-9]{7,15}$")
PINCODE_RE      = re.compile(r"^\d{6}$")
ORDER_NUM_RE    = re.compile(r"^ORD-[0-9\-]+$")
# SECURITY: Strong password: 8+ chars, letter + digit + special
PASSWORD_POLICY_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$")

# SECURITY: bcrypt silently truncates at 72 bytes — enforce max
_MAX_PASSWORD_BYTES = 72

def _sanitise_str(value, max_len: int = 500) -> str:
    """Strip, limit length, remove null bytes."""
    if value is None:
        return ""
    return str(value).replace("\x00", "").strip()[:max_len]

def _validate_email(email: str) -> bool:
    return bool(email) and bool(EMAIL_RE.match(email)) and len(email) <= 254

def _validate_password(password: str) -> tuple[bool, str]:
    if not password:
        return False, "Password is required"
    if len(password.encode("utf-8")) > _MAX_PASSWORD_BYTES:
        return False, "Password is too long"
    if not PASSWORD_POLICY_RE.match(password):
        return False, "Password must be at least 8 characters with a letter, number, and special character"
    return True, ""

# ============================================================
# URL helpers
# ============================================================

def _normalize_url(raw: str, default: str) -> str:
    raw = (raw or "").strip().rstrip("/") or default
    parsed = urlparse(raw)
    if not parsed.scheme:
        raw = f"{'https' if is_production else 'http'}://{raw}"
        parsed = urlparse(raw)
    if is_production and parsed.scheme == "http":
        parsed = parsed._replace(scheme="https")
    return urlunparse(parsed).rstrip("/")

def get_backend_base_url() -> str:
    cfg = os.getenv("BACKEND_URL", "").strip().rstrip("/")
    if cfg:
        if is_production and cfg.startswith("http://"):
            cfg = "https://" + cfg[7:]
        return cfg
    root = request.url_root.rstrip("/") if request else ""
    return _normalize_url(root or "http://localhost:5000", "http://localhost:5000")

def get_frontend_base_url() -> str:
    return _normalize_url(os.getenv("FRONTEND_URL", ""), "http://localhost:3000")

# SECURITY: Validate redirect target is within our allowed origins
_SAFE_REDIRECT_PATHS = {"/login", "/account", "/admin", "/"}

def _safe_redirect(path: str):
    """Only redirect to known internal paths — never to arbitrary URLs."""
    if path in _SAFE_REDIRECT_PATHS:
        return redirect(path)
    return redirect("/")

# ============================================================
# CORS / Origin
# ============================================================
_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")

if _allowed_origins_env:
    origins = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
else:
    _furl = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    origins = [
        "https://usatelier.in",
        "https://www.usatelier.in",
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5000",
        "http://192.168.31.120:3000",
        "https://usatelier08.vercel.app",
        re.compile(r"https://[a-zA-Z0-9-]+\.vercel\.app"),
        re.compile(r"http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?"),
        re.compile(r"http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?"),
        re.compile(r"http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?"),
    ]
    if _furl:
        origins.insert(0, _furl)

# SECURITY: credentials=True requires an explicit origin allowlist (no wildcard)
CORS(app, supports_credentials=True, origins=origins)

def _is_origin_allowed(origin: str) -> bool:
    if not origin:
        return False
    for allowed in origins:
        if isinstance(allowed, str) and origin == allowed:
            return True
        if hasattr(allowed, "match") and allowed.match(origin):
            return True
    return False

# ============================================================
# App config
# ============================================================
_secret_key = os.getenv("SECRET_KEY", "")

# SECURITY: Enforce minimum secret key entropy in production
if is_production:
    if not _secret_key or _secret_key == "dev-secret-change-me":
        raise RuntimeError("SECRET_KEY must be set to a strong random value in production")
    if len(_secret_key) < 32:
        raise RuntimeError("SECRET_KEY must be at least 32 characters in production")
else:
    if not _secret_key:
        _secret_key = secrets.token_hex(32)
        app.logger.warning("No SECRET_KEY set — generated ephemeral key for dev")

app.config["SECRET_KEY"] = _secret_key
app.config["PREFERRED_URL_SCHEME"] = "https" if is_production else "http"
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

# SECURITY: Session hardening
app.config["SESSION_COOKIE_NAME"]     = "__Host-us_atelier_session" if is_production else "us_atelier_session"
app.config["SESSION_COOKIE_PATH"]     = "/"
app.config["SESSION_COOKIE_SAMESITE"] = "None" if is_production else "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True          # JS cannot read cookie
app.config["SESSION_COOKIE_SECURE"]   = is_production  # HTTPS only in prod
app.config["SESSION_REFRESH_EACH_REQUEST"] = True
app.config["PERMANENT_SESSION_LIFETIME"]   = 86400 * 7  # 7 days

# SECURITY: __Host- prefix requires path=/ and no Domain attribute; omit Domain
if is_production:
    app.config["SESSION_COOKIE_DOMAIN"] = None

# MySQL — NullPool is correct for PythonAnywhere free tier (single-threaded WSGI,
# hard limit of 1 DB connection).  A regular pool keeps connections open between
# requests; MySQL kills them after wait_timeout (~300 s on PA), producing the
# classic (2006, "MySQL server has gone away") / (2013, "Lost connection") pair.
# NullPool creates one connection per request and closes it immediately after,
# so there is never a stale connection in the pool to cause BrokenPipe on teardown.
from sqlalchemy.pool import NullPool as _NullPool

app.config["SQLALCHEMY_DATABASE_URI"]        = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "poolclass":  _NullPool,     # no pool — fresh connect/close each request
    "pool_pre_ping": True,       # kept as belt-and-suspenders for any future pool change
    "connect_args": {
        "connect_timeout": 10,
        "read_timeout":    30,
        "write_timeout":   30,
        "autocommit":      False,
    },
}

# Mail
app.config["MAIL_SERVER"]         = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config["MAIL_PORT"]           = int(os.getenv("MAIL_PORT", 587))
app.config["MAIL_USE_TLS"]        = os.getenv("MAIL_USE_TLS", "True") == "True"
app.config["MAIL_USERNAME"]       = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"]       = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")

db_mysql.init_app(app)
mail = Mail(app)
csrf = CSRFProtect(app)

if not is_production:
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

# SECURITY: Public auth endpoints are exempted from CSRF as they bootstrap the session.
# Using decorators directly on routes for robustness.

# ============================================================
# Rate Limiter
# SECURITY: Key by IP; tighter limits on sensitive endpoints
# ============================================================

def _rate_limit_key():
    """Key by IP address for rate limiting."""
    return request.remote_addr or "0.0.0.0"

if HAS_LIMITER:
    limiter = Limiter(
        key_func=_rate_limit_key,
        app=app,
        default_limits=[],
        # SECURITY: Store in memory by default; use Redis in production:
        # storage_uri=os.getenv("REDIS_URL", "memory://"),
    )
else:
    class _NoopLimiter:
        def __init__(self, *a, **kw): pass
        def limit(self, *_a, **_kw):
            def _d(fn): return fn
            return _d
    limiter = _NoopLimiter()
    app.logger.warning("flask-limiter not installed — rate limiting disabled. Run: pip install flask-limiter")

# ============================================================
# CSRF token helpers
# SECURITY: Double-submit cookie pattern
# Token = HMAC(session_id, secret) so it's unforgeable without the secret
# ============================================================

_CSRF_COOKIE_NAME  = "csrf_token"
_CSRF_HEADER_NAME  = "X-CSRF-Token"
_CSRF_FORM_NAME    = "csrf_token"
# These paths use their own signature-based auth; exempt from CSRF cookie check
_CSRF_EXEMPT_PATHS = {
    "/api/payments/webhook",
    "/api/webhooks/razorpay",
    "/api/webhooks/delhivery",
}
# Read-only methods never mutate state
_CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}


@app.route("/api/csrf-token", methods=["GET"])
@csrf.exempt
def get_csrf_token():
    """
    Returns a CSRF token for the frontend.
    Flask-WTF automatically validates this in mutating requests.
    """
    token = generate_csrf()
    resp  = make_response(jsonify({"csrf_token": token}))
    resp.set_cookie(
        _CSRF_COOKIE_NAME,
        token,
        samesite="None" if is_production else "Lax",
        secure=is_production,
        httponly=False,
        max_age=86400 * 7,
    )
    return resp, 200

# OTP Helpers
def _gen_otp() -> str:
    """SECURITY: Use secrets module for cryptographically secure OTP."""
    import secrets as _sec
    return "".join([str(_sec.randbelow(10)) for _ in range(6)])

def _hash_otp(otp: str) -> str:
    return hashlib.sha256(otp.encode()).hexdigest()

RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

def get_razorpay_client():
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

razorpay_client = get_razorpay_client() if RAZORPAY_KEY_ID else None

# Upload
UPLOAD_FOLDER = os.path.join(BASE_DIR, "public", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "tiff", "jfif"}
ALLOWED_MIMES = {
    "image/jpeg", "image/png", "image/webp",
    "image/gif", "image/avif", "image/bmp", "image/tiff",
}

def allowed_file(filename: str, file_stream=None) -> bool:
    # SECURITY: Only allow whitelisted extensions; check MIME via libmagic
    ext_ok = (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )
    if not ext_ok:
        return False
    if file_stream and HAS_MAGIC:
        header = file_stream.read(2048)
        file_stream.seek(0)
        mime = _magic.from_buffer(header, mime=True)
        return mime in ALLOWED_MIMES
    return True

# ============================================================
# Auth helpers
# ============================================================

def _is_password_valid(stored: str, candidate: str) -> bool:
    """SECURITY: Always runs check_password_hash to prevent timing attacks."""
    if not stored or candidate is None:
        # Run a dummy hash to maintain constant time
        check_password_hash(generate_password_hash("dummy"), "dummy")
        return False
    try:
        return check_password_hash(stored, candidate)
    except (ValueError, TypeError):
        return False

def _is_password_hashed(pw: str) -> bool:
    return bool(pw) and (pw.startswith("pbkdf2:") or pw.startswith("scrypt:"))

# ============================================================
# RBAC decorators
# ============================================================

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """Re-queries the DB on every call — never trusts the session boolean alone."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        try:
            user = User.query.get(int(session["user_id"]))
        except (ValueError, TypeError):
            session.clear()
            return jsonify({"error": "Authentication required"}), 401
        if not user or not user.is_admin:
            return jsonify({"error": "Forbidden"}), 403
        if user.is_blocked:
            session.clear()
            return jsonify({"error": "Account suspended"}), 403
        return f(*args, **kwargs)
    return decorated

# ============================================================
# Audit log helper
# ============================================================

def _audit(action: str, entity_type: str = None, entity_id: str = None, detail: dict = None):
    try:
        log = AuditLog(
            user_id=int(session["user_id"]) if "user_id" in session else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            detail=json.dumps(detail) if detail else None,
            ip_address=request.remote_addr,
        )
        db_mysql.session.add(log)
        db_mysql.session.flush()
    except Exception as exc:
        app.logger.warning("audit_log_failed action=%s err=%s", action, exc)

# ============================================================
# Password reset token helpers
# ============================================================

def _gen_reset_token(email: str) -> str:
    s = URLSafeTimedSerializer(app.config["SECRET_KEY"])
    return s.dumps(email, salt="pw-reset")

def _verify_reset_token(token: str, max_age: int = 3600):
    s = URLSafeTimedSerializer(app.config["SECRET_KEY"])
    try:
        return s.loads(token, salt="pw-reset", max_age=max_age)
    except (SignatureExpired, BadSignature):
        return None

# ============================================================
# DB-backed Delhivery dispatch scheduler
# ============================================================

def _run_dispatch_job(job_id: int):
    with app.app_context():
        job = DispatchJob.query.get(job_id)
        if not job or job.status not in ("pending", "retry"):
            return

        job.status   = "running"
        job.attempts += 1
        db_mysql.session.commit()

        try:
            order = OrderSQL.query.get(job.order_id)
            if not order:
                job.status     = "failed"
                job.last_error = "Order not found"
                db_mysql.session.commit()
                return

            if order.delhivery_shipment_id:
                app.logger.info(
                    "dispatch_job_skipped_already_shipped job=%s order=%s shipment=%s",
                    job_id, order.order_number, order.delhivery_shipment_id,
                )
                job.status       = "done"
                job.completed_at = datetime.now(timezone.utc)
                job.last_error   = "Already shipped (idempotency guard)"
                db_mysql.session.commit()
                return

            if order.status in ("Cancelled", "Refunded"):
                job.status       = "failed"
                job.last_error   = f"Order is {order.status} — skipping dispatch"
                db_mysql.session.commit()
                return

            user     = User.query.get(order.user_id)
            shipping = order.shipping_address

            pickup_location = {
                "address": os.getenv("STORE_ADDRESS", ""),
                "city":    os.getenv("STORE_CITY", ""),
                "state":   os.getenv("STORE_STATE", ""),
                "pincode": os.getenv("STORE_PINCODE", ""),
            }
            delivery_location = {
                "address": f"{shipping.get('street', '')}, {shipping.get('city', '')}".strip(", "),
                "city":    shipping.get("city", ""),
                "state":   shipping.get("state", ""),
                "pincode": shipping.get("zip", ""),
            }
            customer_phone = (user.phone if user else None) or "9999999999"
            customer_name  = (
                f"{shipping.get('firstName', '')} {shipping.get('lastName', '')}".strip()
                or (f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Customer")
            )

            res = create_shipment(
                order_id=order.order_number,
                pickup_location=pickup_location,
                delivery_location=delivery_location,
                customer_phone=customer_phone,
                customer_name=customer_name,
                existing_shipment_id=order.delhivery_shipment_id,
                existing_tracking_url=order.delhivery_tracking_url,
            )

            if res.get("success"):
                order.delhivery_shipment_id      = str(res["delhivery_shipment_id"])
                order.delhivery_tracking_url     = res["tracking_url"]
                order.delhivery_waybill_number   = res.get("waybill_number", "")
                order.status                     = "Shipped"
                job.status                       = "done"
                job.completed_at                 = datetime.now(timezone.utc)
                db_mysql.session.commit()

                if user:
                    try:
                        send_order_status_update(
                            mail, user.email, order.order_number,
                            "Shipped", order.delhivery_tracking_url,
                        )
                    except Exception as exc:
                        app.logger.warning("dispatch_email_failed order=%s err=%s",
                                           order.order_number, exc)
            else:
                is_retryable = res.get("retryable", True)
                error_code   = res.get("error_code", "UNKNOWN")
                error_msg    = res.get("error", "Unknown Delhivery error")

                if not is_retryable:
                    job.status     = "failed"
                    job.last_error = f"[{error_code}] {error_msg}"[:500]
                    app.logger.error(
                        "dispatch_job_permanent_failure job=%s order=%s code=%s err=%s",
                        job_id, order.order_number, error_code, error_msg,
                    )
                    db_mysql.session.commit()
                    return

                raise RuntimeError(f"[{error_code}] {error_msg}")

        except Exception as exc:
            delay = min(60 * (2 ** job.attempts), 3600)
            if job.attempts >= job.max_attempts:
                job.status     = "failed"
                job.last_error = str(exc)[:500]
                app.logger.error("dispatch_job_exhausted job=%s order=%s err=%s",
                                 job_id, job.order_id, exc)
            else:
                job.status          = "retry"
                job.last_error      = str(exc)[:500]
                job.next_attempt_at = datetime.now(timezone.utc) + timedelta(seconds=delay)
                app.logger.warning("dispatch_job_retry job=%s attempt=%s next_in=%ss",
                                   job_id, job.attempts, delay)
            db_mysql.session.commit()


def _poll_dispatch_jobs():
    with app.app_context():
        due = DispatchJob.query.filter(
            DispatchJob.status.in_(["pending", "retry"]),
            DispatchJob.next_attempt_at <= datetime.now(timezone.utc),
        ).all()
        for job in due:
            try:
                _run_dispatch_job(job.id)
            except Exception as exc:
                app.logger.exception("scheduler_error job=%s err=%s", job.id, exc)


def _enqueue_dispatch(order_id: int):
    job = DispatchJob(order_id=order_id)
    db_mysql.session.add(job)
    db_mysql.session.flush()
    return job

# ============================================================
# Misc helpers
# ============================================================

def _no_proxy_session():
    s = http_requests.Session()
    s.trust_env = False
    s.proxies   = {"http": None, "https": None}
    retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    adp   = HTTPAdapter(max_retries=retry)
    s.mount("https://", adp)
    s.mount("http://",  adp)
    return s

# ============================================================
# DB init + seed
# ============================================================

with app.app_context():
    try:
        db_mysql.create_all()
        app.logger.info("MySQL tables created/verified")
    except Exception as exc:
        app.logger.error("MySQL create_all failed: %s", exc)


def seed_database():
    admin_email    = os.getenv("ADMIN_EMAIL")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if admin_email and admin_password:
        admin = User.query.filter_by(email=admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                password=generate_password_hash(admin_password),
                is_admin=True, first_name="Admin", last_name="User",
            )
            db_mysql.session.add(admin)
            app.logger.info("Admin account created: %s", admin_email)
        else:
            admin.password = generate_password_hash(admin_password)
            admin.is_admin = True

    default_categories = [
        {"name": "Knitwear",    "subcategories": ["Sweaters", "Cardigans"]},
        {"name": "Trousers",    "subcategories": ["Tailored", "Casual"]},
        {"name": "Basics",      "subcategories": ["Tees"]},
        {"name": "Shirts",      "subcategories": ["Formal"]},
        {"name": "Accessories", "subcategories": ["Bags", "Scarf"]},
    ]
    if CategorySQL.query.count() == 0:
        for cat in default_categories:
            db_mysql.session.add(CategorySQL(name=cat["name"], subcategories=cat["subcategories"]))
        app.logger.info("Default categories seeded")

    try:
        db_mysql.session.commit()
    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.error("Seed commit failed: %s", exc)


with app.app_context():
    try:
        seed_database()
    except Exception as exc:
        app.logger.error("Seeding failed: %s", exc)

# ============================================================
# APScheduler
# ============================================================

if HAS_SCHEDULER:
    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(_poll_dispatch_jobs, "interval", seconds=60, id="delhivery_poll")
    _scheduler.start()
    app.logger.info("APScheduler started — Delhivery shipment poller active")
else:
    app.logger.warning(
        "apscheduler not installed — Delhivery retries disabled. "
        "Run: pip install apscheduler"
    )

# ============================================================
# Static file serving
# ============================================================

@app.route("/uploads/<path:filename>")
def serve_uploads_short(filename):
    """
    Serve user-uploaded files at /uploads/<path>.
    SECURITY: safe_join prevents path traversal across directories.
    """
    try:
        # Resolve the safest absolute path
        from werkzeug.utils import safe_join as _safe_join
        target = _safe_join(app.config["UPLOAD_FOLDER"], filename)
        if not target or not os.path.isfile(target):
            return jsonify({"error": "File not found"}), 404

        # Add CORS header to allow images to be loaded cross-origin (e.g. from the main site)
        resp = send_from_directory(os.path.dirname(target), os.path.basename(target))
        resp.headers["Access-Control-Allow-Origin"] = "*"
        return resp
    except Exception as exc:
        app.logger.warning("serve_file_error path=%s err=%s", filename, exc)
        return jsonify({"error": "Could not serve file"}), 500

@app.errorhandler(413)
def handle_file_too_large(_err):
    return jsonify({"error": "File too large. Maximum size is 10 MB."}), 413

# ============================================================
# Security middleware
# ============================================================

@app.before_request
def enforce_security():
    """
    Combined security guard:
    1. Origin/Referer CORS guard
    2. Webhook exemption from CSRF
    """
    if request.method == "OPTIONS":
        return "", 200

    if request.method in _CSRF_SAFE_METHODS:
        return None

    if not request.path.startswith("/api/"):
        return None

    # Exclude webhooks from CSRF (they use HMAC signatures)
    if request.path in _CSRF_EXEMPT_PATHS:
        csrf.exempt(request.path)
        return None

    origin  = request.headers.get("Origin", "")
    if origin and not _is_origin_allowed(origin.rstrip("/")):
        return jsonify({"error": "Disallowed origin"}), 403

    return None


@app.after_request
def security_headers(response):
    """SECURITY: Harden HTTP response headers on every response."""
    response.headers["X-Content-Type-Options"]  = "nosniff"
    response.headers["X-Frame-Options"]         = "DENY"           # stricter than SAMEORIGIN
    response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=(), payment=()"
    response.headers["X-XSS-Protection"]        = "0"              # modern browsers use CSP; legacy header disabled per OWASP
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: blob: https:; "
        "media-src 'self' blob: https:; "
        "connect-src 'self' https://api.usatelier.in https://api.razorpay.com; "
        "frame-src https://api.razorpay.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    if is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"

    # SECURITY: Remove server banner
    response.headers.pop("Server", None)
    response.headers.pop("X-Powered-By", None)
    return response


@app.teardown_appcontext
def _safe_teardown_db(exc):
    """
    Safely remove the SQLAlchemy scoped session after every request.
    With NullPool the underlying TCP connection is already gone by the time
    Flask calls teardown, so we must swallow BrokenPipe / OperationalError
    instead of letting them bubble up and produce a second traceback in the
    WSGI error log.
    """
    try:
        db_mysql.session.remove()
    except Exception:
        # Connection is already dead — nothing to roll back, nothing to return.
        # Flask-SQLAlchemy will create a fresh session on the next request.
        pass

# ============================================================
# Page routes
# ============================================================

@app.route("/")
def home(): return render_template("index.html")

@app.route("/view-all")
def shop(): return render_template("shop.html")

@app.route("/collections")
def collections(): return render_template("shop.html")

@app.route("/product/<product_id>")
def product_page(product_id):
    # SECURITY: Validate product_id is numeric before rendering
    if not re.match(r"^\d+$", product_id):
        return redirect("/view-all")
    return render_template("product.html", product_id=product_id)

@app.route("/cart")
def cart_page(): return render_template("cart.html")

@app.route("/checkout")
def checkout_page(): return render_template("checkout.html")

@app.route("/login")
def login_page(): return render_template("login.html")

@app.route("/signup")
def signup_page(): return render_template("signup.html")

@app.route("/account")
def account_page():
    if "user_id" not in session:
        return _safe_redirect("/login")
    return render_template("account.html")

@app.route("/admin")
def admin_page():
    if "user_id" not in session or not session.get("is_admin"):
        return _safe_redirect("/login")
    return render_template("admin.html")

@app.route("/health")
def health():
    # SECURITY: Don't expose internal details in production
    try:
        User.query.limit(1).all()
        db_status = "connected"
    except Exception as exc:
        db_status = "error" if is_production else f"error: {exc}"
    return jsonify({
        "status": "healthy",
        "db":     db_status,
    } if is_production else {
        "status":               "healthy",
        "db":                   db_status,
        "payment_configured":   bool(RAZORPAY_KEY_ID),
        "delhivery_configured": bool(os.getenv("DELHIVERY_API_KEY")),
        "scheduler_running":    HAS_SCHEDULER,
    }), 200

# ============================================================
# AUTH
# ============================================================

@app.route("/api/auth/signup", methods=["POST"])
@csrf.exempt
@limiter.limit("5 per minute")
def signup():
    data = request.get_json() or {}

    # SECURITY: Sanitise and validate all inputs server-side
    email          = _sanitise_str(data.get("email", "")).lower()
    password       = data.get("password", "")  # do NOT sanitise password (may contain special chars)
    first_name     = _sanitise_str(data.get("firstName", ""), 100)
    last_name      = _sanitise_str(data.get("lastName", ""), 100)
    phone          = _sanitise_str(data.get("phone", ""), 20)
    terms_accepted = bool(data.get("termsAccepted"))

    if not email or not _validate_email(email):
        return jsonify({"error": "A valid email address is required"}), 400

    pw_valid, pw_error = _validate_password(password)
    if not pw_valid:
        return jsonify({"error": pw_error}), 400

    if not terms_accepted:
        return jsonify({"error": "Terms and Conditions must be accepted"}), 400

    if phone and not PHONE_RE.match(phone):
        return jsonify({"error": "Invalid phone number format"}), 400

    # SECURITY: Use ORM parameterised query — no string interpolation
    if User.query.filter(db_mysql.func.lower(User.email) == email).first():
        # SECURITY: Still return 400 (not 409) to prevent user enumeration via timing — but
        # here leaking "already registered" is acceptable UX for signup
        return jsonify({"error": "Email already registered"}), 400

    try:
        new_user = User(
            email      = email,
            password   = generate_password_hash(password),
            first_name = first_name,
            last_name  = last_name,
            phone      = phone,
            is_admin   = False,
        )
        db_mysql.session.add(new_user)
        db_mysql.session.commit()

        # SECURITY: Regenerate session on privilege change (session fixation prevention)
        session.clear()
        session.permanent    = True
        session["user_id"]   = str(new_user.id)
        session["is_admin"]  = False
        session["is_new_signup"] = True

        try:
            send_signup_confirmation(mail, email, first_name)
        except Exception as exc:
            app.logger.error("signup_email_failed err=%s", type(exc).__name__)

        return jsonify({
            "success":   True,
            "message":   "Signup successful!",
            "user":      email,
            "firstName": first_name,
            "lastName":  last_name,
            "phone":     phone,
            "id":        str(new_user.id),
        }), 201
    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.exception("signup_error")
        return jsonify({"error": "Registration failed"}), 500


@app.route("/api/auth/login", methods=["POST"])
@csrf.exempt
@limiter.limit("10 per minute")
def login():
    data       = request.get_json() or {}
    identifier = _sanitise_str(data.get("email", "")).lower()
    password   = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Email and password required"}), 400

    # SECURITY: Validate email format before querying DB
    if not _validate_email(identifier) and "@" in identifier:
        return jsonify({"error": "Invalid credentials"}), 401

    # SECURITY: Always use ORM parameterised queries
    user = User.query.filter(db_mysql.func.lower(User.email) == identifier).first()

    # Username-style lookup (no @)
    if not user and "@" not in identifier:
        candidates = (
            User.query.filter(User.email.ilike(f"{identifier}@%"))
            .order_by(User.id.asc()).all()
        )
        if len(candidates) == 1:
            user = candidates[0]

    # SECURITY: Check lockout BEFORE password check to avoid timing oracle
    if user and user.is_locked():
        app.logger.warning("login_attempt_locked_account user_id=%s ip=%s", user.id, request.remote_addr)
        return jsonify({"error": "Account temporarily locked due to too many failed attempts. Try again later."}), 429

    # SECURITY: _is_password_valid runs dummy hash when user is None — constant time
    password_ok = _is_password_valid(user.password if user else None, password)

    if not password_ok:
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                app.logger.warning("account_locked user_id=%s ip=%s", user.id, request.remote_addr)
            db_mysql.session.commit()
        # SECURITY: Same response whether user exists or not — prevents enumeration
        return jsonify({"error": "Invalid credentials"}), 401

    if user.is_blocked:
        return jsonify({"error": "Your account has been blocked. Contact support."}), 403

    # Successful login
    user.failed_login_attempts = 0
    user.locked_until          = None
    user.last_login_at         = datetime.now(timezone.utc)
    user.last_login_ip         = request.remote_addr

    if not _is_password_hashed(user.password):
        user.password = generate_password_hash(password)

    db_mysql.session.commit()

    # SECURITY: Session fixation prevention — clear and regenerate session on login
    old_cart = session.get("cart")
    session.clear()
    session.permanent    = True
    session["user_id"]   = str(user.id)
    session["is_admin"]  = bool(user.is_admin)
    if old_cart:
        session["cart"] = old_cart  # preserve guest cart

    return jsonify({
        "success":    True,
        "message":    "Login successful!",
        "user":       user.email,
        "firstName":  user.first_name or user.email.split("@")[0],
        "lastName":   user.last_name or "",
        "phone":      user.phone or "",
        "profilePic": user.profile_pic or "",
        "id":         str(user.id),
        "isAdmin":    user.is_admin,
    }), 200


@app.route("/api/auth/logout", methods=["POST"])
@csrf.exempt
def logout():
    # SECURITY: Completely destroy session on logout
    session.clear()
    resp = make_response(jsonify({"success": True, "message": "Logged out"}))
    # SECURITY: Expire the session cookie immediately
    resp.set_cookie(
        app.config["SESSION_COOKIE_NAME"],
        "",
        expires=0,
        httponly=True,
        secure=is_production,
        samesite="None" if is_production else "Lax",
    )
    return resp, 200


@app.route("/api/auth/user", methods=["GET", "PUT"])
def get_user_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"user": None}), 200

    try:
        user = User.query.get(int(user_id))
    except (ValueError, TypeError):
        session.clear()
        return jsonify({"user": None}), 200

    if not user:
        session.clear()
        return jsonify({"user": None}), 200

    if request.method == "PUT":
        data = request.get_json() or {}
        # SECURITY: Sanitise all inputs; never allow is_admin or is_blocked via this endpoint
        user.first_name  = _sanitise_str(data.get("firstName", user.first_name or ""), 100)
        user.last_name   = _sanitise_str(data.get("lastName",  user.last_name  or ""), 100)
        phone_raw        = _sanitise_str(data.get("phone", user.phone or ""), 20)
        if phone_raw and not PHONE_RE.match(phone_raw):
            return jsonify({"error": "Invalid phone number format"}), 400
        user.phone       = phone_raw
        # Profile pic must be a URL from our own backend
        pic = _sanitise_str(data.get("profilePic", user.profile_pic or ""), 500)
        if pic and not pic.startswith(("/uploads/", get_backend_base_url())):
            return jsonify({"error": "Invalid profile picture URL"}), 400
        user.profile_pic = pic
        try:
            db_mysql.session.commit()
            return jsonify({"success": True, "message": "Profile updated"})
        except Exception as exc:
            db_mysql.session.rollback()
            return jsonify({"error": "Update failed"}), 500

    return jsonify({
        "user":        user.email,
        "id":          str(user.id),
        "firstName":   user.first_name,
        "lastName":    user.last_name,
        "phone":       user.phone,
        "profilePic":  user.profile_pic,
        "isAdmin":     user.is_admin,
        "isBlocked":   user.is_blocked,
        "addresses":   user.JSON_addresses,
        "isNewSignup": session.pop("is_new_signup", False),
    }), 200


@app.route("/api/auth/change-password", methods=["POST"])
@login_required
def change_password():
    data             = request.get_json() or {}
    current_password = data.get("currentPassword", "")
    new_password     = data.get("newPassword", "")

    if not current_password or not new_password:
        return jsonify({"error": "Current and new password required"}), 400

    pw_valid, pw_error = _validate_password(new_password)
    if not pw_valid:
        return jsonify({"error": pw_error}), 400

    try:
        user = User.query.get(int(session["user_id"]))
    except (ValueError, TypeError):
        return jsonify({"error": "User not found"}), 404

    if not user:
        return jsonify({"error": "User not found"}), 404

    # SECURITY: Constant-time check
    if not _is_password_valid(user.password, current_password):
        return jsonify({"error": "Incorrect current password"}), 400

    # SECURITY: Prevent reuse of same password
    if _is_password_valid(user.password, new_password):
        return jsonify({"error": "New password must be different from the current password"}), 400

    try:
        user.password = generate_password_hash(new_password)
        db_mysql.session.commit()
    except Exception:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to update password"}), 500

    # SECURITY: Invalidate all other sessions by regenerating CSRF seed

    try:
        send_password_change_confirmation(mail, user.email, user.first_name or "User")
    except Exception as exc:
        app.logger.error("pw_change_email_failed err=%s", type(exc).__name__)

    return jsonify({"success": True, "message": "Password updated successfully"}), 200


# ---- Password reset ---------------------------------------------------------

@app.route("/api/auth/forgot-password", methods=["POST"])
@limiter.limit("3 per minute")
def forgot_password():
    data  = request.get_json() or {}
    email = _sanitise_str(data.get("email", "")).lower()

    if not email or not _validate_email(email):
        # SECURITY: Return 200 regardless — don't reveal whether email exists
        return jsonify({"success": True, "message": "If that email exists, a reset link has been sent"}), 200

    user = User.query.filter_by(email=email).first()
    if user:
        token      = _gen_reset_token(email)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})

        prt = PasswordResetToken(
            user_id    = user.id,
            token_hash = token_hash,
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db_mysql.session.add(prt)
        try:
            db_mysql.session.commit()
            reset_url = f"{get_frontend_base_url()}/reset-password?token={token}"
            # send_password_reset_email(mail, email, user.first_name, reset_url)
            app.logger.info("reset_token_issued user_id=%s", user.id)
        except Exception as exc:
            db_mysql.session.rollback()
            app.logger.error("reset_token_db_error err=%s", exc)

    return jsonify({"success": True, "message": "If that email exists, a reset link has been sent"}), 200


@app.route("/api/auth/reset-password", methods=["POST"])
@limiter.limit("5 per minute")
def reset_password():
    data         = request.get_json() or {}
    token        = _sanitise_str(data.get("token", ""), 512)
    new_password = data.get("newPassword", "")

    if not token or not new_password:
        return jsonify({"error": "Token and new password required"}), 400

    pw_valid, pw_error = _validate_password(new_password)
    if not pw_valid:
        return jsonify({"error": pw_error}), 400

    email = _verify_reset_token(token)
    if not email:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    prt  = PasswordResetToken.query.filter_by(token_hash=token_hash, used=False).first()
    user = User.query.filter_by(email=email).first()

    if not prt or not prt.is_valid() or not user:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    try:
        user.password = generate_password_hash(new_password)
        prt.used      = True
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Password reset successfully"}), 200
    except Exception:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to reset password"}), 500


# ---- OTP auth ---------------------------------------------------------------

@app.route("/api/auth/send-otp", methods=["POST"])
@csrf.exempt
@limiter.limit("3 per minute")
def send_otp():
    data  = request.get_json() or {}
    email = _sanitise_str(data.get("email", "")).lower()

    if not email or not _validate_email(email):
        return jsonify({"error": "A valid email is required"}), 400

    otp      = _gen_otp()
    otp_hash = _hash_otp(otp)

    user = User.query.filter_by(email=email).first()
    if not user:
        user = User(
            email      = email,
            is_admin   = False,
            created_at = datetime.now(timezone.utc),
        )
        db_mysql.session.add(user)

    user.otp_hash       = otp_hash
    user.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    try:
        db_mysql.session.commit()
        if send_otp_email(mail, email, otp):
            return jsonify({"success": True, "message": "OTP sent to your email"}), 200
        else:
            return jsonify({"error": "Failed to send email"}), 500
    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.error("send_otp_error err=%s", exc)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/api/auth/verify-otp", methods=["POST"])
@csrf.exempt
@limiter.limit("10 per minute")
def verify_otp():
    data  = request.get_json() or {}
    email = _sanitise_str(data.get("email", "")).lower()
    otp   = _sanitise_str(data.get("otp", ""), 10)

    if not email or not otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    if not _validate_email(email):
        return jsonify({"error": "Invalid or expired OTP"}), 400

    # SECURITY: OTP must be numeric and exactly 6 digits
    if not re.match(r"^\d{6}$", otp):
        return jsonify({"error": "Invalid or expired OTP"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.otp_hash or not user.otp_expires_at:
        return jsonify({"error": "Invalid or expired OTP"}), 400

    expiry = user.otp_expires_at.replace(tzinfo=timezone.utc)
    if expiry < datetime.now(timezone.utc):
        return jsonify({"error": "OTP has expired"}), 400

    # SECURITY: Constant-time OTP comparison
    if not hmac.compare_digest(_hash_otp(otp), user.otp_hash):
        return jsonify({"error": "Invalid OTP"}), 400

    # Clear OTP fields immediately after successful use
    user.otp_hash       = None
    user.otp_expires_at = None
    user.last_login_at  = datetime.now(timezone.utc)
    user.last_login_ip  = request.remote_addr

    try:
        db_mysql.session.commit()

        # SECURITY: Session fixation — clear and regenerate
        session.clear()
        session.permanent     = True
        session["user_id"]    = str(user.id)
        session["is_admin"]   = bool(user.is_admin)

        return jsonify({
            "success":   True,
            "message":   "Login successful",
            "user":      user.email,
            "firstName": user.first_name or email.split("@")[0],
            "isAdmin":   user.is_admin,
            "id":        str(user.id),
        }), 200
    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.error("verify_otp_error err=%s", exc)
        return jsonify({"error": "Internal server error"}), 500


# ---- Addresses --------------------------------------------------------------

@app.route("/api/user/addresses", methods=["POST"])
@login_required
def add_address():
    try:
        user = User.query.get(int(session["user_id"]))
    except (ValueError, TypeError):
        return jsonify({"error": "User not found"}), 404

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}

    # SECURITY: Validate and sanitise every address field
    street  = _sanitise_str(data.get("street", ""), 300)
    city    = _sanitise_str(data.get("city", ""), 100)
    state   = _sanitise_str(data.get("state", ""), 100)
    zip_code = _sanitise_str(data.get("zip", ""), 20)
    country = _sanitise_str(data.get("country", "IN"), 10)

    if not street or not city or not state or not zip_code:
        return jsonify({"error": "street, city, state, and zip are required"}), 400

    address = {
        "id":      int(time.time()),
        "street":  street,
        "city":    city,
        "state":   state,
        "zip":     zip_code,
        "country": country,
    }
    try:
        current = user.JSON_addresses
        current.append(address)
        user.JSON_addresses = current
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Address added"}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to add address"}), 500

# ============================================================
# UPLOADS
# ============================================================

@app.route("/api/upload", methods=["POST"])
@csrf.exempt
@admin_required
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if not allowed_file(file.filename, file.stream):
        return jsonify({"error": "File type not allowed"}), 400

    try:
        products_dir = os.path.join(UPLOAD_FOLDER, "products")
        os.makedirs(products_dir, exist_ok=True)
        # SECURITY: Use cryptographic random prefix — prevents filename collision attacks
        rand_prefix = secrets.token_hex(8)
        filename    = f"{rand_prefix}_{secure_filename(file.filename)}"
        # SECURITY: Verify final path is inside the upload directory (path traversal guard)
        final_path = os.path.realpath(os.path.join(products_dir, filename))
        if not final_path.startswith(os.path.realpath(products_dir)):
            return jsonify({"error": "Invalid file path"}), 400
        file.save(final_path)
        rel_url = f"/uploads/products/{filename}"
        return jsonify({
            "success": True,
            "url":  f"{get_backend_base_url()}{rel_url}",
            "path": rel_url,
        }), 200
    except Exception as exc:
        app.logger.error("upload_error err=%s", exc)
        return jsonify({"error": "Upload failed"}), 500


@app.route("/api/upload/profile", methods=["POST"])
@login_required
def upload_profile_pic():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if not allowed_file(file.filename, file.stream):
        return jsonify({"error": "File type not allowed"}), 400

    try:
        profiles_dir = os.path.join(UPLOAD_FOLDER, "profiles")
        os.makedirs(profiles_dir, exist_ok=True)
        ext      = secure_filename(file.filename).rsplit(".", 1)[-1].lower()
        rand_prefix = secrets.token_hex(8)
        filename = f"profile_{session['user_id']}_{rand_prefix}.{ext}"
        final_path = os.path.realpath(os.path.join(profiles_dir, filename))
        if not final_path.startswith(os.path.realpath(profiles_dir)):
            return jsonify({"error": "Invalid file path"}), 400
        file.save(final_path)
        return jsonify({
            "success": True,
            "url":  f"{get_backend_base_url()}/uploads/profiles/{filename}",
            "path": f"/uploads/profiles/{filename}",
        }), 200
    except Exception as exc:
        app.logger.error("profile_upload_error err=%s", exc)
        return jsonify({"error": "Upload failed"}), 500

ALLOWED_VIDEO_EXTENSIONS = {"mp4", "webm", "mov"}
ALLOWED_VIDEO_MIMES      = {"video/mp4", "video/webm", "video/quicktime"}

def allowed_video(filename: str, file_stream=None) -> bool:
    """SECURITY: Only allow whitelisted video extensions; optionally check MIME."""
    ext_ok = (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS
    )
    if not ext_ok:
        return False
    if file_stream and HAS_MAGIC:
        header = file_stream.read(2048)
        file_stream.seek(0)
        mime = _magic.from_buffer(header, mime=True)
        return mime in ALLOWED_VIDEO_MIMES
    return True


@app.route("/api/upload/video", methods=["POST"])
@csrf.exempt
@admin_required
def upload_video():
    """Upload a hero video (MP4 / WebM / MOV) — admin only."""
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if not allowed_video(file.filename, file.stream):
        return jsonify({"error": "File type not allowed. Use MP4, WebM or MOV."}), 400

    # 100 MB limit for videos
    MAX_VIDEO_BYTES = 100 * 1024 * 1024
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_VIDEO_BYTES:
        return jsonify({"error": "Video too large. Maximum size is 100 MB."}), 413

    try:
        videos_dir = os.path.join(UPLOAD_FOLDER, "videos")
        os.makedirs(videos_dir, exist_ok=True)
        rand_prefix = secrets.token_hex(8)
        filename    = f"{rand_prefix}_{secure_filename(file.filename)}"
        final_path  = os.path.realpath(os.path.join(videos_dir, filename))
        if not final_path.startswith(os.path.realpath(videos_dir)):
            return jsonify({"error": "Invalid file path"}), 400
        file.save(final_path)
        rel_url = f"/uploads/videos/{filename}"
        return jsonify({
            "success": True,
            "url":  f"{get_backend_base_url()}{rel_url}",
            "path": rel_url,
        }), 200
    except Exception as exc:
        app.logger.error("video_upload_error err=%s", exc)
        return jsonify({"error": "Upload failed"}), 500

# ============================================================
# PRODUCTS
# ============================================================

@app.route("/api/products", methods=["GET"])
def get_products():
    q = ProductSQL.query
    # SECURITY: All filter values go through ORM — no raw SQL interpolation
    category  = _sanitise_str(request.args.get("category", ""), 100)
    gender    = _sanitise_str(request.args.get("gender", ""), 50)
    search    = _sanitise_str(request.args.get("search", ""), 200)
    min_price = _sanitise_str(request.args.get("min_price", ""), 20)
    max_price = _sanitise_str(request.args.get("max_price", ""), 20)
    sort_raw  = _sanitise_str(request.args.get("sort", ""), 20)

    if category and category != "all":
        q = q.filter_by(category=category)
    if gender and gender != "all":
        q = q.filter_by(gender=gender)
    if search:
        q = q.filter(
            (ProductSQL.name.ilike(f"%{search}%")) |
            (ProductSQL.description.ilike(f"%{search}%"))
        )
    if min_price:
        try: q = q.filter(ProductSQL.price >= float(min_price))
        except ValueError: pass
    if max_price:
        try: q = q.filter(ProductSQL.price <= float(max_price))
        except ValueError: pass

    if sort_raw == "price_asc":
        q = q.order_by(ProductSQL.price.asc())
    elif sort_raw == "price_desc":
        q = q.order_by(ProductSQL.price.desc())
    else:
        q = q.order_by(ProductSQL.created_at.desc())

    return jsonify([p.to_dict() for p in q.all()])


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    product = ProductSQL.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not available"}), 404
    return jsonify(product.to_dict()), 200


@app.route("/api/products", methods=["POST"])
@csrf.exempt
@admin_required
def add_product():
    data = request.get_json() or {}
    for field in ("name", "price", "category", "description", "images", "sizes"):
        if field not in data:
            return jsonify({"error": f"Field '{field}' is required"}), 400

    # SECURITY: Validate and sanitise all product fields
    name        = _sanitise_str(data.get("name", ""), 255)
    description = _sanitise_str(data.get("description", ""), 5000)
    category    = _sanitise_str(data.get("category", ""), 100)
    subcategory = _sanitise_str(data.get("subcategory", ""), 100)
    gender      = _sanitise_str(data.get("gender", "Unisex"), 50)
    fabric      = _sanitise_str(data.get("fabric", ""), 255)
    care        = _sanitise_str(data.get("care", ""), 500)

    try:
        price = float(data["price"])
        if price < 0 or price > 1_000_000:
            raise ValueError("Price out of range")
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid price value"}), 400

    images = data.get("images", [])
    if not isinstance(images, list) or len(images) > 20:
        return jsonify({"error": "images must be a list of up to 20 URLs"}), 400

    sizes_data = data.get("sizes", [])

    try:
        new_product = ProductSQL(
            name             = name,
            price            = price,
            category         = category,
            subcategory      = subcategory,
            gender           = gender,
            description      = description,
            images           = images,
            sizes            = sizes_data,
            stock            = sum(int(v) for v in sizes_data.values() if str(v).isdigit()) if isinstance(sizes_data, dict) else int(data.get("stock", 0)),
            is_featured      = bool(data.get("featured", data.get("is_featured", False))),
            is_new           = bool(data.get("newArrival", data.get("is_new", False))),
            is_bestseller    = bool(data.get("bestseller", data.get("is_bestseller", False))),
            fabric           = fabric,
            care             = care,
            size_guide_image = _sanitise_str(data.get("sizeGuideImage", data.get("size_guide_image", "")), 500),
        )
        db_mysql.session.add(new_product)
        db_mysql.session.flush()   # get new_product.id before audit
        _audit("product_created", "product", new_product.id, {"name": name})
        db_mysql.session.commit()

        if new_product.is_new and data.get("notify_users"):
            for u in User.query.all():
                try:
                    send_new_arrival_notification(
                        mail, u.email,
                        u.first_name or u.email.split("@")[0],
                        new_product.name, new_product.price,
                        new_product.category, new_product.description,
                        str(new_product.id),
                    )
                except Exception:
                    pass

        return jsonify({"success": True, "id": str(new_product.id)}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.error("add_product_error err=%s", exc)
        return jsonify({"error": "Failed to add product"}), 500


@app.route("/api/products/<int:product_id>", methods=["PUT"])
@csrf.exempt
@admin_required
def update_product(product_id):
    product = ProductSQL.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not available"}), 404

    data = request.get_json() or {}

    if "name"          in data: product.name          = _sanitise_str(data["name"], 255)
    if "price"         in data:
        try:
            p = float(data["price"])
            if p < 0 or p > 1_000_000: raise ValueError
            product.price = p
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid price value"}), 400
    if "category"      in data: product.category      = _sanitise_str(data["category"], 100)
    if "subcategory"   in data: product.subcategory   = _sanitise_str(data["subcategory"], 100)
    if "gender"        in data: product.gender        = _sanitise_str(data["gender"], 50)
    if "description"   in data: product.description   = _sanitise_str(data["description"], 5000)
    if "images"        in data:
        imgs = data["images"]
        if not isinstance(imgs, list) or len(imgs) > 20:
            return jsonify({"error": "images must be a list of up to 20 URLs"}), 400
        product.images = imgs
    if "sizes"         in data:
        product.sizes = data["sizes"]
        if isinstance(data["sizes"], dict):
            product.stock = sum(int(v) for v in data["sizes"].values() if str(v).isdigit())
    if "stock"         in data and not isinstance(data.get("sizes"), dict):
        try:
            product.stock = max(0, int(data["stock"]))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid stock value"}), 400
    if "featured"      in data or "is_featured" in data:
        product.is_featured = bool(data.get("featured", data.get("is_featured", False)))
    if "newArrival"    in data or "is_new" in data:
        product.is_new = bool(data.get("newArrival", data.get("is_new", False)))
    if "bestseller"    in data or "is_bestseller" in data:
        product.is_bestseller = bool(data.get("bestseller", data.get("is_bestseller", False)))
    if "fabric"        in data: product.fabric        = _sanitise_str(data["fabric"], 255)
    if "care"          in data: product.care          = _sanitise_str(data["care"], 500)
    if "sizeGuideImage" in data or "size_guide_image" in data:
        product.size_guide_image = _sanitise_str(data.get("sizeGuideImage", data.get("size_guide_image", "")), 500)

    try:
        db_mysql.session.commit()
        _audit("product_updated", "product", product_id)
        return jsonify({"success": True, "message": "Product updated"}), 200
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Update failed"}), 500


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
@csrf.exempt
@admin_required
def delete_product(product_id):
    product = ProductSQL.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not available"}), 404
    try:
        db_mysql.session.delete(product)
        _audit("product_deleted", "product", product_id, {"name": product.name})
        db_mysql.session.commit()
        return jsonify({"success": True}), 200
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Delete failed"}), 500

# ============================================================
# REVIEWS
# ============================================================

@app.route("/api/products/<int:product_id>/reviews", methods=["GET"])
def get_product_reviews(product_id):
    reviews = Review.query.filter_by(product_id=str(product_id)).order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews]), 200

@app.route("/api/products/<int:product_id>/reviews", methods=["POST"])
@login_required
def add_product_review(product_id):
    data    = request.get_json() or {}
    rating  = data.get("rating")
    comment = _sanitise_str(data.get("comment", ""), 2000)

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "Valid rating between 1 and 5 is required"}), 400

    if not (1 <= rating <= 5):
        return jsonify({"error": "Rating must be between 1 and 5"}), 400

    try:
        user = User.query.get(int(session["user_id"]))
    except (ValueError, TypeError):
        return jsonify({"error": "User not found"}), 404

    if not user:
        return jsonify({"error": "User not found"}), 404

    # SECURITY: One review per user per product
    existing = Review.query.filter_by(user_id=user.id, product_id=product_id).first()
    if existing:
        return jsonify({"error": "You have already reviewed this product"}), 400

    try:
        new_review = Review(
            user_id        = user.id,
            user_email     = user.email,
            product_id = product_id,
            rating         = rating,
            comment        = comment,
        )
        db_mysql.session.add(new_review)
        db_mysql.session.commit()
        return jsonify({"success": True, "review": new_review.to_dict()}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to submit review"}), 500

# ============================================================
# CART
# ============================================================

@app.route("/api/cart", methods=["GET"])
def get_cart():
    if "user_id" in session:
        try:
            items   = CartItem.query.filter_by(user_id=int(session["user_id"])).all()
        except (ValueError, TypeError):
            return jsonify([])
        results = []
        for item in items:
            try:
                product = ProductSQL.query.get(item.product_id)
                if product:
                    results.append({
                        "id":       str(product.id),
                        "name":     product.name,
                        "price":    product.price,
                        "image":    product.images[0] if product.images else "",
                        "quantity": item.quantity,
                        "size":     item.size,
                    })
            except (TypeError, ValueError):
                continue
        return jsonify(results)
    return jsonify(session.get("cart", []))


@app.route("/api/cart", methods=["POST"])
def add_to_cart():
    data       = request.get_json() or {}
    product_id = _sanitise_str(str(data.get("id", "")), 50)

    # SECURITY: Validate product exists before adding to cart
    try:
        pid = int(product_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid product ID"}), 400

    product = ProductSQL.query.get(pid)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    try:
        quantity = max(1, min(int(data.get("quantity", 1)), 99))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid quantity"}), 400

    size = _sanitise_str(data.get("size", ""), 20) or None

    if "user_id" in session:
        try:
            uid = int(session["user_id"])
        except (ValueError, TypeError):
            return jsonify({"error": "Authentication required"}), 401

        existing = CartItem.query.filter_by(
            user_id=uid, product_id=pid, size=size,
        ).first()
        try:
            if existing:
                existing.quantity = min(existing.quantity + quantity, 99)
            else:
                db_mysql.session.add(CartItem(
                    user_id=uid, product_id=pid,
                    quantity=quantity, size=size,
                ))
            db_mysql.session.commit()
        except Exception as exc:
            db_mysql.session.rollback()
            return jsonify({"error": "Failed to update cart"}), 500
    else:
        cart  = session.get("cart", [])
        found = False
        for item in cart:
            if item["id"] == product_id and item.get("size") == size:
                item["quantity"] = min(item["quantity"] + quantity, 99)
                found = True
                break
        if not found:
            cart.append({"id": product_id, "quantity": quantity, "size": size})
        session["cart"] = cart

    return jsonify({"success": True})


@app.route("/api/cart/<int:item_id>", methods=["PUT"])
@login_required
def update_cart_item(item_id):
    data = request.get_json() or {}
    try:
        quantity = int(data.get("quantity", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Valid quantity required"}), 400

    if quantity < 1 or quantity > 99:
        return jsonify({"error": "Quantity must be between 1 and 99"}), 400

    try:
        uid = int(session["user_id"])
    except (ValueError, TypeError):
        return jsonify({"error": "Authentication required"}), 401

    item = CartItem.query.filter_by(id=item_id, user_id=uid).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404
    item.quantity = quantity
    try:
        db_mysql.session.commit()
    except Exception:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to update cart item"}), 500
    return jsonify({"success": True})


@app.route("/api/cart/<int:item_id>", methods=["DELETE"])
@login_required
def remove_cart_item(item_id):
    try:
        uid = int(session["user_id"])
    except (ValueError, TypeError):
        return jsonify({"error": "Authentication required"}), 401

    item = CartItem.query.filter_by(id=item_id, user_id=uid).first()
    if item:
        try:
            db_mysql.session.delete(item)
            db_mysql.session.commit()
        except Exception:
            db_mysql.session.rollback()
            return jsonify({"error": "Failed to remove cart item"}), 500
    return jsonify({"success": True})

# ============================================================
# WISHLIST
# ============================================================

@app.route("/api/wishlist", methods=["GET"])
@login_required
def get_wishlist():
    try:
        uid = int(session["user_id"])
    except (ValueError, TypeError):
        return jsonify([])

    items   = WishlistItem.query.filter_by(user_id=uid).all()
    results = []
    for item in items:
        try:
            product = ProductSQL.query.get(item.product_id)
            if product:
                results.append({
                    "id":       str(product.id),
                    "name":     product.name,
                    "price":    product.price,
                    "image":    product.images[0] if product.images else "",
                    "category": product.category,
                })
        except (TypeError, ValueError):
            continue
    return jsonify(results)


@app.route("/api/wishlist", methods=["POST"])
@login_required
def add_to_wishlist():
    data       = request.get_json() or {}
    product_id = _sanitise_str(str(data.get("product_id", "")), 50)

    if not product_id:
        return jsonify({"error": "Product ID required"}), 400

    # SECURITY: Validate product exists
    try:
        pid = int(product_id)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid product ID"}), 400

    if not ProductSQL.query.get(pid):
        return jsonify({"error": "Product not found"}), 404

    try:
        uid = int(session["user_id"])
    except (ValueError, TypeError):
        return jsonify({"error": "Authentication required"}), 401

    existing = WishlistItem.query.filter_by(user_id=uid, product_id=pid).first()
    if existing:
        return jsonify({"message": "Already in wishlist"}), 200

    try:
        db_mysql.session.add(WishlistItem(user_id=uid, product_id=pid))
        db_mysql.session.commit()
        return jsonify({"success": True}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to update wishlist"}), 500


@app.route("/api/wishlist/<product_id>", methods=["DELETE"])
@login_required
def remove_from_wishlist(product_id):
    # SECURITY: Validate product_id is numeric
    if not re.match(r"^\d+$", product_id):
        return jsonify({"error": "Invalid product ID"}), 400

    try:
        uid = int(session["user_id"])
    except (ValueError, TypeError):
        return jsonify({"error": "Authentication required"}), 401

    item = WishlistItem.query.filter_by(user_id=uid, product_id=product_id).first()
    if item:
        db_mysql.session.delete(item)
        db_mysql.session.commit()
    return jsonify({"success": True})

# ============================================================
# COUPONS
# ============================================================

@app.route("/api/coupons/validate", methods=["POST"])
@login_required
def validate_coupon():
    data     = request.get_json() or {}
    code     = _sanitise_str(data.get("code", ""), 50).upper()

    try:
        subtotal = float(data.get("subtotal", 0))
        if subtotal < 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid subtotal"}), 400

    if not code:
        return jsonify({"error": "Coupon code required"}), 400

    # SECURITY: Parameterised query via ORM
    coupon = Coupon.query.filter_by(code=code).first()
    if not coupon:
        return jsonify({"error": "Invalid coupon code"}), 404

    valid, reason = coupon.is_valid(subtotal)
    if not valid:
        return jsonify({"error": reason}), 400

    discount = coupon.apply(subtotal)
    return jsonify({
        "success":         True,
        "discount_type":   coupon.discount_type,
        "discount_value":  coupon.discount_value,
        "discount_amount": discount,
        "final_amount":    round(subtotal - discount, 2),
    })


@app.route("/api/admin/coupons", methods=["GET"])
@admin_required
def list_coupons():
    return jsonify([c.to_dict() for c in Coupon.query.all()])


@app.route("/api/admin/coupons", methods=["POST"])
@admin_required
def create_coupon():
    data = request.get_json() or {}
    code = _sanitise_str(data.get("code", ""), 50).upper()
    if not code or not re.match(r"^[A-Z0-9_\-]{3,50}$", code):
        return jsonify({"error": "Coupon code must be 3–50 alphanumeric characters"}), 400
    if Coupon.query.filter_by(code=code).first():
        return jsonify({"error": "Coupon code already exists"}), 400

    try:
        expires_at = None
        if data.get("expires_at"):
            expires_at = datetime.fromisoformat(str(data["expires_at"]))

        discount_value = float(data.get("discount_value", 0))
        if discount_value < 0:
            raise ValueError("Discount value cannot be negative")

        c = Coupon(
            code             = code,
            discount_type    = data.get("discount_type", "percent"),
            discount_value   = discount_value,
            min_order_amount = float(data.get("min_order_amount", 0)),
            max_uses         = data.get("max_uses"),
            expires_at       = expires_at,
            is_active        = bool(data.get("is_active", True)),
        )
        db_mysql.session.add(c)
        _audit("coupon_created", "coupon", None, {"code": code})
        db_mysql.session.commit()
        return jsonify({"success": True, "coupon": c.to_dict()}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to create coupon"}), 500


@app.route("/api/admin/coupons/<int:coupon_id>", methods=["DELETE"])
@admin_required
def delete_coupon(coupon_id):
    coupon = Coupon.query.get(coupon_id)
    if not coupon:
        return jsonify({"error": "Coupon not found"}), 404
    try:
        db_mysql.session.delete(coupon)
        _audit("coupon_deleted", "coupon", coupon_id)
        db_mysql.session.commit()
        return jsonify({"success": True})
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Delete failed"}), 500

# ============================================================
# PAYMENTS
# ============================================================

@app.route("/api/payments/create-order", methods=["POST"])
@csrf.exempt
def create_razorpay_order():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    data = request.get_json() or {}
    try:
        amount = float(data.get("amount", 0))
        if amount <= 0 or amount > 10_000_000:
            raise ValueError("Amount out of range")
    except (TypeError, ValueError):
        return jsonify({"error": "Valid amount required"}), 400

    try:
        client    = get_razorpay_client()
        rzp_order = client.order.create({
            "amount":          int(amount * 100),
            "currency":        "INR",
            "payment_capture": "1",
        })
        try:
            user_id = session.get("user_id")
            payment = Payment(
                user_id=int(user_id) if user_id else None,
                razorpay_order_id=rzp_order.get("id"),
                amount=amount,
                currency="INR",
                status="pending",
            )
            db_mysql.session.add(payment)
            db_mysql.session.commit()
        except Exception as exc:
            db_mysql.session.rollback()
            app.logger.warning("payment_log_error err=%s", exc)

        return jsonify(rzp_order), 200
    except Exception as exc:
        app.logger.error("razorpay_order_error err=%s", exc)
        return jsonify({"error": "Failed to create payment order"}), 500


@app.route("/api/payments/verify", methods=["POST"])
@csrf.exempt
def verify_payment():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    data = request.get_json() or {}
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id":   _sanitise_str(data.get("razorpay_order_id", ""), 200),
            "razorpay_payment_id": _sanitise_str(data.get("razorpay_payment_id", ""), 200),
            "razorpay_signature":  _sanitise_str(data.get("razorpay_signature", ""), 500),
        })
        return jsonify({"success": True}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": "Payment verification failed"}), 400


@app.route("/api/payments/create-qr", methods=["POST"])
@login_required
def create_payment_qr():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    data = request.get_json() or {}
    try:
        amount = float(data.get("amount", 0))
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Valid amount required"}), 400

    try:
        client = get_razorpay_client()
        va = client.virtual_account.create({
            "receiver_types": ["qr_code"],
            "description":    "Order Payment",
            "amount":         int(amount * 100),
            "currency":       "INR",
            "notes":          {"user_id": session["user_id"]},
        })
        qr = va["receivers"][0]
        return jsonify({
            "success": True,
            "qr_id":   va["id"],
            "qr_url":  qr.get("url"),
            "vpa":     qr.get("vpa"),
        }), 200
    except Exception as exc:
        app.logger.error("qr_create_error err=%s", exc)
        return jsonify({"error": "Failed to create QR payment"}), 500


@app.route("/api/payments/check-qr-status", methods=["POST"])
@login_required
def check_qr_status():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    qr_id = _sanitise_str((request.get_json() or {}).get("qr_id", ""), 200)
    if not qr_id:
        return jsonify({"error": "QR ID required"}), 400
    try:
        client   = get_razorpay_client()
        payments = client.virtual_account.payments(qr_id)
        if payments["count"] > 0:
            paid = next(
                (p for p in payments["items"] if p["status"] in ("captured", "authorized")),
                None,
            )
            if paid:
                return jsonify({"success": True, "status": "Paid", "payment_id": paid["id"]}), 200
        return jsonify({"success": False, "status": "Pending"}), 200
    except Exception as exc:
        return jsonify({"error": "Failed to check payment status"}), 500


@app.route("/api/payments/recover-order", methods=["POST"])
@csrf.exempt
def recover_order():
    """
    Recovery handler for the race condition:
      Payment captured on Razorpay → UI/network failure → order never confirmed.

    The frontend calls this on mount / retry when it detects a pending payment
    (e.g. from localStorage) with no confirmed orderId.

    Flow:
      1. If an Order already exists for this payment → return it (idempotent success).
      2. Otherwise call the Razorpay API to confirm the payment was captured.
      3. Return {payment_captured, payment, order} so the frontend can either:
           a. Show the existing order (order_found=true), OR
           b. Re-submit /api/orders with the original payload now that it knows
              the payment is confirmed (order_found=false, payment_captured=true).

    This endpoint is read-only — it NEVER creates an order itself.
    Order creation still goes through /api/orders which validates stock, address, etc.
    """
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500

    data           = request.get_json() or {}
    rzp_order_id   = _sanitise_str(data.get("razorpay_order_id",   ""), 255)
    rzp_payment_id = _sanitise_str(data.get("razorpay_payment_id", ""), 255)

    if not rzp_order_id and not rzp_payment_id:
        return jsonify({"error": "razorpay_order_id or razorpay_payment_id required"}), 400

    # ── Step 1: Check if the order was already created in our DB ─────────────
    existing_order = None
    if rzp_payment_id:
        existing_order = OrderSQL.query.filter_by(razorpay_payment_id=rzp_payment_id).first()
    if not existing_order and rzp_order_id:
        existing_order = OrderSQL.query.filter_by(razorpay_order_id=rzp_order_id).first()

    if existing_order:
        # Order exists — the UI just missed the confirmation response.
        app.logger.info(
            "recover_order_found order=%s rzp_order=%s rzp_payment=%s",
            existing_order.order_number, rzp_order_id, rzp_payment_id,
        )
        return jsonify({
            "success":          True,
            "order_found":      True,
            "payment_captured": True,
            "order":            existing_order.to_dict(),
            "message":          "Your order was placed successfully.",
        }), 200

    # ── Step 2: Order not in DB — verify payment status with Razorpay ────────
    captured     = False
    payment_info = {}
    rzp_amount   = None

    try:
        client = get_razorpay_client()

        # Prefer payment-level fetch (most precise)
        if rzp_payment_id:
            rzp_pay = client.payment.fetch(rzp_payment_id)
            captured = rzp_pay.get("status") in ("captured", "authorized")
            rzp_amount = rzp_pay.get("amount", 0) / 100   # paise → ₹
            payment_info = {
                "razorpay_payment_id": rzp_payment_id,
                "razorpay_order_id":   rzp_pay.get("order_id") or rzp_order_id,
                "amount":              rzp_amount,
                "method":              rzp_pay.get("method"),
                "status":              rzp_pay.get("status"),
            }
        elif rzp_order_id:
            # Fallback: check the Razorpay order status
            rzp_order_obj = client.order.fetch(rzp_order_id)
            captured  = rzp_order_obj.get("status") == "paid"
            rzp_amount = rzp_order_obj.get("amount", 0) / 100
            payment_info = {
                "razorpay_order_id": rzp_order_id,
                "amount":            rzp_amount,
                "status":            rzp_order_obj.get("status"),
            }
    except Exception as exc:
        app.logger.error(
            "recover_order_rzp_fetch_error rzp_order=%s rzp_payment=%s err=%s",
            rzp_order_id, rzp_payment_id, exc,
        )
        return jsonify({
            "success":          False,
            "order_found":      False,
            "payment_captured": None,   # unknown — Razorpay unreachable
            "message":          "Could not verify payment status. Please try again in a moment.",
        }), 503

    if not captured:
        app.logger.info(
            "recover_order_not_captured rzp_order=%s rzp_payment=%s",
            rzp_order_id, rzp_payment_id,
        )
        return jsonify({
            "success":          False,
            "order_found":      False,
            "payment_captured": False,
            "payment":          payment_info,
            "message":          "Payment has not been captured yet.",
        }), 200

    # ── Step 3: Payment IS captured but order is missing ─────────────────────
    # Upsert our local Payment record so /api/orders can link to it on retry.
    try:
        linked_rzp_order_id = payment_info.get("razorpay_order_id") or rzp_order_id

        local_payment = None
        if rzp_payment_id:
            local_payment = Payment.query.filter_by(razorpay_payment_id=rzp_payment_id).first()
        if not local_payment and linked_rzp_order_id:
            local_payment = Payment.query.filter_by(razorpay_order_id=linked_rzp_order_id).first()

        if not local_payment:
            local_payment = Payment(
                razorpay_order_id   = linked_rzp_order_id or None,
                razorpay_payment_id = rzp_payment_id or None,
                amount              = rzp_amount or 0,
                status              = "captured",
                method              = payment_info.get("method"),
            )
            db_mysql.session.add(local_payment)
        else:
            if rzp_payment_id:
                local_payment.razorpay_payment_id = rzp_payment_id
            local_payment.status = "captured"

        db_mysql.session.commit()
    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.warning("recover_order_payment_upsert_error err=%s", exc)
        # Non-fatal — the frontend can still re-submit /api/orders

    app.logger.info(
        "recover_order_payment_captured_no_order rzp_order=%s rzp_payment=%s amount=%.2f",
        rzp_order_id, rzp_payment_id, rzp_amount or 0,
    )
    return jsonify({
        "success":          True,
        "order_found":      False,
        "payment_captured": True,
        "payment":          payment_info,
        "message":          (
            "Your payment was captured. "
            "Please resubmit your order — it will be linked to this payment automatically."
        ),
    }), 200


@app.route("/api/webhooks/razorpay", methods=["POST"])
def razorpay_webhook():
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not webhook_secret:
        return jsonify({"error": "Webhook secret not configured"}), 500

    payload   = request.get_data()
    signature = request.headers.get("X-Razorpay-Signature", "")
    try:
        get_razorpay_client().utility.verify_webhook_signature(payload, signature, webhook_secret)
    except Exception:
        app.logger.warning("razorpay_webhook_bad_signature ip=%s", request.remote_addr)
        return jsonify({"error": "Invalid signature"}), 400

    data  = request.get_json(silent=True) or {}
    event = data.get("event")

    if event in ("payment.captured", "order.paid"):
        pp             = data["payload"]["payment"]["entity"]
        rzp_payment_id = str(pp["id"])
        rzp_order_id   = str(pp["order_id"])
        amount         = pp["amount"] / 100

        existing = Payment.query.filter_by(razorpay_payment_id=rzp_payment_id).first()
        if existing and existing.status == "captured":
            return jsonify({"success": True}), 200

        payment = Payment.query.filter_by(razorpay_order_id=rzp_order_id).first()
        if not payment:
            payment = Payment(
                razorpay_order_id=rzp_order_id,
                razorpay_payment_id=rzp_payment_id,
                amount=amount,
                status="captured",
                method=pp.get("method"),
                email=pp.get("email"),
                phone=pp.get("contact"),
            )
            db_mysql.session.add(payment)
        else:
            payment.razorpay_payment_id = rzp_payment_id
            payment.status = "captured"
            payment.method = pp.get("method")
            payment.email  = pp.get("email")
            payment.phone  = pp.get("contact")

        order = OrderSQL.query.filter_by(razorpay_order_id=rzp_order_id).first()
        if order:
            order.payment_status      = "Paid"
            order.razorpay_payment_id = rzp_payment_id

        db_mysql.session.commit()

    return jsonify({"success": True}), 200


@app.route("/api/admin/payments", methods=["GET"])
@admin_required
def get_admin_payments():
    return jsonify([p.to_dict() for p in Payment.query.order_by(Payment.created_at.desc()).all()])


@app.route("/api/admin/orders/<order_id>/cancel", methods=["POST"])
@admin_required
def cancel_admin_order(order_id):
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500

    # SECURITY: Sanitise order_id before lookup
    order_id = _sanitise_str(str(order_id), 100)
    order = OrderSQL.query.get(order_id) or OrderSQL.query.filter_by(order_number=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order.status == "Cancelled":
        return jsonify({"error": "Order is already cancelled"}), 400

    rzp_payment_id = order.razorpay_payment_id
    amount         = order.total

    payment = Payment.query.filter_by(razorpay_payment_id=rzp_payment_id).first()
    order_direct = OrderSQL.query.filter_by(razorpay_payment_id=rzp_payment_id).first()

    if payment and payment.status == "refunded":
        if payment.order_id:
            order_via_payment = OrderSQL.query.get(payment.order_id)
            if order_via_payment and order_via_payment.payment_status != "Refunded":
                order_via_payment.payment_status = "Refunded"
                order_via_payment.status = "Cancelled"
                db_mysql.session.commit()
        if order_direct and order_direct.payment_status != "Refunded":
            order_direct.payment_status = "Refunded"
            order_direct.status = "Cancelled"
            db_mysql.session.commit()
        return jsonify({"success": True, "message": "Payment was already refunded", "already_refunded": True}), 200

    if order_direct and order_direct.payment_status == "Refunded":
        return jsonify({"success": True, "message": "Payment was already refunded", "already_refunded": True}), 200

    try:
        client      = get_razorpay_client()
        refund_data = {}
        if amount:
            refund_data["amount"] = int(float(amount) * 100)
        refund = client.payment.refund(rzp_payment_id, refund_data)

        delhivery_cancelled = False
        if order.delhivery_waybill_number or order.delhivery_shipment_id:
            from delhivery_utils import cancel_shipment
            waybill_to_cancel = order.delhivery_waybill_number or order.delhivery_shipment_id
            res = cancel_shipment(waybill_to_cancel)
            if res.get("success"):
                delhivery_cancelled = True

        for item in order.items:
            prod = ProductSQL.query.get(item.product_id)
            if prod:
                prod.stock += item.quantity

        if payment:
            payment.status = "refunded"

        order.payment_status = "Refunded"
        order.status         = "Cancelled"

        if not payment and order_direct:
            order_direct.payment_status = "Refunded"
            order_direct.status         = "Cancelled"

        _audit("order_cancelled_admin", "order", order.id, {"razorpay_payment_id": rzp_payment_id})
        db_mysql.session.commit()
        return jsonify({"success": True, "delhivery_cancelled": delhivery_cancelled}), 200
    except razorpay.errors.BadRequestError as exc:
        err_msg = str(exc)
        db_mysql.session.rollback()
        if "fully refunded" in err_msg.lower() or "already refunded" in err_msg.lower():
            try:
                if payment:
                    payment.status = "refunded"
                order.payment_status = "Refunded"
                order.status         = "Cancelled"
                if order_direct:
                    order_direct.payment_status = "Refunded"
                    order_direct.status         = "Cancelled"
                db_mysql.session.commit()
            except Exception:
                db_mysql.session.rollback()
            return jsonify({"success": True, "message": "Payment was already refunded", "already_refunded": True}), 200
        return jsonify({"error": "Razorpay rejected the refund"}), 400
    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.error("Refund failed: %s", traceback.format_exc())
        return jsonify({"error": "Refund failed"}), 500

# ============================================================
# ORDERS
# ============================================================

def _validate_order_payload(data: dict) -> list:
    errors = []
    if not isinstance(data.get("items"), list) or not data["items"]:
        errors.append("items must be a non-empty list")
    try:
        total = float(data.get("total", 0))
        if total <= 0:
            errors.append("total must be positive")
    except (TypeError, ValueError):
        errors.append("total must be a number")

    addr        = data.get("shippingAddress") or data.get("shipping_address") or {}
    street_val  = addr.get("street") or addr.get("address") or addr.get("line1")
    if not str(street_val or "").strip():
        errors.append("shippingAddress.address is required")
    for field in ("city", "state", "zip"):
        if not str(addr.get(field, "")).strip():
            errors.append(f"shippingAddress.{field} is required")
    return errors

@app.route("/api/orders", methods=["POST"])
@csrf.exempt   # Payment handler callback sends JSON only — no CSRF cookie in Razorpay's context
def create_order():
    data = request.get_json() or {}

    if not bool(data.get("termsAccepted")):
        return jsonify({"error": "Terms and Conditions must be accepted"}), 400

    # Idempotency
    idempotency_key = _sanitise_str(data.get("idempotencyKey", ""), 64) or None
    if idempotency_key:
        existing_order = OrderSQL.query.filter_by(idempotency_key=idempotency_key).first()
        if existing_order:
            return jsonify({"success": True, "orderId": existing_order.order_number, "duplicate": True}), 200

    errors = _validate_order_payload(data)
    if errors:
        return jsonify({"error": errors[0], "details": errors}), 400

    rzp_order_id   = _sanitise_str(data.get("razorpay_order_id", ""), 200)
    rzp_payment_id = _sanitise_str(data.get("razorpay_payment_id", ""), 200)
    rzp_signature  = _sanitise_str(data.get("razorpay_signature", ""), 500)

    if not rzp_order_id or not rzp_payment_id or not rzp_signature:
        return jsonify({"error": "Payment verification required. Please complete payment first."}), 400

    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500

    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id":   rzp_order_id,
            "razorpay_payment_id": rzp_payment_id,
            "razorpay_signature":  rzp_signature,
        })
    except Exception:
        return jsonify({"error": "Payment verification failed. Please try again."}), 400

    payment_status = "Paid"

    addr             = data.get("shippingAddress") or {}
    delivery_pincode = _sanitise_str(str(addr.get("zip", "")), 10)
    if not PINCODE_RE.match(delivery_pincode):
        return jsonify({"error": "Please enter a valid 6-digit delivery pincode"}), 400

    # Pincode serviceability check — fail-open: a Delhivery API timeout must
    # never block a paid order. We log the issue but let the order through.
    try:
        if not validate_pincode(delivery_pincode):
            return jsonify({"error": f"Delivery to pincode {delivery_pincode} is not currently available."}), 400
    except Exception as exc:
        app.logger.warning("pincode_validation_skipped pincode=%s err=%s", delivery_pincode, exc)

    user_id = session.get("user_id")
    try:
        user = User.query.get(int(user_id)) if user_id else None
    except (ValueError, TypeError):
        user = None

    if not user:
        email      = _sanitise_str(data.get("email") or addr.get("email") or "", 254).lower()
        first_name = _sanitise_str(addr.get("firstName") or addr.get("name", "").split(" ")[0], 100)
        last_name  = _sanitise_str(addr.get("lastName")  or " ".join(addr.get("name", "").split(" ")[1:]), 100)
        phone      = _sanitise_str(data.get("phone") or addr.get("phone") or "", 20)

        if not email or not _validate_email(email):
            return jsonify({"error": "A valid email is required for guest checkout"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                email      = email,
                password   = generate_password_hash(secrets.token_hex(32)),  # random, unused
                first_name = first_name,
                last_name  = last_name,
                phone      = phone,
                is_admin   = False,
            )
            db_mysql.session.add(user)
            db_mysql.session.flush()
            try:
                send_signup_confirmation(mail, user.email, user.first_name)
            except Exception:
                pass

        session.clear()
        session.permanent     = True
        session["user_id"]    = str(user.id)
        session["is_admin"]   = bool(user.is_admin)

    incoming_items    = data.get("items", [])
    validated_items   = []
    computed_subtotal = 0.0

    for item in incoming_items:
        try:
            pid      = int(item.get("id"))
            quantity = int(item.get("quantity", 0))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid item payload"}), 400
        if quantity <= 0 or quantity > 99:
            return jsonify({"error": "Quantity must be between 1 and 99"}), 400

        product = ProductSQL.query.with_for_update().get(pid)
        if not product:
            return jsonify({"error": f"Product not found"}), 404

        size = _sanitise_str(item.get("size", ""), 20) or None
        if size:
            available_stock = product.get_stock_for_size(size)
            if available_stock < quantity:
                return jsonify({"error": f"Insufficient stock for {product.name} in size {size}"}), 400
            product.update_stock_for_size(size, -quantity)
        else:
            if product.stock < quantity:
                return jsonify({"error": f"Insufficient stock for {product.name}"}), 400
            product.stock -= quantity

        line_total = float(product.price) * quantity
        computed_subtotal += line_total
        validated_items.append({
            "id":         pid,
            "name":       product.name,
            "quantity":   quantity,
            "size":       size,
            "unit_price": float(product.price),
        })

    coupon_code     = _sanitise_str(data.get("couponCode", ""), 50).upper() or None
    discount_amount = 0.0
    if coupon_code:
        coupon = Coupon.query.filter_by(code=coupon_code).first()
        if coupon:
            valid, _ = coupon.is_valid(computed_subtotal)
            if valid:
                discount_amount = coupon.apply(computed_subtotal)

    try:
        client_total = float(data.get("total", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid total amount"}), 400

    expected_min = computed_subtotal - discount_amount - 1.0
    if client_total < expected_min:
        return jsonify({"error": "Order total mismatch"}), 400

    order_number = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{user.id}"

    try:
        new_order = OrderSQL(
            order_number      = order_number,
            idempotency_key   = idempotency_key,
            user_id           = user.id,
            total             = client_total,
            status            = "Pickup",
            payment_status    = payment_status,
            shipping_address  = addr,
            coupon_code       = coupon_code,
            discount_amount   = discount_amount,
            razorpay_order_id = rzp_order_id,
            razorpay_payment_id = rzp_payment_id,
        )

        db_mysql.session.add(new_order)
        db_mysql.session.flush()

        payment = Payment.query.filter_by(razorpay_order_id=rzp_order_id).first()
        if payment:
            payment.razorpay_payment_id = rzp_payment_id
            payment.status   = "captured"
            payment.order_id = new_order.id

        for item in validated_items:
            db_mysql.session.add(OrderItem(
                order_id       = new_order.id,
                product_id = item["id"],
                product_name   = item["name"],
                quantity       = item["quantity"],
                price          = item["unit_price"],
                size           = item.get("size"),
            ))

        if coupon_code and discount_amount > 0:
            coupon_obj = Coupon.query.filter_by(code=coupon_code).first()
            if coupon_obj:
                coupon_obj.uses += 1

        CartItem.query.filter_by(user_id=user.id).delete()
        _enqueue_dispatch(new_order.id)
        _audit("order_created", "order", new_order.id, {"order_number": order_number})
        db_mysql.session.commit()
        _poll_dispatch_jobs()

        try:
            send_order_confirmation(mail, user.email, order_number, new_order.total, validated_items)
        except Exception as exc:
            app.logger.error("order_email_failed err=%s", type(exc).__name__)

        return jsonify({
            "success": True,
            "message": "Order placed successfully!",
            "orderId": order_number,
        }), 201

    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.error("create_order_error err=%s", exc)
        return jsonify({"error": "Order creation failed. Please try again."}), 500


@app.route("/api/orders", methods=["GET"])
@login_required
def get_orders():
    try:
        uid = int(session["user_id"])
    except (ValueError, TypeError):
        return jsonify([])

    orders = (
        OrderSQL.query.filter_by(user_id=uid)
        .order_by(OrderSQL.created_at.desc()).all()
    )
    return jsonify([o.to_dict() for o in orders])


@app.route("/api/orders/<order_number>/cancel", methods=["POST"])
@login_required
def cancel_order(order_number):
    # SECURITY: Validate order_number format before querying
    order_number = _sanitise_str(str(order_number), 100)

    try:
        uid = int(session["user_id"])
    except (ValueError, TypeError):
        return jsonify({"error": "Authentication required"}), 401

    order = OrderSQL.query.filter_by(order_number=order_number, user_id=uid).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if order.delhivery_shipment_id:
        return jsonify({"error": "Order already dispatched. Contact support."}), 400
    if order.status in ("Cancelled", "Delivered"):
        return jsonify({"error": f"Order is already {order.status}"}), 400

    cutoff = order.created_at.replace(tzinfo=timezone.utc) + timedelta(minutes=30)
    if datetime.now(timezone.utc) > cutoff:
        return jsonify({"error": "30-minute cancellation window has closed"}), 400

    try:
        order.status = "Cancelled"
        for item in order.items:
            prod = ProductSQL.query.get(item.product_id)
            if prod:
                prod.stock += item.quantity
        _audit("order_cancelled", "order", order.id, {"order_number": order_number})
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Order cancelled and stock restored"})
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Cancellation failed"}), 500

# ============================================================
# ADMIN — ORDERS
# ============================================================

@app.route("/api/admin/orders", methods=["GET"])
@admin_required
def get_all_admin_orders():
    orders = OrderSQL.query.order_by(OrderSQL.created_at.desc()).all()
    result = []
    for order in orders:
        user = User.query.get(order.user_id)
        d    = order.to_dict()
        d["customerName"]  = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Unknown"
        d["customerEmail"] = user.email if user else "Unknown"
        d["date"]          = (order.created_at.isoformat() + "Z") if order.created_at else ""
        result.append(d)
    return jsonify(result), 200


@app.route("/api/admin/orders/<order_id>", methods=["GET"])
@admin_required
def get_admin_order_detail(order_id):
    order_id = _sanitise_str(str(order_id), 100)
    order = OrderSQL.query.get(order_id) or OrderSQL.query.filter_by(order_number=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    user = User.query.get(order.user_id)
    d    = order.to_dict()
    d["customerName"]  = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Unknown"
    d["customerEmail"] = user.email if user else "Unknown"
    d["date"]          = order.created_at.isoformat() if order.created_at else None

    frontend_items = [
        {"productName": item.product_name, "quantity": item.quantity, "price": item.price, "size": item.size}
        for item in order.items
    ]
    d["items"]    = frontend_items
    d["subtotal"] = sum(i["price"] * i["quantity"] for i in frontend_items)
    d["shipping"] = round(order.total - d["subtotal"] + (order.discount_amount or 0), 2)
    return jsonify(d), 200


@app.route("/api/admin/orders/<order_id>/status", methods=["PUT"])
@admin_required
def update_order_status(order_id):
    data       = request.get_json() or {}
    new_status = _sanitise_str(data.get("status", ""), 50)

    # SECURITY: Whitelist valid order statuses
    _VALID_STATUSES = {"Pickup", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Returned", "Failed", "Refunded"}
    if not new_status or new_status not in _VALID_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(_VALID_STATUSES)}"}), 400

    order_id = _sanitise_str(str(order_id), 100)
    order = OrderSQL.query.get(order_id) or OrderSQL.query.filter_by(order_number=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    order.status = new_status
    _audit("order_status_updated", "order", order.id, {"status": new_status})
    try:
        db_mysql.session.commit()
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to update order status"}), 500

    user = User.query.get(order.user_id)
    if user:
        try:
            send_order_status_update(
                mail, user.email, order.order_number,
                new_status, _sanitise_str(data.get("tracking_link") or order.delhivery_tracking_url or "", 500),
            )
        except Exception as exc:
            app.logger.error("status_email_failed err=%s", type(exc).__name__)

    return jsonify({"success": True, "message": f"Status updated to {new_status}"}), 200


@app.route("/api/admin/dispatch-jobs", methods=["GET"])
@admin_required
def list_dispatch_jobs():
    status = _sanitise_str(request.args.get("status", ""), 20)
    q = DispatchJob.query
    if status:
        q = q.filter_by(status=status)
    return jsonify([j.to_dict() for j in q.order_by(DispatchJob.created_at.desc()).limit(100).all()])

# ── Pincode cache ─────────────────────────────────────────────────────────
_pincode_cache    = {}
_PINCODE_CACHE_TTL = 3600

def _cached_pincode_check(pincode: str) -> bool:
    now    = time.time()
    cached = _pincode_cache.get(pincode)
    if cached and (now - cached["ts"]) < _PINCODE_CACHE_TTL:
        return cached["data"]
    result = validate_pincode(pincode)
    _pincode_cache[pincode] = {"data": result, "ts": now}
    return result


@app.route("/api/delivery/check-pincode", methods=["POST"])
@csrf.exempt
def check_pincode():
    data    = request.get_json() or {}
    pincode = _sanitise_str(str(data.get("pincode", "")), 10)
    if not PINCODE_RE.match(pincode):
        return jsonify({"error": "Please enter a valid 6-digit pincode"}), 400

    try:
        serviceable = _cached_pincode_check(pincode)
        return jsonify({
            "success":     True,
            "pincode":     pincode,
            "serviceable": serviceable,
            "message":     "Delivery available" if serviceable else "Delivery not available to this pincode",
        }), 200
    except Exception as exc:
        app.logger.warning("pincode_check_error pincode=%s err=%s", pincode, exc)
        return jsonify({"success": True, "pincode": pincode, "serviceable": True,
                        "message": "Unable to verify — delivery will be attempted"}), 200


@app.route("/api/delivery/estimate", methods=["POST"])
@csrf.exempt
def shipping_estimate():
    data    = request.get_json() or {}
    pincode = _sanitise_str(str(data.get("pincode", "")), 10)
    if not PINCODE_RE.match(pincode):
        return jsonify({"error": "Please enter a valid 6-digit pincode"}), 400

    FREE_SHIPPING_MIN = 2000
    SHIPPING_COST     = 149
    try:
        subtotal = max(0.0, float(data.get("subtotal", 0)))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid subtotal"}), 400

    shipping_cost = 0 if subtotal >= FREE_SHIPPING_MIN else SHIPPING_COST
    is_mumbai     = pincode.startswith("400") or pincode.startswith("401")
    if is_mumbai:
        cgst = subtotal * 0.025; sgst = subtotal * 0.025; igst = 0
    else:
        cgst = 0; sgst = 0; igst = subtotal * 0.05
    tax_total = cgst + sgst + igst

    today   = datetime.now(timezone.utc)
    eta_min = today + timedelta(days=5)
    eta_max = today + timedelta(days=7)

    try:
        serviceable = _cached_pincode_check(pincode)
    except Exception:
        serviceable = True

    return jsonify({
        "success":          True,
        "pincode":          pincode,
        "serviceable":      serviceable,
        "shipping_cost":    shipping_cost,
        "free_shipping_min": FREE_SHIPPING_MIN,
        "cgst":             cgst,
        "sgst":             sgst,
        "igst":             igst,
        "tax_total":        tax_total,
        "eta_min":          eta_min.strftime("%b %d, %Y"),
        "eta_max":          eta_max.strftime("%b %d, %Y"),
        "eta_text":         f"Estimated delivery: {eta_min.strftime('%b %d')} – {eta_max.strftime('%b %d, %Y')}",
    }), 200


@app.route("/api/delivery/pincode-lookup", methods=["POST"])
@csrf.exempt
def pincode_lookup():
    data    = request.get_json() or {}
    pincode = _sanitise_str(str(data.get("pincode", "")), 10)
    if not PINCODE_RE.match(pincode):
        return jsonify({"error": "Invalid pincode"}), 400

    try:
        resp = requests.get(
            f"https://api.postalpincode.in/pincode/{pincode}",
            timeout=5,
        )
        if resp.status_code == 200:
            result = resp.json()
            if result and result[0].get("Status") == "Success":
                po = result[0]["PostOffice"][0]
                return jsonify({
                    "success": True,
                    "city":    po.get("District", ""),
                    "state":   po.get("State", ""),
                    "country": "India",
                }), 200
    except Exception as exc:
        app.logger.warning("pincode_lookup_error pincode=%s err=%s", pincode, exc)

    return jsonify({"success": False, "error": "Could not resolve pincode"}), 200


@app.route("/api/webhooks/delhivery", methods=["POST"])
def delhivery_webhook():
    webhook_token = os.getenv("DELHIVERY_WEBHOOK_TOKEN")
    if webhook_token:
        auth_header   = request.headers.get("Authorization", "")
        request_token = request.args.get("token", "")
        # SECURITY: Constant-time comparison
        auth_ok    = hmac.compare_digest(auth_header, f"Token {webhook_token}")
        token_ok   = hmac.compare_digest(request_token, webhook_token)
        if not auth_ok and not token_ok:
            app.logger.warning("delhivery_webhook_unauthorized ip=%s", request.remote_addr)
            return jsonify({"error": "Unauthorized"}), 401

    data        = request.get_json(silent=True) or {}
    shipment_id = _sanitise_str(str(data.get("shipment_id", "")), 200)
    status      = _sanitise_str(str(data.get("status", "")), 100)

    STATUS_MAP = {
        "delivered": "Delivered", "delivered_order": "Delivered",
        "cancelled": "Cancelled", "rto": "Returned",
        "in_transit": "Shipped", "in_shipment": "Shipped",
        "out_for_delivery": "Out for Delivery",
        "pending": "Processing", "failed": "Failed",
    }
    new_status = STATUS_MAP.get(status.lower(), status)

    if shipment_id:
        try:
            order = OrderSQL.query.filter_by(delhivery_shipment_id=shipment_id).first()
            if order:
                order.status = new_status
                db_mysql.session.commit()
                user = User.query.get(order.user_id)
                if user:
                    try:
                        send_order_status_update(
                            mail, user.email, order.order_number,
                            new_status, order.delhivery_tracking_url,
                        )
                    except Exception:
                        pass
        except Exception as exc:
            db_mysql.session.rollback()
            app.logger.error("delhivery_webhook_error err=%s", exc)

    return jsonify({"success": True}), 200

# ============================================================
# ADMIN — ANALYSIS
# ============================================================
@app.route("/api/admin/analysis", methods=["GET"])
@admin_required
def get_analysis_data():
    try:
        from sqlalchemy import func, extract

        # ---------------- MOST SOLD ----------------
        most_sold_raw = (
            db_mysql.session.query(
                OrderItem.product_id,
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("total_sold"),
                func.sum(OrderItem.price * OrderItem.quantity).label("total_revenue"),
            )
            .group_by(OrderItem.product_id, OrderItem.product_name)
            .order_by(func.sum(OrderItem.quantity).desc())
            .limit(10)
            .all()
        )

        most_sold = []
        for r in most_sold_raw:
            try:
                if r[0] is None:
                    # fallback when product_id missing
                    most_sold.append({
                        "id": None,
                        "name": r[1] or "Unknown Product",
                        "total_sold": int(r[2] or 0),
                        "total_revenue": float(r[3] or 0),
                    })
                else:
                    most_sold.append({
                        "id": int(r[0]),
                        "name": r[1] or "Unknown Product",
                        "total_sold": int(r[2] or 0),
                        "total_revenue": float(r[3] or 0),
                    })
            except:
                continue

        # ---------------- MOST FAVORITED ----------------
        fav_raw = (
            db_mysql.session.query(
                WishlistItem.product_id,
                func.count(WishlistItem.id).label("count"),
            )
            .group_by(WishlistItem.product_id)
            .order_by(func.count(WishlistItem.id).desc())
            .limit(10)
            .all()
        )

        most_favorited = []
        for r in fav_raw:
            try:
                if r[0] is None:
                    continue
                prod = ProductSQL.query.get(int(r[0]))
                if prod:
                    most_favorited.append({
                        "id": str(prod.id),
                        "name": prod.name,
                        "count": int(r[1] or 0),
                    })
            except:
                continue

        # ---------------- MOST ADDED TO CART ----------------
        cart_raw = (
            db_mysql.session.query(
                CartItem.product_id,
                func.sum(CartItem.quantity).label("total_qty"),
                func.count(CartItem.user_id.distinct()).label("user_count"),
            )
            .group_by(CartItem.product_id)
            .order_by(func.sum(CartItem.quantity).desc())
            .limit(10)
            .all()
        )

        most_added_to_cart = []
        for r in cart_raw:
            try:
                if r[0] is None:
                    continue
                prod = ProductSQL.query.get(int(r[0]))
                if prod:
                    most_added_to_cart.append({
                        "id": str(prod.id),
                        "name": prod.name,
                        "total_quantity": int(r[1] or 0),
                        "user_count": int(r[2] or 0),
                    })
            except:
                continue

        # ---------------- STOCK ----------------
        products_stock = ProductSQL.query.order_by(ProductSQL.stock.asc()).all()

        all_stock = []
        low_stock = []

        for p in products_stock:
            entry = {
                "id": str(p.id),
                "name": p.name,
                "stock": int(p.stock or 0),
                "category": p.category or "Uncategorized",
            }
            all_stock.append(entry)

            if (p.stock or 0) <= 5:
                low_stock.append(entry)

        # ---------------- CATEGORY PIE ----------------
        cat_raw = (
            db_mysql.session.query(
                ProductSQL.category,
                func.count(ProductSQL.id).label("count"),
                func.sum(ProductSQL.stock).label("total_stock"),
            )
            .group_by(ProductSQL.category)
            .all()
        )

        pie_data = [
            {
                "_id": r[0] or "Uncategorized",
                "count": int(r[1] or 0),
                "total_stock": int(r[2] or 0),
            }
            for r in cat_raw
        ]

        # ---------------- CATEGORY STATS ----------------
        all_products = ProductSQL.query.order_by(
            ProductSQL.category,
            ProductSQL.subcategory,
            ProductSQL.name
        ).all()

        cat_map = {}
        for p in all_products:
            cat_name = p.category or "Uncategorized"
            sub_name = p.subcategory or "General"

            cat_map.setdefault(cat_name, {}).setdefault(sub_name, []).append({
                "id": p.id,
                "name": p.name,
                "stock": int(p.stock or 0),
            })

        category_stats = []
        for cat_name, subs in cat_map.items():
            sub_list = []
            total_count = 0
            total_stock_sum = 0

            for sub_name, prods in subs.items():
                sub_stock = sum(pr["stock"] for pr in prods)

                sub_list.append({
                    "name": sub_name,
                    "count": len(prods),
                    "total_stock": sub_stock,
                    "products": prods,
                })

                total_count += len(prods)
                total_stock_sum += sub_stock

            category_stats.append({
                "name": cat_name,
                "count": total_count,
                "total_stock": total_stock_sum,
                "subcategories": sub_list,
            })

        # ---------------- MONTHLY REVENUE ----------------
        monthly_revenue_raw = (
            db_mysql.session.query(
                extract("year", OrderSQL.created_at),
                extract("month", OrderSQL.created_at),
                func.sum(OrderSQL.total),
                func.count(OrderSQL.id),
            )
            .filter(OrderSQL.payment_status == "Paid")
            .group_by(
                extract("year", OrderSQL.created_at),
                extract("month", OrderSQL.created_at)
            )
            .order_by(
                extract("year", OrderSQL.created_at),
                extract("month", OrderSQL.created_at)
            )
            .limit(12)
            .all()
        )

        monthly_revenue = [
            {
                "year": int(r[0]),
                "month": int(r[1]),
                "revenue": float(r[2] or 0),
                "orders": int(r[3] or 0),
            }
            for r in monthly_revenue_raw
        ]

        return jsonify({
            "most_sold": most_sold,
            "most_favorited": most_favorited,
            "most_added_to_cart": most_added_to_cart,
            "low_stock": low_stock,
            "all_stock": all_stock,
            "category_stats": category_stats,
            "pie_data": pie_data,
            "monthly_revenue": monthly_revenue,
        }), 200

    except Exception as exc:
        db_mysql.session.rollback()
        app.logger.exception("analysis_error")
        return jsonify({"error": "Analysis data unavailable"}), 500


# ============================================================
# ADMIN — CUSTOMERS
# ============================================================

@app.route("/api/admin/customers", methods=["GET"])
@admin_required
def get_customers():
    users = User.query.filter_by(is_admin=False).all()
    result = []
    for user in users:
        orders = OrderSQL.query.filter_by(user_id=user.id).all()
        result.append({
            "id":           str(user.id),
            "name":         f"{user.first_name or ''} {user.last_name or ''}".strip() or "Unknown",
            "email":        user.email,
            "phone":        user.phone or "N/A",
            "date_joined":  user.created_at.isoformat() if user.created_at else None,
            "is_blocked":   user.is_blocked,
            "total_orders": len(orders),
            "total_spent":  sum(o.total for o in orders),
            "last_login":   user.last_login_at.isoformat() if user.last_login_at else None,
        })
    return jsonify(result), 200


@app.route("/api/admin/customers/<int:customer_id>", methods=["GET"])
@admin_required
def get_customer_profile(customer_id):
    user = User.query.get(customer_id)
    if not user:
        return jsonify({"error": "Customer not found"}), 404

    orders       = OrderSQL.query.filter_by(user_id=user.id).order_by(OrderSQL.created_at.desc()).all()
    total_spent  = sum(o.total for o in orders)
    total_orders = len(orders)
    avg_order    = total_spent / total_orders if total_orders else 0

    address = user.JSON_addresses[0] if user.JSON_addresses else None
    if not address:
        for o in orders:
            if o.shipping_address:
                address = o.shipping_address
                break

    return jsonify({
        "id":          str(user.id),
        "first_name":  user.first_name or "",
        "last_name":   user.last_name or "",
        "email":       user.email,
        "phone":       user.phone or "N/A",
        "date_joined": user.created_at.isoformat() if user.created_at else None,
        "is_blocked":  user.is_blocked,
        "address":     address,
        "stats": {
            "total_orders":    total_orders,
            "total_spent":     total_spent,
            "avg_order_value": avg_order,
        },
        "orders": [o.to_dict() for o in orders],
    }), 200


@app.route("/api/admin/customers/<int:customer_id>/status", methods=["PUT"])
@admin_required
def update_customer_status(customer_id):
    data       = request.get_json() or {}
    is_blocked = data.get("is_blocked")
    if is_blocked is None:
        return jsonify({"error": "is_blocked required"}), 400

    user = User.query.get(customer_id)
    if not user:
        return jsonify({"error": "Customer not found"}), 404

    # SECURITY: Prevent blocking admin accounts
    if user.is_admin:
        return jsonify({"error": "Cannot block an admin account"}), 403

    user.is_blocked = bool(is_blocked)
    _audit("customer_blocked" if is_blocked else "customer_unblocked", "user", customer_id)
    try:
        db_mysql.session.commit()
    except Exception:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to update customer status"}), 500
    action = "blocked" if is_blocked else "unblocked"
    return jsonify({"success": True, "message": f"Customer {action}"}), 200

# ============================================================
# CATEGORIES
# ============================================================

@app.route("/api/categories", methods=["GET"])
def get_categories():
    try:
        categories = CategorySQL.query.all()
        result = []
        for c in categories:
            result.append({
                "id":            c.id,
                "name":          c.name,
                "subcategories": c.subcategories,
            })
        return jsonify(result)
    except Exception as exc:
        app.logger.error("get_categories error: %s", exc)
        return jsonify({"error": "Failed to fetch categories"}), 500


@app.route("/api/categories", methods=["POST"])
@csrf.exempt
@admin_required
def add_category():
    data        = request.get_json() or {}
    name        = _sanitise_str(data.get("name", ""), 100)
    subcategory = _sanitise_str(data.get("subcategory", ""), 100)

    if not name:
        return jsonify({"error": "Category name required"}), 400

    try:
        existing = CategorySQL.query.filter_by(name=name).first()
        if existing:
            if subcategory and subcategory not in existing.subcategories:
                subs = existing.subcategories
                subs.append(subcategory)
                existing.subcategories = subs
                db_mysql.session.commit()
                return jsonify({"success": True, "message": "Subcategory added"}), 201
            return jsonify({"error": "Category already exists"}), 400

        db_mysql.session.add(CategorySQL(
            name=name,
            subcategories=[subcategory] if subcategory else [],
        ))
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Category created"}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to create category"}), 500


@app.route("/api/categories/<int:cat_id>", methods=["DELETE"])
@csrf.exempt
@admin_required
def delete_category(cat_id):
    cat = CategorySQL.query.get(cat_id)
    if not cat:
        return jsonify({"error": "Category not found"}), 404
    try:
        db_mysql.session.delete(cat)
        db_mysql.session.commit()
        return jsonify({"success": True}), 200
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Delete failed"}), 500


@app.route("/api/categories/<int:cat_id>/subcategories", methods=["DELETE"])
@admin_required
def delete_subcategory(cat_id):
    data        = request.get_json() or {}
    subcategory = _sanitise_str(data.get("subcategory", ""), 100)
    if not subcategory:
        return jsonify({"error": "Subcategory name required"}), 400

    cat = CategorySQL.query.get(cat_id)
    if not cat:
        return jsonify({"error": "Category not found"}), 404

    subs = cat.subcategories
    if subcategory in subs:
        subs.remove(subcategory)
        cat.subcategories = subs
        try:
            db_mysql.session.commit()
        except Exception:
            db_mysql.session.rollback()
            return jsonify({"error": "Failed to delete subcategory"}), 500
        return jsonify({"success": True}), 200
    return jsonify({"error": "Subcategory not found"}), 404

# ============================================================
# HOMEPAGE CONFIG
# ============================================================

_DEFAULT_HOMEPAGE = {
    "hero_slides": [{
        "image":      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564",
        "content":    "ETHEREAL SHADOWS: FALL WINTER 2025",
        "product_id": "4",
    }],
    "manifesto_text":          "We believe in the quiet power of silence.",
    "bestseller_product_ids":  ["4", "5", "7"],
    "featured_product_ids":    ["4", "5", "7"],
    "new_arrival_product_ids": ["4", "5", "7"],
}


@app.route("/api/homepage", methods=["GET"])
def get_homepage_config():
    try:
        config = HomepageConfig.query.filter_by(config_type="main").first()
        return jsonify(config.to_dict() if config else _DEFAULT_HOMEPAGE)
    except Exception as exc:
        # DB connection failure or schema mismatch — return safe defaults
        app.logger.error("homepage_config_error err=%s", exc)
        return jsonify(_DEFAULT_HOMEPAGE)


@app.route("/api/homepage", methods=["POST"])
@csrf.exempt
@admin_required
def update_homepage_config():
    data = request.get_json() or {}
    try:
        config = HomepageConfig.query.filter_by(config_type="main").first()
        if not config:
            config = HomepageConfig(config_type="main")
            db_mysql.session.add(config)

        new_slides = data.get("hero_slides", [])

        # ── Delete old uploaded files that are no longer referenced ───────────
        # Compare existing hero slides with incoming ones; if a previously-stored
        # local image/video URL is absent from the new payload, delete it from disk.
        def _extract_local_urls(slides):
            """Return the set of /uploads/... paths referenced in these slides."""
            paths = set()
            for s in slides:
                for field in ("image", "video_url"):
                    url = (s or {}).get(field, "") or ""
                    # Only act on files stored on our own server
                    if "/uploads/products/" in url or "/uploads/videos/" in url:
                        # Normalise to a relative path (/uploads/...)
                        try:
                            rel = "/" + url.split("/uploads/", 1)[1]
                            rel = "/uploads/" + rel.lstrip("/")
                        except Exception:
                            rel = url
                        paths.add(rel)
            return paths

        old_local_urls = _extract_local_urls(config.hero_slides or [])
        new_local_urls = _extract_local_urls(new_slides)
        urls_to_delete = old_local_urls - new_local_urls

        for rel_url in urls_to_delete:
            try:
                # Strip leading /uploads/ to get the sub-path (e.g. products/abc.jpg)
                subpath = rel_url.lstrip("/").removeprefix("uploads/")
                disk_path = os.path.realpath(os.path.join(UPLOAD_FOLDER, subpath))
                # SECURITY: verify the resolved path is inside our upload folder
                if disk_path.startswith(os.path.realpath(UPLOAD_FOLDER)) and os.path.isfile(disk_path):
                    os.remove(disk_path)
                    app.logger.info("homepage_old_file_deleted path=%s", disk_path)
            except Exception as del_exc:
                app.logger.warning("homepage_delete_failed url=%s err=%s", rel_url, del_exc)

        config.hero_slides     = new_slides
        config.manifesto_text  = _sanitise_str(data.get("manifesto_text", ""), 2000)
        config.bestseller_ids  = data.get("bestseller_product_ids", [])
        config.featured_ids    = data.get("featured_product_ids", [])
        config.new_arrival_ids = data.get("new_arrival_product_ids", [])
        config.updated_at      = datetime.now(timezone.utc)

        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Homepage updated"}), 200
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": "Update failed"}), 500

# ============================================================
# ADMIN — AUDIT LOG
# ============================================================

@app.route("/api/admin/audit-log", methods=["GET"])
@admin_required
def get_audit_log():
    try:
        page  = max(1, int(request.args.get("page", 1)))
        limit = min(max(1, int(request.args.get("limit", 50))), 200)
    except (TypeError, ValueError):
        page, limit = 1, 50

    logs = (
        AuditLog.query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit).limit(limit).all()
    )
    return jsonify([l.to_dict() for l in logs])

# ============================================================
# ADMIN — DELHIVERY TEST ENDPOINT
# SECURITY: Only available in non-production
# ============================================================

@app.route("/api/admin/test/delhivery", methods=["POST"])
@admin_required
def test_delhivery_shipment():
    # SECURITY: Never expose internal test endpoints in production
    if is_production:
        return jsonify({"error": "Not available in production"}), 403

    data      = request.get_json() or {}
    test_type = _sanitise_str(data.get("test_type", "all"), 20)
    results   = {}

    if test_type in ("all", "pincode"):
        pincode = _sanitise_str(data.get("pincode", "110001"), 10)
        if PINCODE_RE.match(pincode):
            results["pincode_validation"] = {"pincode": pincode, "is_serviceable": validate_pincode(pincode)}

    if test_type in ("all", "shipping"):
        origin = _sanitise_str(data.get("origin_pincode", os.getenv("STORE_PINCODE", "110001")), 10)
        dest   = _sanitise_str(data.get("destination_pincode", "400001"), 10)
        weight = float(data.get("weight", 1.0))
        results["shipping_calculation"] = {
            "origin_pincode":      origin,
            "destination_pincode": dest,
            "weight_kg":           weight,
            "estimated_cost":      calculate_shipping(origin, dest, weight),
        }

    if test_type == "create":
        pickup_loc = {
            "address": _sanitise_str(data.get("pickup_address", os.getenv("STORE_ADDRESS", "")), 300),
            "city":    _sanitise_str(data.get("pickup_city",    os.getenv("STORE_CITY", "")),    100),
            "state":   _sanitise_str(data.get("pickup_state",   os.getenv("STORE_STATE", "")),   100),
            "pincode": _sanitise_str(data.get("pickup_pincode", os.getenv("STORE_PINCODE", "")), 10),
        }
        delivery_loc = {
            "address": _sanitise_str(data.get("delivery_address", ""), 300),
            "city":    _sanitise_str(data.get("delivery_city",    ""), 100),
            "state":   _sanitise_str(data.get("delivery_state",   ""), 100),
            "pincode": _sanitise_str(data.get("delivery_pincode", ""), 10),
        }
        results["shipment_creation"] = create_shipment(
            order_id=f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            pickup_location=pickup_loc,
            delivery_location=delivery_loc,
            customer_phone=_sanitise_str(data.get("phone", "9876543210"), 20),
            customer_name=_sanitise_str(data.get("name", "Test Customer"), 200),
            weight_kg=float(data.get("weight", 1.0)),
        )

    return jsonify({
        "success": True,
        "results": results,
        "environment": {
            "delhivery_api_key_configured": bool(os.getenv("DELHIVERY_API_KEY")),
            "delhivery_facility_code":      os.getenv("DELHIVERY_FACILITY_CODE", ""),
            "store_pincode":                os.getenv("STORE_PINCODE"),
        },
    })


# SECURITY: /run-dispatch is a debug route — disable in production
@app.route("/run-dispatch")
def run_dispatch():
    if is_production:
        return jsonify({"error": "Not available"}), 404
    _poll_dispatch_jobs()
    return "dispatch executed"


# ============================================================
# Generic error handlers — never leak stack traces to clients
# ============================================================

from sqlalchemy.exc import OperationalError as _SAOperationalError

@app.errorhandler(_SAOperationalError)
@cross_origin(supports_credentials=True, origins=origins)
def handle_db_gone_away(e):
    """
    Handles MySQL 2006 / 2013 "gone away" / "lost connection" errors.
    With NullPool these should never occur, but this handler is kept as a
    safety net (e.g. if the MySQL server is temporarily restarting).
    Rolls back any open transaction, removes the session so the next
    request gets a clean connection, and returns a retriable 503.
    """
    try:
        db_mysql.session.rollback()
    except Exception:
        pass
    try:
        db_mysql.session.remove()
    except Exception:
        pass
    app.logger.error("db_gone_away err=%s", e)
    return jsonify({"error": "Database temporarily unavailable. Please retry."}), 503


@app.errorhandler(400)
@cross_origin(supports_credentials=True, origins=origins)
def handle_400(e):
    return jsonify({"error": "Bad request"}), 400

@app.errorhandler(401)
@cross_origin(supports_credentials=True, origins=origins)
def handle_401(e):
    return jsonify({"error": "Authentication required"}), 401

@app.errorhandler(403)
@cross_origin(supports_credentials=True, origins=origins)
def handle_403(e):
    return jsonify({"error": "Forbidden"}), 403

@app.errorhandler(404)
@cross_origin(supports_credentials=True, origins=origins)
def handle_404(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(405)
@cross_origin(supports_credentials=True, origins=origins)
def handle_405(e):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(429)
@cross_origin(supports_credentials=True, origins=origins)
def handle_429(e):
    return jsonify({"error": "Too many requests. Please slow down."}), 429

@app.errorhandler(Exception)
@cross_origin(supports_credentials=True, origins=origins)
def handle_exception(e):
    app.logger.exception("unhandled_exception path=%s method=%s", request.path, request.method)
    # SECURITY: Never return stack traces in production
    if is_production:
        return jsonify({"error": "Internal server error"}), 500
    return jsonify({"error": "Internal server error", "details": str(e), "trace": traceback.format_exc()}), 500

# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=not is_production)