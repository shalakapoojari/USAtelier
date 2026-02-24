from pymongo import MongoClient
import json

client = MongoClient("mongodb://localhost:27017/")
db = client.ecommerce_db

print("--- CATEGORIES ---")
cats = list(db.categories.find())
print(f"Count: {len(cats)}")
for c in cats:
    print(c)

print("\n--- PRODUCTS ---")
prods = list(db.products.find())
print(f"Count: {len(prods)}")
if prods:
    print("Sample product:", prods[0]['name'])

print("\n--- USERS ---")
users = list(db.users.find())
print(f"Count: {len(users)}")
for u in users:
    print(f"Email: {u.get('email')}, Is Admin: {u.get('is_admin')}")
