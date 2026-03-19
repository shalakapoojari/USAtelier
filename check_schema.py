#!/usr/bin/env python
"""Script to fix database schema"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from models_mysql import db_mysql
from sqlalchemy import text

with app.app_context():
    connection = db_mysql.engine.connect()
    
    # Check orders table structure
    result = connection.execute(text("DESCRIBE orders"))
    print("\n=== ORDERS TABLE COLUMNS ===")
    for row in result:
        print(f"  {row[0]}: {row[1]}")
    
    # Check payments table structure
    result = connection.execute(text("DESCRIBE payments"))
    print("\n=== PAYMENTS TABLE COLUMNS ===")
    for row in result:
        print(f"  {row[0]}: {row[1]}")
    
    connection.close()
