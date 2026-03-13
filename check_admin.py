
from app import app
from models_mysql import User, db_mysql
from werkzeug.security import generate_password_hash

with app.app_context():
    # specifically check for a user with email admin@123 or check any admin
    admin_users = User.query.filter_by(is_admin=True).all()
    print("Admin Users in DB:")
    for u in admin_users:
        print(f"ID: {u.id}, Email: {u.email}")
    
    # If no admin exists, or user wants to fix this permanently, 
    # let's look for a user with email like 'admin'
    target_user = User.query.filter(User.email.contains('admin')).first()
    if target_user:
        print(f"Found related user: {target_user.email} (ID: {target_user.id})")
    else:
        print("No user found with 'admin' in email.")
