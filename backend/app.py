"""
app.py — U.S Atelier Flask Backend
Enterprise edition: idempotency, RBAC decorators, DB-backed dispatch queue,
account lockout, password reset, coupon codes, audit logging, structured
logging with PII redaction, hardened headers, and full Borzo integration.
"""

# ============================================================
# Imports
# ============================================================
from pydoc import text

from flask import Flask, render_template, jsonify, request, session, redirect, send_from_directory
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from functools import wraps
from urllib.parse import urlparse, urlunparse
from datetime import datetime, timedelta
import os, json, re, time, hashlib, traceback, logging

import requests as http_requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import razorpay
from flask_mail import Mail
from authlib.integrations.flask_client import OAuth
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

from mail_utils import (
    send_signup_confirmation,
    send_password_change_confirmation,
    send_order_confirmation,
    send_order_status_update,
    send_new_arrival_notification,
)
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
except ModuleNotFoundError:
    Limiter = None
    def get_remote_address():
        return request.remote_addr or "0.0.0.0"
    class _NoopLimiter:
        def __init__(self, *args, **kwargs): pass
        def limit(self, *_a, **_kw):
            def _d(fn): return fn
            return _d

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
load_dotenv(os.path.join(BASE_DIR, ".env"))

is_production = (
    os.getenv("NODE_ENV") == "production"
    or os.getenv("FLASK_ENV") == "production"
)

app = Flask(__name__, static_folder="static", static_url_path="/static")

if os.getenv("TRUST_PROXY_HEADERS", "1") == "1":
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# ============================================================
# Structured logging with PII redaction
# ============================================================
_PII_RE = re.compile(
    r'"(email|phone|password|street|zip|address)"\s*:\s*"[^"]*"',
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
# URL helpers
# ============================================================
PASSWORD_POLICY_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$")

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
    cfg = os.getenv("BACKEND_URL", "")
    if cfg:
        return _normalize_url(cfg, "http://localhost:5000")
    root = request.url_root.rstrip("/") if request else ""
    return _normalize_url(root or "http://localhost:5000", "http://localhost:5000")

def get_frontend_base_url() -> str:
    return _normalize_url(os.getenv("FRONTEND_URL", ""), "http://localhost:3000")

# ============================================================
# CORS / Origin
# ============================================================
_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if _allowed_origins_env:
    origins = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
else:
    _furl = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    origins = [
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
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
app.config["PREFERRED_URL_SCHEME"] = "https" if is_production else "http"

if is_production and app.config["SECRET_KEY"] == "dev-secret-change-me":
    raise RuntimeError("SECRET_KEY must be set in production")

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

# Session
app.config["SESSION_COOKIE_NAME"]     = "us_atelier_session"
app.config["SESSION_COOKIE_PATH"]     = "/"
app.config["SESSION_COOKIE_SAMESITE"] = "None" if is_production else "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SECURE"]   = is_production
app.config["SESSION_REFRESH_EACH_REQUEST"] = True
app.config["PERMANENT_SESSION_LIFETIME"]   = 86400 * 7

# MySQL
app.config["SQLALCHEMY_DATABASE_URI"]        = os.getenv("SQLALCHEMY_DATABASE_URI")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_size":    10,
    "pool_recycle": 280,
    "pool_pre_ping": True,
    "max_overflow": 20,
    "connect_args": {
        "connect_timeout": 10,
        "read_timeout":    30,
        "write_timeout":   30,
    },
}

# Mail
app.config["MAIL_SERVER"]         = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config["MAIL_PORT"]           = int(os.getenv("MAIL_PORT", 587))
app.config["MAIL_USE_TLS"]        = os.getenv("MAIL_USE_TLS", "True") == "True"
app.config["MAIL_USERNAME"]       = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"]       = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")

if not is_production:
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

# ============================================================
# Extensions
# ============================================================
db_mysql.init_app(app)
mail = Mail(app)

oauth = OAuth(app)
google = oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    access_token_url="https://accounts.google.com/o/oauth2/token",
    authorize_url="https://accounts.google.com/o/oauth2/auth",
    api_base_url="https://www.googleapis.com/oauth2/v1/",
    userinfo_endpoint="https://openidconnect.googleapis.com/v1/userinfo",
    client_kwargs={"scope": "openid email profile"},
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
)

