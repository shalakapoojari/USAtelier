# Delhivery Integration - Quick Reference

## Environment Variables Required

```env
DELHIVERY_API_KEY=<your-api-key>
DELHIVERY_FACILITY_CODE=<your-facility-code>
STORE_PHONE=+91-XXXX-XXXX-XXXX
STORE_NAME=U.S Atelier
STORE_ADDRESS=Street Address
STORE_CITY=City Name
STORE_STATE=State Code (e.g., MH)
STORE_PINCODE=XXXXXX
```

## Core Functions

### `delhivery_utils.py`

```python
# Validate if pincode is serviceable
validate_pincode(pincode: str) -> bool

# Get shipping cost estimate
calculate_shipping(
    origin_pincode: str,
    destination_pincode: str,
    weight_kg: float = 1.0
) -> Optional[float]

# Create a shipment
create_shipment(
    order_id: str,
    pickup_location: dict,  # {address, city, state, pincode}
    delivery_location: dict,  # {address, city, state, pincode}
    customer_phone: str,
    customer_name: str,
    weight_kg: float = 1.0,
    items_description: str = "Apparel"
) -> dict

# Get tracking status
get_shipment_status(shipment_id: str) -> Optional[dict]

# Cancel shipment
cancel_shipment(shipment_id: str) -> dict
```

## API Endpoints

### POST `/api/webhooks/delhivery`
**Purpose**: Receive tracking updates from Delhivery
**Body**: 
```json
{
  "shipment_id": "DL12345678",
  "status": "delivered"
}
```

### POST `/api/admin/test/delhivery`
**Purpose**: Test Delhivery integration
**Query Parameters**:
- `test_type`: "all" | "pincode" | "shipping" | "create"
**Response**: Configuration status + test results

### POST `/api/admin/dispatch/<order_id>`
**Purpose**: Manually dispatch an order
**Response**: 
```json
{
  "success": true,
  "tracking_url": "https://track.delhivery.com/...",
  "waybill": "1234567890"
}
```

## Order Status Flow

```
Pending → Processing → Shipped → Out for Delivery → Delivered
                                                  ↓
                                              Returned (RTO)
                                                  ↓
                                               Failed
```

## Database

### Order Model Columns
```sql
delhivery_shipment_id    -- Unique shipment ID from Delhivery
delhivery_tracking_url   -- Live tracking link
delhivery_waybill_number -- Waybill for customer reference
borzo_order_id           -- DEPRECATED (for legacy orders)
borzo_tracking_url       -- DEPRECATED (for legacy orders)
```

## Common Tasks

### Test Pincode Serviceable
```bash
curl -X POST http://localhost:5000/api/admin/test/delhivery \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "test_type": "pincode",
    "pincode": "110001"
  }'
```

### Calculate Shipping Cost
```bash
curl -X POST http://localhost:5000/api/admin/test/delhivery \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "test_type": "shipping",
    "origin_pincode": "110001",
    "destination_pincode": "400001",
    "weight": 1.5
  }'
```

### Create Test Shipment
```bash
curl -X POST http://localhost:5000/api/admin/test/delhivery \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "test_type": "create",
    "name": "Test Customer",
    "phone": "9876543210",
    "pickup_city": "Mumbai",
    "pickup_state": "MH",
    "pickup_pincode": "400001",
    "delivery_city": "Delhi",
    "delivery_state": "DL",
    "delivery_pincode": "110001",
    "weight": 1.0
  }'
```

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `DELHIVERY_AUTH` | API key invalid | Check DELHIVERY_API_KEY |
| `DELHIVERY_VALIDATION` | Invalid address/pincode | Validate input data |
| `DELHIVERY_TIMEOUT` | API unavailable | Retry (auto-retry enabled) |
| `DELHIVERY_MISSING_FIELDS` | Required field missing | Check all fields populated |
| `DELHIVERY_API` | API returned error | Check Delhivery status |

## Frontend Components

### Order Tracking Display
```tsx
{order.delhivery_tracking_url && (
  <a href={order.delhivery_tracking_url}>Track Order</a>
)}

{order.delhivery_waybill && (
  <p>Waybill: {order.delhivery_waybill}</p>
)}
```

### Order Type
```typescript
type Order = {
  delhivery_shipment_id?: string
  delhivery_tracking_url?: string
  delhivery_waybill?: string
  // ... other fields
}
```

## Dispatch Job States

```
pending    → Job waiting to be processed
running    → Job currently executing
done       → Shipment created successfully
retry      → Will try again at next_attempt_at
failed     → Max retries reached, manual intervention needed
```

## Webhook Status Values

| Delhivery Status | Order Status | Email Sent |
|---|---|---|
| pending | Processing | ✓ |
| in_transit | Shipped | ✓ |
| in_shipment | Shipped | ✓ |
| out_for_delivery | Out for Delivery | ✓ |
| delivered | Delivered | ✓ |
| delivered_order | Delivered | ✓ |
| cancelled | Cancelled | ✓ |
| rto | Returned | ✓ |
| failed | Failed | ✓ |

## Logs to Monitor

```bash
# Watch for dispatch errors
tail -f backend/logs/app.log | grep delhivery

# Check scheduler activity
tail -f backend/logs/app.log | grep "delhivery_poll"

# Monitor shipment creation
tail -f backend/logs/app.log | grep "delhivery_shipment"

# Check webhook updates
tail -f backend/logs/app.log | grep "delhivery_webhook"
```

## Database Migration

```bash
# Apply migration
mysql -u user -p database < scripts/migrate_to_delhivery.sql

# Verify
mysql -u user -p database -e "
  DESC orders;
" | grep delhivery
```

## Files Modified

- `backend/app.py` - Dispatch logic + endpoints
- `backend/models_mysql.py` - Order columns
- `backend/delhivery_utils.py` - NEW: Delhivery client
- `frontend/lib/data.ts` - Order type
- `frontend/app/page.tsx` - Enhanced animations
- `frontend/app/account/orders/[id]/page.tsx` - Tracking display

## Key Improvements Over Borzo

| Feature | Borzo | Delhivery | Improvement |
|---|---|---|---|
| API Reliability | Standard | Robust | Better uptime |
| Coverage | Urban | Pan-India | Wider reach |
| COD Support | Limited | Full | Better for customers |
| Tracking | Basic | Real-time | Live updates |
| UI/UX | Minimal | Enhanced | Better experience |
| Documentation | Basic | Comprehensive | Easier to maintain |

## Timeline

- **Setup**: 5 minutes (env vars)
- **Migration**: 1 minute (DB)
- **Testing**: 5 minutes (admin endpoint)
- **Deployment**: 2 minutes
- **Total**: ~15 minutes

## Support

- **Setup Issues**: See `SETUP_DELHIVERY.md`
- **API Issues**: See `DELHIVERY_MIGRATION.md`
- **Troubleshooting**: See `DELHIVERY_MIGRATION.md#Troubleshooting`
- **Code**: See inline comments in `delhivery_utils.py`

## Rollback

In case of issues:
1. Revert imports in `app.py` to `borzo_utils`
2. Restart Flask
3. No data loss (columns remain in DB)

---

**Last Updated**: March 28, 2026
**Version**: 1.0
**Status**: Ready for Production
