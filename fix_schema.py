#!/usr/bin/env python
"""Script to fix database schema - add missing columns"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from models_mysql import db_mysql
from sqlalchemy import text

with app.app_context():
    connection = db_mysql.engine.connect()
    
    try:
        # Add razorpay_order_id if it doesn't exist
        connection.execute(text("ALTER TABLE orders ADD COLUMN razorpay_order_id VARCHAR(255) UNIQUE AFTER borzo_tracking_url"))
        print("✓ Added razorpay_order_id column to orders table")
    except Exception as e:
        print(f"! razorpay_order_id column: {str(e)[:100]}")
    
    try:
        # Add razorpay_payment_id if it doesn't exist
        connection.execute(text("ALTER TABLE orders ADD COLUMN razorpay_payment_id VARCHAR(255) UNIQUE AFTER razorpay_order_id"))
        print("✓ Added razorpay_payment_id column to orders table")
    except Exception as e:
        print(f"! razorpay_payment_id column: {str(e)[:100]}")
    
    connection.commit()
    connection.close()
    print("\n✓ Database schema updated successfully!")
