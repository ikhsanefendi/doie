# DOIEHub - Application Promotion System

A comprehensive system for managing and promoting applications with subscription management, amount system, and admin controls.

## Features

### User Features

- **Marketplace**: Browse and subscribe to available applications
- **Amount System**: Purchase amount or request from admins. Users can view a tutorial for bank transfer and upload proof of payment when requesting amount.
- **Active Subscriptions**: View and manage active subscriptions
- **Direct Access**: Direct links to subscribed applications
- **Account Management**: Manage profile and amount balance (includes pending/available balances when subscriptions are requested)
- **Amount system**: Amount can be granted, requested, or spent; temporary pending reductions are shown separately from permanent balance

### Database migrations

If you upgrade from an earlier version you must apply a couple of schema changes manually before running the app:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_amount_balance INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- seed default audit retention value if needed
INSERT INTO settings (key, value)
VALUES ('audit_retention_days','30')
ON CONFLICT (key) DO NOTHING;
```

Older installations lacking the `settings` table will see harmless errors during audit cleanup or when fetching permissions; the code now handles these cases gracefully. Running the above SQL (e.g. via psql or your migration tool) will bring your database up to date.

- **Transaction History**: Track all transactions

### Admin Features

- **Application Management**: Create, edit, and manage applications
- **User Management**: View users, grant amount, manage permissions
- **Transaction Approval**: Approve or reject amount purchase requests
- **Dashboard**: Real-time statistics and analytics
- **Role Management**: Create custom roles with dynamic permissions (SuperAdmin only)
- **Audit Logs**: Track all admin actions (create/update/delete application, amount grants, transactions, user logins, etc.)
  - retention can be configured via admin settings (`/dashboard/settings/audit`).
  - old entries are automatically purged based on the `audit_retention_days` setting.

### System Features

- **Dynamic Roles**: Create and manage custom roles with granular permissions
- **Subscription Expiry**: Automatic expiration management
- **Manual Payment Verification**: Admin manual approval of transactions
- **Session Management**: Secure JWT-based authentication
- **PostgreSQL Database**: Robust data persistence with Neon

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT with bcrypt password hashing
- **ORM**: Drizzle ORM
- **UI Components**: shadcn/ui with Radix UI
- **State Management**: React Context API

## Prerequisites

- Node.js 18+ (with pnpm package manager)
- PostgreSQL database (via Neon)
- npm or pnpm

## Installation & Setup

### 1. Clone and Install

```bash
# Install dependencies
pnpm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your credentials:

- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `JWT_SECRET`: A strong random secret for JWT signing

### 3. Database Setup

The database schema is defined in `scripts/01-init-schema.sql`. A helper script
is provided so you do not need the `psql` command (especially useful on Windows).

```bash
# apply/update schema using Node (reads DATABASE_URL)
npm run db:init
```

To seed the superadmin account after the schema is ready:

```bash
npm run db:seed
```

### 4. Initialize Superadmin

The superadmin account needs to be created:

**Email**: `ikhsane@doiehub.local`  
**Password**: `Sidoarjo1!`

This is the only hardcoded account for system bootstrap. Change the password immediately in production.

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Flows

### User Registration & Login

1. Visit `/login` or `/register`
2. Create account or login
3. Redirected to dashboard

### User Marketplace Subscription

1. Go to Marketplace
2. Browse available applications
3. Click "Subscribe" if you have enough amount
4. Subscription is active for the specified number of days
5. Click "Go to Application" to access the app

### Request Amount

1. Go to Account Settings
2. Enter number of amount to request
3. Submit request (requires admin approval)

### Admin Application Management

1. Login as admin/superadmin
2. Go to Applications
3. Create new application with:
   - Name, Description
   - Price (in amount)
   - Application URL
   - Subscription duration (days)

### Admin Transaction Approval

1. Go to Transactions
2. View pending transactions
3. Click Approve to add amount to user balance
4. Click Reject to decline the request

### Admin User Management

1. Go to Users
2. View all user accounts
3. Grant amount directly to users
4. View user details and balances

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Applications (Public)

- `GET /api/applications` - List active applications
- `GET /api/admin/applications` - Admin: List all applications
- `POST /api/admin/applications` - Admin: Create application
- `PUT /api/admin/applications/[id]` - Admin: Update application
- `DELETE /api/admin/applications/[id]` - Admin: Delete application

