# Implementation Plan

## Overview

Full-stack platform improvements for U.S. Atelier e-commerce site. Backend tasks use Flask/SQLAlchemy on PythonAnywhere. Frontend tasks use Next.js 16/React 19 on Vercel.

## Tasks

- [x] 1. Backend: Add ProductView model and global error handlers
  - Add `ProductView` SQLAlchemy model to `models_mysql.py`
  - Register `@app.errorhandler(404)` and `@app.errorhandler(Exception)` global handlers in `app.py`
  - Remove any `print()` statements from backend source files
  - Requirements: 7.1, 7.2, 9.2, 9.3, 9.4, 9.5, 12.1, 12.6

- [x] 2. Backend: ProductView tracking endpoints
  - Implement `POST /api/products/<int:id>/view` with 30-min session dedup
  - Implement `GET /api/admin/analytics/product-views` with range filter (today/7d/30d/all)
  - Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11

- [x] 3. Backend: Analytics endpoint expansion
  - Add `total_orders`, `total_revenue`, `top_by_revenue`, `abandoned_cart_rate` to `GET /api/admin/analysis`
  - Implement `GET /api/admin/analytics/revenue-trend` (30-day daily revenue)
  - Requirements: 8.2, 8.4, 8.6, 8.9

- [x] 4. Backend: COD order support in POST /api/orders
  - Add COD path to the existing `POST /api/orders` endpoint
  - Calculate `cod_fee` (₹50 if subtotal < 2000, else 0) and `cod_collectable_amount`
  - Enqueue `DispatchJob` with `max_attempts=3`, `payment_mode="COD"`, `cod_amount`
  - Requirements: 4.5, 4.6, 4.7, 4.9

- [x] 5. Backend: Razorpay reliability — create pending order before modal
  - Modify `POST /api/payments/create-order` to create a pending `Order` and `Payment` record in DB before calling Razorpay
  - Modify `POST /api/webhooks/razorpay` to add HMAC-SHA256 signature verification and idempotent order update
  - Requirements: 5.1, 5.2, 5.3, 5.4, 5.9, 5.10

- [x] 6. Backend: WebP image upload conversion
  - Modify the existing product image upload endpoint to convert images to WebP using Pillow (quality=85)
  - Implement 10 MB size limit, `{timestamp}_{stem}.webp` filename pattern, graceful fallback on conversion error
  - Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9

- [x] 7. Frontend: ProductCard cleanup and image performance
  - Remove the "View Details" overlay bar from `components/product-card.tsx`
  - Add `sizes` and `loading="lazy"` props to the `<Image>` component in ProductCard
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.3, 6.4, 6.5

- [x] 8. Frontend: Checkout COD payment option
  - Add `paymentMethod` state and payment method selector UI to `app/checkout/page.tsx`
  - Add `codFee` calculation and include it in `grandTotal`
  - Implement `handleCODOrder` function that POSTs to `/api/orders` with `paymentMethod: "cod"`
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.8

- [x] 9. Frontend: Analytics page expansion
  - Add summary cards (total orders, total revenue) to `app/admin/analysis/page.tsx`
  - Add 30-day revenue line chart using recharts `LineChart`
  - Add top-by-revenue table with Views and Conversion columns
  - Add abandoned cart rate display
  - Requirements: 8.1, 8.3, 8.5, 8.7, 8.8, 8.10

- [x] 10. Frontend: Accessibility, breakpoint fixes, and cleanup
  - Audit all pages for console errors, broken links, missing aria-labels, and missing form labels
  - Fix checkout page horizontal overflow at 375px and 768px
  - Remove all `console.log` debug statements from `app/`, `components/`, `lib/`, `hooks/`
  - Remove unused ES module imports across all source files
  - Ensure all `apiFetch` calls have error handling
  - Remove unused npm packages from `package.json`
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.1, 6.2, 10.1, 10.2, 10.3, 10.4, 10.5

- [x] 11. Frontend: Product page view tracking
  - In `app/product/[name]/page.tsx`, generate/retrieve a `session_id` from `sessionStorage` and call `POST /api/products/{id}/view` on page load
  - Requirements: 7.3, 7.4

- [x] 12. Backend: Backend codebase cleanup
  - Audit `app.py` for test/demo/debug routes and remove them
  - Verify all routes return structured JSON errors (not plain text)
  - Requirements: 9.1, 9.2, 9.3, 9.4, 9.5

## Task Dependency Graph

```
1 --> 2
1 --> 3
3 --> 4
3 --> 5
3 --> 6
3 --> 7
3 --> 8
3 --> 9
3 --> 10
3 --> 11
3 --> 12
```

## Notes

- All database migrations are additive only — no existing tables altered or dropped
- Do not break the Vercel ↔ PythonAnywhere API contract
- Test all changes against local dev server before marking complete
