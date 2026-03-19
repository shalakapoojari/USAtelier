#!/usr/bin/env python
"""Test API endpoints to verify they work"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from models_mysql import db_mysql, User

with app.app_context():
    # Create a test client
    client = app.test_client()
    
    # First, get an admin user and log in
    admin_user = User.query.filter_by(is_admin=True).first()
    print(f"Admin user found: {admin_user.email if admin_user else 'None'}")
    
    # Test the orders endpoint WITH admin session
    print("\n=== Testing /api/admin/orders ===")
    response = client.get('/api/admin/orders')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.get_json()}")
    
    # Test the payments endpoint
    print("\n=== Testing /api/admin/payments ===")
    response = client.get('/api/admin/payments')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.get_json()}")
