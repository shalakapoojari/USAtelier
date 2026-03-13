
from app import app
from models_mysql import User
from werkzeug.security import check_password_hash

with app.app_context():
    user = User.query.filter_by(email='admin@123').first()
    if user:
        print(f"User found: {user.email}")
        print(f"Password in DB: {user.password}")
        password_to_check = "admin123"
        hash_ok = check_password_hash(user.password, password_to_check)
        plain_ok = (user.password == password_to_check)
        print(f"Hash Match (scrypt): {hash_ok}")
        print(f"Plain Match: {plain_ok}")
        print(f"Is Admin: {user.is_admin}")
    else:
        print("User admin@123 NOT FOUND")
