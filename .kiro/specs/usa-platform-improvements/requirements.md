# Requirements Document

## Introduction

This document captures requirements for a broad platform improvement pass on the U.S. Atelier e-commerce site. The work spans six areas: frontend bug-fixes and polish, checkout reliability (adding Cash on Delivery alongside hardened Razorpay), product-listing page clean-up, image-loading performance, admin analytics expansion, and general codebase hygiene.

The frontend is a Next.js 16 / React 19 application hosted on Vercel; the backend is a Flask (Python) application hosted on PythonAnywhere. All changes must preserve the existing Vercel ↔ PythonAnywhere API contract and use only additive database migrations.

---

## Glossary

- **Checkout_Page**: The Next.js page at `/app/checkout/page.tsx` that handles shipping details, order review, and payment.
- **COD**: Cash on Delivery — a payment method where the customer pays the delivery agent in cash upon receiving the order.
- **COD_Fee**: A flat surcharge applied to orders paid via COD. ₹50 for orders with a merchandise subtotal (after discounts) under ₹2,000; ₹0 for orders at or above ₹2,000.
- **COD_Collectable_Amount**: The total amount the delivery agent must collect: merchandise subtotal + shipping + tax + COD_Fee.
- **Delhivery**: Third-party logistics provider integrated via `delhivery_utils.py`.
- **DispatchJob**: The retry-safe Delhivery dispatch queue model in `models_mysql.py`.
- **Order**: The `orders` table record managed by the `Order` SQLAlchemy model.
- **Payment**: The `payments` table record managed by the `Payment` SQLAlchemy model.
- **ProductCard**: The React component at `/components/product-card.tsx` that renders a single product in listing grids.
- **ProductView**: A new database model to be added to `models_mysql.py` for tracking product page views.
- **Razorpay**: The online payment gateway currently integrated in the checkout flow.
- **Razorpay_Webhook**: The backend endpoint at `POST /api/webhooks/razorpay`, which is the authoritative source of payment-capture confirmation.
- **Admin_Dashboard**: The admin-facing Next.js pages under `/app/admin/`.
- **Analytics_Page**: The admin page at `/app/admin/analysis/page.tsx`.
- **View_All_Page**: The Next.js page at `/app/view-all/page.tsx` that lists all products with filtering.
- **apiFetch**: The frontend utility in `/lib/api-base.ts` that handles CSRF tokens and authenticated requests.
- **CLS**: Cumulative Layout Shift — a Core Web Vitals metric measuring unexpected layout movement.
- **WebP**: A modern image format with superior compression.
- **Session_Window**: A 30-minute rolling period used to deduplicate product view events from the same session.
- **Above the fold**: Visible at 1280 px viewport width without scrolling.

---

## Requirements

### Requirement 1: Frontend Audit — Accessibility and Breakpoint Correctness

**User Story:** As a shopper, I want every page to render correctly and be accessible on mobile, tablet, and desktop, so that I can browse and purchase without encountering broken layouts or inaccessible controls.

#### Acceptance Criteria

1. THE Frontend SHALL render without React console errors or warnings at viewport widths of 375 px (mobile), 768 px (tablet), and 1280 px (desktop).
2. THE Frontend SHALL expose no broken internal links (links that resolve to a 404 or to a route that renders no headings, body text, or interactive controls).
3. THE Frontend SHALL provide an `aria-label` or visible text label for all interactive controls (buttons, links, form inputs) that have neither.
4. THE Frontend SHALL associate every form input with a `<label>` element or an `aria-labelledby` attribute.
5. WHEN a focused interactive element receives keyboard focus, THE Frontend SHALL display a visible focus indicator with at least a 3:1 contrast ratio against the adjacent background (WCAG 2.2 SC 2.4.11).
6. THE Checkout_Page SHALL render all form fields and the order-summary panel without horizontal overflow (no horizontal scrollbar, no content clipped beyond the viewport edge) at both 375 px and 768 px viewport widths.
7. THE Frontend SHALL contain no `console.log` debug statements in production source files under `app/`, `components/`, `lib/`, or `hooks/` (excluding `node_modules`, build output, and test/spec files).
8. THE Frontend SHALL contain no unused ES module imports in source files under `app/`, `components/`, `lib/`, or `hooks/`.

