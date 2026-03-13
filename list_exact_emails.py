
from app import app
from models_mysql import User, db_mysql

with app.app_context():
    # Print EXACT emails in the DB
    users = User.query.all()
    print("ALL USERS IN DB (EXACT EMAILS):")
    for u in users:
        print(f"'{u.email}' (ID: {u.id}, Admin: {u.is_admin})")
