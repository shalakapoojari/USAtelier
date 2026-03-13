
from app import app
from models_mysql import User

with app.app_context():
    users = User.query.all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Email: {u.email}, Is Admin: {u.is_admin}")
