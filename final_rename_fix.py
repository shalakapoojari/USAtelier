
import os
from dotenv import load_dotenv
from flask import Flask
from models_mysql import db_mysql, User
from werkzeug.security import generate_password_hash

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db_mysql.init_app(app)

with app.app_context():
    try:
        # Find all admin-related users
        users = User.query.filter(User.email.contains('admin')).all()
        
        if not users:
            print("No admin users found. Creating fresh.")
            new_u = User(email="admin@123", password=generate_password_hash("admin123"), is_admin=True)
            db_mysql.session.add(new_u)
        else:
            # We have at least one. Let's make the FIRST one exactly what we want.
            primary = users[0]
            print(f"Remapping user ID {primary.id} ('{primary.email}') to admin@123")
            primary.email = "admin@123"
            primary.password = generate_password_hash("admin123")
            primary.is_admin = True
            
            # If there are OTHERS, rename them to something else to avoid conflict
            for other in users[1:]:
                print(f"Renaming conflicting user ID {other.id} ('{other.email}')")
                other.email = f"conflict_{other.id}@oldadmin.com"
        
        db_mysql.session.commit()
        print("FINAL SUCCESS: admin@123 / admin123 is ready.")
        
    except Exception as e:
        db_mysql.session.rollback()
        print(f"FINAL FATAL ERROR: {e}")
