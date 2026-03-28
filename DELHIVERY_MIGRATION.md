# Borzo to Delhivery Migration Guide

## Overview
This document outlines the complete migration from Borzo delivery integration to Delhivery for U.S Atelier.

## What Changed

### Backend Changes

#### New File: `backend/delhivery_utils.py`
- Replaces `borzo_utils.py` with Delhivery API integration
- Implements functions:
  - `validate_pincode()` - Validates if Delhivery can deliver to a pincode
  - `calculate_shipping()` - Estimates shipping cost between pincodes
  - `create_shipment()` - Creates a shipment with Delhivery
  - `get_shipment_status()` - Fetches live tracking info
  - `cancel_shipment()` - Cancels an active shipment

#### Updated: `backend/app.py`
- Imports updated to use `delhivery_utils` instead of `borzo_utils`
- Dispatch scheduler renamed: `borzo_poll` → `delhivery_poll`
- New webhook endpoint: `/api/webhooks/delhivery` (replaces `/api/webhooks/borzo`)
- New test endpoint: `/api/admin/test/delhivery` (replaces `/api/admin/test/borzo`)
- Manual dispatch function renamed: `dispatch_delhivery_order()` (replaces `dispatch_borzo_order()`)

#### Updated: `backend/models_mysql.py`
- Added new Order columns:
  - `delhivery_shipment_id` - Stores Delhivery shipment ID
  - `delhivery_tracking_url` - Stores Delhivery tracking URL
  - `delhivery_waybill_number` - Stores waybill number for customer reference
- Deprecated Borzo columns remain for backward compatibility:
  - `borzo_order_id`
  - `borzo_tracking_url`

### Frontend Changes

#### Updated: `frontend/lib/data.ts`
- Order type includes new fields:
  - `delhivery_shipment_id?`
  - `delhivery_tracking_url?`
  - `delhivery_waybill?`
- Old Borzo fields kept for backward compatibility

#### Updated: `frontend/app/page.tsx`
- Enhanced product card animations with scroll triggers
- Added section-level animations for title and content
- Improved visual polish with gradient accents
- Better hover effects with smooth transitions
- Enhanced spacing for better vertical scroll experience

#### Updated: `frontend/app/account/orders/[id]/page.tsx`
- Tracking button now uses Delhivery URL (if available)
- Displays Delhivery waybill number
- Falls back to Borzo tracking for legacy orders

## Installation & Setup

### 1. Database Migration
Run the migration script to add Delhivery columns:

```bash
# Using MySQL client directly
mysql -h <host> -u <user> -p <database> < scripts/migrate_to_delhivery.sql

# Or execute the SQL statements in your database management tool
```

### 2. Environment Variables
Configure these variables in your `.env` file:

```env
# Delhivery API Configuration
DELHIVERY_API_KEY=your_api_key_from_delhivery
DELHIVERY_FACILITY_CODE=your_facility_code_from_delhivery

# Store Location (for pickup address)
STORE_PHONE=+91-XXXX-XXXX-XXXX
STORE_NAME=U.S Atelier
STORE_ADDRESS=Your Store Address
STORE_CITY=Your City
STORE_STATE=Your State
STORE_PINCODE=Your Pincode (e.g., 110001)
```

### 3. Backend Setup
No additional package installations needed. Delhivery utils uses standard `requests` library.

### 4. Testing
Test the Delhivery integration:

```bash
# POST to test endpoint
curl -X POST http://localhost:5000/api/admin/test/delhivery \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "test_type": "all",
    "pincode": "110001",
    "origin_pincode": "110001",
    "destination_pincode": "400001"
  }'
```

## API Endpoints

### Shipment Creation
**Automatic (via scheduler):**
- Dispatch jobs are automatically processed every 60 seconds
- Failed attempts use exponential backoff (60s, 120s, 240s, ... up to 3600s)

**Manual:**
```
POST /api/orders/<order_id>/dispatch
Headers: Authorization: Bearer <admin_token>
Response: { "success": true, "tracking_url": "...", "waybill": "..." }
```

### Webhook Endpoint
```
POST /api/webhooks/delhivery
Headers: Signature verification (if implemented)
Body: { "shipment_id": "...", "status": "delivered", ... }
```

Supported status values:
- `delivered` / `delivered_order` → "Delivered"
- `in_transit` / `in_shipment` → "Shipped"
- `out_for_delivery` → "Out for Delivery"
- `cancelled` → "Cancelled"
- `rto` → "Returned"
- `pending` → "Processing"

