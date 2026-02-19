# U.S ATELIER - Premium Clothing Ecommerce Store

This is a complete conversion of the Next.js/React ecommerce application to vanilla HTML/CSS/JavaScript frontend with a Flask backend.

## Project Structure

```
├── app.py                 # Flask backend application
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── static/
│   ├── css/
│   │   └── styles.css    # Main stylesheet
│   ├── js/
│   │   ├── auth.js       # Authentication module
│   │   └── cart.js       # Shopping cart module
│   └── images/           # Product images
├── templates/
│   ├── base.html         # Base template
│   ├── index.html        # Homepage
│   ├── shop.html         # Shop/products page
│   ├── product.html      # Product detail page
│   ├── cart.html         # Shopping cart
│   ├── checkout.html     # Checkout page
│   ├── login.html        # Login page
│   ├── signup.html       # Sign up page
│   ├── account.html      # User account page
│   └── admin.html        # Admin dashboard
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure:

```
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
FLASK_DEBUG=True

# Optional: Add Razorpay credentials for payment processing
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

#### Getting Razorpay Credentials

1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to Settings → API Keys
3. Copy your Key ID and Key Secret
4. Paste them in your `.env` file

**Note**: Payments will work seamlessly once credentials are added. Without them, the app shows a message and can complete orders without payment processing.

### 3. Run the Application

```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Features

### Frontend (HTML/CSS/JavaScript)

- **Responsive Design**: Mobile-first design that adapts to all screen sizes
- **Minimal UI**: Clean, elegant interface with premium feel
- **Dynamic Content**: JavaScript loads products, cart, and user data from backend
- **Client-side Cart**: Shopping cart persists across page navigation
- **Session Management**: User authentication and account pages
- **Razorpay Integration**: Secure payment gateway integration ready to use

### Backend (Flask)

- **RESTful API**: Complete API for products, cart, orders, and admin functions
- **Session-based Auth**: User authentication with password hashing
- **Cart Management**: Server-side session-based cart system
- **Order Processing**: Create and manage orders with payment tracking
- **Admin Dashboard**: Full CRUD operations for products and orders
- **Product Management**: Admin can add, edit, and delete products with detailed attributes
- **Payment Gateway**: Razorpay integration for secure payments

## Demo Credentials

- **User Login**: `user@example.com` / `password123`
- **Admin Login**: `admin@example.com` (password would be set during signup)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/<id>` - Get product by ID
- `GET /api/products/category/<category>` - Get products by category

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add item to cart
- `PUT /api/cart/update` - Update cart item quantity
- `DELETE /api/cart/<item_id>` - Remove item from cart
- `POST /api/cart/clear` - Clear cart

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `GET /api/orders/<order_id>` - Get order details

### Admin (requires admin privileges)
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/products` - Get all products
- `POST /api/admin/products` - Add product
- `GET /api/admin/products/<id>` - Get product details
- `PUT /api/admin/products/<id>` - Update product
- `DELETE /api/admin/products/<id>` - Delete product

### Payment (Razorpay)
- `GET /api/payment/razorpay-key` - Get Razorpay public key
- `POST /api/payment/create-order` - Create Razorpay payment order
- `POST /api/payment/verify` - Verify payment signature

## Styling

The application uses a sophisticated color scheme with:
- Primary Dark: `#030303` (background)
- Primary Light: `#e8e8e3` (text)
- Accent Gray: `#4a4a45` (secondary elements)

All styles are defined in `static/css/styles.css` with CSS variables for easy customization.

## Converting Next.js to Flask

### Key Changes Made:

1. **Removed React Dependencies**: All React components converted to HTML templates
2. **Server-side Rendering**: Flask Jinja2 templates replace Next.js pages
3. **Session Management**: Flask sessions replace client-side state management
4. **Static Assets**: CSS and JavaScript files organized in `/static` directory
5. **API Structure**: RESTful endpoints replace Next.js route handlers

