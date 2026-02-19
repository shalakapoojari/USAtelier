from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.exceptions import BadRequest
from functools import wraps
import json
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import razorpay
from html import escape

load_dotenv()

from models import db, User, Product, Order, OrderItem, CartItem, Review, Coupon, Wishlist
from flask_migrate import Migrate
from flask_login import LoginManager, login_user, logout_user, login_required, current_user


app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

# ==================== SECURITY CONFIG ====================
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# ==================== DATABASE CONFIG ====================
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ecommerce.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)
login_manager = LoginManager(app)
login_manager.login_view = 'login_page'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5000", "http://127.0.0.1:5000"]}})

# ==================== SECURITY HEADERS ====================
@app.after_request
def set_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# ==================== SECURITY HELPERS ====================
def sanitize_input(value):
    """Sanitize user input to prevent XSS"""
    if isinstance(value, str):
        return escape(value.strip())
    return value

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_product_data(data):
    """Validate product data"""
    required_fields = ['name', 'price', 'category', 'description']
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return False, f"Missing required field: {field}"
    
    try:
        price = float(data['price'])
        if price < 0 or price > 999999:
            return False, "Price must be between 0 and 999999"
    except (ValueError, TypeError):
        return False, "Invalid price format"
    
    return True, "Valid"

# ==================== RAZORPAY CONFIG ====================
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')

if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
else:
    razorpay_client = None

# ==================== MOCK DATA ====================
# Mock data removed - using DB


collections = [
    {
        "id": "essentials",
        "name": "Essentials",
        "description": "Timeless pieces for everyday elegance",
    },
    {
        "id": "knitwear",
        "name": "Knitwear",
        "description": "Luxurious knits for every season",
    },
    {
        "id": "tailoring",
        "name": "Tailoring",
        "description": "Precision-crafted suiting and trousers",
    },
]





# ==================== AUTHENTICATION ====================
@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Unauthorized"}), 401



@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=True)
            return jsonify({"success": True, "user": email, "isAdmin": user.is_admin}), 200
        
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400
        
        if not validate_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already registered"}), 400
        
        new_user = User(email=email, password_hash=generate_password_hash(password))
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user, remember=True)
        return jsonify({"success": True, "user": email}), 201
    except Exception as e:
        app.logger.error(f"Signup error: {str(e)}")
        return jsonify({"error": "Signup failed"}), 500

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({"success": True}), 200

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    # Mock password reset
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email required"}), 400
    # In real app: generate token, send email
    return jsonify({"success": True, "message": "Password reset link sent to email"}), 200

@app.route('/api/auth/user', methods=['GET'])
def get_user():
    if current_user.is_authenticated:
        return jsonify({
            "user": current_user.email, 
            "isAdmin": current_user.is_admin,
            "id": current_user.id
        }), 200
    return jsonify({"user": None}), 200

# ==================== PRODUCTS ====================
@app.route('/api/products', methods=['GET'])
def get_products():
    search = request.args.get('search')
    category = request.args.get('category')
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')
    sort = request.args.get('sort')
    
    query = Product.query
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(db.or_(Product.name.ilike(search_term), Product.description.ilike(search_term)))
    
    if category and category != 'all':
        query = query.filter(Product.category == category)
    
    if min_price:
        try:
            query = query.filter(Product.price >= float(min_price))
        except:
            pass
            
    if max_price:
        try:
            query = query.filter(Product.price <= float(max_price))
        except:
            pass
            
    if sort == 'price_asc':
        query = query.order_by(Product.price.asc())
    elif sort == 'price_desc':
        query = query.order_by(Product.price.desc())
    elif sort == 'newest':
        query = query.order_by(Product.created_at.desc())
        
    products = query.all()
    return jsonify([p.to_dict() for p in products])

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get(product_id)
    if product:
        return jsonify(product.to_dict())
    return jsonify({"error": "Product not found"}), 404

@app.route('/api/products/category/<category>', methods=['GET'])
def get_products_by_category(category):
    products = Product.query.filter_by(category=category).all()
    return jsonify([p.to_dict() for p in products])

# ==================== COLLECTIONS ====================
@app.route('/api/collections', methods=['GET'])
def get_collections():
    return jsonify(collections)

