from flask import Flask, render_template, jsonify, request, session, redirect, url_for
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import json
import time
import razorpay
from datetime import datetime
from bson.objectid import ObjectId
from flask_pymongo import PyMongo
from flask_mail import Mail
import cloudinary
import cloudinary.uploader
import cloudinary.api
from authlib.integrations.flask_client import OAuth
import requests
from mail_utils import (
    send_signup_confirmation, 
    send_password_change_confirmation,
    send_order_confirmation,
    send_order_status_update,
    send_new_arrival_notification
)
from models_mysql import db_mysql, User, Product as ProductSQL, Category as CategorySQL, Order as OrderSQL, OrderItem, CartItem, WishlistItem
from borzo_utils import create_delivery_order

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
# CORS must specify origins when supports_credentials=True
# Wildcard "*" is NOT allowed with credentials.
CORS(app, supports_credentials=True, origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.31.120:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
])

# Cloudinary Configuration
cloudinary.config(
  cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
  api_key = os.getenv('CLOUDINARY_API_KEY'),
  api_secret = os.getenv('CLOUDINARY_API_SECRET'),
  secure = True
)

# Upload Configuration
# UPLOAD_FOLDER is kept for compatibility if needed, but we'll use Cloudinary
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'public', 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'tiff', 'jfif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1' # Re-enabled for local test

# Google OAuth Configuration
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_params=None,
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    authorize_params=None,
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
    client_kwargs={'scope': 'openid email profile'},
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration'
)

app.config['MONGO_URI'] = "mongodb://localhost:27017/ecommerce_db"
app.config['SESSION_COOKIE_NAME'] = 'us_atelier_session'
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.getenv('NODE_ENV') == 'production' or os.getenv('FLASK_ENV') == 'production'
app.config['SESSION_REFRESH_EACH_REQUEST'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 86400 * 7 # 7 days

# Mail Config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# Razorpay Configuration
def get_razorpay_client():
    return razorpay.Client(auth=(os.getenv('RAZORPAY_KEY_ID'), os.getenv('RAZORPAY_KEY_SECRET')))

razorpay_client = get_razorpay_client()

mongo = PyMongo(app)
db = mongo.db
mail = Mail(app)

# MySQL Initialization
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db_mysql.init_app(app)

with app.app_context():
    try:
        db_mysql.create_all()
        print("MySQL Tables Created/Verified")
    except Exception as e:
        print(f"Error creating MySQL tables: {e}")

# Razorpay Config
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None

# Helper to serialize Mongo docs
def serialize_doc(doc):
    if not doc: return None
    if '_id' in doc:
        doc['id'] = str(doc.pop('_id'))
    
    # Ensure images, sizes, and subcategories are lists, parsing if they are strings
    for field in ['images', 'sizes', 'subcategories']:
        if field in doc:
            if isinstance(doc[field], str):
                try:
                    doc[field] = json.loads(doc[field])
                except:
                    doc[field] = []
            elif not isinstance(doc[field], list):
                doc[field] = []
            
    return doc

# ==================== ROUTES ====================

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/view-all')
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
        "profile_pic": "",
        "is_admin": False,
        "created_at": datetime.utcnow()
    }).inserted_id
    
    # Save to MySQL
    try:
        new_user_sql = User(
            email=email,
            password_hash=generate_password_hash(password),
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            is_admin=False
        )
        db_mysql.session.add(new_user_sql)
        db_mysql.session.commit()
        print(f"DEBUG: User {email} saved to MySQL")
    except Exception as e:
        db_mysql.session.rollback()
        print(f"Error saving user to MySQL: {e}")

    session.permanent = True
    session['user_id'] = str(user_id)
    session['is_admin'] = False
    session['is_new_signup'] = True # Flag for greeting
    
    # Send Welcome Email
    send_signup_confirmation(mail, email, first_name)
    
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
            "profilePic": user.get('profile_pic', ''),
            "id": str(user['_id']),
            "isAdmin": user.get('is_admin', False)
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out"}), 200

# ==================== UPLOADS ====================

