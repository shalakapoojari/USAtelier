from flask import Flask, render_template, jsonify, request, session, redirect, url_for, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import json
import time
import re
import razorpay
from datetime import datetime
from flask_mail import Mail
from authlib.integrations.flask_client import OAuth
import requests
from mail_utils import (
    send_signup_confirmation, 
    send_password_change_confirmation,
    send_order_confirmation,
    send_order_status_update,
    send_new_arrival_notification
)
from models_mysql import (
    db_mysql, User, Product as ProductSQL, Category as CategorySQL, 
    Order as OrderSQL, OrderItem, CartItem, WishlistItem, Review, HomepageConfig,
    Payment
)
from borzo_utils import create_delivery_order

PASSWORD_POLICY_REGEX = re.compile(r'^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$')

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='/static')
# Parse allowed origins from environment (comma separated) or use default local config
allowed_origins_env = os.getenv('ALLOWED_ORIGINS')
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(',')]
else:
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.31.120:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5000",
        re.compile(r"http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?"),
        re.compile(r"http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?"),
        re.compile(r"http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?"),
    ]

# CORS must specify origins when supports_credentials=True
# Wildcard "*" is NOT allowed with credentials.
CORS(app, supports_credentials=True, origins=origins)

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
if os.getenv('FLASK_ENV') != 'production':
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
else:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '0'

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
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET')

def get_razorpay_client():
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

razorpay_client = get_razorpay_client() if RAZORPAY_KEY_ID else None

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

