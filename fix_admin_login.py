
from app import app
from models_mysql import User, db_mysql
from werkzeug.security import generate_password_hash

with app.app_context():
    user = User.query.filter(User.email.contains('admin@123')).first()
    if user:
        print(f"User: {user.email}")
        print(f"Is Admin: {user.is_admin}")
        # The user wants "admin123" to work.
        # Let's set it to hashed just in case.
        from werkzeug.security import generate_password_hash
        user.password = generate_password_hash("admin123")
        user.is_admin = True # Ensure they ARE admin
        user.email = "admin@123.com" # standardizing or should I make it "admin@123"?
        # User typed admin@123 in screen. Let's make it exactly that if that's what they want.
        user.email = "admin@123"
        db_mysql.session.commit()
        print(f"Successfully updated user {user.email} with password 'admin123' and Admin=True")
    else:
        # Create it if it doesn't exist
        new_admin = User(
            email="admin@123",
            password=generate_password_hash("admin123"),
            first_name="Admin",
            last_name="User",
            is_admin=True
        )
        db_mysql.session.add(new_admin)
        db_mysql.session.commit()
        print("Created new admin user: admin@123 / admin123")
