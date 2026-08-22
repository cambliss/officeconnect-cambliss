# Marketplace-Backend Integration Guide

## Overview
This guide documents all API endpoints the Office Connect backend must provide to support the marketplace vendor authentication, dashboard, and order sync flows.

## 1. Authentication Endpoints (`/api/auth`)

### Register Vendor
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
  "email": "vendor@email.com",
  "password": "secure_password",
  "storeName": "My Store"
}

Response (201 Created):
{
  "id": "vendor-123",
  "email": "vendor@email.com",
  "storeName": "My Store",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}

Error Response (400/409):
{
  "message": "Email already registered"
}
```

### Login Vendor
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "vendor@email.com",
  "password": "secure_password"
}

Response (200 OK):
{
  "id": "vendor-123",
  "email": "vendor@email.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}

Error Response (401/404):
{
  "message": "Invalid email or password"
}
```

### Get Vendor Profile
```
GET /api/auth/me
Authorization: Bearer <token>

Response (200 OK):
{
  "id": "vendor-123",
  "email": "vendor@email.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+91...",
  "organizationId": "org-456"
}

Error Response (401):
{
  "message": "Unauthorized"
}
```

## 2. Vendor Store Endpoints (`/api/ecommerce/stores`)

### List Vendor's Stores
```
GET /api/ecommerce/stores
Authorization: Bearer <token>

Query Parameters:
- (optional) skip: number (default 0)
- (optional) take: number (default 20)

Response (200 OK):
[
  {
    "id": "store-123",
    "name": "My Store",
    "domain": "mystore.ocmp.in",
    "description": "Store description",
    "isActive": true,
    "vendorId": "vendor-123",
    "organizationId": "org-456",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]

Note: MUST filter by authenticated vendor's ID
```

### Create Store
```
POST /api/ecommerce/stores
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "name": "My Store",
  "domain": "mystore.ocmp.in",
  "description": "Store description"
}

Response (201 Created):
{
  "id": "store-456",
  "name": "My Store",
  "domain": "mystore.ocmp.in",
  "description": "Store description",
  "isActive": true,
  "vendorId": "vendor-123",
  "organizationId": "org-456",
  "createdAt": "2024-01-15T10:05:00Z"
}

Error Response (400):
{
  "message": "Domain already taken"
}
```

## 3. Vendor Order Endpoints (`/api/ecommerce/orders`)

### List Vendor's Orders
```
GET /api/ecommerce/orders
Authorization: Bearer <token>

Query Parameters:
- (optional) storeId: string (filter by store)
- (optional) status: string (pending, packed, shipped, delivered, cancelled)
- (optional) skip: number (default 0)
- (optional) take: number (default 20)
- (optional) sortBy: string (createdAt, totalAmount)
- (optional) sortOrder: string (asc, desc)

Response (200 OK):
[
  {
    "id": "order-789",
    "orderId": "ORD-2024-001",
    "storeId": "store-123",
    "storeName": "My Store",
    "status": "shipped",
    "totalAmount": 4999.50,
    "customerName": "John Customer",
    "customerEmail": "customer@email.com",
    "items": [
      {
        "productListingId": "listing-123",
        "quantity": 2,
        "price": 2499.75
      }
    ],
    "shippingAddress": "...",
    "createdAt": "2024-01-15T11:00:00Z",
    "updatedAt": "2024-01-15T14:30:00Z"
  }
]

Note:
- MUST filter by vendor's stores (not all orders)
- Include order items, dates, amounts
- Support filtering and pagination
```

### Update Order Status
```
PATCH /api/ecommerce/orders/{orderId}/status
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "status": "shipped"
}

Valid Statuses: pending, packed, shipped, delivered, cancelled

Response (200 OK):
{
  "id": "order-789",
  "orderId": "ORD-2024-001",
  "status": "shipped",
  "updatedAt": "2024-01-15T14:30:00Z"
}

Error Response (403):
{
  "message": "Vendor does not have access to this order"
}
```

### Get Single Order Details
```
GET /api/ecommerce/orders/{orderId}
Authorization: Bearer <token>

Response (200 OK):
{
  "id": "order-789",
  "orderId": "ORD-2024-001",
  "storeId": "store-123",
  "status": "shipped",
  "totalAmount": 4999.50,
  "customerName": "John Customer",
  "customerEmail": "customer@email.com",
  "items": [...],
  "shippingAddress": {...},
  "invoiceId": "inv-123",
  "gstDetails": {...},
  "createdAt": "2024-01-15T11:00:00Z"
}

Error Response (403):
{
  "message": "Vendor does not have access to this order"
}
```