limiter = (
    Limiter(key_func=get_remote_address, app=app, default_limits=[])
    if Limiter else _NoopLimiter()
)

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
    if not stored or candidate is None:
        return False
    try:
        return check_password_hash(stored, candidate)
    except (ValueError, TypeError):
        return stored == candidate

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
    """Re-queries the DB on every call — not just a session bool."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        user = User.query.get(int(session["user_id"]))
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
        # Flush only — commit happens with the parent transaction
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
# DB-backed Borzo dispatch scheduler
# ============================================================

def _run_dispatch_job(job_id: int):
    """
    Called by the scheduler. Processes one DispatchJob row.
    Uses exponential back-off: delay = 60 * 2^attempt seconds.
    """
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

            user = User.query.get(order.user_id)
            shipping = order.shipping_address

            # Parse pickup location
            pickup_location = {
                "address": os.getenv("STORE_ADDRESS", ""),
                "city": os.getenv("STORE_CITY", ""),
                "state": os.getenv("STORE_STATE", ""),
                "pincode": os.getenv("STORE_PINCODE", ""),
            }

            # Parse delivery location from order
            delivery_location = {
                "address": f"{shipping.get('street', '')}, {shipping.get('city', '')}".strip(", "),
                "city": shipping.get('city', ''),
                "state": shipping.get('state', ''),
                "pincode": shipping.get('zip', ''),
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
            )

            if res.get("success"):
                order.delhivery_shipment_id = str(res["delhivery_shipment_id"])
                order.delhivery_tracking_url = res["tracking_url"]
                order.delhivery_waybill_number = res.get("waybill_number", "")
                order.status            = "Shipped"
                job.status              = "done"
                job.completed_at        = datetime.utcnow()
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
                raise RuntimeError(res.get("error", "Unknown Delhivery error"))

        except Exception as exc:
            delay = min(60 * (2 ** job.attempts), 3600)  # cap at 1 h
            if job.attempts >= job.max_attempts:
                job.status     = "failed"
                job.last_error = str(exc)[:500]
                app.logger.error("dispatch_job_exhausted job=%s order=%s err=%s",
                                 job_id, job.order_id, exc)
            else:
                job.status          = "retry"
                job.last_error      = str(exc)[:500]
                job.next_attempt_at = datetime.utcnow() + timedelta(seconds=delay)
                app.logger.warning("dispatch_job_retry job=%s attempt=%s next_in=%ss",
                                   job_id, job.attempts, delay)
            db_mysql.session.commit()


def _poll_dispatch_jobs():
    """Scheduler entry-point: pick up all due jobs."""
    with app.app_context():
        due = DispatchJob.query.filter(
            DispatchJob.status.in_(["pending", "retry"]),
            DispatchJob.next_attempt_at <= datetime.utcnow(),
        ).all()
        for job in due:
            try:
                _run_dispatch_job(job.id)
            except Exception as exc:
                app.logger.exception("scheduler_error job=%s err=%s", job.id, exc)


def _enqueue_dispatch(order_id: int):
    """Create a DispatchJob row and let the scheduler handle it."""
    job = DispatchJob(order_id=order_id)
    db_mysql.session.add(job)
    db_mysql.session.flush()   # get job.id without committing yet
    return job

# ============================================================
# Misc helpers
# ============================================================

def _no_proxy_session():
    s = http_requests.Session()
    s.trust_env = False
    s.proxies   = {"http": None, "https": None}
    retry = Retry(total=3, backoff_factor=1, status_forcelist=[429,500,502,503,504])
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
        {"name": "Knitwear",     "subcategories": ["Sweaters", "Cardigans"]},
        {"name": "Trousers",     "subcategories": ["Tailored", "Casual"]},
        {"name": "Basics",       "subcategories": ["Tees"]},
        {"name": "Shirts",       "subcategories": ["Formal"]},
        {"name": "Accessories",  "subcategories": ["Bags", "Scarf"]},
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
# APScheduler — Borzo retry queue
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

@app.route("/static/uploads/<path:filename>")
def serve_uploads(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/uploads/<path:filename>")
def serve_uploads_short(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.errorhandler(413)
def handle_file_too_large(_err):
    return jsonify({"error": "File too large. Maximum size is 10 MB."}), 413

# ============================================================
# Security middleware
# ============================================================

@app.before_request
def csrf_origin_guard():
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None
    if not request.path.startswith("/api/"):
        return None
    # Webhooks are verified by their own signature — exclude from CSRF guard
    if request.path in ("/api/payments/webhook", "/api/webhooks/razorpay", "/api/webhooks/delhivery"):
        return None

    origin  = request.headers.get("Origin", "")
    referer = request.headers.get("Referer", "")

    if origin and not _is_origin_allowed(origin):
        return jsonify({"error": "Disallowed origin"}), 403

    if not origin and referer:
        parsed          = urlparse(referer)
        referer_origin  = f"{parsed.scheme}://{parsed.netloc}"
        backend_parsed  = urlparse(get_backend_base_url())
        backend_origin  = f"{backend_parsed.scheme}://{backend_parsed.netloc}"
        if referer_origin != backend_origin and not _is_origin_allowed(referer_origin):
            return jsonify({"error": "Disallowed referer"}), 403

    return None


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"]  = "nosniff"
    response.headers["X-Frame-Options"]         = "SAMEORIGIN"
    response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.razorpay.com; "
        "frame-src https://api.razorpay.com;"
    )
    if is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
        response.headers["Cache-Control"] = "no-store"
    return response

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
def product_page(product_id): return render_template("product.html", product_id=product_id)

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
        return redirect("/login")
    return render_template("account.html")

@app.route("/admin")
def admin_page():
    if "user_id" not in session or not session.get("is_admin"):
        return redirect("/login")
    return render_template("admin.html")

@app.route("/health")
def health():
    try:
        User.query.limit(1).all()
        db_status = "connected"
    except Exception as exc:
        db_status = f"error: {exc}"
    return jsonify({
        "status":              "healthy",
        "db":                  db_status,
        "payment_configured":  bool(RAZORPAY_KEY_ID),
        "borzo_configured":    bool(os.getenv("BORZO_API_TOKEN")),
        "scheduler_running":   HAS_SCHEDULER,
    }), 200

# ============================================================
# AUTH
# ============================================================

@app.route("/api/auth/signup", methods=["POST"])
@limiter.limit("5 per minute")
def signup():
    data          = request.get_json() or {}
    email         = data.get("email", "").strip().lower()
    password      = data.get("password", "")
    first_name    = data.get("firstName", "").strip()
    last_name     = data.get("lastName", "").strip()
    phone         = data.get("phone", "").strip()
    terms_accepted = bool(data.get("termsAccepted"))

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    if not PASSWORD_POLICY_RE.match(password):
        return jsonify({"error": "Password must be at least 8 characters with a letter, number, and special character"}), 400
    if not terms_accepted:
        return jsonify({"error": "Terms and Conditions must be accepted"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    try:
        new_user = User(
            email=email,
            password=generate_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            is_admin=False,
        )
        db_mysql.session.add(new_user)
        db_mysql.session.commit()

        session.permanent = False
        session["user_id"]  = str(new_user.id)
        session["is_admin"] = False
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
@limiter.limit("10 per minute")
def login():
    data       = request.get_json() or {}
    identifier = data.get("email", "").strip().lower()
    password   = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter(db_mysql.func.lower(User.email) == identifier).first()
    if not user and "@" not in identifier:
        candidates = (
            User.query.filter(User.email.ilike(f"{identifier}@%"))
            .order_by(User.id.asc()).all()
        )
        if len(candidates) == 1:
            user = candidates[0]

    # Locked account check
    if user and user.is_locked():
        return jsonify({"error": "Account temporarily locked due to too many failed attempts. Try again later."}), 429

    password_ok = bool(user and _is_password_valid(user.password, password))

    if not password_ok:
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                app.logger.warning("account_locked user_id=%s", user.id)
            db_mysql.session.commit()
        return jsonify({"error": "Invalid credentials"}), 401

    if user.is_blocked:
        return jsonify({"error": "Your account has been blocked. Contact support."}), 403

    # Successful login — reset lockout, migrate hash if needed
    user.failed_login_attempts = 0
    user.locked_until          = None
    user.last_login_at         = datetime.utcnow()
    user.last_login_ip         = request.remote_addr

    if not _is_password_hashed(user.password):
        user.password = generate_password_hash(password)

    db_mysql.session.commit()

    session.permanent = False
    session["user_id"]  = str(user.id)
    session["is_admin"] = bool(user.is_admin)

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
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"}), 200


@app.route("/api/auth/user", methods=["GET", "PUT"])
def get_user_profile():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"user": None}), 200

    user = User.query.get(int(user_id))
    if not user:
        session.clear()
        return jsonify({"user": None}), 200

    if request.method == "PUT":
        data = request.get_json() or {}
        user.first_name = data.get("firstName", user.first_name)
        user.last_name  = data.get("lastName",  user.last_name)
        user.phone      = data.get("phone",      user.phone)
        user.profile_pic = data.get("profilePic", user.profile_pic)
        try:
            db_mysql.session.commit()
            return jsonify({"success": True, "message": "Profile updated"})
        except Exception as exc:
            db_mysql.session.rollback()
            return jsonify({"error": str(exc)}), 500

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
    if not PASSWORD_POLICY_RE.match(new_password):
        return jsonify({"error": "New password must be at least 8 characters with letter, number, and special character"}), 400

    user = User.query.get(int(session["user_id"]))
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not check_password_hash(user.password, current_password):
        return jsonify({"error": "Incorrect current password"}), 400

    try:
        user.password = generate_password_hash(new_password)
        db_mysql.session.commit()
    except Exception:
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to update password"}), 500

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
    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email required"}), 400

    user = User.query.filter_by(email=email).first()
    # Always return 200 — do not reveal whether the email exists
    if user:
        token = _gen_reset_token(email)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Invalidate previous tokens for this user
        PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({"used": True})

        prt = PasswordResetToken(
            user_id    = user.id,
            token_hash = token_hash,
            expires_at = datetime.utcnow() + timedelta(hours=1),
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
    token        = data.get("token", "")
    new_password = data.get("newPassword", "")

    if not token or not new_password:
        return jsonify({"error": "Token and new password required"}), 400
    if not PASSWORD_POLICY_RE.match(new_password):
        return jsonify({"error": "Password must be at least 8 characters with letter, number, and special character"}), 400

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

# ---- Google OAuth -----------------------------------------------------------

@app.route("/api/auth/google/login")
def google_login():
    if not os.getenv("GOOGLE_CLIENT_ID"):
        return redirect(f"{get_frontend_base_url()}/login?error=google_oauth_not_configured")
    redirect_uri = f"{get_backend_base_url()}/api/auth/google/callback"
    session.modified = True
    return google.authorize_redirect(redirect_uri)


@app.route("/api/auth/google/callback")
def google_callback():
    frontend_base = get_frontend_base_url()
    try:
        google.authorize_access_token()
        user_info = google.get("userinfo").json()
    except Exception as exc:
        err_text = str(exc).lower()
        code = "google_auth_failed"
        if "mismatching_state" in err_text or "state" in err_text:
            code = "google_state_mismatch"
        elif "redirect_uri_mismatch" in err_text:
            code = "google_redirect_uri_mismatch"
        elif "invalid_client" in err_text:
            code = "google_invalid_client"
        elif "access_denied" in err_text:
            code = "google_access_denied"
        app.logger.error("google_oauth_error code=%s err=%s", code, type(exc).__name__)
        return redirect(f"{frontend_base}/login?error={code}")

    email     = user_info.get("email", "").lower()
    if not email:
        return redirect(f"{frontend_base}/login?error=google_email_missing")

    first_name = user_info.get("given_name", "")
    last_name  = user_info.get("family_name", "")
    picture    = user_info.get("picture", "")

    user = User.query.filter_by(email=email).first()
    if not user:
        try:
            user = User(
                email=email,
                password=os.urandom(24).hex(),
                first_name=first_name,
                last_name=last_name,
                profile_pic=picture,
                is_admin=False,
            )
            db_mysql.session.add(user)
            db_mysql.session.commit()
            try:
                send_signup_confirmation(mail, email, first_name)
            except Exception:
                pass
        except Exception as exc:
            db_mysql.session.rollback()
            app.logger.error("google_user_create_error err=%s", exc)
            return redirect(f"{frontend_base}/login?error=db_error")
    else:
        if picture and user.profile_pic != picture:
            try:
                user.profile_pic = picture
                db_mysql.session.commit()
            except Exception:
                db_mysql.session.rollback()

    session.clear()
    session.permanent  = False
    session["user_id"] = str(user.id)
    session["is_admin"] = bool(user.is_admin)
    return redirect(f"{frontend_base}/auth/callback")

# ---- Addresses --------------------------------------------------------------

@app.route("/api/user/addresses", methods=["POST"])
@login_required
def add_address():
    user = User.query.get(int(session["user_id"]))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data    = request.get_json() or {}
    address = {
        "id":      int(time.time()),
        "street":  data.get("street", ""),
        "city":    data.get("city", ""),
        "state":   data.get("state", ""),
        "zip":     data.get("zip", ""),
        "country": data.get("country", "IN"),
    }
    try:
        current = user.JSON_addresses
        current.append(address)
        user.JSON_addresses = current
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Address added"}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": str(exc)}), 500

# ============================================================
# UPLOADS
# ============================================================

@app.route("/api/upload", methods=["POST"])
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
        filename = f"{int(time.time())}_{secure_filename(file.filename)}"
        file.save(os.path.join(products_dir, filename))
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
        filename = f"profile_{session['user_id']}_{int(time.time())}.{ext}"
        file.save(os.path.join(profiles_dir, filename))
        return jsonify({
            "success": True,
            "url":  f"{get_backend_base_url()}/uploads/profiles/{filename}",
            "path": f"/uploads/profiles/{filename}",
        }), 200
    except Exception as exc:
        app.logger.error("profile_upload_error err=%s", exc)
        return jsonify({"error": "Upload failed"}), 500

# ============================================================
# PRODUCTS
# ============================================================

@app.route("/api/products", methods=["GET"])
def get_products():
    q = ProductSQL.query
    category  = request.args.get("category")
    gender    = request.args.get("gender")
    search    = request.args.get("search")
    min_price = request.args.get("min_price")
    max_price = request.args.get("max_price")
    sort_raw  = request.args.get("sort")

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
@admin_required
def add_product():
    data = request.get_json() or {}
    for field in ("name", "price", "category", "description", "images", "sizes"):
        if field not in data:
            return jsonify({"error": f"Field '{field}' is required"}), 400
    try:
        new_product = ProductSQL(
            name             = data["name"],
            price            = float(data["price"]),
            category         = data["category"],
            subcategory      = data.get("subcategory", ""),
            gender           = data.get("gender", "Unisex"),
            description      = data["description"],
            images           = data["images"],
            sizes            = data["sizes"],
            stock            = int(data.get("stock", 0)),
            is_featured      = bool(data.get("featured", False)),
            is_new           = bool(data.get("newArrival", False)),
            is_bestseller    = bool(data.get("bestseller", False)),
            fabric           = data.get("fabric", ""),
            care             = data.get("care", ""),
            size_guide_image = data.get("sizeGuideImage", ""),
        )
        db_mysql.session.add(new_product)
        db_mysql.session.commit()
        _audit("product_created", "product", new_product.id, {"name": data["name"]})
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
@admin_required
def update_product(product_id):
    product = ProductSQL.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not available"}), 404

    data = request.get_json() or {}
    for attr, key in [
        ("name", "name"), ("price", None), ("category", "category"),
        ("subcategory", "subcategory"), ("gender", "gender"),
        ("description", "description"), ("images", "images"),
        ("sizes", "sizes"), ("stock", None), ("is_featured", None),
        ("is_new", None), ("is_bestseller", None),
        ("fabric", "fabric"), ("care", "care"), ("size_guide_image", None),
    ]:
        pass  # handled below explicitly

    if "name"          in data: product.name          = data["name"]
    if "price"         in data: product.price         = float(data["price"])
    if "category"      in data: product.category      = data["category"]
    if "subcategory"   in data: product.subcategory   = data["subcategory"]
    if "gender"        in data: product.gender        = data["gender"]
    if "description"   in data: product.description   = data["description"]
    if "images"        in data: product.images        = data["images"]
    if "sizes"         in data: product.sizes         = data["sizes"]
    if "stock"         in data: product.stock         = int(data["stock"])
    if "featured"      in data: product.is_featured   = bool(data["featured"])
    if "newArrival"    in data: product.is_new        = bool(data["newArrival"])
    if "bestseller"    in data: product.is_bestseller = bool(data["bestseller"])
    if "fabric"        in data: product.fabric        = data["fabric"]
    if "care"          in data: product.care          = data["care"]
    if "sizeGuideImage" in data: product.size_guide_image = data["sizeGuideImage"]

    try:
        db_mysql.session.commit()
        _audit("product_updated", "product", product_id)
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Product updated"}), 200
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": str(exc)}), 500


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
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
        return jsonify({"error": str(exc)}), 500

# ============================================================
# CART
# ============================================================

@app.route("/api/cart", methods=["GET"])
def get_cart():
    if "user_id" in session:
        items   = CartItem.query.filter_by(user_id=int(session["user_id"])).all()
        results = []
        for item in items:
            try:
                product = ProductSQL.query.get(int(item.product_id_str))
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
    product_id = str(data.get("id", ""))
    quantity   = int(data.get("quantity", 1))
    size       = data.get("size")

    if "user_id" in session:
        existing = CartItem.query.filter_by(
            user_id=int(session["user_id"]),
            product_id_str=product_id,
            size=size,
        ).first()
        try:
            if existing:
                existing.quantity += quantity
            else:
                db_mysql.session.add(CartItem(
                    user_id=int(session["user_id"]),
                    product_id_str=product_id,
                    quantity=quantity,
                    size=size,
                ))
            db_mysql.session.commit()
        except Exception as exc:
            db_mysql.session.rollback()
            return jsonify({"error": str(exc)}), 500
    else:
        cart  = session.get("cart", [])
        found = False
        for item in cart:
            if item["id"] == product_id and item.get("size") == size:
                item["quantity"] += quantity
                found = True
                break
        if not found:
            cart.append({"id": product_id, "quantity": quantity, "size": size})
        session["cart"] = cart

    return jsonify({"success": True})


@app.route("/api/cart/<int:item_id>", methods=["PUT"])
@login_required
def update_cart_item(item_id):
    data     = request.get_json() or {}
    quantity = data.get("quantity")
    if quantity is None or int(quantity) < 1:
        return jsonify({"error": "Valid quantity required"}), 400
    item = CartItem.query.filter_by(id=item_id, user_id=int(session["user_id"])).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404
    item.quantity = int(quantity)
    db_mysql.session.commit()
    return jsonify({"success": True})


@app.route("/api/cart/<int:item_id>", methods=["DELETE"])
@login_required
def remove_cart_item(item_id):
    item = CartItem.query.filter_by(id=item_id, user_id=int(session["user_id"])).first()
    if item:
        db_mysql.session.delete(item)
        db_mysql.session.commit()
    return jsonify({"success": True})

# ============================================================
# WISHLIST
# ============================================================

@app.route("/api/wishlist", methods=["GET"])
@login_required
def get_wishlist():
    items   = WishlistItem.query.filter_by(user_id=int(session["user_id"])).all()
    results = []
    for item in items:
        try:
            product = ProductSQL.query.get(int(item.product_id_str))
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
    product_id = str((request.get_json() or {}).get("product_id", ""))
    if not product_id:
        return jsonify({"error": "Product ID required"}), 400

    existing = WishlistItem.query.filter_by(
        user_id=int(session["user_id"]),
        product_id_str=product_id,
    ).first()
    if existing:
        return jsonify({"message": "Already in wishlist"}), 200

    try:
        db_mysql.session.add(WishlistItem(
            user_id=int(session["user_id"]),
            product_id_str=product_id,
        ))
        db_mysql.session.commit()
        return jsonify({"success": True}), 201
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": str(exc)}), 500


@app.route("/api/wishlist/<product_id>", methods=["DELETE"])
@login_required
def remove_from_wishlist(product_id):
    item = WishlistItem.query.filter_by(
        user_id=int(session["user_id"]),
        product_id_str=str(product_id),
    ).first()
    if item:
        db_mysql.session.delete(item)
        db_mysql.session.commit()
    return jsonify({"success": True})

# ============================================================
# REVIEWS
# ============================================================

@app.route("/api/products/<product_id>/reviews", methods=["GET", "POST"])
def product_reviews(product_id):
    if request.method == "POST":
        if "user_id" not in session:
            return jsonify({"error": "Login required"}), 401
        data   = request.get_json() or {}
        rating = data.get("rating")
        if not rating:
            return jsonify({"error": "Rating required"}), 400
        user = User.query.get(int(session["user_id"]))
        try:
            db_mysql.session.add(Review(
                user_id=user.id if user else None,
                user_email=user.email if user else "Anonymous",
                product_id_str=str(product_id),
                rating=int(rating),
                comment=data.get("comment", ""),
            ))
            db_mysql.session.commit()
            return jsonify({"success": True}), 201
        except Exception as exc:
            db_mysql.session.rollback()
            return jsonify({"error": str(exc)}), 500

    reviews = (
        Review.query.filter_by(product_id_str=str(product_id))
        .order_by(Review.created_at.desc()).all()
    )
    return jsonify([r.to_dict() for r in reviews])

# ============================================================
# COUPONS
# ============================================================

@app.route("/api/coupons/validate", methods=["POST"])
@login_required
def validate_coupon():
    data     = request.get_json() or {}
    code     = data.get("code", "").strip().upper()
    subtotal = float(data.get("subtotal", 0))

    if not code:
        return jsonify({"error": "Coupon code required"}), 400

    coupon = Coupon.query.filter_by(code=code).first()
    if not coupon:
        return jsonify({"error": "Invalid coupon code"}), 404

    valid, reason = coupon.is_valid(subtotal)
    if not valid:
        return jsonify({"error": reason}), 400

    discount = coupon.apply(subtotal)
    return jsonify({
        "success":        True,
        "discount_type":  coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": discount,
        "final_amount":   round(subtotal - discount, 2),
    })


@app.route("/api/admin/coupons", methods=["GET"])
@admin_required
def list_coupons():
    return jsonify([c.to_dict() for c in Coupon.query.all()])


@app.route("/api/admin/coupons", methods=["POST"])
@admin_required
def create_coupon():
    data = request.get_json() or {}
    code = data.get("code", "").strip().upper()
    if not code:
        return jsonify({"error": "Coupon code required"}), 400
    if Coupon.query.filter_by(code=code).first():
        return jsonify({"error": "Coupon code already exists"}), 400

    try:
        expires_at = None
        if data.get("expires_at"):
            expires_at = datetime.fromisoformat(data["expires_at"])

        c = Coupon(
            code             = code,
            discount_type    = data.get("discount_type", "percent"),
            discount_value   = float(data.get("discount_value", 0)),
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
        return jsonify({"error": str(exc)}), 500


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
        return jsonify({"error": str(exc)}), 500

# ============================================================
# PAYMENTS
# ============================================================

@app.route("/api/payments/create-order", methods=["POST"])
@login_required
def create_razorpay_order():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    data   = request.get_json() or {}
    amount = data.get("amount")
    if not amount:
        return jsonify({"error": "Amount required"}), 400
    try:
        client = get_razorpay_client()
        rzp_order = client.order.create({
            "amount":          int(float(amount) * 100),
            "currency":        "INR",
            "payment_capture": "1",
        })
        try:
            payment = Payment(
                user_id=int(session["user_id"]),
                razorpay_order_id=rzp_order.get("id"),
                amount=float(amount),
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
        return jsonify({"error": str(exc)}), 500


@app.route("/api/payments/verify", methods=["POST"])
def verify_payment():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    data = request.get_json() or {}
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id":   data.get("razorpay_order_id"),
            "razorpay_payment_id": data.get("razorpay_payment_id"),
            "razorpay_signature":  data.get("razorpay_signature"),
        })
        return jsonify({"success": True}), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


@app.route("/api/payments/create-qr", methods=["POST"])
@login_required
def create_payment_qr():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    data   = request.get_json() or {}
    amount = data.get("amount")
    try:
        client = get_razorpay_client()
        va = client.virtual_account.create({
            "receiver_types": ["qr_code"],
            "description":    "Order Payment",
            "amount":         int(float(amount) * 100),
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
        return jsonify({"error": str(exc)}), 500


@app.route("/api/payments/check-qr-status", methods=["POST"])
@login_required
def check_qr_status():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    qr_id = (request.get_json() or {}).get("qr_id")
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
        return jsonify({"error": str(exc)}), 500


@app.route("/api/webhooks/razorpay", methods=["POST"])
def razorpay_webhook():
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not webhook_secret:
        return jsonify({"error": "Webhook secret not configured"}), 500

    payload   = request.get_data()
    signature = request.headers.get("X-Razorpay-Signature")
    try:
        get_razorpay_client().utility.verify_webhook_signature(payload, signature, webhook_secret)
    except Exception:
        app.logger.warning("razorpay_webhook_bad_signature")
        return jsonify({"error": "Invalid signature"}), 400

    data  = request.get_json(silent=True) or {}
    event = data.get("event")

    if event in ("payment.captured", "order.paid"):
        pp               = data["payload"]["payment"]["entity"]
        rzp_payment_id   = pp["id"]
        rzp_order_id     = pp["order_id"]
        amount           = pp["amount"] / 100

        # Idempotency guard
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
            order.payment_status       = "Paid"
            order.razorpay_payment_id  = rzp_payment_id

        db_mysql.session.commit()

    return jsonify({"success": True}), 200


@app.route("/api/admin/payments", methods=["GET"])
@admin_required
def get_admin_payments():
    return jsonify([p.to_dict() for p in Payment.query.order_by(Payment.created_at.desc()).all()])


@app.route("/api/admin/payments/refund", methods=["POST"])
@admin_required
def refund_payment():
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 500
    data           = request.get_json() or {}
    rzp_payment_id = data.get("razorpay_payment_id")
    amount         = data.get("amount")
    if not rzp_payment_id:
        return jsonify({"error": "Razorpay Payment ID required"}), 400
    try:
        client      = get_razorpay_client()
        refund_data = {}
        if amount:
            refund_data["amount"] = int(float(amount) * 100)
        refund = client.payment.refund(rzp_payment_id, refund_data)

        payment = Payment.query.filter_by(razorpay_payment_id=rzp_payment_id).first()
        if payment:
            payment.status = "refunded"
            if payment.order_id:
                order = OrderSQL.query.get(payment.order_id)
                if order:
                    order.payment_status = "Refunded"
                    order.status         = "Cancelled"
        _audit("payment_refunded", "payment", None, {"razorpay_payment_id": rzp_payment_id})
        db_mysql.session.commit()
        return jsonify({"success": True, "refund": refund}), 200
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": str(exc)}), 500

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

    addr = data.get("shippingAddress") or data.get("shipping_address") or {}
    for field in ("street", "city", "state", "zip"):
        if not str(addr.get(field, "")).strip():
            errors.append(f"shippingAddress.{field} is required")
    return errors


@app.route("/api/orders", methods=["POST"])
@login_required
def create_order():
    data = request.get_json() or {}

    # Terms
    if not bool(data.get("termsAccepted")):
        return jsonify({"error": "Terms and Conditions must be accepted"}), 400

    # Idempotency — prevent duplicate orders on retry
    idempotency_key = data.get("idempotencyKey")
    if idempotency_key:
        existing_order = OrderSQL.query.filter_by(idempotency_key=idempotency_key).first()
        if existing_order:
            return jsonify({
                "success": True,
                "orderId": existing_order.order_number,
                "duplicate": True,
            }), 200

    # Validate payload
    errors = _validate_order_payload(data)
    if errors:
        return jsonify({"error": errors[0], "details": errors}), 400

    # Payment verification
    rzp_payment_id = data.get("razorpay_payment_id")
    rzp_order_id   = data.get("razorpay_order_id")
    rzp_signature  = data.get("razorpay_signature")
    payment_status = "Pending"

    if rzp_payment_id and rzp_order_id and rzp_signature:
        if not razorpay_client:
            return jsonify({"error": "Payment gateway not configured"}), 500
        try:
            razorpay_client.utility.verify_payment_signature({
                "razorpay_order_id":   rzp_order_id,
                "razorpay_payment_id": rzp_payment_id,
                "razorpay_signature":  rzp_signature,
            })
            payment_status = "Paid"
        except Exception:
            return jsonify({"error": "Payment verification failed"}), 400

    user = User.query.get(int(session["user_id"]))
    if not user:
        return jsonify({"error": "User not found"}), 404

    incoming_items = data.get("items", [])
    validated_items = []
    computed_subtotal = 0.0

    for item in incoming_items:
        try:
            pid      = int(item.get("id"))
            quantity = int(item.get("quantity", 0))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid item payload"}), 400
        if quantity <= 0:
            return jsonify({"error": "Quantity must be greater than 0"}), 400

        # Lock the row for atomic stock decrement
        product = ProductSQL.query.with_for_update().get(pid)
        if not product:
            return jsonify({"error": f"Product not found: {pid}"}), 404
        if product.stock < quantity:
            return jsonify({"error": f"Insufficient stock for {product.name}"}), 400

        line_total = float(product.price) * quantity
        computed_subtotal += line_total
        validated_items.append({
            "id":         pid,
            "name":       product.name,
            "quantity":   quantity,
            "size":       item.get("size"),
            "unit_price": float(product.price),
        })

    # Coupon
    coupon_code     = data.get("couponCode", "").strip().upper() or None
    discount_amount = 0.0
    if coupon_code:
        coupon = Coupon.query.filter_by(code=coupon_code).first()
        if coupon:
            valid, _ = coupon.is_valid(computed_subtotal)
            if valid:
                discount_amount = coupon.apply(computed_subtotal)

    client_total = float(data.get("total", 0))
    # Allow client total to be up to 1 rupee less than computed (discount applied)
    expected_min = computed_subtotal - discount_amount - 1.0
    if client_total < expected_min:
        return jsonify({"error": "Order total mismatch"}), 400

    order_number = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{user.id}"

    try:
        new_order = OrderSQL(
            order_number          = order_number,
            idempotency_key       = idempotency_key,
            user_id               = user.id,
            total                 = client_total,
            status                = "Processing",
            payment_status        = payment_status,
            shipping_address_json = json.dumps(data.get("shippingAddress", {})),
            coupon_code           = coupon_code,
            discount_amount       = discount_amount,
        )
        if rzp_order_id:
            new_order.razorpay_order_id   = rzp_order_id
        if rzp_payment_id:
            new_order.razorpay_payment_id = rzp_payment_id

        db_mysql.session.add(new_order)
        db_mysql.session.flush()

        # Link Payment record
        if rzp_order_id:
            payment_rec = Payment.query.filter_by(razorpay_order_id=rzp_order_id).first()
            if payment_rec:
                payment_rec.order_id = new_order.id
                payment_rec.status   = "captured" if payment_status == "Paid" else payment_rec.status

        # Order items + stock decrement
        for item in validated_items:
            db_mysql.session.add(OrderItem(
                order_id       = new_order.id,
                product_id_str = str(item["id"]),
                product_name   = item["name"],
                quantity       = item["quantity"],
                price          = item["unit_price"],
                size           = item.get("size"),
            ))
            product = ProductSQL.query.with_for_update().get(item["id"])
            if not product or product.stock < item["quantity"]:
                raise ValueError(f"Insufficient stock for {item['name']}")
            product.stock -= item["quantity"]

            # Out-of-stock alert
            if product.stock == 0:
                app.logger.warning("stock_depleted product_id=%s name=%s", product.id, product.name)

        # Increment coupon uses
        if coupon_code and discount_amount > 0:
            coupon_obj = Coupon.query.filter_by(code=coupon_code).first()
            if coupon_obj:
                coupon_obj.uses += 1

        # Clear cart
        CartItem.query.filter_by(user_id=user.id).delete()

        # Enqueue Borzo dispatch job (instead of raw thread)
        if payment_status == "Paid":
            _enqueue_dispatch(new_order.id)

        _audit("order_created", "order", new_order.id, {"order_number": order_number})
        db_mysql.session.commit()

        # Send confirmation email (non-blocking, best-effort)
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
    orders = (
        OrderSQL.query.filter_by(user_id=session["user_id"])
        .order_by(OrderSQL.created_at.desc()).all()
    )
    return jsonify([o.to_dict() for o in orders])


@app.route("/api/orders/<order_number>/cancel", methods=["POST"])
@login_required
def cancel_order(order_number):
    order = OrderSQL.query.filter_by(
        order_number=order_number,
        user_id=int(session["user_id"]),
    ).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if order.borzo_order_id:
        return jsonify({"error": "Order already dispatched and cannot be self-cancelled. Contact support."}), 400
    if order.status in ("Cancelled", "Delivered"):
        return jsonify({"error": f"Order is already {order.status}"}), 400

    cutoff = order.created_at + timedelta(minutes=30)
    if datetime.utcnow() > cutoff:
        return jsonify({"error": "30-minute cancellation window has closed"}), 400

    try:
        order.status = "Cancelled"
        for item in order.items:
            prod = ProductSQL.query.get(int(item.product_id_str))
            if prod:
                prod.stock += item.quantity
        _audit("order_cancelled", "order", order.id, {"order_number": order_number})
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Order cancelled and stock restored"})
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": str(exc)}), 500


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
    order = OrderSQL.query.get(order_id) or OrderSQL.query.filter_by(order_number=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    user = User.query.get(order.user_id)
    d    = order.to_dict()
    d["customerName"]  = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Unknown"
    d["customerEmail"] = user.email if user else "Unknown"
    d["date"]          = order.created_at.isoformat() if order.created_at else None

    frontend_items = [
        {
            "productName": item.product_name,
            "quantity":    item.quantity,
            "price":       item.price,
            "size":        item.size,
        }
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
    new_status = data.get("status")
    if not new_status:
        return jsonify({"error": "Status required"}), 400

    order = OrderSQL.query.get(order_id) or OrderSQL.query.filter_by(order_number=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404

    order.status = new_status
    _audit("order_status_updated", "order", order.id, {"status": new_status})
    db_mysql.session.commit()

    user = User.query.get(order.user_id)
    if user:
        try:
            send_order_status_update(
                mail, user.email, order.order_number,
                new_status, data.get("tracking_link") or order.borzo_tracking_url,
            )
        except Exception as exc:
            app.logger.error("status_email_failed err=%s", type(exc).__name__)

    return jsonify({"success": True, "message": f"Status updated to {new_status}"}), 200


@app.route("/api/admin/dispatch/<order_id>", methods=["POST"])
@admin_required
def dispatch_delhivery_order(order_id):
    order = OrderSQL.query.filter_by(order_number=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    if order.delhivery_shipment_id:
        return jsonify({"error": "Order already dispatched via Delhivery"}), 400

    user = User.query.get(order.user_id)
    shipping = order.shipping_address

    pickup_location = {
        "address": os.getenv("STORE_ADDRESS", ""),
        "city": os.getenv("STORE_CITY", ""),
        "state": os.getenv("STORE_STATE", ""),
        "pincode": os.getenv("STORE_PINCODE", ""),
    }

    delivery_location = {
        "address": f"{shipping.get('street', '')}, {shipping.get('city', '')}".strip(", "),
        "city": shipping.get('city', ''),
        "state": shipping.get('state', ''),
        "pincode": shipping.get('zip', ''),
    }

    customer_phone = (user.phone if user else None) or "9999999999"
    customer_name = (
        f"{shipping.get('firstName', '')} {shipping.get('lastName', '')}".strip()
        or (f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Customer")
    )

    res = create_shipment(
        order_id=order_id,
        pickup_location=pickup_location,
        delivery_location=delivery_location,
        customer_phone=customer_phone,
        customer_name=customer_name,
    )

    if res.get("success"):
        order.delhivery_shipment_id = str(res["delhivery_shipment_id"])
        order.delhivery_tracking_url = res["tracking_url"]
        order.delhivery_waybill_number = res.get("waybill_number", "")
        order.status = "Shipped"
        _audit("delhivery_dispatch_manual", "order", order.id, {"shipment_id": res["delhivery_shipment_id"]})
        db_mysql.session.commit()

        if user:
            try:
                send_order_status_update(mail, user.email, order_id, "Shipped", res["tracking_url"])
            except Exception:
                pass

        return jsonify({
            "success": True,
            "message": "Dispatched via Delhivery",
            "tracking_url": res["tracking_url"],
            "waybill": res.get("waybill_number", ""),
        }), 200

    return jsonify({"error": f"Delhivery error: {res.get('error')}"}), 500


@app.route("/api/admin/dispatch-jobs", methods=["GET"])
@admin_required
def list_dispatch_jobs():
    status = request.args.get("status")
    q = DispatchJob.query
    if status:
        q = q.filter_by(status=status)
    return jsonify([j.to_dict() for j in q.order_by(DispatchJob.created_at.desc()).limit(100).all()])


@app.route("/api/webhooks/delhivery", methods=["POST"])
def delhivery_webhook():
    data = request.get_json(silent=True) or {}
    shipment_id = str(data.get("shipment_id", ""))
    status = data.get("status", "")

    # Map Delhivery status to our order status
    STATUS_MAP = {
        "delivered": "Delivered",
        "delivered_order": "Delivered",
        "cancelled": "Cancelled",
        "rto": "Returned",
        "in_transit": "Shipped",
        "in_shipment": "Shipped",
        "out_for_delivery": "Out for Delivery",
        "pending": "Processing",
        "failed": "Failed",
    }
    new_status = STATUS_MAP.get(status, status)

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
        from sqlalchemy import func

        most_sold_raw = (
            db_mysql.session.query(
                OrderItem.product_id_str,
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("total_sold"),
                func.sum(OrderItem.price * OrderItem.quantity).label("total_revenue"),
            )
            .group_by(OrderItem.product_id_str, OrderItem.product_name)
            .order_by(text('total_sold DESC'))
            .limit(10).all()
        )
        most_sold = [{"id": r[0], "name": r[1], "total_sold": int(r[2]), "total_revenue": float(r[3])} for r in most_sold_raw]

        fav_raw = (
            db_mysql.session.query(
                WishlistItem.product_id_str, func.count(WishlistItem.id).label("count")
            ).group_by(WishlistItem.product_id_str).order_by(func.desc("count")).limit(10).all()
        )
        most_favorited = []
        for r in fav_raw:
            try:
                prod = ProductSQL.query.get(int(r[0]))
                if prod:
                    most_favorited.append({"id": str(prod.id), "name": prod.name, "count": r[1]})
            except (TypeError, ValueError):
                continue

        cart_raw = (
            db_mysql.session.query(
                CartItem.product_id_str,
                func.sum(CartItem.quantity).label("total_qty"),
                func.count(CartItem.user_id.distinct()).label("user_count"),
            ).group_by(CartItem.product_id_str).order_by(func.desc("total_qty")).limit(10).all()
        )
        most_added_to_cart = []
        for r in cart_raw:
            try:
                prod = ProductSQL.query.get(int(r[0]))
                if prod:
                    most_added_to_cart.append({
                        "id": str(prod.id), "name": prod.name,
                        "total_quantity": int(r[1]), "user_count": r[2],
                    })
            except (TypeError, ValueError):
                continue

        products_stock = ProductSQL.query.order_by(ProductSQL.stock.asc()).all()
        all_stock, low_stock = [], []
        for p in products_stock:
            entry = {"id": str(p.id), "name": p.name, "stock": p.stock, "category": p.category or "Uncategorized"}
            all_stock.append(entry)
            if p.stock <= 5:
                low_stock.append(entry)

        cat_raw = (
            db_mysql.session.query(
                ProductSQL.category,
                func.count(ProductSQL.id).label("count"),
                func.sum(ProductSQL.stock).label("total_stock"),
            ).group_by(ProductSQL.category).all()
        )
        category_stats = [{"_id": r[0] or "Uncategorized", "count": r[1], "total_stock": int(r[2] or 0)} for r in cat_raw]

        # Revenue summary
        from sqlalchemy import extract
        now = datetime.utcnow()
        monthly_revenue_raw = (
            db_mysql.session.query(
                extract("year", OrderSQL.created_at).label("year"),
                extract("month", OrderSQL.created_at).label("month"),
                func.sum(OrderSQL.total).label("revenue"),
                func.count(OrderSQL.id).label("orders"),
            )
            .filter(OrderSQL.payment_status == "Paid")
            .group_by("year", "month")
            .order_by("year", "month")
            .limit(12).all()
        )
        monthly_revenue = [
            {"year": int(r[0]), "month": int(r[1]), "revenue": float(r[2]), "orders": int(r[3])}
            for r in monthly_revenue_raw
        ]

        return jsonify({
            "most_sold":          most_sold,
            "most_favorited":     most_favorited,
            "most_added_to_cart": most_added_to_cart,
            "low_stock":          low_stock,
            "all_stock":          all_stock,
            "category_stats":     category_stats,
            "monthly_revenue":    monthly_revenue,
        }), 200

    except Exception as exc:
        app.logger.error("analysis_error err=%s", exc)
        return jsonify({"error": str(exc)}), 500

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
        "id":         str(user.id),
        "first_name": user.first_name or "",
        "last_name":  user.last_name or "",
        "email":      user.email,
        "phone":      user.phone or "N/A",
        "date_joined": user.created_at.isoformat() if user.created_at else None,
        "is_blocked": user.is_blocked,
        "address":    address,
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

    user.is_blocked = is_blocked
    _audit(
        "customer_blocked" if is_blocked else "customer_unblocked",
        "user", customer_id,
    )
    db_mysql.session.commit()
    action = "blocked" if is_blocked else "unblocked"
    return jsonify({"success": True, "message": f"Customer {action}"}), 200

# ============================================================
# CATEGORIES
# ============================================================

@app.route("/api/categories", methods=["GET"])
def get_categories():
    return jsonify([c.to_dict() for c in CategorySQL.query.all()])


@app.route("/api/categories", methods=["POST"])
@admin_required
def add_category():
    data       = request.get_json() or {}
    name       = data.get("name", "").strip()
    subcategory = data.get("subcategory", "").strip()
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
        return jsonify({"error": str(exc)}), 500


@app.route("/api/categories/<int:cat_id>", methods=["DELETE"])
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
        return jsonify({"error": str(exc)}), 500


@app.route("/api/categories/<int:cat_id>/subcategories", methods=["DELETE"])
@admin_required
def delete_subcategory(cat_id):
    data       = request.get_json() or {}
    subcategory = data.get("subcategory")
    if not subcategory:
        return jsonify({"error": "Subcategory name required"}), 400

    cat = CategorySQL.query.get(cat_id)
    if not cat:
        return jsonify({"error": "Category not found"}), 404

    subs = cat.subcategories
    if subcategory in subs:
        subs.remove(subcategory)
        cat.subcategories = subs
        db_mysql.session.commit()
        return jsonify({"success": True}), 200
    return jsonify({"error": "Subcategory not found"}), 404

# ============================================================
# HOMEPAGE CONFIG
# ============================================================

_DEFAULT_HOMEPAGE = {
    "hero_slides": [{
        "image":      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564",
        "content":    "ETHEREAL SHADOWS: FALL WINTER 2025",
        "product_id": "",
    }],
    "manifesto_text": (
        "We believe in the quiet power of silence. In a world of noise, "
        "U.S ATELIER is the absence of it."
    ),
    "bestseller_product_ids":   [],
    "featured_product_ids":     [],
    "new_arrival_product_ids":  [],
}


@app.route("/api/homepage", methods=["GET"])
def get_homepage_config():
    config = HomepageConfig.query.filter_by(config_type="main").first()
    return jsonify(config.to_dict() if config else _DEFAULT_HOMEPAGE)


@app.route("/api/homepage", methods=["POST"])
@admin_required
def update_homepage_config():
    data = request.get_json() or {}
    try:
        config = HomepageConfig.query.filter_by(config_type="main").first()
        if not config:
            config = HomepageConfig(config_type="main")
            db_mysql.session.add(config)

        config.hero_slides      = data.get("hero_slides", [])
        config.manifesto_text   = data.get("manifesto_text")
        config.bestseller_ids   = data.get("bestseller_product_ids", [])
        config.featured_ids     = data.get("featured_product_ids", [])
        config.new_arrival_ids  = data.get("new_arrival_product_ids", [])
        config.updated_at       = datetime.utcnow()

        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Homepage updated"}), 200
    except Exception as exc:
        db_mysql.session.rollback()
        return jsonify({"error": str(exc)}), 500

# ============================================================
# ADMIN — AUDIT LOG
# ============================================================

@app.route("/api/admin/audit-log", methods=["GET"])
@admin_required
def get_audit_log():
    page  = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 50)), 200)
    logs  = (
        AuditLog.query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * limit).limit(limit).all()
    )
    return jsonify([l.to_dict() for l in logs])

# ============================================================
# ADMIN — DELHIVERY TEST ENDPOINT
# ============================================================

@app.route("/api/admin/test/delhivery", methods=["POST"])
@admin_required
def test_delhivery_shipment():
    data = request.get_json() or {}
    test_type = data.get("test_type", "all")
    results = {}

    if test_type in ("all", "pincode"):
        pincode = data.get("pincode", "110001")
        results["pincode_validation"] = {
            "pincode": pincode,
            "is_serviceable": validate_pincode(pincode),
        }

    if test_type in ("all", "shipping"):
        origin = data.get("origin_pincode", os.getenv("STORE_PINCODE", "110001"))
        dest = data.get("destination_pincode", "400001")
        weight = float(data.get("weight", 1.0))
        results["shipping_calculation"] = {
            "origin_pincode": origin,
            "destination_pincode": dest,
            "weight_kg": weight,
            "estimated_cost": calculate_shipping(origin, dest, weight),
        }

    if test_type == "create":
        pickup_loc = {
            "address": data.get("pickup_address", os.getenv("STORE_ADDRESS", "")),
            "city": data.get("pickup_city", os.getenv("STORE_CITY", "")),
            "state": data.get("pickup_state", os.getenv("STORE_STATE", "")),
            "pincode": data.get("pickup_pincode", os.getenv("STORE_PINCODE", "")),
        }
        delivery_loc = {
            "address": data.get("delivery_address", ""),
            "city": data.get("delivery_city", ""),
            "state": data.get("delivery_state", ""),
            "pincode": data.get("delivery_pincode", ""),
        }
        results["shipment_creation"] = create_shipment(
            order_id=f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            pickup_location=pickup_loc,
            delivery_location=delivery_loc,
            customer_phone=data.get("phone", "9876543210"),
            customer_name=data.get("name", "Test Customer"),
            weight_kg=float(data.get("weight", 1.0)),
        )

    return jsonify({
        "success": True,
        "results": results,
        "environment": {
            "delhivery_api_key_configured": bool(os.getenv("DELHIVERY_API_KEY")),
            "delhivery_facility_code": os.getenv("DELHIVERY_FACILITY_CODE", ""),
            "store_address": os.getenv("STORE_ADDRESS"),
            "store_pincode": os.getenv("STORE_PINCODE"),
        },
    })

# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=not is_production)
