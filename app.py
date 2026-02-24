from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import json
import razorpay
from datetime import datetime
from bson.objectid import ObjectId
from flask_pymongo import PyMongo

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"])
# Or for even more flexibility in development:
# CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}})

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')
app.config['MONGO_URI'] = "mongodb://localhost:27017/ecommerce_db"
app.config['SESSION_COOKIE_NAME'] = 'us_atelier_session'
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = False # Set to True in production with HTTPS
app.config['SESSION_REFRESH_EACH_REQUEST'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 7 # 7 days

mongo = PyMongo(app)
db = mongo.db

# Razorpay Config
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

# Helper to serialize Mongo docs
def serialize_doc(doc):
    if not doc: return None
    if '_id' in doc:
        doc['id'] = str(doc.pop('_id'))
    return doc

# ==================== ROUTES ====================

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/shop')
def shop():
    return render_template('shop.html')

@app.route('/collections')
def collections():
    return render_template('shop.html')

@app.route('/product/<product_id>')
def product_page(product_id):
    return render_template('product.html', product_id=product_id)

@app.route('/cart')
def cart_page():
    return render_template('cart.html')

@app.route('/checkout')
def checkout_page():
    return render_template('checkout.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/signup')
def signup_page():
    return render_template('signup.html')

@app.route('/account')
def account_page():
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('account.html')

@app.route('/admin')
def admin_page():
    # Helper to check if user is admin
    if 'user_id' not in session or not session.get('is_admin'):
        return redirect('/login')
    return render_template('admin.html')

@app.route('/health')
def health():
    try:
        # Check DB connection
        db.command('ping')
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return jsonify({
        "status": "healthy",
        "payment_configured": bool(RAZORPAY_KEY_ID),
        "db": db_status
    }), 200

# ==================== AUTH ====================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    first_name = data.get('firstName', '').strip()
    last_name = data.get('lastName', '').strip()
    phone = data.get('phone', '').strip()
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
        
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400
        
    user_id = db.users.insert_one({
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "phone": phone,
        "password_hash": generate_password_hash(password),
        "is_admin": False,
        "created_at": datetime.utcnow()
    }).inserted_id
    
    session.permanent = True
    session['user_id'] = str(user_id)
    session['is_admin'] = False
    
    return jsonify({
        "success": True,
        "message": "Signup successful!",
        "user": email,
        "firstName": first_name,
        "lastName": last_name,
        "phone": phone,
        "id": str(user_id)
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    
    user = db.users.find_one({"email": email})
    
    if user and check_password_hash(user['password_hash'], password):
        session.permanent = True
        session['user_id'] = str(user['_id'])
        session['is_admin'] = bool(user.get('is_admin', False))
        print(f"DEBUG: Login success for {email}. is_admin: {session['is_admin']}")
        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": email,
            "firstName": user.get('first_name', user.get('name', email.split('@')[0])),
            "lastName": user.get('last_name', ''),
            "phone": user.get('phone', ''),
            "id": str(user['_id']),
            "isAdmin": user.get('is_admin', False)
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"}), 200

# ==================== UPLOADS ====================

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'public', 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
def upload_file():
    print(f"DEBUG: upload_file session: {list(session.keys())}")
    print(f"DEBUG: is_admin: {session.get('is_admin')} (Type: {type(session.get('is_admin'))})")
    
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        # Add timestamp to avoid collisions
        filename = f"{int(datetime.utcnow().timestamp())}_{filename}"
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        return jsonify({
            "success": True,
            "url": f"/uploads/{filename}"
        }), 200
        
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    
    if not current_password or not new_password:
        return jsonify({"error": "Current and new password required"}), 400
        
    user = db.users.find_one({"_id": ObjectId(session['user_id'])})
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if not check_password_hash(user['password_hash'], current_password):
        return jsonify({"error": "Incorrect current password"}), 400
        
    db.users.update_one(
        {"_id": ObjectId(session['user_id'])},
        {"$set": {"password_hash": generate_password_hash(new_password)}}
    )
    
    return jsonify({"success": True, "message": "Password updated successfully"}), 200

@app.route('/api/auth/user', methods=['GET', 'PUT'])
def user_profile():
    if 'user_id' not in session:
         return jsonify({"user": None}), 200

    if request.method == 'GET':
        user = db.users.find_one({"_id": ObjectId(session['user_id'])})
        if user:
            return jsonify({
                "user": user['email'], 
                "firstName": user.get('first_name', user.get('name', user['email'].split('@')[0])),
                "lastName": user.get('last_name', ''),
                "phone": user.get('phone', ''),
                "isAdmin": user.get('is_admin', False),
                "id": str(user['_id']),
                "addresses": user.get('addresses', [])
            }), 200
    
    if request.method == 'PUT':
        data = request.get_json()
        update_fields = {}
        if 'firstName' in data: update_fields['first_name'] = data['firstName']
        if 'lastName' in data: update_fields['last_name'] = data['lastName']
        if 'phone' in data: update_fields['phone'] = data['phone']
        
        if update_fields:
            db.users.update_one(
                {"_id": ObjectId(session['user_id'])},
                {"$set": update_fields}
            )
        return jsonify({"success": True, "message": "Profile updated"}), 200

    return jsonify({"user": None}), 200

@app.route('/api/user/addresses', methods=['POST'])
def add_address():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
    
    data = request.get_json()
    address = {
        "id": str(ObjectId()),
        "street": data.get('street'),
        "city": data.get('city'),
        "state": data.get('state'),
        "zip": data.get('zip'),
        "country": data.get('country', 'US')
    }
    
    db.users.update_one(
        {"_id": ObjectId(session['user_id'])},
        {"$push": {"addresses": address}}
    )
    
    return jsonify({"success": True, "message": "Address added"}), 201

# ==================== PRODUCTS ====================

@app.route('/api/products', methods=['GET'])
def get_products():
    query = {}
    
    # Filtering
    category = request.args.get('category')
    if category and category != 'all':
        query['category'] = category

    gender = request.args.get('gender')
    if gender and gender != 'all':
        query['gender'] = gender
        
    search = request.args.get('search')
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}}
        ]

    # Price Filtering
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')
    price_query = {}
    if min_price: price_query['$gte'] = float(min_price)
    if max_price: price_query['$lte'] = float(max_price)
    if price_query: query['price'] = price_query

    # Sorting
    sort_raw = request.args.get('sort')
    sort_order = [('created_at', -1)] # Default new
    if sort_raw == 'price_asc':
        sort_order = [('price', 1)]
    elif sort_raw == 'price_desc':
        sort_order = [('price', -1)]

    products = list(db.products.find(query).sort(sort_order))
    return jsonify([serialize_doc(p) for p in products])

