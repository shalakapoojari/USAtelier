
from app import app
from models_mysql import User, db_mysql
from werkzeug.security import generate_password_hash

with app.app_context():
    try:
        # Delete ALL users with 'admin' in email to avoid any conflicts (like admin@123.com, admin@123 etc)
        admin_related = User.query.filter(User.email.contains('admin')).all()
        for u in admin_related:
            print(f"Deleting user: {u.email}")
            db_mysql.session.delete(u)
        db_mysql.session.commit()

        # Create EXACTLY what the user wants
        new_admin = User(
            email="admin@123",
            password=generate_password_hash("admin123"),
            first_name="Admin",
            last_name="User",
            is_admin=True
        )
        db_mysql.session.add(new_admin)
        db_mysql.session.commit()
        print("SUCCESS: Permanently fixed admin account. Use admin@123 / admin123")
    except Exception as e:
        db_mysql.session.rollback()
        print(f"ERROR: {e}")
