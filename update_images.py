from app import app, db
from flask import json

def update_images():
    print("Updating product images...")
    
    # Map of partial name match to image file
    image_map = {
        "Cashmere Sweater": "minimal-beige-cashmere-sweater-on-model.jpg",
        "Wool Trousers": "charcoal-grey-wool-trousers-on-model-minimal.jpg",
        "Cotton Tee": "white-cotton-t-shirt-on-model-minimal-clean.jpg",
        "Silk Button-Down": "ivory-silk-shirt-on-model-minimal-elegant.jpg",
        "Merino Wool Cardigan": "navy-merino-wool-cardigan-on-model.jpg",
        "Linen Wide-Leg Pants": "natural-linen-wide-leg-pants-on-model.jpg",
        "Leather Minimal Tote": "tan-leather-tote-bag-minimal.jpg",
        "Cashmere Scarf": "beige-cashmere-scarf-styled.jpg"
    }

    with app.app_context():
        products = db.products.find({})
        count = 0
        for p in products:
            for key, filename in image_map.items():
                if key in p['name']:
                    db.products.update_one(
                        {"_id": p['_id']},
                        {"$set": {"images": json.dumps([filename])}}
                    )
                    count += 1
                    print(f"Updated {p['name']} -> {filename}")
                    break
        
        print(f"✅ Updated {count} products.")

if __name__ == "__main__":
    update_images()