### Subscriptions

- `GET /api/subscriptions` - Get user subscriptions
- `POST /api/subscriptions/create` - Subscribe to application

### Users

- `GET /api/admin/users` - Admin: List all users (response now includes `roleId` and `roleName`)
- `POST /api/admin/users/[id]/grant-amount` - Admin: Grant amount
- `PUT /api/admin/users/[id]/role` - SuperAdmin: Change a user's role, JSON body `{ "roleId": "..." }`

### Transactions

- `GET /api/admin/transactions` - Admin: List transactions (optionally filter by user: `?userId=<id>`)

- `POST /api/admin/transactions/[id]/approve` - Admin: Approve transaction (id may also be supplied in JSON body: `{ "id": "..." }`)
- `POST /api/admin/transactions/[id]/reject` - Admin: Reject transaction (id may also be supplied in JSON body)
- `GET /api/admin/audit-logs?action=approve_transaction` - Admin: Get balance mutation log report

### Amount

- `POST /api/amount/request` - User: Request amount

### Dashboard

- `GET /api/admin/dashboard/stats` - Admin: Dashboard statistics

### Roles

- `GET /api/admin/roles` - SuperAdmin: List roles
- `POST /api/admin/roles` - SuperAdmin: Create role

### Menu Items

- `GET /api/admin/menu-items` - SuperAdmin: List all sidebar/menu items with associated role ids
- `POST /api/admin/menu-items` - SuperAdmin: Create a new menu item
- `PUT /api/admin/menu-items/[id]` - SuperAdmin: Update menu item properties
- `DELETE /api/admin/menu-items/[id]` - SuperAdmin: Remove menu item
- `PUT /api/admin/menu-items/[id]/roles` - SuperAdmin: Assign roles to a menu item (body `{ "roleIds": [...] }`)

A public endpoint provides the current user’s menu:

- `GET /api/menu` - returns menu items filtered by logged-in user’s role

## Default Credentials

### Superadmin Account

- **Email**: `ikhsane@doiehub.local`
- **Password**: `Sidoarjo1!`
- **Role**: SuperAdmin (cannot be deleted)
- **Initial Amount**: 1000

This account has full system access and can manage all features.

## Project Structure

```
.
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── api/
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── applications/
│   │   ├── subscriptions/
│   │   ├── vouchers/
│   │   └── users/
│   ├── dashboard/
│   │   ├── applications/
│   │   ├── marketplace/
│   │   ├── transactions/
│   │   ├── users/
│   │   └── settings/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   └── dashboard/
├── hooks/
│   └── use-auth.tsx
├── lib/
│   ├── db.ts
│   ├── schema.ts
│   ├── auth.ts
│   ├── permissions.ts
│   └── jwt.ts
└── scripts/
    └── 01-init-schema.sql
```

## Database Schema

### Tables

- **users**: User accounts with amount balance
- **roles**: Dynamic role definitions
- **permissions**: Permission definitions
- **role_permissions**: Role-permission mapping
- **applications**: Applications available for subscription
- **subscriptions**: Active user subscriptions
- **transactions**: Amount purchases and approvals
- **amount**: Amount records linked to transactions
- **audit_logs**: System action audit trail

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `JWT_SECRET`
4. Deploy

The application automatically runs database migrations on first deployment.

## Security Considerations

1. **Passwords**: Hashed using bcrypt with 10 salt rounds
2. **Sessions**: JWT tokens with 7-day expiry, stored in httpOnly cookies
3. **Permissions**: Row-level access control based on roles
4. **API Routes**: Permission checks on all protected endpoints
5. **Input Validation**: All user inputs validated before processing

## Future Enhancements

- Email notifications for transaction approvals
- Payment gateway integration (Stripe/Midtrans)
- Subscription renewal reminders
- Analytics and reporting
- API rate limiting
- Two-factor authentication
- Admin audit logs dashboard
- Application reviews and ratings

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` in `.env.local`
- Check Neon project credentials
- Ensure IP whitelist includes your dev environment

### JWT Errors

- Verify `JWT_SECRET` is set and consistent
- Check token expiry (7 days)
- Clear browser cookies and try again

### Permission Denied

- Check user role and assigned permissions
- Verify user is part of correct role
- Check role_permissions table for correct mappings

## Support

For issues or questions, contact the development team.

## License

Proprietary - DOIEHub Application Promotion System
