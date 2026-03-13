
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
        # Use raw SQL to find every user that has 'admin' in email
        res = db_mysql.session.execute(text("SELECT id, email FROM users")).fetchall()
        for row in res:
            uid, email = row
            if 'admin' in email.lower() or 'admin' in email:
                print(f"Brute force deleting user ID {uid} ('{email}')")
                db_mysql.session.execute(text(f"DELETE FROM users WHERE id = {uid}"))
        
        db_mysql.session.commit()
        
        # Now create the ONE true admin
        u = User(
            email="admin@123",
            password=generate_password_hash("admin123"),
            is_admin=True,
            first_name="Admin"
        )
        db_mysql.session.add(u)
        db_mysql.session.commit()
        print("ULTRA SUCCESS: 'admin@123' is now the only admin.")
        
    except Exception as e:
        db_mysql.session.rollback()
        print(f"ULTRA FATAL ERROR: {e}")
