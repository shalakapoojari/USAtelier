#!/usr/bin/env python
"""Test authentication flow"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from models_mysql import db_mysql, User

with app.app_context():
    client = app.test_client()
    
    # First test: Login
    print("=== Step 1: Login ===")
    response = client.post('/api/auth/login', 
        json={"email": "admin@123.com", "password": "admin123"}
    )
    print(f"Status: {response.status_code}")
    data = response.get_json()
    print(f"Response: {data}")
    
    # Step 2: Check /api/auth/user
    print("\n=== Step 2: Check /api/auth/user ===")
    response = client.get('/api/auth/user')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.get_json()}")
    
    # Step 3: Try /api/admin/orders (with session)
    print("\n=== Step 3: Try /api/admin/orders ===")
    response = client.get('/api/admin/orders')
    print(f"Status: {response.status_code}")
    data = response.get_json()
    if isinstance(data, list) and len(data) > 0:
        print(f"✓ Got {len(data)} orders")
        print(f"First order: {data[0]}")
    else:
        print(f"Response: {data}")
    
    # Step 4: Try /api/admin/payments (with session)
    print("\n=== Step 4: Try /api/admin/payments ===")
    response = client.get('/api/admin/payments')
    print(f"Status: {response.status_code}")
    data = response.get_json()
    if isinstance(data, list) and len(data) > 0:
        print(f"✓ Got {len(data)} payments")
        print(f"First payment: {data[0]}")
    else:
        print(f"Response: {data}")
