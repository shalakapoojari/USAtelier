
from app import app
from models_mysql import HomepageConfig, Product
import json

with app.app_context():
    config = HomepageConfig.query.filter_by(config_type='main').first()
    if not config:
        print("No homepage config found in DB.")
        # Create default if missing? 
        # Actually let's just see what products we have
        products = Product.query.limit(10).all()
        print(f"Total products in DB: {Product.query.count()}")
        for p in products:
            print(f"ID: {p.id}, Name: {p.name}, Bestseller: {p.is_bestseller}, Featured: {p.is_featured}, New: {p.is_new}")
    else:
        print("Homepage Config Found:")
        print(f"Bestseller IDs: {config.bestseller_ids}")
        print(f"Featured IDs: {config.featured_ids}")
        print(f"New Arrival IDs: {config.new_arrival_ids}")
        
        # Check if these products actually exist
        all_ids = config.bestseller_ids + config.featured_ids + config.new_arrival_ids
        for pid in all_ids:
            p = Product.query.get(int(pid))
            if not p:
                print(f"WARNING: Product ID {pid} in config but NOT FOUND in DB.")
            else:
                print(f"ID: {pid} found: {p.name}")