### Data Flow:

1. HTML pages loaded from `/templates` directory
2. JavaScript files in `/static/js` handle frontend logic
3. CSS files in `/static/css` handle styling
4. Backend API serves data to frontend via JSON endpoints
5. Flask sessions manage user authentication and cart state

## Admin Features

### Product Management
The admin dashboard (`/admin`) provides full product management:

1. **View Products**: See all products in a table with details
2. **Add Products**: Click "Add New Product" to add new items with:
   - Name, category, price, description
   - Multiple sizes and images
   - Stock status flags (In Stock, Featured, Bestseller, New Arrival)
3. **Edit Products**: Click "Edit" to modify any product
4. **Delete Products**: Remove products from inventory

### Order Management
- View all customer orders
- Track payment status
- Monitor order details and shipping information

### Access Control
- Admin panel is only accessible to `admin@example.com`
- All admin operations require authentication

## Features to Add

- Database integration (SQLAlchemy with PostgreSQL/MySQL)
- Email notifications
- Product image uploads
- Advanced filtering and search
- User reviews and ratings
- Wishlist functionality
- Email verification
- Inventory tracking

## Payment Processing (Razorpay)

### How It Works

1. **Checkout Page**: Customer fills in shipping and payment details
2. **Order Creation**: Backend creates a pending order
3. **Razorpay Gateway**: Customer is redirected to Razorpay's secure checkout
4. **Payment Verification**: Payment signature is verified server-side
5. **Order Completion**: Order is marked as paid and customer sees confirmation

### Integration Notes

- Razorpay JavaScript is loaded from CDN (works without local installation)
- Payment amount is converted from USD to INR (paise)
- Signature verification ensures payment authenticity
- Order details include Razorpay transaction IDs for tracking

### Testing

Use Razorpay's test credentials to test the payment flow:
- Test cards are available in Razorpay documentation
- All test transactions won't debit from actual accounts

## Security Features

### Implemented Security Measures
- **Input Validation**: All user inputs validated and sanitized server-side
- **XSS Protection**: HTML escaping for all user-generated content
- **CORS Configuration**: Restricted to localhost for development
- **Session Security**: Secure, HTTP-only cookies with same-site policy
- **Security Headers**: 
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection enabled
  - Content-Security-Policy configured
  - HSTS enabled
- **Password Security**: Bcrypt hashing with proper salting
- **Email Validation**: RFC-compliant email format checking
- **Payment Verification**: Razorpay signature verification server-side
- **Error Handling**: Safe error messages without exposing internal details
- **Rate Limiting Ready**: Architecture supports middleware addition

### Production Security Checklist
- [ ] Change `SECRET_KEY` to a strong random value (min 32 characters)
- [ ] Set `FLASK_ENV=production` and disable `FLASK_DEBUG`
- [ ] Enable HTTPS/SSL (required for Razorpay and security)
- [ ] Configure CORS with your production domain
- [ ] Set secure Razorpay credentials in environment variables
- [ ] Use production WSGI server (Gunicorn, uWSGI)
- [ ] Implement rate limiting for API endpoints
- [ ] Set up logging and monitoring for suspicious activity
- [ ] Enable database backups and recovery procedures
- [ ] Configure WAF (Web Application Firewall)
- [ ] Implement IP whitelisting for admin endpoints
- [ ] Set up SSL/TLS certificate renewal automation
- [ ] Never commit `.env` files to version control

## Development

To run in development mode with hot reload:

```bash
FLASK_ENV=development FLASK_DEBUG=True python app.py
```

## Deployment

For production deployment:

1. Install production WSGI server: `pip install gunicorn`
2. Create production `.env` with secure `SECRET_KEY`
3. Run with: `gunicorn app:app`
4. Use nginx or Apache as reverse proxy
5. Enable HTTPS with SSL certificate

## License

This project is proprietary and confidential.
#   U . S - A T E L I E R  
 