@app.route('/api/collections/<collection_id>', methods=['GET'])
def get_collection(collection_id):
    collection = next((c for c in collections if c['id'] == collection_id), None)
    if collection:
        return jsonify(collection)
    return jsonify({"error": "Collection not found"}), 404

# ==================== CART ====================
@app.route('/api/cart', methods=['GET'])
def get_cart():
    if current_user.is_authenticated:
        cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
        return jsonify([item.to_dict() for item in cart_items])
    else:
        if 'cart' not in session:
            session['cart'] = []
        return jsonify(session['cart'])

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    
    if current_user.is_authenticated:
        # DB Cart logic
        product_id = data.get('id')
        size = data.get('size')
        quantity = data.get('quantity', 1)
        
        existing_item = CartItem.query.filter_by(
            user_id=current_user.id, 
            product_id=product_id, 
            size=size
        ).first()
        
        if existing_item:
            existing_item.quantity += quantity
        else:
            new_item = CartItem(
                user_id=current_user.id,
                product_id=product_id,
                quantity=quantity,
                size=size,
                color=data.get('color')
            )
            db.session.add(new_item)
        
        db.session.commit()
        return get_cart() # Return updated cart
        
    else:
        # Session Cart Logic
        if 'cart' not in session:
            session['cart'] = []
        
        item = {
            'id': data.get('id'),
            'name': data.get('name'),
            'price': data.get('price'),
            'size': data.get('size'),
            'quantity': data.get('quantity', 1),
            'image': data.get('image')
        }
        
        existing = next((i for i in session['cart'] if i['id'] == item['id'] and i['size'] == item['size']), None)
        if existing:
            existing['quantity'] += item['quantity']
        else:
            session['cart'].append(item)
        
        session.modified = True
        return jsonify({"success": True, "cart": session['cart']})

@app.route('/api/cart/<item_id>', methods=['DELETE'])
def remove_from_cart(item_id):
    if current_user.is_authenticated:
        # item_id here refers to Product ID for simplicity in current frontend logic, 
        # but ideally should be CartItem ID. For now assuming we delete by Product ID + User
        # Wait, the interface sends item_id. 
        # Let's assume item_id is passed as int.
        try:
            cart_items = CartItem.query.filter_by(user_id=current_user.id, product_id=item_id).all()
            for item in cart_items:
                db.session.delete(item)
            db.session.commit()
        except:
            pass
        return get_cart()
    else:
        if 'cart' in session:
            session['cart'] = [i for i in session['cart'] if str(i['id']) != str(item_id)]
            session.modified = True
        return jsonify({"success": True, "cart": session.get('cart', [])})

@app.route('/api/cart/update', methods=['PUT'])
def update_cart():
    data = request.get_json()
    if current_user.is_authenticated:
        product_id = data.get('id')
        size = data.get('size')
        quantity = data.get('quantity')
        
        item = CartItem.query.filter_by(user_id=current_user.id, product_id=product_id, size=size).first()
        if item:
            if quantity <= 0:
                db.session.delete(item)
            else:
                item.quantity = quantity
            db.session.commit()
        return get_cart()
    else:
        if 'cart' in session:
            item = next((i for i in session['cart'] if i['id'] == data.get('id') and i['size'] == data.get('size')), None)
            if item:
                item['quantity'] = data.get('quantity', 1)
                if item['quantity'] <= 0:
                    session['cart'].remove(item)
            session.modified = True
        return jsonify({"success": True, "cart": session.get('cart', [])})

@app.route('/api/cart/clear', methods=['POST'])
def clear_cart():
    if current_user.is_authenticated:
        CartItem.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
    else:
        session['cart'] = []
        session.modified = True
    return jsonify({"success": True})

# ==================== PAYMENT ====================
@app.route('/api/payment/razorpay-key', methods=['GET'])
def get_razorpay_key():
    """Get Razorpay key status - only return key if configured"""
    return jsonify({
        "configured": bool(RAZORPAY_KEY_ID),
        "key": RAZORPAY_KEY_ID if RAZORPAY_KEY_ID else None
    })

