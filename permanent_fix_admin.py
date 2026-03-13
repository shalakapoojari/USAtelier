
from app import app
from models_mysql import User, db_mysql
from werkzeug.security import generate_password_hash

with app.app_context():
    # 1. Delete all users that look like admin@123
    users_to_del = User.query.filter(User.email.like('%admin@123%')).all()
    for u in users_to_del:
        print(f"Deleting user: {u.email} (ID: {u.id})")
        db_mysql.session.delete(u)
    db_mysql.session.commit()

    # 2. Create one fresh admin user
    # IMPORTANT: no trailing spaces, no hidden chars
    email = "admin@123"
    password = "admin123"
    new_admin = User(
        email=email.lower(),
        password=generate_password_hash(password),
        first_name="Admin",
        last_name="User",
        is_admin=True,
        is_blocked=False
    )
    db_mysql.session.add(new_admin)
    db_mysql.session.commit()
    print(f"PERMANENT FIX: Created admin user '{email}' with password '{password}'")
    
    # Verify it again
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"Verification: Found user {user.email}, IsAdmin: {user.is_admin}")
    else:
        print("ERROR: User still not found after creation!")
