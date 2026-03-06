from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db_mysql = SQLAlchemy()

class User(db_mysql.Model):
    __tablename__ = 'users'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    email = db_mysql.Column(db_mysql.String(255), unique=True, nullable=False)
    password_hash = db_mysql.Column(db_mysql.String(255), nullable=False)
    first_name = db_mysql.Column(db_mysql.String(100))
    last_name = db_mysql.Column(db_mysql.String(100))
    phone = db_mysql.Column(db_mysql.String(20))
    profile_pic = db_mysql.Column(db_mysql.Text) # Add this line
    is_admin = db_mysql.Column(db_mysql.Boolean, default=False)
    is_blocked = db_mysql.Column(db_mysql.Boolean, default=False)
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

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
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)

    items = db_mysql.relationship('OrderItem', backref='order', lazy=True)

class OrderItem(db_mysql.Model):
    __tablename__ = 'order_items'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    order_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('orders.id'), nullable=False)
    product_id_str = db_mysql.Column(db_mysql.String(50)) # To store original mongo ID if needed
    product_name = db_mysql.Column(db_mysql.String(255))
    quantity = db_mysql.Column(db_mysql.Integer, nullable=False)
    price = db_mysql.Column(db_mysql.Float, nullable=False)
    size = db_mysql.Column(db_mysql.String(20))

class CartItem(db_mysql.Model):
    __tablename__ = 'cart_items'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('users.id'))
    product_id_str = db_mysql.Column(db_mysql.String(50))
    quantity = db_mysql.Column(db_mysql.Integer, default=1)
    size = db_mysql.Column(db_mysql.String(20))

class WishlistItem(db_mysql.Model):
    __tablename__ = 'wishlist_items'
    id = db_mysql.Column(db_mysql.Integer, primary_key=True)
    user_id = db_mysql.Column(db_mysql.Integer, db_mysql.ForeignKey('users.id'))
    product_id_str = db_mysql.Column(db_mysql.String(50))
    created_at = db_mysql.Column(db_mysql.DateTime, default=datetime.utcnow)