@app.route('/api/payment/create-order', methods=['POST'])
@login_required
def create_payment_order():
    """Create Razorpay payment order"""
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 503
    
    try:
        data = request.get_json()
        if not data or 'amount' not in data:
            return jsonify({"error": "Missing amount"}), 400
        
        try:
            amount = float(data['amount'])
            if amount < 1 or amount > 999999:
                return jsonify({"error": "Invalid amount"}), 400
            amount_paise = int(amount * 100)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid amount format"}), 400
        
        razorpay_order = razorpay_client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'payment_capture': 1
        })
        return jsonify(razorpay_order), 201
    except Exception as e:
        app.logger.error(f"Razorpay order creation error: {str(e)}")
        return jsonify({"error": "Payment processing error"}), 500

@app.route('/api/payment/verify', methods=['POST'])
@login_required
def verify_payment():
    """Verify Razorpay payment signature"""
    if not razorpay_client:
        return jsonify({"error": "Payment gateway not configured"}), 503
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Missing payment data"}), 400
        
        required_fields = ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing payment fields"}), 400
        
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature': data['razorpay_signature']
        })
        return jsonify({"success": True}), 200
    except razorpay.errors.SignatureVerificationError:
        return jsonify({"error": "Invalid payment signature"}), 403
    except Exception as e:
        app.logger.error(f"Payment verification error: {str(e)}")
        return jsonify({"error": "Verification failed"}), 500

# ==================== WISHLIST ====================
@app.route('/api/wishlist', methods=['GET'])
@login_required
def get_wishlist():
    items = Wishlist.query.filter_by(user_id=current_user.id).all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/wishlist', methods=['POST'])
@login_required
def add_to_wishlist():
    data = request.get_json()
    product_id = data.get('product_id')
    
    if not product_id:
        return jsonify({"error": "Product ID required"}), 400
        
    existing = Wishlist.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if existing:
        return jsonify({"message": "Already in wishlist"}), 200
        
    item = Wishlist(user_id=current_user.id, product_id=product_id)
    db.session.add(item)
    db.session.commit()
    return jsonify({"success": True, "wishlist": [i.to_dict() for i in Wishlist.query.filter_by(user_id=current_user.id).all()]}), 201

@app.route('/api/wishlist/<int:product_id>', methods=['DELETE'])
@login_required
def remove_from_wishlist(product_id):
    item = Wishlist.query.filter_by(user_id=current_user.id, product_id=product_id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return jsonify({"success": True, "wishlist": [i.to_dict() for i in Wishlist.query.filter_by(user_id=current_user.id).all()]})

# ==================== REVIEWS ====================
@app.route('/api/products/<int:product_id>/reviews', methods=['GET', 'POST'])
def product_reviews(product_id):
    if request.method == 'POST':
        if not current_user.is_authenticated:
            return jsonify({"error": "Login required"}), 401
            
        data = request.get_json()
        rating = data.get('rating')
        comment = data.get('comment')
        
        if not rating:
            return jsonify({"error": "Rating required"}), 400
            
        review = Review(
            user_id=current_user.id,
            product_id=product_id,
            rating=rating,
            comment=comment
        )
        db.session.add(review)
        db.session.commit()
        return jsonify({"success": True}), 201

    reviews = Review.query.filter_by(product_id=product_id).order_by(Review.created_at.desc()).all()
    return jsonify([{
        'id': r.id,
        'user': r.user.email,
        'rating': r.rating,
        'comment': r.comment,
        'date': r.created_at.isoformat()
    } for r in reviews])

# ==================== COUPONS ====================
@app.route('/api/coupons/verify', methods=['POST'])
def verify_coupon():
    data = request.get_json()
    code = data.get('code')
    
    coupon = Coupon.query.filter_by(code=code, is_active=True).first()
    if not coupon:
        return jsonify({"error": "Invalid coupon"}), 400
        
    if coupon.expiry_date and coupon.expiry_date < datetime.utcnow():
        return jsonify({"error": "Coupon expired"}), 400
        
    return jsonify({
        "success": True,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value
    })

# ==================== ORDERS ====================
@app.route('/api/orders', methods=['POST'])
@login_required
def create_order():
    data = request.get_json()
    order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    order = Order(
        id=order_id,
        user_id=current_user.id,
        total_amount=data.get('total', 0),
        status='Pending',
        payment_status=data.get('paymentStatus', 'pending'),
        payment_method=data.get('paymentMethod', 'razorpay'),
        razorpay_order_id=data.get('razorpayOrderId'),
        razorpay_payment_id=data.get('razorpayPaymentId'),
        shipping_address=json.dumps(data.get('shippingAddress', {}))
    )
    
    # Process items
    items_data = data.get('items', [])
    for item in items_data:
        # Ideally we should verify price from DB
        product = Product.query.get(item['id'])
        if product:
            order_item = OrderItem(
                order_id=order_id,
                product_id=product.id,
                quantity=item['quantity'],
                price_at_purchase=item['price'],
                size=item.get('size'),
                color=item.get('color')
            )
            db.session.add(order_item)
            
            # Update stock
            if product.stock >= item['quantity']:
                product.stock -= item['quantity']
    
    db.session.add(order)
    
    # Clear cart
    CartItem.query.filter_by(user_id=current_user.id).delete()
    
    db.session.commit()
    
    return jsonify(order.to_dict()), 201

@app.route('/api/orders', methods=['GET'])
@login_required
def get_orders():
    user_orders = Order.query.filter_by(user_id=current_user.id).order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in user_orders])

