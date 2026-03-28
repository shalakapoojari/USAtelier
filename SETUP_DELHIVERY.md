# Quick Setup Guide: Delhivery Integration

## For Development Team

### Prerequisites
- MySQL database running
- Python 3.8+ with Flask
- Node.js 16+ with Next.js
- Delhivery account with API access

### Step-by-Step Setup

#### 1. Database Preparation
```bash
# Connect to your MySQL database and run:
cd /path/to/project
mysql -h <host> -u <user> -p <database> < scripts/migrate_to_delhivery.sql

# Verify migration
mysql -h <host> -u <user> -p <database> -e "
  SHOW COLUMNS FROM orders LIKE 'delhivery%';
  SHOW COLUMNS FROM orders LIKE 'borzo%';
"
```

#### 2. Environment Variables
Create or update `.env` in the project root:

```env
# Backend - Flask
DELHIVERY_API_KEY=your_api_key_from_delhivery_dashboard
DELHIVERY_FACILITY_CODE=your_facility_code

# Store Location (replace with your actual details)
STORE_PHONE=+91-9999999999
STORE_NAME=U.S Atelier
STORE_ADDRESS=Your Store, Street, Area
STORE_CITY=Mumbai
STORE_STATE=Maharashtra
STORE_PINCODE=400001

# Other required vars (if not already set)
DATABASE_URL=mysql+pymysql://user:pass@localhost/usatelier_db
SECRET_KEY=your-secret-key-here
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
MAIL_SERVER=smtp.gmail.com
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Frontend
NEXT_PUBLIC_API_BASE=http://localhost:5000
```

#### 3. Verify Backend Integration
```bash
# In the project root, test the integration
curl -X POST http://localhost:5000/api/admin/test/delhivery \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-admin-token>" \
  -d '{
    "test_type": "all",
    "pincode": "400001",
    "origin_pincode": "110001",
    "destination_pincode": "400001"
  }'
```

Expected response:
```json
{
  "success": true,
  "results": {
    "pincode_validation": {
      "pincode": "400001",
      "is_serviceable": true
    },
    "shipping_calculation": {
      "origin_pincode": "110001",
      "destination_pincode": "400001",
      "weight_kg": 1.0,
      "estimated_cost": 150.00
    }
  },
  "environment": {
    "delhivery_api_key_configured": true,
    "delhivery_facility_code": "ABC123",
    "store_address": "Your Store Address"
  }
}
```

#### 4. Start Services
```bash
# Terminal 1: Backend
cd backend
python app.py
# Should see: "Delhivery shipment poller active"

# Terminal 2: Frontend
cd frontend
npm run dev
# Should start on http://localhost:3000
```

#### 5. Test Order Dispatch
1. Create a test order through the frontend
2. Check that the dispatch job was created:
```bash
curl http://localhost:5000/api/admin/dispatch-jobs \
  -H "Authorization: Bearer <admin-token>"
```

3. Wait 60 seconds for scheduler to process, or manually trigger:
```bash
# (This endpoint may require manual implementation for testing)
```

4. Verify order has tracking info:
```bash
curl http://localhost:5000/api/orders/<order_id> \
  -H "Authorization: Bearer <user-token>"
```

Should include:
```json
{
  "delhivery_shipment_id": "DL12345678",
  "delhivery_tracking_url": "https://track.delhivery.com/tracking/shipments/DL12345678",
  "delhivery_waybill": "1234567890123"
}
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  - Enhanced animations and better UX                         │
│  - Displays Delhivery tracking URLs                         │
│  - Shows waybill numbers for customer reference             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Layer (Flask)                           │
│  - New endpoints for Delhivery integration                  │
│  - Webhook handler for tracking updates                    │
│  - Admin test endpoint                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              delhivery_utils.py Module                       │
│  - validate_pincode()                                       │
│  - calculate_shipping()                                     │
│  - create_shipment()                                        │
│  - get_shipment_status()                                    │
│  - cancel_shipment()                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            APScheduler Background Job                        │
│  - Polls due dispatch jobs every 60 seconds                 │
│  - Processes shipment creation with exponential backoff     │
│  - Updates order status on success                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│             Delhivery API (External)                        │
│  - Shipment creation                                        │
│  - Tracking status updates                                  │
│  - Pincode validation                                       │
│  - Shipping cost calculation                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

#### Security
- ✅ API keys in environment variables only
- ✅ HTTPS for all external API calls
- ✅ PII redaction in logs
- ✅ Input validation for all user data
- ✅ Rate limiting on sensitive endpoints
- ✅ Secure session management

#### Reliability
- ✅ Automatic retry with exponential backoff
- ✅ Database-backed dispatch queue
- ✅ Graceful error handling
- ✅ Comprehensive logging
- ✅ Backward compatibility with Borzo data

#### User Experience
- ✅ Scroll-triggered animations on homepage
- ✅ Enhanced product card hover effects
- ✅ Live tracking with waybill numbers
- ✅ Visual feedback for order status
- ✅ Better spacing and typography

### Testing Checklist

- [ ] Database migration successful
- [ ] Environment variables configured
- [ ] Admin test endpoint returns valid response
- [ ] Pincode validation works
- [ ] Shipping cost calculation works
- [ ] Can create test shipment
- [ ] Order pages display tracking URL
- [ ] Homepage animations work smoothly
- [ ] Mobile responsiveness maintained
- [ ] Old Borzo orders still display tracking

### Common Issues & Solutions

**Issue**: Delhivery API returns 401 Unauthorized
- Solution: Verify DELHIVERY_API_KEY is correct in .env

**Issue**: Pincode validation fails
- Solution: Ensure pincode is serviceable with Delhivery

**Issue**: Dispatch job never completes
- Solution: Check APScheduler is running, verify logs

**Issue**: Frontend animations lag
- Solution: Check browser console for JavaScript errors

### Code Structure

**Files Created/Modified:**
- ✅ `backend/delhivery_utils.py` - NEW: Delhivery integration
- ✅ `backend/app.py` - Updated dispatch logic
- ✅ `backend/models_mysql.py` - Added Delhivery columns
- ✅ `frontend/lib/data.ts` - Updated Order type
- ✅ `frontend/app/page.tsx` - Enhanced animations
- ✅ `frontend/app/account/orders/[id]/page.tsx` - Tracking display
- ✅ `scripts/migrate_to_delhivery.sql` - Database migration
- ✅ `.env.example` - Configuration template
- ✅ `DELHIVERY_MIGRATION.md` - Migration documentation
- ✅ `SETUP_DELHIVERY.md` - This file

### Next Steps

1. **Get Delhivery API Credentials**
   - Visit: https://dlv.in/admin/
   - Generate API key
   - Get facility code
   - Set up webhook URL

2. **Configure Webhook** (Optional but recommended)
   - URL: `https://your-domain.com/api/webhooks/delhivery`
   - Event: Shipment tracking status updates
   - This enables automatic tracking updates

3. **Deploy to Production**
   - Run database migration on production database
   - Set environment variables in production
   - Deploy code changes
   - Monitor logs for errors

4. **Notify Users** (Optional)
   - Update order tracking page messaging
   - Add info about Delhivery tracking

### Support

For issues or questions:
1. Check `DELHIVERY_MIGRATION.md` for detailed documentation
2. Review server logs: `tail -f backend/logs/*.log`
3. Test endpoint: `/api/admin/test/delhivery`
4. Contact: development@usatelier.com

Happy shipping! 🎉