---

### Requirement 2: Remove Redundant "View Details" CTA from ProductCard

**User Story:** As a shopper, I want product cards to be uncluttered, so that I can see the full product image and click directly to the product page without visual noise.

#### Acceptance Criteria

1. THE ProductCard SHALL NOT render any overlay bar containing the text "View Details" or any equivalent CTA label on the product image.
2. WHEN a user clicks anywhere on the ProductCard, THE ProductCard SHALL navigate to `/product/{encodeURIComponent(product.name)}` using the existing Next.js `<Link>` component (the `href` must remain `"/product/" + encodeURIComponent(product.name)`).
3. THE ProductCard SHALL continue to render an "Out of Stock" overlay when `product.stock === 0` (or when `product.inStock` is false and `product.stock` is undefined).
4. THE ProductCard SHALL continue to render a "New" badge when `product.newArrival` or `product.is_new` is truthy, and a "Best" badge when `product.bestseller` or `product.is_bestseller` is truthy.
5. WHEN a pointer-device user hovers over the ProductCard, THE ProductCard SHALL apply the GSAP scale (1.04) and box-shadow transition to the image, with no overlay bar appearing at any point during or after the hover.
6. WHEN a pointer-device user moves the cursor off the ProductCard, THE ProductCard SHALL restore the image scale to 1.0 and revert the box-shadow.

---

### Requirement 3: View-All Page Filter Behaviour Across Breakpoints

**User Story:** As a shopper, I want the category tabs and filter dropdowns on the View-All page to work correctly on all screen sizes, so that I can narrow down products on any device.

#### Acceptance Criteria

1. THE View_All_Page SHALL render the horizontal category tab bar at 375 px viewport width such that no tab text is clipped, no horizontal body scrollbar appears, and all tab elements remain within viewport bounds (achieved via horizontal scroll within the tab bar container, not page-level overflow).
2. WHEN a filter dropdown is opened on a viewport narrower than 768 px, THE View_All_Page SHALL present the dropdown as a full-width bottom-sheet panel that slides up from the bottom of the viewport with a semi-transparent backdrop overlay behind it.
3. WHEN a filter dropdown is opened on a viewport 768 px or wider, THE View_All_Page SHALL present the dropdown as an inline menu whose top edge is immediately below the trigger button, with no overlap of the trigger.
4. WHEN a user taps the semi-transparent backdrop overlay behind an open filter dropdown on mobile, THE View_All_Page SHALL close that dropdown.
5. THE View_All_Page SHALL display spacing between ProductCard components of 24 px on viewports 0–767 px (2-column grid), 32 px on viewports 768–1279 px, and 40 px on viewports 1280 px and above.
6. WHEN a URL `?category=` query parameter is present, THE View_All_Page SHALL case-insensitively match its value to a category name, pre-select the matching tab, and filter the product list to that category on first render without requiring user interaction.
7. WHEN a URL `?category=` value does not match any known category (case-insensitive), THE View_All_Page SHALL render all products and highlight the "All" tab, treating the unrecognised value as absent.
8. WHEN no products match the active filters, THE View_All_Page SHALL display a textual message indicating no products match the current filters and a "Clear Filters" button that resets all active filters.

---

### Requirement 4: Add Cash on Delivery Payment Option

**User Story:** As a shopper, I want to pay with Cash on Delivery, so that I can complete purchases without a credit or debit card.

#### Acceptance Criteria

