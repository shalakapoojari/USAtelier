# 🛍️ U.S ATELIER
### Enterprise-Ready Premium Ecommerce Platform

> A production-grade ecommerce system converted from a Next.js architecture into a Flask-powered full-stack solution.

---

## 🧠 Project Overview

U.S ATELIER is a secure, scalable ecommerce application featuring:

- Full REST API
- Admin management dashboard
- Payment gateway integration
- Production-level security headers
- Session-based authentication

This project demonstrates full-stack architecture, API design, security implementation, and payment integration.

---

## 🏗 Architecture

Frontend:
- HTML templates (Jinja2)
- Vanilla JS modules
- Responsive CSS design

Backend:
- Flask REST API
- Session management
- Secure authentication
- Order processing
- Razorpay payment verification

---

## ⚙️ Setup Guide

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
```

Set:

```env
SECRET_KEY=strong-random-key
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
```

### 3. Run locally
```bash
python app.py
```

---

## 🔥 Core Features

### Ecommerce Engine
- Dynamic product system
- Cart persistence
- Secure checkout flow
- Order tracking

### Admin Capabilities
- Product CRUD operations
- Order monitoring
- Payment tracking

### Payment Flow
1. Order created
2. Razorpay payment initialized
3. Signature verified server-side
4. Order marked as paid

---

## 🔐 Security Implementation

- Bcrypt password hashing
- HTTP-only secure cookies
- CORS restrictions
- XSS protection
- Content Security Policy
- HSTS enforcement
- Secure payment verification

---

## 🚀 Production Deployment

```bash
pip install gunicorn
gunicorn app:app
```

Recommended:
- nginx reverse proxy
- HTTPS (SSL)
- Rate limiting middleware
- Logging & monitoring

---

## 📈 Future Enhancements

- PostgreSQL integration
- Product image uploads
- Email notifications
- Reviews & ratings
- Inventory management

---

## 🧪 Demo Credentials

User: user@example.com  
Password: password123

---

## 📜 License

Proprietary and confidential.
