
from app import app
from models_mysql import User, db_mysql
from werkzeug.security import generate_password_hash

with app.app_context():
    # 1. Look for user ID 33 which we saw earlier as admin@123.com
    user = User.query.get(33)
    if not user:
        # fallback search
        user = User.query.filter(User.email.contains('admin')).first()
    
    if user:
        print(f"Found user to remap: {user.email}")
        user.email = "admin@123"
        user.password = generate_password_hash("admin123")
        user.is_admin = True
        db_mysql.session.commit()
        print(f"PERMANENT FIX AUTH: {user.email} is now active with password admin123")
    else:
        # Definitely create it
        new_u = User(email="admin@123", password=generate_password_hash("admin123"), is_admin=True)
        db_mysql.session.add(new_u)
        db_mysql.session.commit()
        print("PERMANENT FIX AUTH: Created fresh admin@123")