1. THE Checkout_Page SHALL display a payment-method selector with at least two options: "Pay Online (Razorpay)" and "Cash on Delivery".
2. WHEN a user selects "Cash on Delivery" and the order subtotal (after discounts, before shipping and tax) is less than ₹2,000, THE Checkout_Page SHALL add a COD_Fee of ₹50 to the order total displayed in the summary.
3. WHEN a user selects "Cash on Delivery" and the order subtotal (after discounts, before shipping and tax) is ₹2,000 or more, THE Checkout_Page SHALL display a COD_Fee of ₹0 in the order summary.
4. WHEN a user switches from "Cash on Delivery" to "Pay Online (Razorpay)", THE Checkout_Page SHALL remove the COD_Fee line from the summary and recalculate the order total to exclude any COD_Fee.
5. WHEN a user selects "Cash on Delivery" and submits the order, THE Backend SHALL create an Order record with `payment_method = "cod"`, `payment_status = "COD - Pending"`, `cod_fee` equal to the applicable fee (₹50 or ₹0), and `cod_collectable_amount` equal to `subtotal - discount + shipping + tax + cod_fee`.
6. WHEN a COD Order is created, THE Backend SHALL enqueue a DispatchJob with `payment_mode = "COD"` and `cod_amount` equal to the Order's `cod_collectable_amount`.
7. WHEN a COD DispatchJob is processed, THE Backend SHALL call `delhivery_utils.create_shipment()` with `payment_mode="COD"` and `cod_amount` equal to the Order's `cod_collectable_amount`.
8. WHEN a COD order is successfully created, THE Checkout_Page SHALL redirect the user to the order confirmation page without opening the Razorpay modal.
9. IF a COD DispatchJob fails all 3 retry attempts, THEN THE Backend SHALL set the job `status` to `"failed"`, log the failure at ERROR level with the order ID and last error message, and leave the Order record with `status = "Pending"` for manual review.

---

### Requirement 5: Razorpay Checkout Reliability

**User Story:** As a shopper, I want my order to be recorded even if I lose my internet connection after a Razorpay payment, so that I am never charged without receiving an order confirmation.

#### Acceptance Criteria

1. WHEN a user initiates an online payment, THE Backend SHALL create an Order record with `status = "Pending"` and `razorpay_order_id` populated and persist it to the database BEFORE returning the Razorpay order ID to the frontend (i.e., before the Razorpay checkout modal can open).
2. WHEN the Razorpay_Webhook receives a `payment.captured` event, THE Backend SHALL verify the Razorpay webhook signature using the `RAZORPAY_WEBHOOK_SECRET` environment variable before processing the event; IF signature verification fails, THE Backend SHALL return HTTP 400 and take no action.
3. WHEN the Razorpay_Webhook receives a verified `payment.captured` event and an Order with the matching `razorpay_order_id` exists in the database, THE Backend SHALL update that Order's `payment_status` to `"Paid"` and `status` to `"Processing"` exactly once, regardless of how many times the webhook event is delivered.
4. WHEN the Razorpay_Webhook receives a verified `payment.captured` event and no Order with the matching `razorpay_order_id` exists, THE Backend SHALL attempt to create the Order using the `checkout_payload_json` stored on the associated Payment record; IF no Payment record or payload exists, THE Backend SHALL log the event at ERROR level and return HTTP 200 to prevent Razorpay retries.
5. WHEN a user reopens the Checkout_Page and `localStorage` contains a `checkout_pending_payment` entry with a `razorpay_order_id` or `razorpay_payment_id`, THE Checkout_Page SHALL call `POST /api/payments/recover-order` before rendering the payment form.
6. IF `POST /api/payments/recover-order` returns `{ "order_found": true }`, THEN THE Checkout_Page SHALL navigate to the order confirmation page and clear the `checkout_pending_payment` entry from `localStorage`.
7. IF `POST /api/payments/recover-order` returns `{ "payment_captured": false }`, THEN THE Checkout_Page SHALL clear the `checkout_pending_payment` entry from `localStorage` and allow the user to re-initiate payment normally.
8. IF `POST /api/payments/recover-order` returns HTTP 503 with `{ "payment_captured": null }`, THEN THE Checkout_Page SHALL display a non-blocking message to the user indicating the payment status cannot be verified yet, and SHALL NOT clear the `checkout_pending_payment` entry.
9. THE Backend's `POST /api/payments/recover-order` endpoint SHALL return `{ "order_found": true, "orderId": "<order_number>" }` when a completed Order exists for the supplied `razorpay_payment_id` or `razorpay_order_id`.
10. THE Backend's `POST /api/payments/recover-order` endpoint SHALL return `{ "payment_captured": false }` when neither a completed Order nor a captured payment exists for the supplied identifiers.

