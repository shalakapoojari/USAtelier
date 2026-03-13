
from app import app
from models_mysql import User, db_mysql
from werkzeug.security import generate_password_hash
from sqlalchemy import text

with app.app_context():
    # 1. Use raw SQL to find and DESTROY any conflicts
    # This bypasses any SQLAlchemy caching issues
    db_mysql.session.execute(text("DELETE FROM users WHERE email LIKE '%admin%'"))
    db_mysql.session.commit()
    print("Nuked all admin-like emails.")

    # 2. Add fresh
    u = User(
        email="admin@123",
        password=generate_password_hash("admin123"),
        is_admin=True,
        first_name="Admin"
    )
    db_mysql.session.add(u)
    db_mysql.session.commit()
    print("SUCCESS: Forced 'admin@123' / 'admin123' as the only admin.")
