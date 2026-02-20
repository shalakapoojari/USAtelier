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
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')
app.config['MONGO_URI'] = "mongodb://localhost:27017/ecommerce_db"

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
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
        
    if db.users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 400
        
    user_id = db.users.insert_one({
        "email": email,
        "password_hash": generate_password_hash(password),
        "is_admin": False,
        "created_at": datetime.utcnow()
    }).inserted_id
    
    session['user_id'] = str(user_id)
    session['is_admin'] = False
    
    return jsonify({"success": True, "message": "Signup successful!", "user": email}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = db.users.find_one({"email": email})
    
    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = str(user['_id'])
        session['is_admin'] = user.get('is_admin', False)
        return jsonify({
            "success": True, 
            "message": "Login successful!",
            "user": email, 
            "isAdmin": user.get('is_admin', False)
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully"}), 200

@app.route('/api/auth/user', methods=['GET', 'PUT'])
def user_profile():
    if 'user_id' not in session:
         return jsonify({"user": None}), 200

    if request.method == 'GET':
        user = db.users.find_one({"_id": ObjectId(session['user_id'])})
        if user:
            return jsonify({
                "user": user['email'], 
                "name": user.get('name', ''),
                "phone": user.get('phone', ''),
                "isAdmin": user.get('is_admin', False),
                "id": str(user['_id']),
                "addresses": user.get('addresses', [])
            }), 200
    
    if request.method == 'PUT':
        data = request.get_json()
        update_fields = {}
        if 'name' in data: update_fields['name'] = data['name']
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
    try:
        product = db.products.find_one({"_id": ObjectId(product_id)})
        if product:
            return jsonify(serialize_doc(product))
        return jsonify({"error": "Product not found"}), 404
    except:
        return jsonify({"error": "Invalid ID"}), 400

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

# ==================== SEEDING ====================

def seed_database():
    if db.products.count_documents({}) > 0:
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
            "created_at": datetime.utcnow()
        },
        {
            "name": "Tailored Wool Trousers",
            "price": 245,
            "description": "Classic tailored trousers crafted from premium wool.",
            "category": "Trousers",
            "images": json.dumps(["charcoal-grey-wool-trousers-on-model-minimal.jpg"]),
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
            "images": json.dumps(["white-cotton-t-shirt-on-model-minimal-clean.jpg"]),
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
            "images": json.dumps(["ivory-silk-shirt-on-model-minimal-elegant.jpg"]),
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
            "images": json.dumps(["navy-merino-wool-cardigan-on-model.jpg"]),
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
            "images": json.dumps(["natural-linen-wide-leg-pants-on-model.jpg"]),
            "sizes": json.dumps(["XS", "S", "M", "L"]),
            "stock": 40,
            "created_at": datetime.utcnow()
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
            "is_bestseller": True,
            "created_at": datetime.utcnow()
        },
        {
            "name": "Cashmere Scarf",
            "price": 165,
            "description": "Soft cashmere scarf in a versatile neutral tone.",
            "category": "Accessories",
            "images": json.dumps(["beige-cashmere-scarf-styled.jpg"]),
            "sizes": json.dumps(["One Size"]),
            "stock": 40,
            "is_new": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    db.products.insert_many(products_data)
    
    # Admin
    if not db.users.find_one({"email": "admin@example.com"}):
        db.users.insert_one({
            "email": "admin@example.com",
            "password_hash": generate_password_hash("password123"),
            "is_admin": True,
            "created_at": datetime.utcnow()
        })
    print("MongoDB Seeded with new images!")

if __name__ == '__main__':
    with app.app_context():
        try:
            seed_database()
        except Exception as e:
            print(f"Seeding failed (is MongoDB running?): {e}")
            
    app.run(debug=True)
