
import os
from dotenv import load_dotenv
from flask import Flask
from models_mysql import db_mysql, User
from werkzeug.security import generate_password_hash
from sqlalchemy import text

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db_mysql.init_app(app)

with app.app_context():
    try:
        # Brute force deletion of ANY conflicting admin
        # Using raw SQL to be sure
        db_mysql.session.execute(text("DELETE FROM users WHERE email LIKE '%admin%'"))
        db_mysql.session.commit()
        
        # Create fresh
        u = User(
            email="admin@123",
            password=generate_password_hash("admin123"),
            is_admin=True,
            first_name="Admin"
        )
        db_mysql.session.add(u)
        db_mysql.session.commit()
        
        # Verify
        check = User.query.filter_by(email="admin@123").first()
        if check:
            print(f"VERIFIED: User '{check.email}' exists in DB with Admin={check.is_admin}")
        else:
            print("CRITICAL ERROR: User created but not found in verify step!")
            
    except Exception as e:
        db_mysql.session.rollback()
        print(f"FATAL ERROR: {e}")