@app.route('/api/orders/<order_id>', methods=['GET'])
@login_required
def get_order(order_id):
    order = Order.query.filter_by(id=order_id, user_id=current_user.id).first()
    if order:
        return jsonify(order.to_dict())
    return jsonify({"error": "Order not found"}), 404

# ==================== ADMIN ====================
@app.route('/api/admin/orders', methods=['GET'])
@login_required
def admin_get_orders():
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])

@app.route('/api/admin/orders/<order_id>', methods=['PUT'])
@login_required
def update_order_status(order_id):
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.get_json()
    status = data.get('status')
    
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    if status:
        order.status = status
        db.session.commit()
        
    return jsonify(order.to_dict())

@app.route('/api/admin/products', methods=['GET', 'POST'])
@login_required
def admin_products():
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
    
    if request.method == 'POST':
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            is_valid, error_msg = validate_product_data(data)
            if not is_valid:
                return jsonify({"error": error_msg}), 400
            
            product = Product(
                name=sanitize_input(data['name']),
                description=sanitize_input(data['description']),
                category=sanitize_input(data['category']),
                price=float(data['price']),
                stock=int(data.get('countInStock', 0)), # frontend might send countInStock or stock
                is_featured=bool(data.get('featured', False)),
                is_bestseller=bool(data.get('bestseller', False)),
                is_new=bool(data.get('newArrival', False)),
                sizes=json.dumps([sanitize_input(s) for s in data.get('sizes', [])]),
                images=json.dumps([sanitize_input(i) for i in data.get('images', [])])
            )
            
            db.session.add(product)
            db.session.commit()
            return jsonify(product.to_dict()), 201
        except Exception as e:
            app.logger.error(f"Product creation error: {str(e)}")
            return jsonify({"error": "Failed to create product"}), 500
    
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products]), 200

@app.route('/api/admin/products/<int:product_id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def admin_product(product_id):
    if not current_user.is_admin:
        return jsonify({"error": "Unauthorized"}), 403
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    if request.method == 'GET':
        return jsonify(product.to_dict()), 200
    
    elif request.method == 'PUT':
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            if 'name' in data:
                product.name = sanitize_input(data['name'])
            if 'description' in data:
                product.description = sanitize_input(data['description'])
            if 'category' in data:
                product.category = sanitize_input(data['category'])
            if 'price' in data:
                try:
                    price = float(data['price'])
                    if price < 0 or price > 999999:
                        return jsonify({"error": "Invalid price"}), 400
                    product.price = price
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid price format"}), 400
            if 'inStock' in data:
                 # Logic for inStock flag if needed, usually derived from stock > 0
                 pass
            if 'countInStock' in data:
                try:
                    product.stock = int(data['countInStock'])
                except:
                    pass
            if 'featured' in data:
                product.is_featured = bool(data['featured'])
            if 'bestseller' in data:
                product.is_bestseller = bool(data['bestseller'])
            if 'newArrival' in data:
                product.is_new = bool(data['newArrival'])
            if 'sizes' in data:
                product.sizes = json.dumps([sanitize_input(s) for s in data.get('sizes', [])])
            if 'images' in data:
                product.images = json.dumps([sanitize_input(i) for i in data.get('images', [])])
            
            db.session.commit()
            return jsonify(product.to_dict()), 200
        except Exception as e:
            app.logger.error(f"Product update error: {str(e)}")
            return jsonify({"error": "Failed to update product"}), 500
    
    elif request.method == 'DELETE':
        db.session.delete(product)
        db.session.commit()
        return jsonify({"success": True}), 200
    
    return jsonify({"error": "Method not allowed"}), 405

# ==================== PAGES ====================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/shop')
def shop():
    return render_template('shop.html')

@app.route('/product/<product_id>')
def product_detail(product_id):
    return render_template('product.html', product_id=product_id)

@app.route('/cart')
def cart():
    return render_template('cart.html')

@app.route('/checkout')
def checkout():
    return render_template('checkout.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/signup')
def signup_page():
    return render_template('signup.html')

@app.route('/account')
def account():
    return render_template('account.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# ==================== ERROR HANDLERS ====================
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Resource not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(403)
def forbidden(error):
    return jsonify({"error": "Access forbidden"}), 403

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

# ==================== HEALTH CHECK ====================
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "payment_configured": bool(RAZORPAY_KEY_ID)
    }), 200

