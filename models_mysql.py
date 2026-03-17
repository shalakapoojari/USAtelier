from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import os

db_mysql = SQLAlchemy()


def _backend_base() -> str:
    return os.getenv('BACKEND_URL', '').strip().rstrip('/')


def _public_asset_url(value):
    if value is None:
        return value
    raw = str(value).strip()
    if not raw:
        return raw
    if raw.startswith('http://') or raw.startswith('https://') or raw.startswith('data:') or raw.startswith('blob:'):
        return raw
    if not raw.startswith('/'):
        raw = f'/{raw}'

    base = _backend_base()
    return f'{base}{raw}' if base else raw

class User(db_mysql.Model):
    __tablename__ = 'users'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    email = db_mysql.Column(db_mysql.String(255), unique=True, nullable=False)
    password = db_mysql.Column(db_mysql.String(255), nullable=False)
    first_name = db_mysql.Column(db_mysql.String(100))
    last_name = db_mysql.Column(db_mysql.String(100))
    phone = db_mysql.Column(db_mysql.String(20))
    profile_pic = db_mysql.Column(db_mysql.Text) # Add this line
    is_admin = db_mysql.Column(db_mysql.Boolean, default=False)
    is_blocked = db_mysql.Column(db_mysql.Boolean, default=False)
    addresses_json = db_mysql.Column(db_mysql.Text, default='[]')
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    @property
    def JSON_addresses(self):
        return json.loads(self.addresses_json) if self.addresses_json else []

    @JSON_addresses.setter
    def JSON_addresses(self, value):
        self.addresses_json = json.dumps(value)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone,
            'profilePic': self.profile_pic,
            'isAdmin': self.is_admin,
            'isBlocked': self.is_blocked,
            'addresses': self.JSON_addresses,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Category(db_mysql.Model):
    __tablename__ = 'categories'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    name = db_mysql.Column(db_mysql.String(100), unique=True, nullable=False)
    subcategories_json = db_mysql.Column(db_mysql.Text) # Stored as JSON string
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    @property
    def subcategories(self):
        return json.loads(self.subcategories_json) if self.subcategories_json else []

    @subcategories.setter
    def subcategories(self, value):
        self.subcategories_json = json.dumps(value)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'subcategories': self.subcategories,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Product(db_mysql.Model):
    __tablename__ = 'products'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    name = db_mysql.Column(db_mysql.String(255), nullable=False)
    price = db_mysql.Column(db_mysql.Float, nullable=False)
    category = db_mysql.Column(db_mysql.String(100))
    subcategory = db_mysql.Column(db_mysql.String(100))
    gender = db_mysql.Column(db_mysql.String(50))
    description = db_mysql.Column(db_mysql.Text)
    images_json = db_mysql.Column(db_mysql.Text) # Stored as JSON string
    sizes_json = db_mysql.Column(db_mysql.Text) # Stored as JSON string
    stock = db_mysql.Column(db_mysql.Integer, default=0)
    is_featured = db_mysql.Column(db_mysql.Boolean, default=False)
    is_new = db_mysql.Column(db_mysql.Boolean, default=False)
    is_bestseller = db_mysql.Column(db_mysql.Boolean, default=False)
    fabric = db_mysql.Column(db_mysql.String(255))
    care = db_mysql.Column(db_mysql.Text)
    size_guide_image = db_mysql.Column(db_mysql.Text) # Stored as URL or path
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

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
        normalized_images = [_public_asset_url(img) for img in self.images]
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'category': self.category,
            'subcategory': self.subcategory,
            'gender': self.gender,
            'description': self.description,
            'images': normalized_images,
            'sizes': self.sizes,
            'stock': self.stock,
            'isFeatured': self.is_featured,
            'isNew': self.is_new,
            'isBestseller': self.is_bestseller,
            'fabric': self.fabric,
            'care': self.care,
            'sizeGuideImage': _public_asset_url(self.size_guide_image),
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Payment(db_mysql.Model):
    __tablename__ = 'payments'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('users.id'), nullable=True)
    order_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('orders.id'), nullable=True)
    razorpay_order_id = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True)
    razorpay_payment_id = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True)
    amount = db_mysql.Column(db_mysql.Float, nullable=False)
    currency = db_mysql.Column(db_mysql.String(10), default='INR')
    status = db_mysql.Column(db_mysql.String(50), default='pending') # pending, captured, failed, refunded
    method = db_mysql.Column(db_mysql.String(50), nullable=True) # card, upi, etc.
    email = db_mysql.Column(db_mysql.String(255), nullable=True)
    phone = db_mysql.Column(db_mysql.String(50), nullable=True)
    error_code = db_mysql.Column(db_mysql.String(100), nullable=True)
    error_description = db_mysql.Column(db_mysql.Text, nullable=True)
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)
    updated_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "order_id": self.order_id,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "method": self.method,
            "email": self.email,
            "phone": self.phone,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Order(db_mysql.Model):
    __tablename__ = 'orders'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    order_number = db_mysql.Column(db_mysql.String(50), unique=True, nullable=False)
    user_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('users.id'))
    total = db_mysql.Column(db_mysql.Float, nullable=False)
    status = db_mysql.Column(db_mysql.String(50), default='Pending')
    payment_status = db_mysql.Column(db_mysql.String(50), default='Pending')
    shipping_address_json = db_mysql.Column(db_mysql.Text)
    borzo_order_id = db_mysql.Column(db_mysql.String(100))
    borzo_tracking_url = db_mysql.Column(db_mysql.String(500))
    razorpay_order_id = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True)
    razorpay_payment_id = db_mysql.Column(db_mysql.String(255), unique=True, nullable=True)
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    items = db_mysql.relationship('OrderItem', backref='order', lazy=True)

    @property
    def shipping_address(self):
        return json.loads(self.shipping_address_json) if self.shipping_address_json else {}

    @shipping_address.setter
    def shipping_address(self, value):
        self.shipping_address_json = json.dumps(value)

    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'total': self.total,
            'status': self.status,
            'payment_status': self.payment_status,
            'razorpay_payment_id': self.razorpay_payment_id,
            'shipping_address': self.shipping_address,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'items': [item.to_dict() for item in self.items]
        }