@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    product = db.products.find_one({"_id": ObjectId(product_id)})
    if product:
        return jsonify(serialize_doc(product)), 200
    return jsonify({"error": "Product not found"}), 404

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    print(f"DEBUG: delete_product session: {list(session.keys())}")
    print(f"DEBUG: is_admin: {session.get('is_admin')}")
    
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    result = db.products.delete_one({"_id": ObjectId(product_id)})
    if result.deleted_count > 0:
        return jsonify({"success": True, "message": "Product deleted"}), 200
    return jsonify({"error": "Product not found"}), 404

@app.route('/api/products', methods=['POST'])
def add_product():
    print(f"DEBUG: add_product session: {list(session.keys())}")
    print(f"DEBUG: is_admin: {session.get('is_admin')} (Type: {type(session.get('is_admin'))})")

    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    
    # Validation
    required = ['name', 'price', 'category', 'gender', 'description', 'images', 'sizes']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Field '{field}' is required"}), 400
            
    try:
        new_product = {
            "name": data['name'],
            "price": float(data['price']),
            "category": data['category'],
            "gender": data['gender'],
            "description": data['description'],
            "images": json.dumps(data['images']) if isinstance(data['images'], list) else data['images'],
            "sizes": json.dumps(data['sizes']) if isinstance(data['sizes'], list) else data['sizes'],
            "stock": int(data.get('stock', 0)),
            "is_featured": bool(data.get('featured', False)),
            "is_new": bool(data.get('newArrival', False)),
            "is_bestseller": bool(data.get('bestseller', False)),
            "fabric": data.get('fabric', ''),
            "care": data.get('care', ''),
            "created_at": datetime.utcnow()
        }
        
        result = db.products.insert_one(new_product)
        return jsonify({
            "success": True, 
            "message": "Product added successfully",
            "id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== CART ====================

@app.route('/api/cart', methods=['GET'])
def get_cart():
    if 'user_id' in session:
        # DB Cart
        cart_items = list(db.cart.find({"user_id": session['user_id']}))
        results = []
        for item in cart_items:
            product = db.products.find_one({"_id": ObjectId(item['product_id'])})
            if product:
                results.append({
                    "id": str(product['_id']),
                    "name": product['name'],
                    "price": product['price'],
                    "image": json.loads(product['images'])[0] if product.get('images') and product['images'] != '[]' else '',
                    "quantity": item['quantity'],
                    "size": item.get('size'),
                })
        return jsonify(results)
    else:
        return jsonify(session.get('cart', []))

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    product_id = data.get('id')
    quantity = data.get('quantity', 1)
    size = data.get('size')
    
    if 'user_id' in session:
        # DB Cart
        existing = db.cart.find_one({
            "user_id": session['user_id'],
            "product_id": product_id,
            "size": size
        })
        
        if existing:
            db.cart.update_one(
                {"_id": existing['_id']},
                {"$inc": {"quantity": quantity}}
            )
        else:
            db.cart.insert_one({
                "user_id": session['user_id'],
                "product_id": product_id,
                "quantity": quantity,
                "size": size
            })
    else:
        # Session Cart
        cart = session.get('cart', [])
        # Find if item exists
        found = False
        for item in cart:
            if item['id'] == product_id and item['size'] == size:
                item['quantity'] += quantity
                found = True
                break
        if not found:
            cart.append({
                "id": product_id,
                "quantity": quantity,
                "size": size
            })
        session['cart'] = cart
        
    return jsonify({"success": True, "message": "Added to cart"})

# ==================== WISHLIST ====================

@app.route('/api/wishlist', methods=['GET'])
def get_wishlist():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
    
    items = list(db.wishlist.find({"user_id": session['user_id']}))
    results = []
    for item in items:
        product = db.products.find_one({"_id": ObjectId(item['product_id'])})
        if product:
            results.append({
                'id': str(product['_id']),
                'name': product['name'],
                'price': product['price'],
                'image': json.loads(product['images'])[0] if product.get('images') and product['images'] != '[]' else '',
                'category': product['category']
            })
    return jsonify(results)

@app.route('/api/wishlist', methods=['POST'])
def add_to_wishlist():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    data = request.get_json()
    product_id = data.get('product_id')
    
    if not product_id:
        return jsonify({"error": "Product ID required"}), 400
        
    existing = db.wishlist.find_one({
        "user_id": session['user_id'],
        "product_id": product_id
    })
    
    if existing:
        return jsonify({"message": "Already in wishlist"}), 200
        
    db.wishlist.insert_one({
        "user_id": session['user_id'],
        "product_id": product_id,
        "created_at": datetime.utcnow()
    })
    
    return jsonify({"success": True}), 201

@app.route('/api/wishlist/<product_id>', methods=['DELETE'])
def remove_from_wishlist(product_id):
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    db.wishlist.delete_one({
        "user_id": session['user_id'],
        "product_id": product_id
    })
    return jsonify({"success": True})

# ==================== REVIEWS ====================

@app.route('/api/products/<product_id>/reviews', methods=['GET', 'POST'])
def product_reviews(product_id):
    if request.method == 'POST':
        if 'user_id' not in session:
            return jsonify({"error": "Login required"}), 401
            
        data = request.get_json()
        rating = data.get('rating')
        comment = data.get('comment')
        
        if not rating:
            return jsonify({"error": "Rating required"}), 400
            
        user = db.users.find_one({"_id": ObjectId(session['user_id'])})
        
        db.reviews.insert_one({
            "user_id": session['user_id'],
            "user_email": user['email'] if user else "Anonymous",
            "product_id": product_id,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.utcnow()
        })
        return jsonify({"success": True}), 201

    reviews = list(db.reviews.find({"product_id": product_id}).sort("created_at", -1))
    return jsonify([{
        'id': str(r['_id']),
        'user': r.get('user_email', 'Anonymous'),
        'rating': r.get('rating'),
        'comment': r.get('comment'),
        'date': r.get('created_at').isoformat() if r.get('created_at') else ''
    } for r in reviews])

# ==================== PASS RESET ====================

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email required"}), 400
    # Mock logic
    return jsonify({"success": True, "message": "Password reset link sent to email"}), 200

# ==================== ORDERS ====================

@app.route('/api/orders', methods=['POST'])
def create_order():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    data = request.get_json()
    
    order_doc = {
        "id": f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "user_id": session['user_id'],
        "total": data.get('total'),
        "status": "Pending",
        "payment_status": data.get('paymentStatus', 'Pending'),
        "created_at": datetime.utcnow(),
        "items": data.get('items', []),
        "shipping_address": data.get('shippingAddress', {})
    }
    
    db.orders.insert_one(order_doc)
    db.cart.delete_many({"user_id": session['user_id']})
    
    # Update Stock
    for item in data.get('items', []):
        db.products.update_one(
            {"_id": ObjectId(item['id'])},
            {"$inc": {"stock": -item['quantity']}}
        )
    
    return jsonify({"success": True, "orderId": order_doc['id']}), 201

@app.route('/api/orders', methods=['GET'])
def get_orders():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    orders = list(db.orders.find({"user_id": session['user_id']}).sort("created_at", -1))
    return jsonify([serialize_doc(o) for o in orders])

# ==================== CATEGORIES ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = list(db.categories.find())
    return jsonify([serialize_doc(c) for c in categories])

@app.route('/api/categories', methods=['POST'])
def add_category():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    name = data.get('name', '').strip()
    subcategory = data.get('subcategory', '').strip()
    
    if not name:
        return jsonify({"error": "Category name required"}), 400
        
    existing = db.categories.find_one({"name": name})
    if existing:
        if subcategory and subcategory not in existing.get('subcategories', []):
            db.categories.update_one(
                {"_id": existing['_id']},
                {"$push": {"subcategories": subcategory}}
            )
            return jsonify({"success": True, "message": "Subcategory added"}), 201
        return jsonify({"error": "Category already exists"}), 400
        
    new_cat = {
        "name": name,
        "subcategories": [subcategory] if subcategory else [],
        "created_at": datetime.utcnow()
    }
    db.categories.insert_one(new_cat)
    return jsonify({"success": True, "message": "Category created"}), 201

@app.route('/api/categories/<cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    db.categories.delete_one({"_id": ObjectId(cat_id)})
    return jsonify({"success": True, "message": "Category deleted"}), 200

# ==================== SEEDING ====================

def seed_database():
    # ── ALWAYS SYNC ADMIN CREDENTIALS ──
    admin_email = "admin@123.com"
    admin_data = {
        "email": admin_email,
        "password_hash": generate_password_hash("admin123"),
        "is_admin": True,
        "first_name": "Admin",
        "last_name": "User",
        "created_at": datetime.utcnow()
    }
    
    if not db.users.find_one({"email": admin_email}):
        db.users.insert_one(admin_data)
        print(f"Created new admin: {admin_email}")
    else:
        db.users.update_one(
            {"email": admin_email},
            {"$set": {
                "password_hash": admin_data["password_hash"],
                "is_admin": True
            }}
        )
        print(f"Synced credentials for admin: {admin_email}")

    # Cleanup old experiments if they exist
    db.users.delete_many({"email": {"$in": ["admin@example.com", "admin.com"]}})

    # ── SEED CATEGORIES ──
    default_categories = [
        {"name": "Knitwear", "subcategories": ["Sweaters", "Cardigans"]},
        {"name": "Trousers", "subcategories": ["Tailored", "Casual"]},
        {"name": "Basics", "subcategories": ["Tees"]},
        {"name": "Shirts", "subcategories": ["Formal"]},
        {"name": "Accessories", "subcategories": ["Bags", "Scarf"]},
    ]
    
    if db.categories.count_documents({}) == 0:
        db.categories.insert_many(default_categories)
        print("Categories Seeded!")

    # ── SEED PRODUCTS ONLY IF EMPTY (OR FORCE RE-SEED FOR CLEANUP) ──
    # If we have very few products or broken ones, let's clear it once.
    if db.products.count_documents({}) > 0:
        # If the user has old data that might be breaking the shop, we can clear it.
        # For now, let's just return if data exists, but ensure it's valid.
        return

    products_data = [
        {
            "name": "Essential Cashmere Sweater",
            "price": 295,
            "description": "Luxuriously soft cashmere sweater with a relaxed fit.",
            "category": "Knitwear",
            "subcategory": "Sweaters",
            "gender": "Women",
            "images": json.dumps(["/minimal-beige-cashmere-sweater-on-model.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L", "XL"]),
            "stock": 100,
            "is_featured": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Tailored Wool Trousers",
            "price": 245,
            "description": "Classic tailored trousers crafted from premium wool.",
            "category": "Trousers",
            "subcategory": "Tailored",
            "gender": "Men",
            "images": json.dumps(["/charcoal-grey-wool-trousers-on-model-minimal.jpg"]),
            "sizes": json.dumps(["28", "30", "32", "34", "36"]),
            "stock": 50,
            "is_featured": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Organic Cotton Tee",
            "price": 85,
            "description": "Essential crew neck tee made from premium organic cotton.",
            "category": "Basics",
            "subcategory": "Tees",
            "gender": "Men",
            "images": json.dumps(["/white-cotton-t-shirt-on-model-minimal-clean.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L", "XL"]),
            "stock": 200,
            "is_new": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Silk Button-Down Shirt",
            "price": 325,
            "description": "Elegant silk shirt with mother-of-pearl buttons.",
            "category": "Shirts",
            "subcategory": "Formal",
            "gender": "Women",
            "images": json.dumps(["/ivory-silk-shirt-on-model-minimal-elegant.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L"]),
            "stock": 30,
            "is_new": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Merino Wool Cardigan",
            "price": 275,
            "description": "Lightweight merino wool cardigan.",
            "category": "Knitwear",
            "subcategory": "Cardigans",
            "gender": "Men",
            "images": json.dumps(["/navy-merino-wool-cardigan-on-model.jpg"]),
            "sizes": json.dumps(["S", "M", "L", "XL"]),
            "stock": 60,
            "is_featured": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Linen Wide-Leg Pants",
            "price": 195,
            "description": "Flowing wide-leg pants in breathable linen.",
            "category": "Trousers",
            "subcategory": "Casual",
            "gender": "Women",
            "images": json.dumps(["/natural-linen-wide-leg-pants-on-model.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L"]),
            "stock": 40,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Leather Minimal Tote",
            "price": 425,
            "description": "Handcrafted leather tote with clean lines.",
            "category": "Accessories",
            "subcategory": "Bags",
            "gender": "Women",
            "images": json.dumps(["/tan-leather-tote-bag-minimal.jpg"]),
            "sizes": json.dumps(["One Size"]),
            "stock": 15,
            "is_featured": True,
            "is_bestseller": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Cashmere Scarf",
            "price": 165,
            "description": "Soft cashmere scarf in a versatile neutral tone.",
            "category": "Accessories",
            "subcategory": "Scarf",
            "gender": "Men",
            "images": json.dumps(["/beige-cashmere-scarf-styled.jpg"]),
            "sizes": json.dumps(["One Size"]),
            "stock": 40,
            "is_new": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    db.products.insert_many(products_data)
    print("MongoDB Products Seeded!")

if __name__ == '__main__':
    with app.app_context():
        try:
            seed_database()
        except Exception as e:
            print(f"Seeding failed: {e}")
            
    app.run(host='0.0.0.0', port=5000, debug=False)
