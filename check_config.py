#!/usr/bin/env python
"""Check CORS and Cookie configuration"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import app

print("\n=== FLASK SESSION CONFIGURATION ===")
print(f"SECRET_KEY: {'SET' if app.config.get('SECRET_KEY') else 'NOT SET'}")
print(f"SESSION_COOKIE_NAME: {app.config.get('SESSION_COOKIE_NAME')}")
print(f"SESSION_COOKIE_PATH: {app.config.get('SESSION_COOKIE_PATH')}")
print(f"SESSION_COOKIE_SAMESITE: {app.config.get('SESSION_COOKIE_SAMESITE')}")
print(f"SESSION_COOKIE_HTTPONLY: {app.config.get('SESSION_COOKIE_HTTPONLY')}")
print(f"SESSION_COOKIE_SECURE: {app.config.get('SESSION_COOKIE_SECURE')}")
print(f"SESSION_REFRESH_EACH_REQUEST: {app.config.get('SESSION_REFRESH_EACH_REQUEST')}")
print(f"PREFERRED_URL_SCHEME: {app.config.get('PREFERRED_URL_SCHEME')}")

print("\n=== CORS CONFIGURATION ===")
from app import origins, is_production
print(f"Production mode: {is_production}")
print(f"Allowed origins: {origins}")

print("\n=== ENVIRONMENT VARIABLES ===")
print(f"FRONTEND_URL: {os.getenv('FRONTEND_URL', 'NOT SET')}")
print(f"BACKEND_URL: {os.getenv('BACKEND_URL', 'NOT SET')}")
print(f"ALLOWED_ORIGINS: {os.getenv('ALLOWED_ORIGINS', 'NOT SET')}")
