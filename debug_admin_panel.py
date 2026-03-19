#!/usr/bin/env python
"""Debug script to check orders and payments data"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from models_mysql import db_mysql, Order, Payment, OrderItem, User

with app.app_context():
    orders = Order.query.all()
    payments = Payment.query.all()
    
    print(f"\n=== DATABASE STATUS ===")
    print(f"Total Orders: {len(orders)}")
    print(f"Total Payments: {len(payments)}")
    
    if orders:
        print(f"\n=== ORDERS ===")
        for order in orders[:3]:  # Show first 3
            print(f"Order ID: {order.id}, Number: {order.order_number}, Status: {order.status}, Payment Status: {order.payment_status}, Total: {order.total}")
    
    if payments:
        print(f"\n=== PAYMENTS ===")
        for payment in payments[:3]:  # Show first 3
            print(f"Payment ID: {payment.id}, Order ID: {payment.order_id}, Status: {payment.status}, Amount: {payment.amount}")
    
    # Check if any users are admin
    admin_users = User.query.filter_by(is_admin=True).all()
    print(f"\n=== ADMIN USERS ===")
    print(f"Total Admin Users: {len(admin_users)}")
    for user in admin_users:
        print(f"Admin: {user.email}")