@app.route('/api/upload', methods=['POST'])
def upload_file():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        try:
            # Local Storage Only
            filename = f"{int(time.time())}_{file.filename}"
            # Ensure products folder exists
            products_dir = os.path.join(UPLOAD_FOLDER, 'products')
            if not os.path.exists(products_dir):
                os.makedirs(products_dir)
                
            filepath = os.path.join(products_dir, filename)
            file.save(filepath)
            
            # Return relative path for frontend
            return jsonify({
                "success": True,
                "url": f"/uploads/products/{filename}"
            }), 200
        except Exception as e:
            print(f"Error saving file locally: {str(e)}")
            return jsonify({"error": f"Upload failed: {str(e)}"}), 500
        
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/upload/profile', methods=['POST'])
def upload_profile_pic():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        try:
            # Try Cloudinary first if configured
            if os.getenv('CLOUDINARY_CLOUD_NAME') and os.getenv('CLOUDINARY_CLOUD_NAME') != 'your_cloud_name':
                upload_result = cloudinary.uploader.upload(
                    file,
                    folder="profiles",
                    public_id=f"user_{session['user_id']}_{int(time.time())}",
                    overwrite=True,
                    resource_type="image"
                )
                return jsonify({
                    "success": True,
                    "url": upload_result.get('secure_url')
                }), 200
            else:
                raise Exception("Cloudinary not configured")
        except Exception as e:
            print(f"Cloudinary upload failed or skipped, trying local: {str(e)}")
            try:
                # Local Fallback
                filename = f"profile_{session['user_id']}_{int(time.time())}_{file.filename}"
                profiles_dir = os.path.join(UPLOAD_FOLDER, 'profiles')
                if not os.path.exists(profiles_dir):
                    os.makedirs(profiles_dir)
                    
                filepath = os.path.join(profiles_dir, filename)
                file.seek(0) # Reset file pointer
                file.save(filepath)
                
                return jsonify({
                    "success": True,
                    "url": f"/uploads/profiles/{filename}"
                }), 200
            except Exception as local_err:
                print(f"Local upload failed: {str(local_err)}")
                return jsonify({"error": f"Upload failed: {str(local_err)}"}), 500
            
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
    
    # Sync to MySQL
    try:
        user_sql = User.query.filter_by(email=user['email']).first()
        if user_sql:
            user_sql.password_hash = generate_password_hash(new_password)
            db_mysql.session.commit()
    except Exception as e:
        print(f"DEBUG: Error syncing password to MySQL: {e}")
        db_mysql.session.rollback()
    
    # Send Password Change Notification
    email_sent = send_password_change_confirmation(mail, user['email'], user.get('first_name', 'User'))
    
    if not email_sent:
        return jsonify({
            "success": True, 
            "message": "Password updated, but there was an error sending the confirmation email. Please check your contact details."
        }), 200
        
    return jsonify({"success": True, "message": "Password updated successfully. A confirmation email has been sent."}), 200

# ==================== AUTH GOOGLE ====================

@app.route('/api/auth/google/login')
def google_login():
    redirect_uri = f"{os.getenv('BACKEND_URL', 'http://localhost:5000')}/api/auth/google/callback"
    # Ensure session is saved before redirecting
    session.modified = True
    return google.authorize_redirect(redirect_uri)