---

### Requirement 6: Image Loading Performance

**User Story:** As a shopper, I want product images to load quickly and without layout shifts, so that the site feels fast and images do not push content around while loading.

#### Acceptance Criteria

1. THE Frontend SHALL set `loading="lazy"` on every Next.js `<Image>` component that is not above the fold (above the fold = visible at 1280 px viewport width without scrolling).
2. THE Frontend SHALL set the `priority` prop on Next.js `<Image>` components that are above the fold (hero images and the first product row on listing pages), and SHALL NOT set `priority` on any image below the fold.
3. THE Frontend SHALL provide either explicit `width` and `height` props, or the `fill` prop paired with a non-empty `sizes` prop, on every Next.js `<Image>` component to prevent CLS.
4. WHERE a Next.js `<Image>` uses the `fill` prop, THE Frontend SHALL provide a `sizes` prop that reflects the actual responsive display width (e.g., `"(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"` for a 4-column grid).
5. THE ProductCard image SHALL visually fill its `aspect-ratio: 3/4` container without letterboxing or distortion across viewport widths from 320 px to 2560 px.

---

### Requirement 7: ProductView Tracking Model and Endpoints

**User Story:** As an admin, I want to see how many times each product page has been viewed, so that I can understand customer interest beyond sales and cart data.

#### Acceptance Criteria

1. THE Backend SHALL define a `ProductView` SQLAlchemy model with columns: `id` (integer primary key), `product_id` (integer foreign key to `products.id`), `user_id` (nullable integer foreign key to `users.id`), `session_id` (nullable `VARCHAR(128)`), and `timestamp` (datetime, defaulting to `datetime.utcnow`).
2. THE Backend SHALL create the `product_views` table via `db_mysql.create_all()` as an additive migration (no existing tables altered or dropped).
3. WHEN a request is made to `POST /api/products/{id}/view`, THE Backend SHALL insert a ProductView row with `product_id` set to `{id}`, `user_id` set to the session user's ID if authenticated (otherwise `NULL`), `session_id` set to the value from the request body (if provided), and `timestamp` set to the current UTC time; THE Backend SHALL return HTTP 201.
4. WHEN a request is made to `POST /api/products/{id}/view` and a `session_id` is provided in the request body AND a ProductView row with the same `session_id` and `product_id` already exists with a `timestamp` within the preceding 30 minutes, THE Backend SHALL NOT insert a new row and SHALL return HTTP 200.
5. WHEN a request is made to `POST /api/products/{id}/view` and no `session_id` is provided (null or absent), THE Backend SHALL always insert a new ProductView row regardless of recent rows.
6. WHEN a request is made to `POST /api/products/{id}/view` and the `session_id` in the request body exceeds 128 characters, THE Backend SHALL return HTTP 422 with `{ "error": "session_id exceeds maximum length of 128 characters" }`.
7. WHEN a request is made to `POST /api/products/{id}/view` for a `product_id` that does not exist in the `products` table, THE Backend SHALL return HTTP 404 with `{ "error": "Product not found" }`.
8. THE Backend `POST /api/products/{id}/view` endpoint SHALL NOT require authentication.
9. WHEN a request is made to `GET /api/admin/analytics/product-views`, THE Backend SHALL return a JSON array where each element contains `product_id` (integer), `product_name` (string, or `"[Deleted]"` if the product no longer exists), and `view_count` (integer), filtered by the `range` query parameter: `today` (current calendar day UTC), `7d` (last 7 days), `30d` (last 30 days), or `all` (all time); results SHALL be sorted descending by `view_count`.
10. WHEN a request is made to `GET /api/admin/analytics/product-views` with an absent or unrecognised `range` value, THE Backend SHALL return HTTP 422 with `{ "error": "range must be one of: today, 7d, 30d, all" }`.
11. THE Backend `GET /api/admin/analytics/product-views` endpoint SHALL require admin authentication, returning HTTP 401 if unauthenticated and HTTP 403 if authenticated but not admin.

---

### Requirement 8: Analytics Page — Revenue and Conversion Metrics

