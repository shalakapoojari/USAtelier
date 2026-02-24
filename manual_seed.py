from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017/")
db = client.ecommerce_db
default_categories = [
    {"name": "Knitwear", "subcategories": ["Sweaters", "Cardigans"]},
    {"name": "Trousers", "subcategories": ["Tailored", "Casual"]},
    {"name": "Basics", "subcategories": ["Tees"]},
    {"name": "Shirts", "subcategories": ["Formal"]},
    {"name": "Accessories", "subcategories": ["Bags", "Scarf"]},

]
if db.categories.count_documents({}) == 0:
    db.categories.insert_many(default_categories)
    print("Categories Seeded Manually!")
else:
    print("Categories already exist.")