# ==================== STATIC ASSETS ====================
@app.route('/static/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(os.path.join(os.getcwd(), 'public', 'uploads'), filename)

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
        # Check MySQL connection
        User.query.limit(1).all()
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
    terms_accepted = bool(data.get('termsAccepted'))
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    if not PASSWORD_POLICY_REGEX.match(password):
        return jsonify({"error": "Password must be at least 8 characters and include a letter, a number, and a special character"}), 400

    if not terms_accepted:
        return jsonify({"error": "Terms and Conditions must be accepted"}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400
        
    try:
        new_user = User(
            email=email,
            password=generate_password_hash(password), # Hashed password
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            is_admin=False
        )
        db_mysql.session.add(new_user)
        db_mysql.session.commit()

        session.permanent = False # Change to False for session-only persistence
        session['user_id'] = str(new_user.id)
        session['is_admin'] = False
        session['is_new_signup'] = True 
        
        # Send Welcome Email
        send_signup_confirmation(mail, email, first_name)
        
        return jsonify({
            "success": True,
            "message": "Signup successful!",
            "user": email,
            "firstName": first_name,
            "lastName": last_name,
            "phone": phone,
            "id": str(new_user.id)
        }), 201
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    
    print(f"DEBUG: Login Attempt - Email: '{email}', Password: '{password}'")
    user = User.query.filter_by(email=email).first()
    
    password_ok = False
    if user:
        # 1. Try hashed check
        if check_password_hash(user.password, password):
            password_ok = True
        # 2. Fallback to plain-text for legacy users
        elif user.password == password:
            password_ok = True
            # Automatically upgrade to hash for next time
            try:
                user.password = generate_password_hash(password)
                db_mysql.session.commit()
                print(f"DEBUG: Password upgraded to hash for {email}")
            except Exception as e:
                db_mysql.session.rollback()
                print(f"DEBUG: Failed to upgrade password for {email}: {e}")

    if user and password_ok:
        if user.is_blocked:
            return jsonify({"error": "Your account has been blocked. Please contact support."}), 403

        session.permanent = False # Change to False for session-only persistence
        session['user_id'] = str(user.id)
        session['is_admin'] = bool(user.is_admin)
        print(f"DEBUG: Login success for {email}. is_admin: {session['is_admin']}")
        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": email,
            "firstName": user.first_name or email.split('@')[0],
            "lastName": user.last_name or '',
            "phone": user.phone or '',
            "profilePic": user.profile_pic or '',
            "id": str(user.id),
            "isAdmin": user.is_admin
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/user', methods=['GET', 'PUT'])
def get_user_profile():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({"user": None}), 200
        
    user = User.query.get(int(user_id))
    if not user:
        session.clear()
        return jsonify({"user": None}), 200

    if request.method == 'PUT':
        data = request.get_json()
        user.first_name = data.get('firstName', user.first_name)
        user.last_name = data.get('lastName', user.last_name)
        user.phone = data.get('phone', user.phone)
        user.profile_pic = data.get('profilePic', user.profile_pic)
        try:
            db_mysql.session.commit()
            return jsonify({"success": True, "message": "Profile updated", "user": user.email, "id": str(user.id)})
        except Exception as e:
            db_mysql.session.rollback()
            return jsonify({"error": str(e)}), 500

    return jsonify({
        "user": user.email,
        "id": str(user.id),
        "firstName": user.first_name,
        "lastName": user.last_name,
        "phone": user.phone,
        "profilePic": user.profile_pic,
        "isAdmin": user.is_admin,
        "isBlocked": user.is_blocked,
        "addresses": user.JSON_addresses,
        "isNewSignup": session.get('is_new_signup', False)
    }), 200

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
            # Local Storage Only (as requested)
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
            print(f"Error saving product file locally: {str(e)}")
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
            # Local Storage Only (as requested)
            user_id = session['user_id']
            filename = f"profile_{user_id}_{int(time.time())}.{file.filename.rsplit('.', 1)[1].lower()}"
            
            profiles_dir = os.path.join(UPLOAD_FOLDER, 'profiles')
            if not os.path.exists(profiles_dir):
                os.makedirs(profiles_dir)
                
            filepath = os.path.join(profiles_dir, filename)
            file.save(filepath)
            
            return jsonify({
                "success": True,
                "url": f"/uploads/profiles/{filename}"
            }), 200
        except Exception as e:
            print(f"Error saving profile pic locally: {str(e)}")
            return jsonify({"error": f"Upload failed: {str(e)}"}), 500
            
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

    if not PASSWORD_POLICY_REGEX.match(new_password):
        return jsonify({"error": "New password must be at least 8 characters and include a letter, a number, and a special character"}), 400
        
    user = User.query.get(int(session['user_id']))
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if not check_password_hash(user.password, current_password):
        return jsonify({"error": "Incorrect current password"}), 400
        
    try:
        user.password = generate_password_hash(new_password) # Hashed password
        db_mysql.session.commit()
    except Exception as e:
        print(f"DEBUG: Error updating password in MySQL: {e}")
        db_mysql.session.rollback()
        return jsonify({"error": "Failed to update password"}), 500
    
    # Send Password Change Notification
    email_sent = send_password_change_confirmation(mail, user.email, user.first_name or 'User')
    
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

    user = User.query.filter_by(email=email).first()
    
    if not user:
        try:
            user = User(
                email=email,
                password=os.urandom(24).hex(), # Random pass for OAuth users
                first_name=first_name,
                last_name=last_name,
                profile_pic=picture,
                is_admin=False
            )
            db_mysql.session.add(user)
            db_mysql.session.commit()
            
            # Welcome Email
            try:
                send_signup_confirmation(mail, email, first_name)
            except Exception as e:
                print(f"Error sending welcome email: {str(e)}")
        except Exception as e:
            db_mysql.session.rollback()
            print(f"Error creating Google user in MySQL: {e}")
            return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/login?error=db_error")
    else:
        # Update existing user profile pic if it changed
        if not user.profile_pic or user.profile_pic != picture:
            try:
                user.profile_pic = picture
                db_mysql.session.commit()
            except Exception as e:
                db_mysql.session.rollback()
                print(f"Error updating MySQL profile pic: {e}")

    # Set session
    session.clear()
    session.permanent = True
    session['user_id'] = str(user.id)
    session['is_admin'] = bool(user.is_admin)
    
    # Redirect to Landing Page
    return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/")

@app.route('/api/auth/user', methods=['GET', 'PUT'])
def user_profile():
    if 'user_id' not in session:
        return jsonify({"user": None}), 200

    user = User.query.get(int(session['user_id']))
    if not user:
        return jsonify({"user": None}), 200

    if request.method == 'GET':
        return jsonify({
            "user": user.email, 
            "firstName": user.first_name or user.email.split('@')[0],
            "lastName": user.last_name or '',
            "phone": user.phone or '',
            "profilePic": user.profile_pic or '',
            "isAdmin": user.is_admin,
            "isNewSignup": session.get('is_new_signup', False),
            "id": str(user.id),
            "addresses": user.JSON_addresses
        }), 200
    
    if request.method == 'PUT':
        data = request.get_json()
        try:
            if 'firstName' in data: user.first_name = data['firstName']
            if 'lastName' in data: user.last_name = data['lastName']
            if 'phone' in data: user.phone = data['phone']
            if 'profilePic' in data: user.profile_pic = data['profilePic']
            db_mysql.session.commit()
            return jsonify({"success": True, "message": "Profile updated"}), 200
        except Exception as e:
            db_mysql.session.rollback()
            return jsonify({"error": str(e)}), 500

    return jsonify({"user": None}), 200

@app.route('/api/user/addresses', methods=['POST'])
def add_address():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
    
    user = User.query.get(int(session['user_id']))
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    address = {
        "id": int(time.time()), # Simple integer ID for SQL
        "street": data.get('street'),
        "city": data.get('city'),
        "state": data.get('state'),
        "zip": data.get('zip'),
        "country": data.get('country', 'US')
    }
    
    try:
        current_addresses = user.JSON_addresses
        current_addresses.append(address)
        user.JSON_addresses = current_addresses
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Address added"}), 201
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

# ==================== PRODUCTS ====================

@app.route('/api/products', methods=['GET'])
def get_products():
    query = ProductSQL.query
    
    # Filtering
    category = request.args.get('category')
    if category and category != 'all':
        query = query.filter_by(category=category)

    gender = request.args.get('gender')
    if gender and gender != 'all':
        query = query.filter_by(gender=gender)
        
    search = request.args.get('search')
    if search:
        query = query.filter(
            (ProductSQL.name.ilike(f'%{search}%')) | 
            (ProductSQL.description.ilike(f'%{search}%'))
        )

    # Price Filtering
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')
    if min_price:
        query = query.filter(ProductSQL.price >= float(min_price))
    if max_price:
        query = query.filter(ProductSQL.price <= float(max_price))

    # Sorting
    sort_raw = request.args.get('sort')
    if sort_raw == 'price_asc':
        query = query.order_by(ProductSQL.price.asc())
    elif sort_raw == 'price_desc':
        query = query.order_by(ProductSQL.price.desc())
    else:
        query = query.order_by(ProductSQL.created_at.desc())

    products = query.all()
    return jsonify([p.to_dict() for p in products])

@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = ProductSQL.query.get(int(product_id))
        if product:
            return jsonify(product.to_dict()), 200
    except:
        pass
    return jsonify({"error": "Product not available"}), 404

@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        product = ProductSQL.query.get(int(product_id))
        if product:
            db_mysql.session.delete(product)
            db_mysql.session.commit()
            return jsonify({"success": True, "message": "Product deleted"}), 200
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500
        
    return jsonify({"error": "Product not available"}), 404

@app.route('/api/products', methods=['POST'])
def add_product():
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
        new_product = ProductSQL(
            name=data['name'],
            price=float(data['price']),
            category=data['category'],
            subcategory=data.get('subcategory', ''),
            gender=data.get('gender', 'Unisex'),
            description=data['description'],
            images=data['images'],
            sizes=data['sizes'],
            stock=int(data.get('stock', 0)),
            is_featured=bool(data.get('featured', False)),
            is_new=bool(data.get('newArrival', False)),
            is_bestseller=bool(data.get('bestseller', False)),
            fabric=data.get('fabric', ''),
            care=data.get('care', ''),
            size_guide_image=data.get('sizeGuideImage', '')
        )
        
        db_mysql.session.add(new_product)
        db_mysql.session.commit()

        # Send New Arrival Email to all users if it's marked as new and notification is requested
        if new_product.is_new and data.get('notify_users'):
            users = User.query.all()
            for u in users:
                user_name = u.first_name or u.email.split('@')[0]
                send_new_arrival_notification(
                    mail, 
                    u.email, 
                    user_name,
                    new_product.name, 
                    new_product.price, 
                    new_product.category,
                    new_product.description,
                    str(new_product.id)
                )
        
        return jsonify({
            "success": True, 
            "message": "Product added successfully",
            "id": str(new_product.id)
        }), 201
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    
    try:
        product = ProductSQL.query.get(int(product_id))
        if not product:
            return jsonify({"error": "Product not available"}), 404
            
        if 'name' in data: product.name = data['name']
        if 'price' in data: product.price = float(data['price'])
        if 'category' in data: product.category = data['category']
        if 'subcategory' in data: product.subcategory = data['subcategory']
        if 'gender' in data: product.gender = data['gender']
        if 'description' in data: product.description = data['description']
        if 'images' in data: product.images = data['images']
        if 'sizes' in data: product.sizes = data['sizes']
        if 'stock' in data: product.stock = int(data['stock'])
        if 'featured' in data: product.is_featured = bool(data['featured'])
        if 'newArrival' in data: product.is_new = bool(data['newArrival'])
        if 'bestseller' in data: product.is_bestseller = bool(data['bestseller'])
        if 'fabric' in data: product.fabric = data['fabric']
        if 'care' in data: product.care = data['care']
        if 'sizeGuideImage' in data: product.size_guide_image = data['sizeGuideImage']
        
        db_mysql.session.commit()
        return jsonify({
            "success": True, 
            "message": "Product updated successfully"
        }), 200
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

# ==================== CART ====================

# ==================== CART ====================

@app.route('/api/cart', methods=['GET'])
def get_cart():
    if 'user_id' in session:
        # DB Cart
        cart_items = CartItem.query.filter_by(user_id=int(session['user_id'])).all()
        results = []
        for item in cart_items:
            try:
                product = ProductSQL.query.get(int(item.product_id_str))
                if product:
                    results.append({
                        "id": str(product.id),
                        "name": product.name,
                        "price": product.price,
                        "image": product.images[0] if product.images else '',
                        "quantity": item.quantity,
                        "size": item.size,
                    })
            except:
                pass
        return jsonify(results)
    else:
        return jsonify(session.get('cart', []))

@app.route('/api/cart', methods=['POST'])
def add_to_cart():
    data = request.get_json()
    product_id = str(data.get('id'))
    quantity = data.get('quantity', 1)
    size = data.get('size')
    
    if 'user_id' in session:
        # DB Cart
        existing = CartItem.query.filter_by(
            user_id=int(session['user_id']),
            product_id_str=product_id,
            size=size
        ).first()
        
        try:
            if existing:
                existing.quantity += quantity
            else:
                new_item = CartItem(
                    user_id=int(session['user_id']),
                    product_id_str=product_id,
                    quantity=quantity,
                    size=size
                )
                db_mysql.session.add(new_item)
            db_mysql.session.commit()
        except Exception as e:
            db_mysql.session.rollback()
            return jsonify({"error": str(e)}), 500
    else:
        # Session Cart
        cart = session.get('cart', [])
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
    
    items = WishlistItem.query.filter_by(user_id=int(session['user_id'])).all()
    results = []
    for item in items:
        try:
            product = ProductSQL.query.get(int(item.product_id_str))
            if product:
                results.append({
                    'id': str(product.id),
                    'name': product.name,
                    'price': product.price,
                    'image': product.images[0] if product.images else '',
                    'category': product.category
                })
        except:
            pass
    return jsonify(results)

@app.route('/api/wishlist', methods=['POST'])
def add_to_wishlist():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    data = request.get_json()
    product_id = str(data.get('product_id'))
    
    if not product_id:
        return jsonify({"error": "Product ID required"}), 400
        
    existing = WishlistItem.query.filter_by(
        user_id=int(session['user_id']),
        product_id_str=product_id
    ).first()
    
    if existing:
        return jsonify({"message": "Already in wishlist"}), 200
        
    try:
        new_item = WishlistItem(
            user_id=int(session['user_id']),
            product_id_str=product_id
        )
        db_mysql.session.add(new_item)
        db_mysql.session.commit()
        return jsonify({"success": True}), 201
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/wishlist/<product_id>', methods=['DELETE'])
def remove_from_wishlist(product_id):
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    try:
        item = WishlistItem.query.filter_by(
            user_id=int(session['user_id']),
            product_id_str=str(product_id)
        ).first()
        if item:
            db_mysql.session.delete(item)
            db_mysql.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

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
            
        user = User.query.get(int(session['user_id']))
        
        try:
            new_review = Review(
                user_id=user.id if user else None,
                user_email=user.email if user else "Anonymous",
                product_id_str=str(product_id),
                rating=int(rating),
                comment=comment
            )
            db_mysql.session.add(new_review)
            db_mysql.session.commit()
            return jsonify({"success": True}), 201
        except Exception as e:
            db_mysql.session.rollback()
            return jsonify({"error": str(e)}), 500

    reviews = Review.query.filter_by(product_id_str=str(product_id)).order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews])
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
        
        # Log Payment attempt
        try:
            payment = Payment(
                user_id=int(session['user_id']),
                razorpay_order_id=razorpay_order.get('id'),
                amount=float(amount),
                currency="INR",
                status='pending'
            )
            db_mysql.session.add(payment)
            db_mysql.session.commit()
        except Exception as log_err:
            print(f"DEBUG: Error logging payment: {log_err}")
            db_mysql.session.rollback()

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
        va = client.virtual_account.create({
            "receiver_types": ["qr_code"],
            "description": "Order Payment",
            "amount": int(float(amount) * 100),
            "currency": "INR",
            "notes": {
                "user_id": session['user_id']
            }
        })
        
        qr_data = va['receivers'][0]
        return jsonify({
            "success": True,
            "qr_id": va['id'],
            "qr_url": qr_data.get('url'),
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

@app.route('/api/webhooks/razorpay', methods=['POST'])
def razorpay_webhook():
    webhook_secret = os.getenv('RAZORPAY_WEBHOOK_SECRET')
    if not webhook_secret:
        return jsonify({"error": "Webhook secret not configured"}), 500
        
    payload = request.get_data()
    signature = request.headers.get('X-Razorpay-Signature')
    
    try:
        client = get_razorpay_client()
        client.utility.verify_webhook_signature(payload, signature, webhook_secret)
    except Exception as e:
        print(f"Webhook Signature Verification Failed: {e}")
        return jsonify({"error": "Invalid signature"}), 400
        
    data = request.get_json()
    event = data.get('event')
    
    if event in ['payment.captured', 'order.paid']:
        payment_payload = data['payload']['payment']['entity']
        razorpay_payment_id = payment_payload['id']
        razorpay_order_id = payment_payload['order_id']
        amount = payment_payload['amount'] / 100
        
        # Update or create payment record
        payment = Payment.query.filter_by(razorpay_order_id=razorpay_order_id).first()
        if not payment:
            payment = Payment(
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                amount=amount,
                status='captured',
                method=payment_payload.get('method'),
                email=payment_payload.get('email'),
                phone=payment_payload.get('contact')
            )
            db_mysql.session.add(payment)
        else:
            payment.razorpay_payment_id = razorpay_payment_id
            payment.status = 'captured'
            payment.method = payment_payload.get('method')
            payment.email = payment_payload.get('email')
            payment.phone = payment_payload.get('contact')
            
        # Update order if exists
        order = OrderSQL.query.filter_by(razorpay_order_id=razorpay_order_id).first()
        if order:
            order.payment_status = 'Paid'
            order.razorpay_payment_id = razorpay_payment_id
            
        db_mysql.session.commit()
    
    return jsonify({"success": True}), 200

@app.route('/api/admin/payments', methods=['GET'])
def get_admin_payments():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    payments = Payment.query.order_by(Payment.created_at.desc()).all()
    return jsonify([p.to_dict() for p in payments]), 200

@app.route('/api/admin/payments/refund', methods=['POST'])
def refund_payment():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    rzp_payment_id = data.get('razorpay_payment_id')
    amount = data.get('amount')
    
    if not rzp_payment_id:
        return jsonify({"error": "Razorpay Payment ID is required"}), 400
        
    try:
        client = get_razorpay_client()
        refund_data = {}
        if amount:
            refund_data['amount'] = int(float(amount) * 100)
            
        refund = client.payment.refund(rzp_payment_id, refund_data)
        
        # Update local payment record
        payment = Payment.query.filter_by(razorpay_payment_id=rzp_payment_id).first()
        if payment:
            payment.status = 'refunded'
            
        # Update order if it was a full refund? Or maybe just keep it separate.
        # Usually order status would be "Refunded"
        if payment and payment.order_id:
            order = OrderSQL.query.get(payment.order_id)
            if order:
                order.payment_status = 'Refunded'
                order.status = 'Cancelled'
                
        db_mysql.session.commit()
            
        return jsonify({"success": True, "refund": refund}), 200
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/payments/check-qr-status', methods=['POST'])
def check_qr_status():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
    
    data = request.get_json()
    qr_id = data.get('qr_id') 
    
    if not qr_id:
        return jsonify({"error": "QR ID required"}), 400
        
    try:
        client = get_razorpay_client()
        payments = client.virtual_account.payments(qr_id)
        
        if payments['count'] > 0:
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
    terms_accepted = bool(data.get('termsAccepted'))

    if not terms_accepted:
        return jsonify({"error": "Terms and Conditions must be accepted before placing an order"}), 400
    
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
    
    user = User.query.get(int(session['user_id']))
    if not user:
        return jsonify({"error": "User not found"}), 404

    order_id_str = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    try:
        new_order = OrderSQL(
            order_number=order_id_str,
            user_id=user.id,
            total=float(data.get('total', 0)),
            status="Processing",
            payment_status=payment_status,
            shipping_address_json=json.dumps(data.get('shippingAddress', {}))
        )
        if razorpay_order_id:
            new_order.razorpay_order_id = razorpay_order_id
        if razorpay_payment_id:
            new_order.razorpay_payment_id = razorpay_payment_id
            
        db_mysql.session.add(new_order)
        db_mysql.session.flush()
        
        # Link payment record to order
        if razorpay_order_id:
            payment = Payment.query.filter_by(razorpay_order_id=razorpay_order_id).first()
            if payment:
                payment.order_id = new_order.id
                payment.status = 'captured' if payment_status == 'Paid' else payment.status
        
        for item in data.get('items', []):
            new_item = OrderItem(
                order_id=new_order.id,
                product_id_str=str(item['id']),
                product_name=item['name'],
                quantity=item['quantity'],
                price=float(item['price']),
                size=item.get('size')
            )
            db_mysql.session.add(new_item)
            
            # Update Stock
            try:
                prod = ProductSQL.query.get(int(item['id']))
                if prod:
                    prod.stock -= item['quantity']
            except:
                pass
        
        # Clear Cart
        CartItem.query.filter_by(user_id=user.id).delete()
        
        db_mysql.session.commit()
        
        # Send Order Confirmation Email
        send_order_confirmation(mail, user.email, order_id_str, data.get('total'), data.get('items'))
        
        return jsonify({
            "success": True, 
            "message": "Order placed successfully!", 
            "orderId": order_id_str
        }), 201
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/orders', methods=['GET'])
def get_orders():
    if 'user_id' not in session:
        return jsonify({"error": "Login required"}), 401
        
    orders = OrderSQL.query.filter_by(user_id=session['user_id']).order_by(OrderSQL.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])

@app.route('/api/admin/orders/<order_id>', methods=['GET'])
def get_admin_order_detail(order_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    # Try ID first, then order_number
    order = OrderSQL.query.get(order_id)
    if not order:
        order = OrderSQL.query.filter_by(order_number=order_id).first()
        
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    user = User.query.get(order.user_id)
    order_dict = order.to_dict()
    
    # Add customer info
    order_dict['customerName'] = f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Unknown"
    order_dict['customerEmail'] = user.email if user else "Unknown"
    order_dict['date'] = order.created_at.isoformat() if order.created_at else None
    
    # Map to frontend expectations
    frontend_items = []
    for item in order.items:
        frontend_items.append({
            "productName": item.product_name,
            "quantity": item.quantity,
            "price": item.price,
            "size": item.size
        })
    order_dict['items'] = frontend_items
    order_dict['subtotal'] = sum(i['price'] * i['quantity'] for i in frontend_items)
    order_dict['shipping'] = order.total - order_dict['subtotal']
    
    return jsonify(order_dict), 200

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
        
    order = OrderSQL.query.get(order_id)
    if not order:
        order = OrderSQL.query.filter_by(order_number=order_id).first()
        
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    order.status = new_status
    db_mysql.session.commit()
    
    # Send Status Update Email
    user = User.query.get(order.user_id)
    if user:
        send_order_status_update(mail, user.email, order.order_number, new_status, tracking_link)
        
    return jsonify({"success": True, "message": f"Order status updated to {new_status}"}), 200

@app.route('/api/admin/dispatch/<order_id>', methods=['POST'])
def dispatch_borzo_order(order_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    order = OrderSQL.query.filter_by(order_number=order_id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
        
    if order.borzo_order_id:
        return jsonify({"error": "Order already dispatched via Borzo"}), 400

    user = User.query.get(order.user_id)
    shipping_address = order.shipping_address
    
    # Format address for Borzo
    deliver_to = f"{shipping_address.get('street', '')}, {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('zip', '')}"
    pickup_from = os.getenv("STORE_ADDRESS", "Main Store Address, City, State ZIP")
    
    customer_phone = user.phone or '9999999999' if user else '9999999999'
    customer_name = f"{shipping_address.get('firstName', '')} {shipping_address.get('lastName', '')}".strip()

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
            
            order.status = "Shipped"
            order.borzo_order_id = str(borzo_id)
            order.borzo_tracking_url = tracking_url
            db_mysql.session.commit()
                
            # Send Notification
            if user:
                send_order_status_update(mail, user.email, order_id, "Shipped", tracking_url)

            return jsonify({"success": True, "message": "Dispatched via Borzo", "tracking_url": tracking_url}), 200
        else:
            return jsonify({"error": f"Borzo API Error: {dispatch_res.get('error')}"}), 500
            
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/webhooks/borzo', methods=['POST'])
def borzo_webhook():
    data = request.get_json()
    if not data:
        return jsonify({"success": True}), 200
        
    order_data = data.get("order", {})
    borzo_id = str(order_data.get("order_id"))
    status = order_data.get("status") 
    
    if borzo_id and status:
        internal_status = "Shipped"
        if status == "completed":
            internal_status = "Delivered"
        elif status == "canceled":
            internal_status = "Cancelled"
            
        try:
            order = OrderSQL.query.filter_by(borzo_order_id=borzo_id).first()
            if order:
                order.status = internal_status
                db_mysql.session.commit()
                # Optional: Send email
                user = User.query.get(order.user_id)
                if user:
                    send_order_status_update(mail, user.email, order.order_number, internal_status, order.borzo_tracking_url)
        except Exception as e:
            db_mysql.session.rollback()
            print(f"Webhook MySQL update error: {e}")
            
    return jsonify({"success": True}), 200

# ==================== ANALYSIS ====================

@app.route('/api/admin/analysis', methods=['GET'])
def get_analysis_data():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        from sqlalchemy import func

        # 1. Most Sold Products
        most_sold_raw = db_mysql.session.query(
            OrderItem.product_name, 
            func.sum(OrderItem.quantity).label('total_sold')
        ).group_by(OrderItem.product_name).order_by(func.sum(OrderItem.quantity).desc()).limit(10).all()
        
        most_sold = [{"name": r[0], "total_sold": int(r[1])} for r in most_sold_raw]

        # 2. Most Favorited
        most_favorited_raw = db_mysql.session.query(
            WishlistItem.product_id_str, 
            func.count(WishlistItem.id).label('total_favorites')
        ).group_by(WishlistItem.product_id_str).order_by(func.count(WishlistItem.id).desc()).limit(10).all()
        
        most_favorited = []
        for p_id_str, count in most_favorited_raw:
             p = ProductSQL.query.get(int(p_id_str)) if p_id_str.isdigit() else None
             most_favorited.append({"name": p.name if p else "Unknown", "count": count})

        # 3. Most Added to Cart
        most_added_raw = db_mysql.session.query(
            CartItem.product_id_str, 
            func.count(CartItem.id).label('total_carts')
        ).group_by(CartItem.product_id_str).order_by(func.count(CartItem.id).desc()).limit(10).all()
        
        most_added_to_cart = []
        for p_id_str, count in most_added_raw:
             p = ProductSQL.query.get(int(p_id_str)) if p_id_str.isdigit() else None
             most_added_to_cart.append({"name": p.name if p else "Unknown", "count": count})

        # 4. Stock Levels
        all_products = ProductSQL.query.all()
        all_stock = [{"name": p.name, "stock": p.stock, "category": p.category, "subcategory": p.subcategory} for p in all_products]
        low_stock = [p for p in all_stock if p['stock'] <= 5]

        # 5. Category distribution for pie chart & dropdowns
        # Hierarchical: Category -> Subcategory -> List of Products
        cat_map = {}
        for p in all_products:
            c = p.category or "Uncategorized"
            s = p.subcategory or "General"
            
            if c not in cat_map:
                cat_map[c] = {
                    "name": c, 
                    "count": 0, 
                    "total_stock": 0, 
                    "subcategories": {}
                }
            
            cat_map[c]["count"] += 1
            cat_map[c]["total_stock"] += p.stock
            
            if s not in cat_map[c]["subcategories"]:
                cat_map[c]["subcategories"][s] = {
                    "name": s, 
                    "count": 0, 
                    "total_stock": 0,
                    "products": []
                }
            
            cat_map[c]["subcategories"][s]["count"] += 1
            cat_map[c]["subcategories"][s]["total_stock"] += p.stock
            cat_map[c]["subcategories"][s]["products"].append({
                "id": p.id,
                "name": p.name,
                "stock": p.stock
            })

        # Process into final list structure
        category_stats = []
        for c_name, c_data in cat_map.items():
            subs = []
            for s_name, s_data in c_data["subcategories"].items():
                subs.append(s_data)
            
            c_data["subcategories"] = subs
            category_stats.append(c_data)

        # Simplified pie chart data (needs _id for the chart component)
        pie_data = [{"_id": c["name"], "count": c["count"]} for c in category_stats]

        return jsonify({
            "most_sold": most_sold,
            "most_favorited": most_favorited,
            "most_added_to_cart": most_added_to_cart,
            "low_stock": low_stock,
            "all_stock": all_stock,
            "category_stats": category_stats,
            "pie_data": pie_data
        })

    except Exception as e:
        print(f"Analysis API Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ==================== CUSTOMERS ====================

@app.route('/api/admin/customers', methods=['GET'])
def get_customers():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    users = User.query.filter_by(is_admin=False).all()
    print(f"DEBUG: Found {len(users)} customers for admin panel")
    
    customer_data = []
    for user in users:
        orders = OrderSQL.query.filter_by(user_id=user.id).all()
        total_orders = len(orders)
        total_spent = sum(o.total for o in orders)
        
        customer_data.append({
            "id": str(user.id),
            "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or "Unknown",
            "email": user.email,
            "phone": user.phone or "N/A",
            "date_joined": user.created_at.isoformat() if user.created_at else None,
            "is_blocked": user.is_blocked,
            "total_orders": total_orders,
            "total_spent": total_spent
        })
        
    return jsonify(customer_data), 200

@app.route('/api/admin/customers/<customer_id>', methods=['GET'])
def get_customer_profile(customer_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        user = User.query.get(int(customer_id))
        if not user:
            return jsonify({"error": "Customer not found"}), 404
            
        orders = OrderSQL.query.filter_by(user_id=user.id).order_by(OrderSQL.created_at.desc()).all()
        
        total_orders = len(orders)
        total_spent = sum(o.total for o in orders)
        avg_order_value = total_spent / total_orders if total_orders > 0 else 0
        
        address = user.JSON_addresses[0] if user.JSON_addresses else None
        if not address:
            for o in orders:
                if o.shipping_address:
                    address = o.shipping_address
                    break
                
        customer_profile = {
            "id": str(user.id),
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "email": user.email,
            "phone": user.phone or "N/A",
            "date_joined": user.created_at.isoformat() if user.created_at else None,
            "is_blocked": user.is_blocked,
            "address": address,
            "stats": {
                "total_orders": total_orders,
                "total_spent": total_spent,
                "avg_order_value": avg_order_value
            },
            "orders": [o.to_dict() for o in orders]
        }
        
        return jsonify(customer_profile), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

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
        user = User.query.get(int(customer_id))
        if user:
            user.is_blocked = is_blocked
            db_mysql.session.commit()
            action = "blocked" if is_blocked else "unblocked"
            return jsonify({"success": True, "message": f"Customer successfully {action}."}), 200
        return jsonify({"error": "Customer not found"}), 404
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500


# ==================== ANALYSIS ====================


# ==================== CATEGORIES ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = CategorySQL.query.all()
    return jsonify([c.to_dict() for c in categories])

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
        
    try:
        existing = CategorySQL.query.filter_by(name=name).first()
        if existing:
            if subcategory and subcategory not in existing.subcategories:
                current_subs = existing.subcategories
                current_subs.append(subcategory)
                existing.subcategories = current_subs
                db_mysql.session.commit()
                return jsonify({"success": True, "message": "Subcategory added"}), 201
            return jsonify({"error": "Category already exists"}), 400
            
        new_cat = CategorySQL(
            name=name,
            subcategories=[subcategory] if subcategory else []
        )
        db_mysql.session.add(new_cat)
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Category created"}), 201
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories/<cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        cat = CategorySQL.query.get(int(cat_id))
        if cat:
            db_mysql.session.delete(cat)
            db_mysql.session.commit()
            return jsonify({"success": True, "message": "Category deleted"}), 200
        return jsonify({"error": "Category not found"}), 404
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories/<cat_id>/subcategories', methods=['DELETE'])
def delete_subcategory(cat_id):
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.get_json()
    subcategory = data.get('subcategory')
    
    if not subcategory:
        return jsonify({"error": "Subcategory name required"}), 400
        
    try:
        cat = CategorySQL.query.get(int(cat_id))
        if cat:
            current_subs = cat.subcategories
            if subcategory in current_subs:
                current_subs.remove(subcategory)
                cat.subcategories = current_subs
                db_mysql.session.commit()
                return jsonify({"success": True, "message": "Subcategory deleted"}), 200
        return jsonify({"error": "Category or subcategory not found"}), 404
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

# ==================== HOMEPAGE ====================

@app.route('/api/homepage', methods=['GET'])
def get_homepage_config():
    config = HomepageConfig.query.filter_by(config_type='main').first()
    
    # Default fallback
    default_config = {
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
        return jsonify(default_config)
    
    return jsonify(config.to_dict())

@app.route('/api/homepage', methods=['POST'])
def update_homepage_config():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.get_json()
    
    try:
        config = HomepageConfig.query.filter_by(config_type='main').first()
        if not config:
            config = HomepageConfig(config_type='main')
            db_mysql.session.add(config)
            
        config.hero_slides = data.get('hero_slides', [])
        config.manifesto_text = data.get('manifesto_text')
        config.bestseller_ids = data.get('bestseller_product_ids', [])
        config.featured_ids = data.get('featured_product_ids', [])
        config.new_arrival_ids = data.get('new_arrival_product_ids', [])
        config.updated_at = datetime.utcnow()
        
        db_mysql.session.commit()
        return jsonify({"success": True, "message": "Homepage updated successfully"}), 200
    except Exception as e:
        db_mysql.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/analysis', methods=['GET'])
def get_business_analysis():
    is_admin = session.get('is_admin')
    if 'user_id' not in session or not (is_admin is True or str(is_admin).lower() == 'true'):
        return jsonify({"error": "Unauthorized"}), 401

    try:
        # 1. Most Sold Products
        most_sold_raw = db_mysql.session.query(
            OrderItem.product_id_str,
            OrderItem.product_name,
            db_mysql.func.sum(OrderItem.quantity).label('total_sold'),
            db_mysql.func.sum(OrderItem.price * OrderItem.quantity).label('total_revenue')
        ).group_by(OrderItem.product_id_str, OrderItem.product_name).order_by(db_mysql.desc('total_sold')).limit(10).all()

        most_sold = [{
            "id": r[0],
            "name": r[1],
            "total_sold": int(r[2]),
            "total_revenue": float(r[3])
        } for r in most_sold_raw]

        # 2. Most Favorited Products
        fav_counts_raw = db_mysql.session.query(
            WishlistItem.product_id_str,
            db_mysql.func.count(WishlistItem.id).label('count')
        ).group_by(WishlistItem.product_id_str).order_by(db_mysql.desc('count')).limit(10).all()

        most_favorited = []
        for r in fav_counts_raw:
            try:
                prod = ProductSQL.query.get(int(r[0]))
                if prod:
                    most_favorited.append({
                        "id": str(prod.id),
                        "name": prod.name,
                        "count": r[1]
                    })
            except: pass

        # 3. Most Added to Cart
        cart_counts_raw = db_mysql.session.query(
            CartItem.product_id_str,
            db_mysql.func.sum(CartItem.quantity).label('total_quantity'),
            db_mysql.func.count(CartItem.user_id.distinct()).label('user_count')
        ).group_by(CartItem.product_id_str).order_by(db_mysql.desc('total_quantity')).limit(10).all()

        most_added_to_cart = []
        for r in cart_counts_raw:
            try:
                prod = ProductSQL.query.get(int(r[0]))
                if prod:
                    most_added_to_cart.append({
                        "id": str(prod.id),
                        "name": prod.name,
                        "total_quantity": int(r[1]),
                        "user_count": r[2]
                    })
            except: pass

        # 4. Stock Inventory Levels
        products_stock = ProductSQL.query.order_by(ProductSQL.stock.asc()).all()
        all_stock = []
        low_stock = []
        for p in products_stock:
            p_data = {
                "id": str(p.id),
                "name": p.name,
                "stock": p.stock,
                "category": p.category or 'Uncategorized'
            }
            all_stock.append(p_data)
            if p.stock <= 5:
                low_stock.append(p_data)

        # 5. Category Analysis
        category_stats_raw = db_mysql.session.query(
            ProductSQL.category,
            db_mysql.func.count(ProductSQL.id).label('count'),
            db_mysql.func.sum(ProductSQL.stock).label('total_stock')
        ).group_by(ProductSQL.category).all()

        category_stats = [{
            "_id": r[0] or 'Uncategorized',
            "count": r[1],
            "total_stock": int(r[2] or 0)
        } for r in category_stats_raw]

        return jsonify({
            "most_sold": most_sold,
            "most_favorited": most_favorited,
            "most_added_to_cart": most_added_to_cart,
            "low_stock": low_stock,
            "all_stock": all_stock,
            "category_stats": category_stats
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== SEEDING ====================

def seed_database():
    # ── ALWAYS SYNC ADMIN CREDENTIALS ──
    admin_email = "admin@123.com"
    admin = User.query.filter_by(email=admin_email).first()
    if not admin:
        admin = User(
            email=admin_email,
            password="admin123", # PLAIN TEXT AS REQUESTED
            is_admin=True,
            first_name="Admin",
            last_name="User"
        )
        db_mysql.session.add(admin)
        print(f"Created new admin: {admin_email}")
    else:
        admin.password = "admin123" # PLAIN TEXT AS REQUESTED
        admin.is_admin = True
        print(f"Synced credentials for admin: {admin_email}")

    # ── SEED CATEGORIES ──
    default_categories = [
        {"name": "Knitwear", "subcategories": ["Sweaters", "Cardigans"]},
        {"name": "Trousers", "subcategories": ["Tailored", "Casual"]},
        {"name": "Basics", "subcategories": ["Tees"]},
        {"name": "Shirts", "subcategories": ["Formal"]},
        {"name": "Accessories", "subcategories": ["Bags", "Scarf"]},
    ]
    
    if CategorySQL.query.count() == 0:
        for cat_data in default_categories:
            new_cat = CategorySQL(
                name=cat_data['name'],
                subcategories=cat_data['subcategories']
            )
            db_mysql.session.add(new_cat)
        print("Categories Seeded!")

    try:
        db_mysql.session.commit()
    except Exception as e:
        db_mysql.session.rollback()
        print(f"Commit failed: {e}")

    try:
        db_mysql.session.commit()
    except Exception as e:
        db_mysql.session.rollback()
        print(f"Commit failed: {e}")

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
