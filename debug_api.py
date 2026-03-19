#!/usr/bin/env python
"""Debug the orders API response"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app

with app.app_context():
    client = app.test_client()
    
    # Login
    print("\n=== LOGIN ===")
    response = client.post('/api/auth/login', 
        json={"email": "admin@123.com", "password": "admin123"}
    )
    print(f"Status: {response.status_code}")
    
    # Try /api/admin/orders
    print("\n=== GET /api/admin/orders ===")
    response = client.get('/api/admin/orders')
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.content_type}")
    
    if response.status_code == 200:
        try:
            data = response.get_json()
            print(f"Success! Got {len(data)} orders")
            if len(data) > 0:
                print(f"First order keys: {list(data[0].keys())}")
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw response: {response.get_data(as_text=True)[:500]}")
    else:
        print(f"Response: {response.get_data(as_text=True)[:500]}")
