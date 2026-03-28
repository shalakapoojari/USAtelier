"""
models_mysql.py — SQLAlchemy models for U.S Atelier
Enterprise additions:
  - DispatchJob       (retry-safe Borzo queue)
  - Coupon            (discount codes)
  - PasswordResetToken
  - AuditLog          (admin action trail)
  - account lockout fields on User
  - idempotency_key on Order
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db_mysql = SQLAlchemy()


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(db_mysql.Model):
    __tablename__ = "users"

    id                    = db_mysql.Column(db_mysql.Integer, primary_key=True)
    email                 = db_mysql.Column(db_mysql.String(255), unique=True, nullable=False)
    password              = db_mysql.Column(db_mysql.String(255), nullable=False)
    first_name            = db_mysql.Column(db_mysql.String(100))
    last_name             = db_mysql.Column(db_mysql.String(100))
    phone                 = db_mysql.Column(db_mysql.String(20))
    profile_pic           = db_mysql.Column(db_mysql.Text)
    is_admin              = db_mysql.Column(db_mysql.Boolean, default=False)
    is_blocked            = db_mysql.Column(db_mysql.Boolean, default=False)
    addresses_json        = db_mysql.Column(db_mysql.Text, default="[]")
    # Account lockout
    failed_login_attempts = db_mysql.Column(db_mysql.Integer, default=0)
    locked_until          = db_mysql.Column(db_mysql.DateTime, nullable=True)
    # Audit
    last_login_at         = db_mysql.Column(db_mysql.DateTime, nullable=True)
    last_login_ip         = db_mysql.Column(db_mysql.String(45), nullable=True)
    created_at            = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    @property
    def JSON_addresses(self):
        return json.loads(self.addresses_json) if self.addresses_json else []

    @JSON_addresses.setter
    def JSON_addresses(self, value):
        self.addresses_json = json.dumps(value)

    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > datetime.utcnow())

    def to_dict(self):
        return {
            "id":         self.id,
            "email":      self.email,
            "firstName":  self.first_name,
            "lastName":   self.last_name,
            "phone":      self.phone,
            "profilePic": self.profile_pic,
            "isAdmin":    self.is_admin,
            "isBlocked":  self.is_blocked,
            "addresses":  self.JSON_addresses,
            "createdAt":  self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class Category(db_mysql.Model):
    __tablename__ = "categories"

    id                  = db_mysql.Column(db_mysql.Integer, primary_key=True)
    name                = db_mysql.Column(db_mysql.String(100), unique=True, nullable=False)
    subcategories_json  = db_mysql.Column(db_mysql.Text)
    created_at          = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    @property
    def subcategories(self):
        return json.loads(self.subcategories_json) if self.subcategories_json else []

    @subcategories.setter
    def subcategories(self, value):
        self.subcategories_json = json.dumps(value)

    def to_dict(self):
        return {
            "id":            self.id,
            "name":          self.name,
            "subcategories": self.subcategories,
            "createdAt":     self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class Product(db_mysql.Model):
    __tablename__ = "products"

    id               = db_mysql.Column(db_mysql.Integer, primary_key=True)
    name             = db_mysql.Column(db_mysql.String(255), nullable=False)
    price            = db_mysql.Column(db_mysql.Float, nullable=False)
    category         = db_mysql.Column(db_mysql.String(100))
    subcategory      = db_mysql.Column(db_mysql.String(100))
    gender           = db_mysql.Column(db_mysql.String(50))
    description      = db_mysql.Column(db_mysql.Text)
    images_json      = db_mysql.Column(db_mysql.Text)
    sizes_json       = db_mysql.Column(db_mysql.Text)
    stock            = db_mysql.Column(db_mysql.Integer, default=0)
    is_featured      = db_mysql.Column(db_mysql.Boolean, default=False)
    is_new           = db_mysql.Column(db_mysql.Boolean, default=False)
    is_bestseller    = db_mysql.Column(db_mysql.Boolean, default=False)
    fabric           = db_mysql.Column(db_mysql.String(255))
    care             = db_mysql.Column(db_mysql.Text)
    size_guide_image = db_mysql.Column(db_mysql.Text)
    created_at       = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    @property
    def images(self):
        return json.loads(self.images_json) if self.images_json else []

    @images.setter
    def images(self, value):
        self.images_json = json.dumps(value)

    @property
    def sizes(self):
        return json.loads(self.sizes_json) if self.sizes_json else []

    @sizes.setter
    def sizes(self, value):
        self.sizes_json = json.dumps(value)

    def to_dict(self):
        return {
            "id":            self.id,
            "name":          self.name,
            "price":         self.price,
            "category":      self.category,
            "subcategory":   self.subcategory,
            "gender":        self.gender,
            "description":   self.description,
            "images":        self.images,
            "sizes":         self.sizes,
            "stock":         self.stock,
            "isFeatured":    self.is_featured,
            "isNew":         self.is_new,
            "isBestseller":  self.is_bestseller,
            "fabric":        self.fabric,
            "care":          self.care,
            "sizeGuideImage": self.size_guide_image,
            "createdAt":     self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------

class Payment(db_mysql.Model):
    __tablename__ = "payments"

    id                    = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id               = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("users.id"), nullable=True)
    order_id              = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("orders.id"), nullable=True)
    razorpay_order_id     = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True, index=True)
    razorpay_payment_id   = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True, index=True)
    amount                = db_mysql.Column(db_mysql.Float, nullable=False)
    currency              = db_mysql.Column(db_mysql.String(10), default="INR")
    status                = db_mysql.Column(db_mysql.String(50), default="pending")
    method                = db_mysql.Column(db_mysql.String(50), nullable=True)
    email                 = db_mysql.Column(db_mysql.String(255), nullable=True)
    phone                 = db_mysql.Column(db_mysql.String(50), nullable=True)
    error_code            = db_mysql.Column(db_mysql.String(100), nullable=True)
    error_description     = db_mysql.Column(db_mysql.Text, nullable=True)
    created_at            = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)
    updated_at            = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id":                  self.id,
            "user_id":             self.user_id,
            "order_id":            self.order_id,
            "razorpay_order_id":   self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "amount":              self.amount,
            "currency":            self.currency,
            "status":              self.status,
            "method":              self.method,
            "email":               self.email,
            "phone":               self.phone,
            "created_at":          self.created_at.isoformat() if self.created_at else None,
            "updated_at":          self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# Order + OrderItem
# ---------------------------------------------------------------------------

class Order(db_mysql.Model):
    __tablename__ = "orders"

    id                    = db_mysql.Column(db_mysql.Integer, primary_key=True)
    order_number          = db_mysql.Column(db_mysql.String(50), unique=True, nullable=False, index=True)
    idempotency_key       = db_mysql.Column(db_mysql.String(64), unique=True, nullable=True, index=True)
    user_id               = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("users.id"))
    total                 = db_mysql.Column(db_mysql.Float, nullable=False)
    status                = db_mysql.Column(db_mysql.String(50), default="Pending")
    payment_status        = db_mysql.Column(db_mysql.String(50), default="Pending")
    shipping_address_json = db_mysql.Column(db_mysql.Text)
    coupon_code           = db_mysql.Column(db_mysql.String(50), nullable=True)
    discount_amount       = db_mysql.Column(db_mysql.Float, default=0.0)
    # Delhivery
    delhivery_shipment_id = db_mysql.Column(db_mysql.String(100), nullable=True, index=True)
    delhivery_tracking_url = db_mysql.Column(db_mysql.String(500), nullable=True)
    delhivery_waybill_number = db_mysql.Column(db_mysql.String(100), nullable=True)
    # Borzo (deprecated, kept for backward compatibility)
    borzo_order_id        = db_mysql.Column(db_mysql.String(100), nullable=True, index=True)
    borzo_tracking_url    = db_mysql.Column(db_mysql.String(500), nullable=True)
    # Razorpay
    razorpay_order_id     = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True, index=True)
    razorpay_payment_id   = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True)
    created_at            = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    items = db_mysql.relationship("OrderItem", backref="order", lazy=True, cascade="all, delete-orphan")

    @property
    def shipping_address(self):
        return json.loads(self.shipping_address_json) if self.shipping_address_json else {}

    @shipping_address.setter
    def shipping_address(self, value):
        self.shipping_address_json = json.dumps(value)

    def to_dict(self):
        return {
            "id":                     self.id,
            "order_number":           self.order_number,
            "total":                  self.total,
            "status":                 self.status,
            "payment_status":         self.payment_status,
            "razorpay_payment_id":    self.razorpay_payment_id,
            "shipping_address":       self.shipping_address,
            "delhivery_tracking_url": self.delhivery_tracking_url,
            "delhivery_waybill":      self.delhivery_waybill_number,
            "borzo_tracking_url":     self.borzo_tracking_url,  # deprecated
            "coupon_code":            self.coupon_code,
            "discount_amount":        self.discount_amount,
            "createdAt":              self.created_at.isoformat() if self.created_at else None,
            "items":                  [item.to_dict() for item in self.items],
        }


class OrderItem(db_mysql.Model):
    __tablename__ = "order_items"

    id              = db_mysql.Column(db_mysql.Integer, primary_key=True)
    order_id        = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("orders.id"), nullable=False)
    product_id_str  = db_mysql.Column(db_mysql.String(50))
    product_name    = db_mysql.Column(db_mysql.String(255))
    quantity        = db_mysql.Column(db_mysql.Integer, nullable=False)
    price           = db_mysql.Column(db_mysql.Float, nullable=False)
    size            = db_mysql.Column(db_mysql.String(20))

    def to_dict(self):
        return {
            "id":           self.id,
            "product_name": self.product_name,
            "quantity":     self.quantity,
            "price":        self.price,
            "size":         self.size,
        }


# ---------------------------------------------------------------------------
# Cart & Wishlist
# ---------------------------------------------------------------------------

class CartItem(db_mysql.Model):
    __tablename__ = "cart_items"

    id              = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id         = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("users.id"))
    product_id_str  = db_mysql.Column(db_mysql.String(50))
    quantity        = db_mysql.Column(db_mysql.Integer, default=1)
    size            = db_mysql.Column(db_mysql.String(20))

    def to_dict(self):
        return {
            "id":         self.id,
            "product_id": self.product_id_str,
            "quantity":   self.quantity,
            "size":       self.size,
        }


class WishlistItem(db_mysql.Model):
    __tablename__ = "wishlist_items"

    id              = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id         = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("users.id"))
    product_id_str  = db_mysql.Column(db_mysql.String(50))
    created_at      = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":         self.id,
            "product_id": self.product_id_str,
            "createdAt":  self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Review
# ---------------------------------------------------------------------------

class Review(db_mysql.Model):
    __tablename__ = "reviews"

    id              = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id         = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("users.id"))
    user_email      = db_mysql.Column(db_mysql.String(255))
    product_id_str  = db_mysql.Column(db_mysql.String(50))
    rating          = db_mysql.Column(db_mysql.Integer, nullable=False)
    comment         = db_mysql.Column(db_mysql.Text)
    created_at      = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":      self.id,
            "user":    self.user_email,
            "rating":  self.rating,
            "comment": self.comment,
            "date":    self.created_at.isoformat() if self.created_at else "",
        }


# ---------------------------------------------------------------------------
# HomepageConfig
# ---------------------------------------------------------------------------

class HomepageConfig(db_mysql.Model):
    __tablename__ = "homepage_config"

    id                    = db_mysql.Column(db_mysql.Integer, primary_key=True)
    config_type           = db_mysql.Column(db_mysql.String(50), unique=True, default="main")
    hero_slides_json      = db_mysql.Column(db_mysql.Text, default="[]")
    manifesto_text        = db_mysql.Column(db_mysql.Text)
    bestseller_ids_json   = db_mysql.Column(db_mysql.Text, default="[]")
    featured_ids_json     = db_mysql.Column(db_mysql.Text, default="[]")
    new_arrival_ids_json  = db_mysql.Column(db_mysql.Text, default="[]")
    updated_at            = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    @property
    def hero_slides(self):
        return json.loads(self.hero_slides_json) if self.hero_slides_json else []

    @hero_slides.setter
    def hero_slides(self, value):
        self.hero_slides_json = json.dumps(value)

    @property
    def bestseller_ids(self):
        return json.loads(self.bestseller_ids_json) if self.bestseller_ids_json else []

    @bestseller_ids.setter
    def bestseller_ids(self, value):
        self.bestseller_ids_json = json.dumps(value)

    @property
    def featured_ids(self):
        return json.loads(self.featured_ids_json) if self.featured_ids_json else []

    @featured_ids.setter
    def featured_ids(self, value):
        self.featured_ids_json = json.dumps(value)

    @property
    def new_arrival_ids(self):
        return json.loads(self.new_arrival_ids_json) if self.new_arrival_ids_json else []

    @new_arrival_ids.setter
    def new_arrival_ids(self, value):
        self.new_arrival_ids_json = json.dumps(value)

    def to_dict(self):
        return {
            "hero_slides":            self.hero_slides,
            "manifesto_text":         self.manifesto_text,
            "bestseller_product_ids": self.bestseller_ids,
            "featured_product_ids":   self.featured_ids,
            "new_arrival_product_ids": self.new_arrival_ids,
            "updated_at":             self.updated_at.isoformat() if self.updated_at else None,
        }


# ---------------------------------------------------------------------------
# DispatchJob — retry-safe Borzo queue
# ---------------------------------------------------------------------------

class DispatchJob(db_mysql.Model):
    """
    Persisted queue for Borzo dispatch tasks.
    A background scheduler polls this table every 60 s and retries
    failed jobs with exponential back-off (max 5 attempts).
    """
    __tablename__ = "dispatch_jobs"

    id              = db_mysql.Column(db_mysql.Integer, primary_key=True)
    order_id        = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("orders.id"), nullable=False, index=True)
    status          = db_mysql.Column(db_mysql.String(20), default="pending", index=True)
    # pending | running | done | failed
    attempts        = db_mysql.Column(db_mysql.Integer, default=0)
    max_attempts    = db_mysql.Column(db_mysql.Integer, default=5)
    last_error      = db_mysql.Column(db_mysql.Text, nullable=True)
    next_attempt_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow, index=True)
    created_at      = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)
    completed_at    = db_mysql.Column(db_mysql.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id":              self.id,
            "order_id":        self.order_id,
            "status":          self.status,
            "attempts":        self.attempts,
            "last_error":      self.last_error,
            "next_attempt_at": self.next_attempt_at.isoformat() if self.next_attempt_at else None,
            "created_at":      self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Coupon
# ---------------------------------------------------------------------------

class Coupon(db_mysql.Model):
    __tablename__ = "coupons"

    id               = db_mysql.Column(db_mysql.Integer, primary_key=True)
    code             = db_mysql.Column(db_mysql.String(50), unique=True, nullable=False, index=True)
    discount_type    = db_mysql.Column(db_mysql.String(20), nullable=False)  # "percent" | "fixed"
    discount_value   = db_mysql.Column(db_mysql.Float, nullable=False)
    min_order_amount = db_mysql.Column(db_mysql.Float, default=0.0)
    max_uses         = db_mysql.Column(db_mysql.Integer, nullable=True)      # None = unlimited
    uses             = db_mysql.Column(db_mysql.Integer, default=0)
    expires_at       = db_mysql.Column(db_mysql.DateTime, nullable=True)
    is_active        = db_mysql.Column(db_mysql.Boolean, default=True)
    created_at       = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    def is_valid(self, order_subtotal: float) -> tuple:
        """
        Returns (True, None) or (False, "reason string").
        """
        if not self.is_active:
            return False, "Coupon is inactive"
        if self.expires_at and self.expires_at < datetime.utcnow():
            return False, "Coupon has expired"
        if self.max_uses is not None and self.uses >= self.max_uses:
            return False, "Coupon usage limit reached"
        if order_subtotal < self.min_order_amount:
            return False, f"Minimum order amount is ₹{self.min_order_amount:.0f}"
        return True, None

    def apply(self, subtotal: float) -> float:
        """Return the discount amount (not the final price)."""
        if self.discount_type == "percent":
            return round(subtotal * self.discount_value / 100, 2)
        return min(self.discount_value, subtotal)

    def to_dict(self):
        return {
            "id":               self.id,
            "code":             self.code,
            "discount_type":    self.discount_type,
            "discount_value":   self.discount_value,
            "min_order_amount": self.min_order_amount,
            "max_uses":         self.max_uses,
            "uses":             self.uses,
            "expires_at":       self.expires_at.isoformat() if self.expires_at else None,
            "is_active":        self.is_active,
        }


# ---------------------------------------------------------------------------
# PasswordResetToken
# ---------------------------------------------------------------------------

class PasswordResetToken(db_mysql.Model):
    __tablename__ = "password_reset_tokens"

    id         = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id    = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("users.id"), nullable=False)
    token_hash = db_mysql.Column(db_mysql.String(128), unique=True, nullable=False, index=True)
    expires_at = db_mysql.Column(db_mysql.DateTime, nullable=False)
    used       = db_mysql.Column(db_mysql.Boolean, default=False)
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    def is_valid(self) -> bool:
        return not self.used and self.expires_at > datetime.utcnow()


# ---------------------------------------------------------------------------
# AuditLog
# ---------------------------------------------------------------------------

class AuditLog(db_mysql.Model):
    """Lightweight record of admin actions for compliance / debugging."""
    __tablename__ = "audit_logs"

    id          = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id     = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey("users.id"), nullable=True)
    action      = db_mysql.Column(db_mysql.String(100), nullable=False)
    entity_type = db_mysql.Column(db_mysql.String(50), nullable=True)   # "order" | "product" | etc.
    entity_id   = db_mysql.Column(db_mysql.String(50), nullable=True)
    detail      = db_mysql.Column(db_mysql.Text, nullable=True)         # JSON string, no PII
    ip_address  = db_mysql.Column(db_mysql.String(45), nullable=True)
    created_at  = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id":          self.id,
            "user_id":     self.user_id,
            "action":      self.action,
            "entity_type": self.entity_type,
            "entity_id":   self.entity_id,
            "detail":      self.detail,
            "ip_address":  self.ip_address,
            "created_at":  self.created_at.isoformat() if self.created_at else None,
        }