class OrderItem(db_mysql.Model):
    __tablename__ = 'order_items'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    order_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('orders.id'), nullable=False)
    product_id_str = db_mysql.Column(db_mysql.String(50)) # To store original mongo ID if needed
    product_name = db_mysql.Column(db_mysql.String(255))
    quantity = db_mysql.Column(db_mysql.Integer, nullable=False)
    price = db_mysql.Column(db_mysql.Float, nullable=False)
    size = db_mysql.Column(db_mysql.String(20))

    def to_dict(self):
        return {
            'id': self.id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'price': self.price,
            'size': self.size
        }

class CartItem(db_mysql.Model):
    __tablename__ = 'cart_items'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('users.id'))
    product_id_str = db_mysql.Column(db_mysql.String(50))
    quantity = db_mysql.Column(db_mysql.Integer, default=1)
    size = db_mysql.Column(db_mysql.String(20))

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id_str, # In SQL it might still refer to string ID for compatibility
            'quantity': self.quantity,
            'size': self.size
        }

class WishlistItem(db_mysql.Model):
    __tablename__ = 'wishlist_items'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('users.id'))
    product_id_str = db_mysql.Column(db_mysql.String(50))
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id_str,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
class Review(db_mysql.Model):
    __tablename__ = 'reviews'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('users.id'))
    user_email = db_mysql.Column(db_mysql.String(255))
    product_id_str = db_mysql.Column(db_mysql.String(50))
    rating = db_mysql.Column(db_mysql.Integer, nullable=False)
    comment = db_mysql.Column(db_mysql.Text)
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user': self.user_email,
            'rating': self.rating,
            'comment': self.comment,
            'date': self.created_at.isoformat() if self.created_at else ''
        }
class HomepageConfig(db_mysql.Model):
    __tablename__ = 'homepage_config'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    config_type = db_mysql.Column(db_mysql.String(50), unique=True, default='main')
    hero_slides_json = db_mysql.Column(db_mysql.Text, default='[]')
    manifesto_text = db_mysql.Column(db_mysql.Text)
    bestseller_ids_json = db_mysql.Column(db_mysql.Text, default='[]')
    featured_ids_json = db_mysql.Column(db_mysql.Text, default='[]')
    new_arrival_ids_json = db_mysql.Column(db_mysql.Text, default='[]')
    updated_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

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
        normalized_slides = []
        for slide in self.hero_slides:
            if isinstance(slide, dict):
                next_slide = dict(slide)
                next_slide['image'] = _public_asset_url(next_slide.get('image'))
                normalized_slides.append(next_slide)
            else:
                normalized_slides.append(slide)

        return {
            'hero_slides': normalized_slides,
            'manifesto_text': self.manifesto_text,
            'bestseller_product_ids': self.bestseller_ids,
            'featured_product_ids': self.featured_ids,
            'new_arrival_product_ids': self.new_arrival_ids,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
