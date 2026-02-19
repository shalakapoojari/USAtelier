from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import json

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    orders = db.relationship('Order', backref='user', lazy=True)
    cart_items = db.relationship('CartItem', backref='user', lazy=True)
    reviews = db.relationship('Review', backref='user', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    stock = db.Column(db.Integer, default=0)
    images = db.Column(db.Text, default='[]')  # JSON string of image URLs
    sizes = db.Column(db.Text, default='[]')   # JSON string of available sizes
    colors = db.Column(db.Text, default='[]')  # JSON string of available colors
    tags = db.Column(db.Text, default='[]')    # JSON string of tags
    is_featured = db.Column(db.Boolean, default=False)
    is_bestseller = db.Column(db.Boolean, default=False)
    is_new = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    reviews = db.relationship('Review', backref='product', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'category': self.category,
            'stock': self.stock,
            'images': json.loads(self.images),
            'sizes': json.loads(self.sizes),
            'colors': json.loads(self.colors),
            'tags': json.loads(self.tags),
            'featured': self.is_featured,
            'bestseller': self.is_bestseller,
            'newArrival': self.is_new,
            'createdAt': self.created_at.isoformat()
        }

class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    size = db.Column(db.String(20))
    color = db.Column(db.String(20))
    
    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.product_id,
            'name': self.product.name,
            'price': self.product.price,
            'image': json.loads(self.product.images)[0] if json.loads(self.product.images) else '',
            'quantity': self.quantity,
            'size': self.size,
            'color': self.color
        }

class Order(db.Model):
    id = db.Column(db.String(36), primary_key=True)  # custom ID like ORD-YYYYMMDD...
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='Pending')  # Pending, Processing, Shipped, Delivered
    payment_status = db.Column(db.String(20), default='Pending')
    payment_method = db.Column(db.String(20))
    razorpay_order_id = db.Column(db.String(100))
    razorpay_payment_id = db.Column(db.String(100))
    shipping_address = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    items = db.relationship('OrderItem', backref='order', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'customerId': self.user.email,
            'date': self.created_at.isoformat(),
            'status': self.status,
            'paymentStatus': self.payment_status,
            'total': self.total_amount,
            'items': [item.to_dict() for item in self.items],
            'shippingAddress': json.loads(self.shipping_address) if self.shipping_address else {}
        }

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(36), db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_at_purchase = db.Column(db.Float, nullable=False)
    size = db.Column(db.String(20))
    color = db.Column(db.String(20))
    
    product = db.relationship('Product')

    def to_dict(self):
        return {
            'name': self.product.name,
            'quantity': self.quantity,
            'price': self.price_at_purchase,
            'size': self.size,
            'color': self.color,
            'image': json.loads(self.product.images)[0] if json.loads(self.product.images) else ''
        }

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Coupon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    discount_type = db.Column(db.String(10), nullable=False)  # 'percentage' or 'fixed'
    discount_value = db.Column(db.Float, nullable=False)
    expiry_date = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)

class Wishlist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    product = db.relationship('Product')

    def to_dict(self):
        return {
            'id': self.product.id,
            'name': self.product.name,
            'price': self.product.price,
            'image': json.loads(self.product.images)[0] if json.loads(self.product.images) else '',
            'category': self.product.category
        }