@app.route('/api/auth/google/callback')
def google_callback():
    token = google.authorize_access_token()
    resp = google.get('userinfo')
    user_info = resp.json()
    
    email = user_info.get('email', '').lower()
    first_name = user_info.get('given_name', '')
    last_name = user_info.get('family_name', '')
    picture = user_info.get('picture', '')
    
    if not email:
        return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login?error=google_email_missing")

    # Check MongoDB
    user = db.users.find_one({"email": email})
    
    if not user:
        # Create new user in MongoDB
        new_mongo_user = {
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "profile_pic": picture,
            "is_admin": False,
            "created_at": datetime.utcnow()
        }
        user_id = db.users.insert_one(new_mongo_user).inserted_id
        user = db.users.find_one({"_id": user_id})
        
        # Create in MySQL
        try:
            new_mysql_user = User(
                email=email,
                first_name=first_name,
                last_name=last_name,
                profile_pic=picture,
                is_admin=False
            )
            db_mysql.session.add(new_mysql_user)
            db_mysql.session.commit()
            print(f"DEBUG: Google user {email} synced to MySQL")
        except Exception as e:
            db_mysql.session.rollback()
            print(f"Error syncing Google user to MySQL: {e}")
            
        # Welcome Email
        try:
            send_signup_confirmation(mail, email, first_name)
        except Exception as e:
            print(f"Error sending welcome email: {str(e)}")
    else:
        # Update existing user profile pic if it changed
        if not user.get('profile_pic') or user.get('profile_pic') != picture:
            db.users.update_one({"email": email}, {"$set": {"profile_pic": picture}})
            # Sync to MySQL
            try:
                mysql_user = User.query.filter_by(email=email).first()
                if mysql_user:
                    mysql_user.profile_pic = picture
                    db_mysql.session.commit()
            except Exception as e:
                db_mysql.session.rollback()
                print(f"Error updating MySQL profile pic: {e}")

    # Set session
    session.clear()
    session.permanent = True
    session['user_id'] = str(user['_id'])
    session['is_admin'] = bool(user.get('is_admin', False))
    
    # Redirect to account page
    return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/account")

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
                "profilePic": user.get('profile_pic', ''),
                "isAdmin": user.get('is_admin', False),
                "isNewSignup": session.get('is_new_signup', False),
                "id": str(user['_id']),
                "addresses": user.get('addresses', [])
            }), 200
    
    if request.method == 'PUT':
        data = request.get_json()
        update_fields = {}
        if 'firstName' in data: update_fields['first_name'] = data['firstName']
        if 'lastName' in data: update_fields['last_name'] = data['lastName']
        if 'phone' in data: update_fields['phone'] = data['phone']
        if 'profilePic' in data: update_fields['profile_pic'] = data['profilePic']
        
        if update_fields:
            db.users.update_one(
                {"_id": ObjectId(session['user_id'])},
                {"$set": update_fields}
            )
            
            # Sync to MySQL
            try:
                user_mongo = db.users.find_one({"_id": ObjectId(session['user_id'])})
                if user_mongo:
                    user_sql = User.query.filter_by(email=user_mongo['email']).first()
                    if user_sql:
                        if 'first_name' in update_fields: user_sql.first_name = update_fields['first_name']
                        if 'last_name' in update_fields: user_sql.last_name = update_fields['last_name']
                        if 'phone' in update_fields: user_sql.phone = update_fields['phone']
                        if 'profile_pic' in update_fields: user_sql.profile_pic = update_fields['profile_pic']
                        db_mysql.session.commit()
            except Exception as e:
                print(f"Error syncing profile to MySQL: {e}")
                db_mysql.session.rollback()
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
    return jsonify({"error": "Product not available"}), 404

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
    return jsonify({"error": "Product not available"}), 404