**User Story:** As an admin, I want to see revenue trends, top products by revenue, conversion rates, and abandoned-cart rates on the analytics dashboard, so that I can make data-driven decisions about the business.

#### Acceptance Criteria

1. THE Analytics_Page SHALL display a "Total Orders" summary card and a "Total Revenue" summary card at the top of the page, each fetching data from the existing `/api/admin/analysis` endpoint.
2. THE Backend `/api/admin/analysis` endpoint SHALL include `total_orders` (integer count of all Orders where `status` is not `"Cancelled"`) and `total_revenue` (sum of `Order.total` for all non-cancelled orders, returned as a float rounded to 2 decimal places) in its response payload.
3. THE Analytics_Page SHALL display a line chart showing daily revenue for the previous 30 calendar days using the existing `recharts` `LineChart` component.
4. THE Backend SHALL provide a `GET /api/admin/analytics/revenue-trend` endpoint that returns a JSON array of `{ "date": "YYYY-MM-DD", "revenue": float }` objects for each of the previous 30 calendar days (UTC), including days with zero revenue as `{ "date": "...", "revenue": 0.0 }`, sorted ascending by date; this endpoint SHALL require admin authentication.
5. THE Analytics_Page SHALL display a "Top Products by Revenue" section listing up to 10 products ranked by `total_revenue` (descending), showing product name and formatted revenue (₹ with Indian locale comma formatting).
6. THE Backend `/api/admin/analysis` endpoint SHALL include `top_by_revenue` — a JSON array of up to 10 objects each containing `product_id` (integer), `product_name` (string), and `total_revenue` (float, sum of `OrderItem.price × OrderItem.quantity` for all non-cancelled orders), sorted descending by `total_revenue`.
7. THE Analytics_Page SHALL display a "Views" column in the top-selling products table showing the 30-day view count from `ProductView` for each product; the column SHALL be sortable by clicking the column header.
8. THE Analytics_Page SHALL display a "Conversion" column calculated as `(count of distinct orders containing the product) / (product_view_count)`, expressed as a percentage with two decimal places; WHEN `product_view_count` is zero, THE Analytics_Page SHALL display "—" in that cell.
9. THE Backend `/api/admin/analysis` endpoint SHALL include `abandoned_cart_rate` — the percentage (float, rounded to 1 decimal place) of distinct user emails that appear in `CartEvent` rows with `event_type = "add"` but have no corresponding `Order` within 24 hours of their earliest add event; WHEN the total count of such users is zero, THE Backend SHALL return `abandoned_cart_rate` as `null`.
10. THE Analytics_Page SHALL display the abandoned cart rate as a percentage rounded to one decimal place (e.g., "34.5%"), or "N/A" when the value is `null`.

---

### Requirement 9: Codebase Cleanup — Backend

**User Story:** As a developer, I want the backend codebase to be free of unused routes, debug code, and inconsistent error responses, so that the production API is easier to maintain and monitor.

#### Acceptance Criteria

1. THE Backend SHALL remove any Flask route handler that bears a `# test`, `# demo`, or `# debug` comment on its decorator line or within its function body, unless the route URL appears in a maintained allowlist of production-used endpoints.
2. WHEN any backend route encounters an unhandled exception, THE Backend SHALL return HTTP 500 with a JSON body containing at least `{ "error": "Internal server error" }` and `Content-Type: application/json` — never a plain-text body or an unformatted Python traceback in the response.
3. THE Backend source files SHALL contain no `print()` statements in code paths reachable when `FLASK_ENV=production` or `NODE_ENV=production` is set.
4. WHEN a request is made to a URL that does not match any registered Flask route, THE Backend SHALL return HTTP 404 with `{ "error": "Not found" }` and `Content-Type: application/json`.
5. THE Backend SHALL register a global unhandled-exception handler that returns a structured JSON 500 response (as per Criterion 2) while writing the full traceback to the server-side application log.

---

### Requirement 10: Codebase Cleanup — Frontend

**User Story:** As a developer, I want the frontend codebase to be free of silent API failures, unused dependencies, and dead code, so that errors surface promptly and the build stays lean.

#### Acceptance Criteria

