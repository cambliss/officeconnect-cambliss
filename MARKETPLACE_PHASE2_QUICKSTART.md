# Phase 2 Quick Start Guide

## 🚀 Getting Started

### 1. Start Development Server
```bash
cd c:\Users\cambl\saas-platform\cambliss-marketplace
npm run dev
```
Visit http://localhost:3000

### 2. Marketplace Pages Available

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Marketplace overview |
| Products | `/products` | Browse all products |
| Cart | `/cart` | Place orders |
| Vendor Login | `/vendor/login` | Vendor authentication |
| Vendor Register | `/vendor/register` | New vendor sign-up |
| Vendor Dashboard | `/vendor/dashboard` | Manage stores & orders |
| Vendor Onboarding | `/vendor/onboarding` | Create new store |

### 3. Key Features Implemented

✅ **Vendor Authentication**
- Email/password registration and login
- JWT token stored in localStorage
- Automatic token attachment to API requests
- Session persistence across page refreshes

✅ **Vendor Dashboard**
- View your stores (domain, status)
- See recent orders with status badges
- Real-time data from Office Connect backend
- Protected route redirects to login

✅ **Webhook Ready**
- POST `/api/webhooks/order-status` endpoint
- Receives order updates from Office Connect
- Ready for real-time SSE/WebSocket upgrades

✅ **Enhanced Checkout**
- Improved form layout
- Order flow documentation
- Success/error feedback

### 4. Environment Setup

Create `.env.local` in `cambliss-marketplace/`:
```
BACKEND_ORIGIN=http://localhost:4000
```

For production, update to your production backend URL.

### 5. Testing the Flow

#### Test Vendor Registration
1. Visit http://localhost:3000/vendor/register
2. Enter: email, password, store name
3. Should auto-redirect to dashboard
4. Check browser DevTools → Application → LocalStorage
5. `marketplace_vendor_token` key should contain JWT

#### Test Vendor Login
1. Visit http://localhost:3000/vendor/login
2. Use registered credentials
3. Should redirect to dashboard
4. Dashboard shows vendor stores and orders

#### Test Order Checkout
1. Visit http://localhost:3000/products (see available products)
2. Go to http://localhost:3000/cart
3. Fill form:
   - Store Domain: `store-name` (or from products page)
   - Product ID: valid product ID
   - Quantity: 1-5
   - Customer Name & Email
4. Click "Place Order"
5. Order should be created in backend

### 6. Verify API Integration

Open browser DevTools → Network tab:
- Auth requests: `POST /api/auth/login` → proxied to backend
- Order requests: `GET/POST /api/ecommerce/*` → proxied to backend
- Check headers: `Authorization: Bearer <token>` should appear on vendor routes

### 7. Backend Requirements

For full functionality, Office Connect backend needs:

**Auth Routes:**
```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

**Vendor Routes:**
```
GET /api/ecommerce/stores (filtered by vendor)
GET /api/ecommerce/orders (filtered by vendor)
PATCH /api/ecommerce/orders/:id/status
```

**Webhook Sender:**
After order status changes in backend, POST to:
```
POST http://localhost:3000/api/webhooks/order-status
Body: { orderId, status, storeId, totalAmount }
```

### 8. Build for Production

```bash
npm run build
npm run start
```

All pages pre-render as static HTML + API routes handle dynamic operations.

### 9. Troubleshooting

**Issue:** "Login failed" error
- Ensure backend is running on `BACKEND_ORIGIN`
- Check backend has auth endpoints at `/api/auth/*`
- Verify CORS is configured to allow marketplace origin

**Issue:** "No stores found" on dashboard
- Ensure vendor has created stores via `/vendor/onboarding`
- Backend must filter stores by vendor ID/organization

**Issue:** Orders not showing
- Backend must implement `GET /api/ecommerce/orders`
- Must filter by vendor's stores

**Issue:** Token not persisting
- Check localStorage in DevTools
- Verify `marketplace_vendor_token` key exists
- Check `useVendorAuth` hook is mounted

### 10. Next Steps (Phase 3)

- [ ] Real-time updates (SSE/WebSocket)
- [ ] Seller metrics & analytics
- [ ] Product management interface
- [ ] Settlement & payouts
- [ ] Review & rating system
- [ ] Advanced inventory sync

---

**Marketplace Status:** ✅ Phase 2 Complete - Ready for Integration Testing

**Build Output:**
```
✓ 8 static pages
✓ 1 API webhook route
✓ 1 middleware
✓ All TypeScript checks passed
✓ Ready for deployment
```