@app.route('/api/products', methods=['POST'])
def add_product():
    print(f"DEBUG: add_product session: {list(session.keys())}")
    print(f"DEBUG: is_admin: {session.get('is_admin')} (Type: {type(session.get('is_admin'))})")

    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    
    # Validation
    required = ['name', 'price', 'category', 'description', 'images', 'sizes']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Field '{field}' is required"}), 400
            
    try:
        new_product = {
            "name": data['name'],
            "price": float(data['price']),
            "category": data['category'],
            "subcategory": data.get('subcategory', ''),
            "gender": data.get('gender', 'Unisex'),
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
        
        # Save to MySQL
        try:
            new_product_sql = ProductSQL(
                name=new_product['name'],
                price=new_product['price'],
                category=new_product['category'],
                subcategory=new_product['subcategory'],
                gender=new_product['gender'],
                description=new_product['description'],
                images=json.loads(new_product['images']) if isinstance(new_product['images'], str) else new_product['images'],
                sizes=json.loads(new_product['sizes']) if isinstance(new_product['sizes'], str) else new_product['sizes'],
                stock=new_product['stock'],
                is_featured=new_product['is_featured'],
                is_new=new_product['is_new'],
                is_bestseller=new_product['is_bestseller'],
                fabric=new_product['fabric'],
                care=new_product['care']
            )
            db_mysql.session.add(new_product_sql)
            db_mysql.session.commit()
            print(f"DEBUG: Product {new_product['name']} saved to MySQL")
        except Exception as e:
            db_mysql.session.rollback()
            print(f"Error saving product to MySQL: {e}")

        # Send New Arrival Email to all users if it's marked as new and notification is requested
        if new_product.get('is_new') and data.get('notify_users'):
            users = list(db.users.find({}, {"email": 1, "first_name": 1}))
            for u in users:
                user_name = u.get('first_name', u.get('email', '').split('@')[0])
                send_new_arrival_notification(
                    mail, 
                    u['email'], 
                    user_name,
                    new_product['name'], 
                    new_product['price'], 
                    new_product['category'],
                    new_product['description'],
                    str(result.inserted_id)
                )
        
        return jsonify({
            "success": True, 
            "message": "Product added successfully",
            "id": str(result.inserted_id)
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    
    # Validation
    required = ['name', 'price', 'category', 'description', 'images', 'sizes']
    for field in required:
        if field not in data:
            return jsonify({"error": f"Field '{field}' is required"}), 400
            
    try:
        updated_product = {
            "name": data['name'],
            "price": float(data['price']),
            "category": data['category'],
            "subcategory": data.get('subcategory', ''),
            "gender": data.get('gender', 'Unisex'),
            "description": data['description'],
            "images": json.dumps(data['images']) if isinstance(data['images'], list) else data['images'],
            "sizes": json.dumps(data['sizes']) if isinstance(data['sizes'], list) else data['sizes'],
            "stock": int(data.get('stock', 0)),
            "is_featured": bool(data.get('featured', False)),
            "is_new": bool(data.get('newArrival', False)),
            "is_bestseller": bool(data.get('bestseller', False)),
            "fabric": data.get('fabric', ''),
            "care": data.get('care', ''),
            "updated_at": datetime.utcnow()
        }
        
        result = db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": updated_product}
        )
        
        if result.matched_count > 0:
            return jsonify({
                "success": True, 
                "message": "Product updated successfully"
            }), 200
        else:
            return jsonify({"error": "Product not available"}), 404
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
            # MySQL Update
            try:
                sql_item = CartItem.query.filter_by(user_id=session['user_id'], product_id_str=product_id, size=size).first()
                if sql_item:
                    sql_item.quantity += quantity
                    db_mysql.session.commit()
            except:
                db_mysql.session.rollback()
        else:
            db.cart.insert_one({
                "user_id": session['user_id'],
                "product_id": product_id,
                "quantity": quantity,
                "size": size
            })
            # MySQL Insert
            try:
                new_sql_cart = CartItem(
                    user_id=session['user_id'],
                    product_id_str=product_id,
                    quantity=quantity,
                    size=size
                )
                db_mysql.session.add(new_sql_cart)
                db_mysql.session.commit()
            except:
                db_mysql.session.rollback()
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
    
    # MySQL Insert
    try:
        new_wishlist_sql = WishlistItem(
            user_id=session['user_id'],
            product_id_str=product_id
        )
        db_mysql.session.add(new_wishlist_sql)
        db_mysql.session.commit()
    except:
        db_mysql.session.rollback()
    
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

# ==================== PAYMENTS ====================

@app.route('/api/payments/create-order', methods=['POST'])
def create_razorpay_order():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
    
    data = request.get_json()
    amount = data.get('amount') # In Rupees
    
    if not amount:
        return jsonify({"error": "Amount required"}), 400
        
    try:
        print(f"DEBUG: Creating Razorpay order for amount: {amount}")
        client = get_razorpay_client()
        # Amount in paise (1 INR = 100 paise)
        razorpay_order = client.order.create({
            "amount": int(float(amount) * 100),
            "currency": "INR",
            "payment_capture": "1"
        })
        print(f"DEBUG: Razorpay order created: {razorpay_order.get('id')}")
        return jsonify(razorpay_order), 200
    except Exception as e:
        print(f"DEBUG: Razorpay error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/payments/create-qr', methods=['POST'])
def create_payment_qr():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
    
    data = request.get_json()
    amount = data.get('amount')
    
    try:
        client = get_razorpay_client()
        # Create a Virtual Account for single payment via QR
        # This is the modern way to show a QR directly
        va = client.virtual_account.create({
            "receiver_types": ["qr_code"],
            "description": "Order Payment",
            "amount": int(float(amount) * 100),
            "currency": "INR",
            "notes": {
                "user_id": session['user_id']
            }
        })
        
        # Razorpay Virtual Account returns receivers list
        qr_data = va['receivers'][0]
        return jsonify({
            "success": True,
            "qr_id": va['id'],
            "qr_url": qr_data.get('url'), # This is the image URL
            "vpa": qr_data.get('vpa')
        }), 200
    except Exception as e:
        print(f"DEBUG: QR Creation Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/payments/verify', methods=['POST'])
def verify_payment():
    data = request.get_json()
    
    params_dict = {
        'razorpay_order_id': data.get('razorpay_order_id'),
        'razorpay_payment_id': data.get('razorpay_payment_id'),
        'razorpay_signature': data.get('razorpay_signature')
    }
    
    try:
        razorpay_client.utility.verify_payment_signature(params_dict)
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

@app.route('/api/payments/check-qr-status', methods=['POST'])
def check_qr_status():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
    
    data = request.get_json()
    qr_id = data.get('qr_id') # This is the Virtual Account ID
    
    if not qr_id:
        return jsonify({"error": "QR ID required"}), 400
        
    try:
        client = get_razorpay_client()
        # Fetch payments for this virtual account
        payments = client.virtual_account.payments(qr_id)
        
        if payments['count'] > 0:
            # Payment received!
            # We take the first successful payment
            payment = next((p for p in payments['items'] if p['status'] in ['captured', 'authorized']), None)
            if payment:
                return jsonify({
                    "success": True,
                    "status": "Paid",
                    "payment_id": payment['id']
                }), 200
            
        return jsonify({"success": False, "status": "Pending"}), 200
    except Exception as e:
        print(f"DEBUG: QR Status Check Error: {e}")
        return jsonify({"error": str(e)}), 500

# ==================== ORDERS ====================

@app.route('/api/orders', methods=['POST'])
def create_order():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    data = request.get_json()
    
    # Razorpay Verification
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_signature = data.get('razorpay_signature')
    
    payment_status = "Pending"
    if razorpay_payment_id and razorpay_order_id and razorpay_signature:
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        try:
            razorpay_client.utility.verify_payment_signature(params_dict)
            payment_status = "Paid"
        except Exception as e:
            print(f"Payment Verification Failed: {e}")
            return jsonify({"error": "Payment verification failed"}), 400
    
    user = db.users.find_one({"_id": ObjectId(session['user_id'])})
    if not user:
        return jsonify({"error": "User not found"}), 404

    order_doc = {
        "id": f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "user_id": session['user_id'],
        "total": data.get('total'),
        "status": "Processing",
        "payment_status": payment_status,
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_order_id": razorpay_order_id,
        "created_at": datetime.utcnow(),
        "items": data.get('items', []),
        "shipping_address": data.get('shippingAddress', {})
    }
    
    db.orders.insert_one(order_doc)
    
    # Save to MySQL
    try:
        user_sql = User.query.filter_by(email=user['email']).first() if user else None
        new_order_sql = OrderSQL(
            order_number=order_doc['id'],
            user_id=user_sql.id if user_sql else None,
            total=order_doc['total'],
            status=order_doc['status'],
            payment_status=order_doc['payment_status'],
            shipping_address_json=json.dumps(order_doc['shipping_address'])
        )
        db_mysql.session.add(new_order_sql)
        db_mysql.session.flush() # To get the order ID for items
        
        for item in order_doc['items']:
            new_item_sql = OrderItem(
                order_id=new_order_sql.id,
                product_id_str=item['id'],
                product_name=item['name'],
                quantity=item['quantity'],
                price=item['price'],
                size=item.get('size')
            )
            db_mysql.session.add(new_item_sql)
        
        db_mysql.session.commit()
        print(f"DEBUG: Order {order_doc['id']} saved to MySQL")
    except Exception as e:
        db_mysql.session.rollback()
        print(f"Error saving order to MySQL: {e}")

    # Update Stock and Clear Cart
    try:
        db.cart.delete_many({"user_id": session['user_id']})
        for item in order_doc['items']:
            db.products.update_one(
                {"_id": ObjectId(item['id'])},
                {"$inc": {"stock": -item['quantity']}}
            )
    except Exception as e:
        print(f"DEBUG: Error updating stock/cart: {e}")

    # Send Order Confirmation Email
    send_order_confirmation(mail, user['email'], order_doc['id'], order_doc['total'], order_doc['items'])
    
    return jsonify({
        "success": True, 
        "message": "Order placed successfully!", 
        "orderId": order_doc['id']
    }), 201

@app.route('/api/orders', methods=['GET'])
def get_orders():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    orders = list(db.orders.find({"user_id": session['user_id']}).sort("created_at", -1))
    return jsonify([serialize_doc(o) for o in orders])

@app.route('/api/admin/orders/<order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    new_status = data.get('status')
    tracking_link = data.get('tracking_link')
    
    if not new_status:
        return jsonify({"error": "Status required"}), 400
        
    order = db.orders.find_one({"id": order_id})
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": new_status}}
    )
    
    # Send Status Update Email
    user = db.users.find_one({"_id": ObjectId(order['user_id'])})
    if user:
        send_order_status_update(mail, user['email'], order_id, new_status, tracking_link)
        
    return jsonify({"success": True, "message": f"Order status updated to {new_status}"}), 200

@app.route('/api/admin/orders/<order_id>/dispatch', methods=['POST'])
def dispatch_borzo_order(order_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    order = db.orders.find_one({"id": order_id})
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    if order.get("borzo_order_id"):
        return jsonify({"error": "Order already dispatched via Borzo"}), 400

    user = db.users.find_one({"_id": ObjectId(order['user_id'])})
    shipping_address = order.get('shipping_address', {})
    
    # Format exactly as Borzo expects: full written address
    deliver_to = f"{shipping_address.get('address', '')}, {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('zip', '')}"
    pickup_from = os.getenv("STORE_ADDRESS", "Main Store Address, City, State ZIP")
    
    customer_phone = user.get('phone', '9999999999') if user else '9999999999'
    customer_name = shipping_address.get('firstName', '') + ' ' + shipping_address.get('lastName', '')

    try:
        dispatch_res = create_delivery_order(
            order_id=order_id,
            pickup_address=pickup_from,
            delivery_address=deliver_to,
            customer_phone=customer_phone,
            customer_name=customer_name
        )
        
        if dispatch_res.get("success"):
            borzo_id = dispatch_res["borzo_order_id"]
            tracking_url = dispatch_res["tracking_url"]
            
            # Update Mongo
            db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": "Shipped",
                    "borzo_order_id": borzo_id,
                    "borzo_tracking_url": tracking_url
                }}
            )
            
            # Update MySQL
            order_sql = OrderSQL.query.filter_by(order_number=order_id).first()
            if order_sql:
                order_sql.status = "Shipped"
                order_sql.borzo_order_id = str(borzo_id)
                order_sql.borzo_tracking_url = tracking_url
                db_mysql.session.commit()
                
            # Send Notification
            if user:
                send_order_status_update(mail, user['email'], order_id, "Shipped", tracking_url)

            return jsonify({"success": True, "message": "Dispatched via Borzo", "tracking_url": tracking_url}), 200
        else:
            return jsonify({"error": f"Borzo API Error: {dispatch_res.get('error')}"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/webhooks/borzo', methods=['POST'])
def borzo_webhook():
    # Borzo sends tracking updates here
    data = request.get_json()
    if not data:
        return jsonify({"success": True}), 200
        
    order_data = data.get("order", {})
    borzo_id = order_data.get("order_id")
    status = order_data.get("status") # e.g., 'available', 'active', 'completed', 'canceled'
    
    if borzo_id and status:
        internal_status = "Shipped"
        if status == "completed":
            internal_status = "Delivered"
        elif status == "canceled":
            internal_status = "Cancelled"
            
        # Update Mongo
        db.orders.update_one(
            {"borzo_order_id": borzo_id},
            {"$set": {"status": internal_status}}
        )
        
        # Update MySQL
        try:
            order_sql = OrderSQL.query.filter_by(borzo_order_id=str(borzo_id)).first()
            if order_sql:
                order_sql.status = internal_status
                db_mysql.session.commit()
        except Exception as e:
            db_mysql.session.rollback()
            print(f"Webhook MySQL update error: {e}")
            
    return jsonify({"success": True}), 200

# ==================== CUSTOMERS ====================

@app.route('/api/admin/customers', methods=['GET'])
def get_customers():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    # 1. Get all non-admin users
    users = list(db.users.find({"is_admin": {"$ne": True}}))
    
    # 2. For each user, aggregate their orders
    customer_data = []
    for user in users:
        user_id_str = str(user['_id'])
        
        # Aggregate totals from orders
        pipeline = [
            {"$match": {"user_id": user_id_str}},
            {"$group": {
                "_id": None,
                "total_orders": {"$sum": 1},
                "total_spent": {"$sum": "$total"}
            }}
        ]
        
        agg_result = list(db.orders.aggregate(pipeline))
        stats = agg_result[0] if len(agg_result) > 0 else {"total_orders": 0, "total_spent": 0}
        
        customer_data.append({
            "id": user_id_str,
            "name": f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "Unknown",
            "email": user.get("email"),
            "phone": user.get("phone", "N/A"),
            "date_joined": user.get("created_at"),
            "is_blocked": user.get("is_blocked", False),
            "total_orders": stats["total_orders"],
            "total_spent": stats["total_spent"]
        })
        
    return jsonify(serialize_doc(customer_data)), 200

@app.route('/api/admin/customers/<customer_id>', methods=['GET'])
def get_customer_profile(customer_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        user = db.users.find_one({"_id": ObjectId(customer_id)})
        if not user:
            return jsonify({"error": "Customer not found"}), 404
            
        # Get all their orders
        orders = list(db.orders.find({"user_id": customer_id}).sort("created_at", -1))
        
        # Calculate stats
        total_orders = len(orders)
        total_spent = sum(o.get('total', 0) for o in orders)
        avg_order_value = total_spent / total_orders if total_orders > 0 else 0
        
        # Extract default address from first order if possible, else empty
        address = None
        for o in orders:
            if o.get("shipping_address"):
                address = o["shipping_address"]
                break
                
        customer_profile = {
            "id": str(user["_id"]),
            "first_name": user.get("first_name", ""),
            "last_name": user.get("last_name", ""),
            "email": user.get("email"),
            "phone": user.get("phone", "N/A"),
            "date_joined": user.get("created_at"),
            "is_blocked": user.get("is_blocked", False),
            "address": address,
            "stats": {
                "total_orders": total_orders,
                "total_spent": total_spent,
                "avg_order_value": avg_order_value
            },
            "orders": [serialize_doc(o) for o in orders]
        }
        
        return jsonify(serialize_doc(customer_profile)), 200
        
    except Exception as e:
        return jsonify({"error": f"Invalid ID format: {str(e)}"}), 400

@app.route('/api/admin/customers/<customer_id>/status', methods=['PUT'])
def update_customer_status(customer_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    is_blocked = data.get('is_blocked')
    
    if is_blocked is None:
        return jsonify({"error": "is_blocked status is required"}), 400
        
    try:
        # Update MongoDB
        db.users.update_one(
            {"_id": ObjectId(customer_id)},
            {"$set": {"is_blocked": is_blocked}}
        )
        
        # Try to sync to MySQL if it exists there
        mysql_user = User.query.filter_by(id=customer_id).first()
        if not mysql_user:
            # Maybe lookup by email instead since ID might differ across DBs
            mongo_user = db.users.find_one({"_id": ObjectId(customer_id)})
            if mongo_user:
                mysql_user = User.query.filter_by(email=mongo_user['email']).first()
                
        if mysql_user:
            mysql_user.is_blocked = is_blocked
            db_mysql.session.commit()
            
        action = "blocked" if is_blocked else "unblocked"
        return jsonify({"success": True, "message": f"Customer successfully {action}."}), 200
        
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

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
    
    # Save to MySQL
    try:
        new_cat_sql = CategorySQL(
            name=name,
            subcategories=[subcategory] if subcategory else []
        )
        db_mysql.session.add(new_cat_sql)
        db_mysql.session.commit()
    except Exception as e:
        db_mysql.session.rollback()
        print(f"Error saving category to MySQL: {e}")
        
    return jsonify({"success": True, "message": "Category created"}), 201

@app.route('/api/categories/<cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    db.categories.delete_one({"_id": ObjectId(cat_id)})
    return jsonify({"success": True, "message": "Category deleted"}), 200

@app.route('/api/categories/<cat_id>/subcategories', methods=['DELETE'])
def delete_subcategory(cat_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    subcategory = data.get('subcategory')
    
    if not subcategory:
        return jsonify({"error": "Subcategory name required"}), 400
        
    db.categories.update_one(
        {"_id": ObjectId(cat_id)},
        {"$pull": {"subcategories": subcategory}}
    )
    return jsonify({"success": True, "message": "Subcategory deleted"}), 200

# ==================== HOMEPAGE ====================

@app.route('/api/homepage', methods=['GET'])
def get_homepage_config():
    print("DEBUG: Fetching homepage config")
    config = db.homepage_config.find_one({"type": "main"})
    
    # Default fallback
    default_config = {
        "type": "main",
        "hero_slides": [
            {
                "image": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564&auto=format&fit=crop",
                "content": "ETHEREAL SHADOWS: FALL WINTER 2025",
                "product_id": ""
            }
        ],
        "manifesto_text": "We believe in the quiet power of silence. In a world of noise, U.S ATELIER is the absence of it. We strip away the unnecessary to reveal the essential structure of the human form. This is not just clothing; this is architecture for the soul.",
        "bestseller_product_ids": [],
        "featured_product_ids": [],
        "new_arrival_product_ids": []
    }

    if not config:
        print("DEBUG: No config found, using default")
        return jsonify(serialize_doc(default_config))
    
    # Migration: If old structure exists or hero_slides needs schema update
    if 'hero_slides' not in config or not config['hero_slides']:
        print("DEBUG: Migrating old config to hero_slides array")
        config['hero_slides'] = [{
            "image": config.get('hero_image', default_config['hero_slides'][0]['image']),
            "content": f"{config.get('hero_title_1', 'ETHEREAL')} {config.get('hero_title_2', 'SHADOWS')}",
            "product_id": ""
        }]
    
    return jsonify(serialize_doc(config))

@app.route('/api/homepage', methods=['POST'])
def update_homepage_config():
    is_admin = session.get('is_admin')
    print(f"DEBUG: Updating homepage config. is_admin: {is_admin}")
    
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        print("DEBUG: Unauthorized update attempt")
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    print(f"DEBUG: New homepage data: {data}")
    
    update_data = {
        "hero_slides": data.get('hero_slides', []),
        "manifesto_text": data.get('manifesto_text'),
        "bestseller_product_ids": data.get('bestseller_product_ids', []),
        "featured_product_ids": data.get('featured_product_ids', []),
        "new_arrival_product_ids": data.get('new_arrival_product_ids', []),
        "updated_at": datetime.utcnow()
    }
    
    db.homepage_config.update_one(
        {"type": "main"},
        {"$set": update_data},
        upsert=True
    )
    print("DEBUG: Homepage config updated successfully")
    return jsonify({"success": True, "message": "Homepage updated successfully"}), 200

@app.route('/api/admin/analysis', methods=['GET'])
def get_business_analysis():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        # 1. Most Sold Products (from orders)
        sales_pipeline = [
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.id",
                "name": {"$first": "$items.name"},
                "total_sold": {"$sum": "$items.quantity"},
                "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
            }},
            {"$sort": {"total_sold": -1}},
            {"$limit": 10}
        ]
        most_sold = list(db.orders.aggregate(sales_pipeline))

        # 2. Most Favorited Products (from wishlist)
        wishlist_pipeline = [
            {"$group": {
                "_id": "$product_id",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        fav_counts = list(db.wishlist.aggregate(wishlist_pipeline))
        most_favorited = []
        for item in fav_counts:
            product = db.products.find_one({"_id": ObjectId(item['_id'])})
            if product:
                most_favorited.append({
                    "id": str(product['_id']),
                    "name": product['name'],
                    "count": item['count']
                })

        # 3. Most Added to Cart (from cart)
        cart_pipeline = [
            {"$group": {
                "_id": "$product_id",
                "total_quantity": {"$sum": "$quantity"},
                "user_count": {"$sum": 1}
            }},
            {"$sort": {"total_quantity": -1}},
            {"$limit": 10}
        ]
        cart_counts = list(db.cart.aggregate(cart_pipeline))
        most_added_to_cart = []
        for item in cart_counts:
            product = db.products.find_one({"_id": ObjectId(item['_id'])})
            if product:
                most_added_to_cart.append({
                    "id": str(product['_id']),
                    "name": product['name'],
                    "total_quantity": item['total_quantity'],
                    "user_count": item['user_count']
                })

        # 4. Stock Inventory Levels
        # Fetch all products and sort by stock ascending
        products_stock = list(db.products.find({}, {"name": 1, "stock": 1, "category": 1}).sort("stock", 1))
        all_stock = []
        low_stock = []
        for p in products_stock:
            p_data = {
                "id": str(p['_id']),
                "name": p['name'],
                "stock": p.get('stock', 0),
                "category": p.get('category', 'Uncategorized')
            }
            all_stock.append(p_data)
            if p.get('stock', 0) <= 5:
                low_stock.append(p_data)

        # 5. Category Analysis
        cat_pipeline = [
            {"$group": {
                "_id": "$category",
                "count": {"$sum": 1},
                "total_stock": {"$sum": "$stock"}
            }}
        ]
        category_stats = list(db.products.aggregate(cat_pipeline))

        return jsonify({
            "most_sold": most_sold,
            "most_favorited": most_favorited,
            "most_added_to_cart": most_added_to_cart,
            "low_stock": low_stock,
            "all_stock": all_stock,
            "category_stats": category_stats
        }), 200

    except Exception as e:
        import traceback
        error_msg = f"Error in business analysis: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        with open("analysis_error.log", "a") as f:
            f.write(f"\n--- {datetime.utcnow()} ---\n{error_msg}\n")
        return jsonify({"error": str(e), "details": "Check analysis_error.log on server"}), 500

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

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == '__main__':
    with app.app_context():
        try:
            seed_database()
        except Exception as e:
            print(f"Seeding failed: {e}")
            
    app.run(host='0.0.0.0', port=5000, debug=True)