## 4. Webhook Endpoint (Marketplace Side)

Marketplace provides webhook endpoint for backend to notify about order updates:

```
POST http://localhost:3000/api/webhooks/order-status
(In production: https://marketplace.yourdomain.com/api/webhooks/order-status)

Content-Type: application/json

Request Body:
{
  "orderId": "ORD-2024-001",
  "status": "shipped",
  "storeId": "store-123",
  "totalAmount": 4999.50,
  "trackingNumber": "SHP123456",
  "estimatedDelivery": "2024-01-20"
}

Response (200 OK):
{
  "success": true,
  "orderId": "ORD-2024-001",
  "message": "Order status updated"
}
```

## 5. Webhook Integration in Backend

### Where to Call Webhook

After order status changes in any module (fulfillment, shipping, etc.):

```typescript
// Example in fulfillment service
async function updateOrderStatus(orderId: string, newStatus: string) {
  // Update order in database
  const order = await db.orders.update({ id: orderId, status: newStatus });
  
  // Notify marketplace
  try {
    await axios.post(
      `${process.env.MARKETPLACE_WEBHOOK_URL}/api/webhooks/order-status`,
      {
        orderId: order.externalOrderId, // marketplace order ID
        status: newStatus,
        storeId: order.storeId,
        totalAmount: order.totalAmount,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery
      },
      {
        headers: {
          'X-Webhook-Secret': process.env.WEBHOOK_SECRET
        }
      }
    );
  } catch (error) {
    console.error('Failed to notify marketplace:', error);
    // Continue processing even if webhook fails (add to retry queue)
  }
}
```

### Environment Variables Needed

```env
# Webhook configuration
MARKETPLACE_WEBHOOK_URL=http://localhost:3000
WEBHOOK_SECRET=your-secret-key-32-chars-minimum

# For production:
# MARKETPLACE_WEBHOOK_URL=https://marketplace.yourdomain.com
# WEBHOOK_SECRET=<strong-random-secret>
```

## 6. Data Filtering & Authorization

### Critical: Vendor Isolation
```typescript
// Example: Get vendor's orders (MUST filter)
async function getVendorOrders(vendorId: string) {
  const vendorStores = await db.stores.findMany({
    where: { vendorId }
  });
  
  const storeIds = vendorStores.map(s => s.id);
  
  const orders = await db.orders.findMany({
    where: { storeId: { in: storeIds } }
  });
  
  return orders;
}
```

## 7. JWT Token Implementation

### Token Requirements
- Algorithm: HS256 or RS256
- Payload must include: `vendorId`, `organizationId`, `email`
- Expiration: 24-48 hours recommended
- Refresh token support (optional but recommended)

### Example Payload
```json
{
  "sub": "vendor-123",
  "vendorId": "vendor-123",
  "organizationId": "org-456",
  "email": "vendor@email.com",
  "iat": 1705325400,
  "exp": 1705411800
}
```

## 8. CORS Configuration

Backend must allow marketplace origin:

```typescript
// In Express CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

Environment:
```env
CORS_ORIGINS=http://localhost:3000,https://marketplace.yourdomain.com
```

## 9. Error Response Format

All error responses should follow this format:

```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (vendor doesn't have access)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `500` - Server Error

## 10. Testing Integration

### Test Vendor Registration
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@vendor.com",
    "password": "test123",
    "storeName": "Test Store"
  }'
```

### Test Vendor Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@vendor.com",
    "password": "test123"
  }'
```

### Test Get Profile (with token)
```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <token-from-login>"
```

### Test Webhook Delivery
```bash
curl -X POST http://localhost:3000/api/webhooks/order-status \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-2024-001",
    "status": "shipped",
    "storeId": "store-123",
    "totalAmount": 4999.50
  }'
```

## Implementation Checklist

- [ ] Auth endpoints: register, login, me
- [ ] Store endpoints: list, create
- [ ] Order endpoints: list, get, update status
- [ ] JWT token generation & validation
- [ ] CORS configuration
- [ ] Vendor isolation in queries
- [ ] Error handling
- [ ] Webhook sender in fulfillment module
- [ ] Environment variables setup
- [ ] Integration testing with marketplace

---

**Status:** This specification defines all backend requirements for Phase 2 integration.

**Next:** Implement these endpoints and test with marketplace at http://localhost:3000