### Testing Endpoint
```
POST /api/admin/test/delhivery
Headers: Authorization: Bearer <admin_token>
Parameters:
  - test_type: "all" | "pincode" | "shipping" | "create"
  - pincode: "110001" (for pincode test)
  - origin_pincode: "110001" (for shipping calc)
  - destination_pincode: "400001" (for shipping calc)
  - weight: 1.0 (optional, default 1.0 kg)
  - name: "Customer Name" (for shipment creation)
  - phone: "9876543210" (for shipment creation)
```

## Order Status Mapping

| Delhivery Status | Order Status |
|---|---|
| pending | Processing |
| in_transit, in_shipment | Shipped |
| out_for_delivery | Out for Delivery |
| delivered, delivered_order | Delivered |
| cancelled | Cancelled |
| rto | Returned |
| failed | Failed |

## Security Features

1. **API Key Protection**: Delhivery API key stored in environment variables only
2. **Input Validation**: All addresses and pincodes validated before API calls
3. **PII Redaction**: Sensitive customer data redacted from logs
4. **Rate Limiting**: Existing rate limiting applies to dispatch endpoints
5. **Secure Headers**: HTTPS enforced in production
6. **Session Management**: HTTP-only, secure, SameSite cookies
7. **Request Retry Logic**: Automatic retries with exponential backoff

## Migration Path

### For Existing Orders (with Borzo tracking)
1. Old Borzo data remains intact and accessible
2. Tracking URLs automatically serve old Borzo links when available
3. Frontend gracefully falls back to Borzo for legacy orders
4. No data loss or forced migration needed

### For New Orders
1. All new orders use Delhivery for shipment creation
2. Dispatcher automatically uses Delhivery functions
3. Tracking info updated via Delhivery webhook

## Frontend Enhancements

### Home Page Improvements
- **Scroll-triggered animations**: Product cards fade in as user scrolls
- **Section animations**: Titles and dividers animate on scroll
- **Gradient accents**: Subtle amber/gold gradients enhance luxury aesthetic
- **Enhanced hover effects**: Smooth color transitions and scale effects
- **Better spacing**: Increased section spacing for better visual flow
- **Refined typography**: Better text hierarchy and readability

### Order Tracking Display
- Shows Delhivery tracking URL with status badge
- Displays waybill number for customer reference
- Color-coded status indicators
- Fallback support for legacy Borzo orders

## Troubleshooting

### Issue: "Delhivery API unavailable"
**Cause**: Network connectivity or invalid credentials
**Solution**: 
- Verify DELHIVERY_API_KEY is correct
- Check API endpoint accessibility
- Verify firewall/proxy settings

### Issue: Shipment creation fails with "Invalid pincode"
**Cause**: Destination pincode not serviceable
**Solution**:
- Verify pincode is valid and serviceable with Delhivery
- Check if shipment weight is reasonable
- Validate address format

### Issue: Webhook updates not received
**Cause**: Webhook URL not configured in Delhivery dashboard
**Solution**:
- Configure webhook URL in Delhivery admin panel
- Set URL to: `https://your-domain.com/api/webhooks/delhivery`
- Test webhook delivery in Delhivery dashboard

### Issue: Old Borzo orders not showing tracking
**Cause**: Legacy orders still reference Borzo data
**Solution**:
- This is expected for old orders
- System automatically uses `borzo_tracking_url` for legacy orders
- No action needed

## Rollback Plan (if needed)

1. Revert imports in `app.py` to use `borzo_utils`
2. Keep Delhivery columns in database (no data loss)
3. Restart Flask application
4. Old dispatch jobs will still process correctly

## Performance Considerations

- **Dispatch Job Polling**: Runs every 60 seconds (configurable in scheduler)
- **Database Indexes**: Added on `delhivery_shipment_id` for fast lookups
- **API Timeout**: 30 seconds per request (configurable)
- **Retry Strategy**: Max 3 retries with exponential backoff

## Support & Resources

- Delhivery API Documentation: https://delhivery.com/api-doc
- Integration Support: contact@delhivery.com
- Dashboard: https://dlv.in/admin/

## Changelog

### Version 1.0 (Current)
- ✅ Complete Delhivery integration
- ✅ Database migration with backward compatibility
- ✅ Enhanced frontend animations
- ✅ Secure API implementation
- ✅ Comprehensive error handling
- ✅ Admin testing endpoint
- ✅ Webhook support

## Questions?

For issues or questions about this migration:
1. Check logs for specific error messages
2. Test with admin endpoint
3. Verify environment variables
4. Check Delhivery dashboard for account status
