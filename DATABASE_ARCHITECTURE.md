# Office Connect - Database Architecture Documentation

**Document Version:** 1.0  
**Generated:** 2026-06-17  
**Database Type:** PostgreSQL  
**ORM:** Prisma

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Entities](#core-entities)
3. [Module Breakdown](#module-breakdown)
4. [Entity Relationship Diagram](#entity-relationship-diagram)
5. [Data Flow](#data-flow)
6. [Indexing Strategy](#indexing-strategy)

---

## Executive Summary

Office Connect is a comprehensive SaaS platform built on a multi-tenant architecture supporting:

- **Multi-organizational** support with role-based access control
- **Subscription management** with tiered plans
- **Modular feature access** (CRM, HRM, Inventory, eCommerce, etc.)
- **Enterprise accounting** with GST compliance
- **Human Resource Management** with payroll and attendance
- **Inventory & Warehouse** management with stock tracking
- **D2C eCommerce** with stores, products, and orders
- **Point-of-Sale (POS)** system integration
- **Invoice generation** with GST automation

**Database Size Estimate:** 50-200GB (depending on transaction volume)  
**Typical Row Count:** 10M+ transactions in production

---

## Core Entities

### 1. Authentication & Authorization

#### User
- **Purpose:** Platform user account
- **Key Fields:** email, firstName, lastName, passwordHash, isPlatformUser, organizationId
- **Relationships:** 
  - `1:N` with `OrganizationUser` (memberships)
  - `1:N` with `Project` (project members)
  - `1:N` with `File` (uploaded files)

#### Role
- **Purpose:** Define role-based access levels
- **Enum Values:** SUPER_ADMIN, ADMIN, PROJECT_MANAGER, EMPLOYEE, CLIENT
- **Key Fields:** name (unique)

#### OrganizationUser
- **Purpose:** Join user to organization with specific role
- **Key Fields:** organizationId, userId, roleId
- **Constraints:** Unique combination of (organizationId, userId)

---

### 2. Organization & Subscription

#### Organization
- **Purpose:** Tenant container for all business data
- **Key Fields:** name, legalName, panNumber, businessType, addressLine1-pincode, country
- **Settlement Fields:** settlementAccountHolderName, settlementAccountNumber, settlementIFSC
- **Relationships:**
  - `1:N` with `User`
  - `1:N` with `Subscription`
  - `1:N` with `Project`, `Contact`, `Product`, etc.
- **Multi-tenant Strategy:** All queries filtered by `organizationId`

#### Subscription
- **Purpose:** Track active subscription for organization
- **Key Fields:** organizationId, planId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd
- **Status Values:** TRIALING, ACTIVE, PAST_DUE, CANCELED, EXPIRED, SUSPENDED
- **Relationships:**
  - `N:1` with `Organization`
  - `N:1` with `Plan`
  - `1:N` with `Payment`

#### Plan
- **Purpose:** Define subscription tiers
- **Key Fields:** name, description, features[], price, currency, interval, userLimit, storageLimit
- **Relationships:**
  - `1:N` with `Subscription`
  - `1:N` with `PlanModule`

#### Payment
- **Purpose:** Record subscription payment transactions
- **Key Fields:** subscriptionId, amount, currency, provider, externalPaymentId, paidAt
- **Providers:** Razorpay, Stripe

---

### 3. Module & Feature Access

#### Module
- **Purpose:** Define available features (CRM, HRM, Inventory, eCommerce, Chat, etc.)
- **Key Fields:** name (unique), description, isActive
- **Relationships:**
  - `1:N` with `PlanModule` (which plans include this module)
  - `1:N` with `OrganizationModule` (which orgs have enabled this module)

#### PlanModule
- **Purpose:** Junction table linking Plans to Modules
- **Key Fields:** planId, moduleId
- **Constraints:** Unique (planId, moduleId)

#### OrganizationModule
- **Purpose:** Track which modules are enabled for an organization
- **Key Fields:** organizationId, moduleId, isEnabled
- **Constraints:** Unique (organizationId, moduleId)

---

## Module Breakdown

### CRM Module

#### Contact
- **Purpose:** Store customer, vendor, partner information
- **Key Fields:** organizationId, type (CUSTOMER/VENDOR/PARTNER), firstName, lastName, companyName, email, phone, gstNumber, panNumber, billingAddress, shippingAddress, isActive
- **Relationships:** Linked to Lead, Deal, Order, Invoice, Transaction

#### Lead
- **Purpose:** Track sales prospects
- **Key Fields:** organizationId, contactId, firstName, email, phone, source, status, score, assignedTo, isArchived
- **Status Values:** NEW, QUALIFIED, NURTURING, STALLED, CONVERTED
- **Relationships:** 
  - `N:1` with `Contact`
  - `1:N` with `Activity`

#### Pipeline & Stage
- **Purpose:** Define deal workflow stages
- **Pipeline:** organizationId, name
- **Stage:** pipelineId, name, order (sequence)
- **Relationships:**
  - Stage `1:N` with `Deal`
  - Stage in `DealStageHistory`

#### Deal
- **Purpose:** Track sales opportunities
- **Key Fields:** organizationId, contactId, pipelineId, stageId, value, probability, expectedClose, status (OPEN/WON/LOST)
- **Relationships:**
  - `N:1` with `Pipeline`, `Stage`, `Contact`
  - `1:N` with `Activity`, `DealStageHistory`

#### Activity
- **Purpose:** Log CRM interactions
- **Key Fields:** dealId, leadId, createdBy, type (CALL/EMAIL/MEETING), note, dueDate, completed
- **Relationships:** Connected to Deal, Lead, User

#### DealStageHistory
- **Purpose:** Audit trail of deal movement through stages
- **Key Fields:** dealId, fromStageId, toStageId, changedBy (userId), changedAt
- **Use Case:** Generate sales velocity reports, forecast accuracy

---

### HRM Module

#### Employee
- **Purpose:** Central employee record
- **Key Fields:** organizationId, employeeCode (unique per org), userId, joinDate, confirmationDate, salary, bankAccountNumber, bankIFSC, taxId, emergencyContact
- **Relationships:**
  - `N:1` with `Department`, `Designation`, `Team`, `Location`
  - `1:1` with `User`
  - Manager hierarchy: `self-referencing` (managerId points to Employee)
  - `1:N` with `Attendance`, `LeaveBalance`, `Payslip`, etc.

#### Department, Designation, Team, Location
- **Purpose:** Organizational structure hierarchy
- **Constraints:** Unique (organizationId, name)

#### Shift & EmployeeShift
- **Purpose:** Define work schedules
- **Shift:** organizationId, name, startTime, endTime, graceMinutes
- **EmployeeShift:** employee-to-shift mapping

#### Attendance
- **Purpose:** Track daily attendance
- **Key Fields:** organizationId, employeeId, date, checkIn, checkOut, totalHours, overtimeHours, isLate, status
- **Constraints:** Unique (employeeId, date)

#### LeavePolicy & LeaveBalance
- **Purpose:** Define and track leave entitlements
- **LeavePolicy:** organizationId, name, annualQuota, carryForward
- **LeaveBalance:** employeeId, leavePolicyId, balance
- **Constraints:** Unique (employeeId, leavePolicyId)

#### LeaveRequest
- **Purpose:** Track leave applications
- **Key Fields:** employeeId, leavePolicyId, startDate, endDate, reason, status (PENDING/APPROVED/REJECTED), approvedBy

#### SalaryStructure & Payslip
- **Purpose:** Define and generate salary
- **SalaryComponent:** organizationId, name, type, isPercentage, value
- **SalaryStructure:** employeeId, componentId (junction for structure)
- **Payslip:** employeeId, month, year, grossSalary, netSalary

#### PerformanceReview
- **Purpose:** Track employee performance
- **Key Fields:** employeeId, reviewerId, rating, comments, reviewDate

---

### Inventory & Warehouse Module

#### Product
- **Purpose:** Master product catalog
- **Key Fields:** organizationId, name, sku (unique per org), hsnCode, description, unitPrice, costPrice, taxRate, isActive
- **Relationships:**
  - `1:N` with `StockItem`, `StockMovement`
  - `1:N` with `PurchaseItem`, `ProductListing`

#### Warehouse
- **Purpose:** Physical storage locations
- **Key Fields:** organizationId, name, location, latitude, longitude
- **Relationships:**
  - `1:N` with `StockItem`, `StockMovement`, `GatePass`

#### StockItem
- **Purpose:** Product inventory at warehouse level
- **Key Fields:** productId, warehouseId, quantity
- **Constraints:** Unique (productId, warehouseId)
- **Update Strategy:** Incremented/decremented by StockMovement

#### StockMovement
- **Purpose:** Audit log of inventory transactions
- **Key Fields:** organizationId, productId, warehouseId, type (PURCHASE/SALE/ADJUSTMENT/TRANSFER), quantity, referenceId, notes
- **Relationships:** Linked to Product, Warehouse
- **Use Case:** Full traceability of stock changes

#### GatePass & GatePassItem
- **Purpose:** Manage inbound/outbound warehouse transfers
- **GatePass:** organizationId, passNumber (unique per org), type (INWARD/OUTWARD), status, vehicleNumber, driverName, warehouseId
- **GatePassItem:** gatePassId, productId, quantity
- **Status Workflow:** OPEN → CLOSED / CANCELLED

#### PurchaseOrder & PurchaseItem
- **Purpose:** Track vendor purchases
- **PurchaseOrder:** organizationId, vendorId, status (DRAFT/APPROVED/RECEIVED), totalAmount
- **PurchaseItem:** purchaseId, productId, quantity, unitPrice, gstRate, cgst/sgst/igstAmount
- **GST Breakdown:** Separate CGST, SGST, IGST calculation

---

### Accounting & Finance Module

#### LedgerAccount
- **Purpose:** Chart of accounts
- **Key Fields:** organizationId, name, type (ASSET/LIABILITY/EQUITY/INCOME/EXPENSE), code, parentId (hierarchy)
- **Constraints:** Unique (organizationId, code)
- **Relationships:** Self-referential tree structure for account hierarchy

#### Transaction
- **Purpose:** Core accounting transaction
- **Key Fields:** organizationId, type (SALE/PURCHASE/EXPENSE/PAYMENT/REFUND), referenceNumber, contactId, totalAmount, status (DRAFT/POSTED/PAID), transactionDate, reversalOfId
- **Relationships:**
  - `1:N` with `JournalEntry`
  - `1:N` with `PaymentAllocation`
  - Self-referential for reversals

#### JournalEntry
- **Purpose:** Double-entry bookkeeping records
- **Key Fields:** transactionId, ledgerAccountId, debit, credit
- **Constraint:** Debit XOR Credit (only one can be non-null)
- **Invariant:** Sum of debits = Sum of credits per transaction

#### GSTConfig
- **Purpose:** GST registration details per organization
- **Key Fields:** organizationId (unique), gstNumber, legalName, tradeName, stateCode, isComposition
- **Use Case:** Determine GST applicability and rates

#### AccountingPeriod
- **Purpose:** Lock financial periods for closure
- **Key Fields:** organizationId, name, startDate, endDate, isLocked, lockedAt
- **Use Case:** Prevent editing of closed periods

---

### D2C eCommerce Module

#### Store
- **Purpose:** Customer-facing storefront
- **Key Fields:** organizationId, ownerUserId, name, domain (unique), description, isActive
- **Payment Fields:** paymentDisplayName, paymentUpiId, paymentBankAccountName, paymentBankAccountNo, paymentBankIfsc
- **Relationships:**
  - `1:N` with `Category`, `ProductListing`, `Cart`, `Order`
  - `N:N` with `User` (StoreMember)

#### StoreMember
- **Purpose:** User access control for store
- **Key Fields:** storeId, userId, role (OWNER/MANAGER/STAFF/VIEWER), isActive
- **Constraints:** Unique (storeId, userId)

#### Category
- **Purpose:** Hierarchical product categories
- **Key Fields:** storeId, name, description, image, parentId
- **Relationships:** Self-referential tree (parentId points to Category)
- **Constraints:** Unique (storeId, name, parentId)

#### ProductListing
- **Purpose:** Store-specific product variant
- **Key Fields:** storeId, productId, categoryId, sellingPrice, description, isActive
- **SEO Fields:** seoTitle, seoDescription, images[]
- **Constraints:** Unique (storeId, productId)

#### Cart & CartItem
- **Purpose:** Shopping cart management
- **Cart:** storeId, customerId, createdAt, updatedAt
- **CartItem:** cartId, productListingId, quantity
- **Constraints:** Unique (storeId, customerId)
- **TTL Strategy:** Auto-expire carts after 7 days

#### Order & OrderItem
- **Purpose:** Complete order lifecycle
- **Order:** organizationId, storeId, customerId, status, paymentStatus, totalAmount
- **Payment:** razorpayOrderId, razorpayPaymentId
- **Fulfillment:** packedAt, shippedAt, deliveredAt, trackingNumber, courierPartner
- **Return:** isRefunded
- **OrderItem:** orderId, productListingId, quantity, unitPrice

#### ReturnRequest & ReturnItem
- **Purpose:** Handle product returns and refunds
- **ReturnRequest:** orderId, status (REQUESTED/INSPECTED/APPROVED/REJECTED/REFUNDED), reason, refundAmount, gatewayRefundId
- **ReturnItem:** returnRequestId, orderItemId, quantity
- **Workflow:** REQUESTED → INSPECTED → APPROVED/REJECTED → REFUNDED

---

### Invoice & GST Module

#### Invoice
- **Purpose:** Tax invoice generation
- **Key Fields:** organizationId, invoiceNumber (unique per org), orderId, posOrderId, customerId, placeOfSupply
- **GST Breakdown:** subtotal, cgstAmount, sgstAmount, igstAmount, totalAmount
- **Status:** ISSUED, CANCELLED
- **Relationships:**
  - `1:N` with `InvoiceItem`
  - `1:N` with `EWayBill`
  - `1:N` with `PaymentAllocation`

#### InvoiceItem
- **Purpose:** Line items on invoice
- **Key Fields:** invoiceId, productId, quantity, price, gstRate
- **GST Rates:** cgstRate, sgstRate, igstRate (separate tracking)
- **Amounts:** cgstAmount, sgstAmount, igstAmount (calculated)

#### EWayBill
- **Purpose:** Electronic way bill for interstate transport
- **Key Fields:** organizationId, invoiceId, transporterName, transporterGSTIN, vehicleNumber, transportMode (ROAD/RAIL/AIR/SHIP), distance
- **Status:** GENERATED, CANCELLED
- **Validity:** Based on distance (15 days to 1 month)

#### PaymentAllocation
- **Purpose:** Map invoice payment to transaction
- **Key Fields:** organizationId, transactionId, invoiceId, amount, allocatedAt
- **Use Case:** Track partial payments and matching

---

### Point of Sale (POS) Module

#### POSTerminal
- **Purpose:** Physical checkout device
- **Key Fields:** organizationId, name, location, isActive

#### POSSession
- **Purpose:** Daily cash register session
- **Key Fields:** terminalId, openedBy, openedAt, closedAt, openingCash, closingCash
- **Relationships:** `1:N` with `POSOrder`

#### POSOrder
- **Purpose:** Point-of-sale transaction
- **Key Fields:** organizationId, sessionId, customerId, totalAmount, paymentMethod, status
- **Relationships:**
  - `N:1` with `POSSession`, `Contact`
  - `1:N` with `POSOrderItem`
  - `1:1` with `Invoice`

#### POSOrderItem
- **Purpose:** Items sold in POS transaction
- **Key Fields:** orderId, productId, quantity, price

---

## Entity Relationship Diagram

### Core Hierarchy
```
Organization (root tenant)
├── User + OrganizationUser + Role (access control)
├── Subscription + Plan + Module (billing & features)
├── Contact (customer/vendor/partner)
├── Product (master catalog)
├── Employee + Shift + Attendance (HR)
├── LedgerAccount + Transaction + JournalEntry (accounting)
├── Store + Order (eCommerce)
└── Invoice + EWayBill (compliance)
```

### Multi-tenant Data Isolation
- **Every table** has `organizationId` field
- **Indexed on organizationId** for query performance
- **Foreign key constraint** prevents cross-org data access
- **Row-level security** enforced at application layer

---

## Data Flow

### Subscription to Module Activation
1. Organization creates Subscription (planId)
2. Plan references multiple PlanModule entries
3. Application enables corresponding OrganizationModule records
4. User access to module determined by role + enabled status

### Order to Invoice to Payment
1. Customer creates Order with OrderItems
2. Order status transitions: PENDING → PAID (payment captured)
3. Invoice generated linking to Order
4. InvoiceItems created from OrderItems (with GST calculation)
5. EWayBill generated if interstate
6. PaymentAllocation matches Payment to Invoice

### Stock Movement Audit
1. PurchaseOrder created with PurchaseItems
2. On receipt, StockMovement record created (type=PURCHASE)
3. StockItem quantity updated
4. GatePass tracks physical transfer
5. Full traceability: Product → Warehouse → Quantity change

### HRM Attendance to Payroll
1. EmployeeShift defines working schedule
2. Daily Attendance record created (checkIn/checkOut)
3. LeaveRequest reduces LeaveBalance
4. SalaryStructure + Payslip generated (monthly)
5. Data flows: Employee → Shift → Attendance → Payslip → Payment

---

## Indexing Strategy

### Critical Indexes (created)
```sql
-- Multi-tenant isolation
Organization.id (PRIMARY)
User.organizationId (FOREIGN KEY)
Contact.organizationId
Product.organizationId
Employee.organizationId
Order.organizationId

-- High-query-volume tables
Transaction.organizationId, transactionDate
Invoice.organizationId, issuedAt
Order.organizationId, customerId, status
Attendance.employeeId, date
StockMovement.organizationId, productId, warehouseId

-- Junction/linking tables
OrganizationUser(organizationId, userId) UNIQUE
ProjectMember(projectId, userId) UNIQUE
StoreMember(storeId, userId) UNIQUE
```

### Query Optimization Tips
1. Always filter by `organizationId` first
2. Use composite indexes on (organizationId, foreignKey)
3. Partition large tables by organizationId (future)
4. Archive old transactions/invoices to separate schemas
5. Denormalize high-cardinality fields (totalAmount, qty) for reporting

### Performance Considerations
- **Transaction Volume:** 10M+ rows in Production
- **Query Complexity:** Mostly O(1) lookups; O(n) for reporting
- **Caching:** Redis for frequently accessed data (LedgerAccount hierarchy, Plans)
- **Batch Processing:** Monthly reconciliation jobs run async
- **Archival:** Transactions >2 years moved to cold storage

---

## Constraints & Validations

### Data Integrity Rules
1. **Subscription Status Transitions:** Only valid state transitions enforced
2. **GST Calculations:** CGST + SGST = IGST must hold (for non-interstate)
3. **Attendance Uniqueness:** One record per (employeeId, date)
4. **Stock Reconciliation:** StockItem.quantity ≥ 0 (no negative stock)
5. **Leave Balance:** Cannot go negative
6. **Invoice Uniqueness:** invoiceNumber unique per organization

### Referential Integrity
- `onDelete: Cascade` for transactional data (Orders, Invoices)
- `onDelete: Restrict` for master data (Plans, Modules)
- `onDelete: SetNull` for optional relationships (Category.parentId)

---

## Future Enhancements

1. **Database Partitioning:** By organizationId and date range
2. **Read Replicas:** For reporting and analytics
3. **Time-Series Tables:** Separate tables for audit logs (time-bucketed)
4. **Change Data Capture (CDC):** For real-time synchronization
5. **Full-Text Search:** For contacts, products, invoices
6. **Graph DB Integration:** For organizational hierarchy (future extension)

---

## Backup & Disaster Recovery

- **RPO (Recovery Point Objective):** Hourly
- **RTO (Recovery Time Objective):** 4 hours
- **Backup Strategy:** Daily full + hourly incremental
- **Storage:** Multi-region redundancy (AWS S3)
- **Test Frequency:** Monthly restore tests

---

## Compliance & Audit

- **GDPR:** organizationId-based data isolation
- **India GST:** compliant Invoice + EWayBill generation
- **PII Protection:** Encrypted storage for SSN, bank details
- **Audit Trail:** DealStageHistory, StockMovement, LeaveRequest history
- **Data Retention:** 7-year retention for financial records

---

**End of Document**

Generated: 2026-06-17 | Database Type: PostgreSQL | ORM: Prisma v5+