def seed_database():
    if Product.query.first():
        return

    products_data = [
        {
            "name": "Essential Cashmere Sweater",
            "price": 295,
            "description": "Luxuriously soft cashmere sweater with a relaxed fit.",
            "category": "Knitwear",
            "images": json.dumps(["minimal-beige-cashmere-sweater-on-model.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L", "XL"]),
            "stock": 100,
            "is_featured": True,
            "is_bestseller": True
        },
        {
            "name": "Tailored Wool Trousers",
            "price": 245,
            "description": "Classic tailored trousers crafted from premium wool.",
            "category": "Trousers",
            "images": json.dumps(["charcoal-grey-wool-trousers-on-model-minimal.jpg"]),
            "sizes": json.dumps(["28", "30", "32", "34", "36"]),
            "stock": 50,
            "is_featured": True
        },
        {
            "name": "Organic Cotton Tee",
            "price": 85,
            "description": "Essential crew neck tee made from premium organic cotton.",
            "category": "Basics",
            "images": json.dumps(["white-cotton-t-shirt-on-model-minimal-clean.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L", "XL"]),
            "stock": 200,
            "is_new": True
        },
        {
            "name": "Silk Button-Down Shirt",
            "price": 325,
            "description": "Elegant silk shirt with mother-of-pearl buttons.",
            "category": "Shirts",
            "images": json.dumps(["ivory-silk-shirt-on-model-minimal-elegant.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L"]),
            "stock": 30,
            "is_new": True
        },
        {
            "name": "Merino Wool Cardigan",
            "price": 275,
            "description": "Lightweight merino wool cardigan.",
            "category": "Knitwear",
            "images": json.dumps(["navy-merino-wool-cardigan-on-model.jpg"]),
            "sizes": json.dumps(["S", "M", "L", "XL"]),
            "stock": 60,
            "is_featured": True
        },
        {
            "name": "Linen Wide-Leg Pants",
            "price": 195,
            "description": "Flowing wide-leg pants in breathable linen.",
            "category": "Trousers",
            "images": json.dumps(["natural-linen-wide-leg-pants-on-model.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L"]),
            "stock": 0
        },
        {
            "name": "Leather Minimal Tote",
            "price": 425,
            "description": "Handcrafted leather tote with clean lines.",
            "category": "Accessories",
            "images": json.dumps(["tan-leather-tote-bag-minimal.jpg"]),
            "sizes": json.dumps(["One Size"]),
            "stock": 15,
            "is_featured": True,
            "is_bestseller": True
        },
        {
            "name": "Cashmere Scarf",
            "price": 165,
            "description": "Soft cashmere scarf in a versatile neutral tone.",
            "category": "Accessories",
            "images": json.dumps(["beige-cashmere-scarf-styled.jpg"]),
            "sizes": json.dumps(["One Size"]),
            "stock": 40,
            "is_new": True
        }
    ]

    for p_data in products_data:
        product = Product(**p_data)
        db.session.add(product)
    
    # Create Admin User
    if not User.query.filter_by(email='admin@example.com').first():
        admin = User(
            email='admin@example.com',
            password_hash=generate_password_hash('password123'),
            is_admin=True
        )
        db.session.add(admin)

    db.session.commit()
    print("Database seeded!")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()
    app.run(debug=True)