1. WHEN an `apiFetch` call fails (network error, non-2xx response, or thrown exception), THE Frontend SHALL render a non-empty error message in the UI rather than silently swallowing the error (every `apiFetch` call SHALL have either a `try/catch` block or a `.catch()` handler that sets visible UI state).
2. THE Frontend SHALL contain no `.then()` chains on Promises without a paired `.catch()` or equivalent rejection handler in production source files.
3. THE Frontend `package.json` dependencies SHALL list only npm packages that are transitively reachable by at least one import in `app/`, `components/`, `lib/`, or `hooks/` (excluding devDependencies, which may include build-only tools).
4. THE Frontend SHALL contain no dead React components defined in `components/` that are not imported (directly or transitively) by any file in `app/`, `components/`, `lib/`, or `hooks/`.
5. THE Frontend SHALL contain no `console.log` calls in production source files under `app/`, `components/`, `lib/`, or `hooks/`.

---

### Requirement 11: Backend Upload Endpoint — WebP Conversion

**User Story:** As an admin, I want product images automatically converted to WebP on upload, so that served images are smaller and page loads are faster without requiring manual conversion.

#### Acceptance Criteria

1. WHEN an image file is uploaded via the product image upload endpoint, THE Backend SHALL convert the image to WebP format using Pillow before saving.
2. WHEN converting an uploaded image to WebP, THE Backend SHALL use Pillow with `quality=85`.
3. WHEN converting an uploaded image to WebP, THE Backend SHALL produce an output file with identical pixel dimensions (width × height) to the input file (zero pixel difference).
4. WHEN an uploaded file is already in WebP format, THE Backend SHALL save it using the timestamp naming pattern (Criterion 6) without re-encoding.
5. WHEN an uploaded file's format cannot be opened by Pillow as a recognised image (not JPEG, PNG, GIF, BMP, TIFF, or WebP), THE Backend SHALL return HTTP 400 with a JSON body containing `{ "error": "Unsupported image format" }`.
6. THE Backend SHALL name each saved image file as `{T}_{stem}.webp`, where `{T}` is the integer Unix timestamp (seconds since epoch) at the moment of upload and `{stem}` is the sanitised, path-traversal-safe base name of the original file without its extension (produced by `werkzeug.utils.secure_filename` applied before stripping the extension).
7. WHEN an uploaded image file exceeds 10 MB, THE Backend SHALL return HTTP 400 with `{ "error": "File size exceeds 10 MB limit" }` without attempting conversion.
8. WHEN a Pillow conversion error occurs, THE Backend SHALL save the original file (renamed using the Criterion 6 pattern with its original extension), log the exception at ERROR level, and return HTTP 200 with a JSON body containing `{ "url": "<saved_file_url>", "warning": "Image could not be converted to WebP; original format saved" }`.
9. WHEN a product image upload succeeds (with or without WebP conversion), THE Backend SHALL return HTTP 200 with `{ "url": "<full_public_url_of_saved_file>" }`.

---

### Requirement 12: Structured Error Handling — API Contract

**User Story:** As a frontend developer, I want all backend API errors to be returned as structured JSON, so that the frontend can display meaningful messages without parsing HTML error pages.

#### Acceptance Criteria

1. THE Backend SHALL return `Content-Type: application/json` with a valid, parseable JSON body on all error responses (4xx and 5xx).
2. WHEN a required request body field is missing or fails validation, THE Backend SHALL return HTTP 400 with `{ "error": "<description that names the missing or invalid field and the constraint violated>" }`.
3. WHEN an authenticated endpoint is called without a valid session, THE Backend SHALL return HTTP 401 with `{ "error": "Authentication required" }`.
4. WHEN an admin-only endpoint is called by an authenticated non-admin user, THE Backend SHALL return HTTP 403 with `{ "error": "Admin access required" }`.
5. WHEN a resource addressed by a route parameter does not exist, THE Backend SHALL return HTTP 404 with `{ "error": "Not found" }`.
6. THE Backend SHALL never return an HTTP 500 response whose body contains an unformatted Python traceback when `FLASK_ENV=production` or `NODE_ENV=production` is set.
