-- DOIEHub Database Schema
-- Initialize all tables for the promotion system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES table (for dynamic roles) - Create FIRST for foreign key references
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- System roles (SuperAdmin, Admin, User) cannot be deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USERS table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id),
  amount_balance INT DEFAULT 0,
  pending_amount_balance INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PERMISSIONS table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ROLE_PERMISSIONS junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- MENU_ITEMS table (for sidebar/menu configuration)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(255) NOT NULL UNIQUE,
  href VARCHAR(500) NOT NULL,
  icon VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ensure unique index on label exists for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_label ON menu_items(label);

-- ROLE_MENU_ITEMS junction table
CREATE TABLE IF NOT EXISTS role_menu_items (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, menu_item_id)
);

-- APPLICATIONS table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INT NOT NULL, -- in amount/points
  url VARCHAR(500) NOT NULL,
  subscription_days INT NOT NULL, -- e.g., 30 days
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SUBSCRIPTIONS table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS table - Create BEFORE vouchers for foreign key reference
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50), -- 'buy_amount', 'subscribe_app'
  amount INT NOT NULL, -- amount
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  description TEXT,
  payment_proof_url VARCHAR(500),
  balance_before INT DEFAULT 0, -- user's balance before the transaction
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VOUCHERS table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  transaction_id UUID REFERENCES transactions(id),
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expired_at TIMESTAMP
);

-- AUDIT_LOGS table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_application_id ON subscriptions(application_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_is_active ON applications(is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- System roles
INSERT INTO roles (id, name, description, is_system) VALUES
  (uuid_generate_v4(), 'SuperAdmin', 'Super Administrator - Full access', TRUE),
  (uuid_generate_v4(), 'Admin', 'Administrator - Can manage most features', TRUE),
  (uuid_generate_v4(), 'User', 'Regular User - Can browse and subscribe', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Default settings
INSERT INTO settings (key, value)
VALUES ('audit_retention_days', '30')
ON CONFLICT (key) DO NOTHING;

-- System permissions
INSERT INTO permissions (name, description) VALUES
  ('manage_users', 'Can manage user accounts'),
  ('manage_roles', 'Can manage roles and permissions'),
  ('manage_applications', 'Can manage applications'),
  ('manage_transactions', 'Can approve/reject transactions'),
  ('manage_admins', 'Can manage admin accounts'),
  ('view_audit_logs', 'Can view audit logs'),
  ('manage_amount', 'Can grant/revoke amount to users'),
  ('view_dashboard', 'Can view dashboard')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to SuperAdmin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SuperAdmin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign limited permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Admin' AND p.name IN (
  'manage_users', 'manage_applications', 'manage_transactions', 
  'manage_amount', 'view_dashboard', 'view_audit_logs'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign minimal permissions to User role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'User' AND p.name IN ('view_dashboard')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Default menu items
INSERT INTO menu_items (id, label, href, icon) VALUES
  (uuid_generate_v4(), 'Dashboard', '/dashboard', 'LayoutDashboard'),
  (uuid_generate_v4(), 'Marketplace', '/dashboard/marketplace', 'Package'),
  (uuid_generate_v4(), 'Applications', '/dashboard/applications', 'Package'),
  (uuid_generate_v4(), 'Users', '/dashboard/users', 'Users'),
  (uuid_generate_v4(), 'Transactions', '/dashboard/transactions', 'CreditCard'),
  (uuid_generate_v4(), 'Account Settings', '/dashboard/settings/user', 'Settings'),
  (uuid_generate_v4(), 'Roles & Permissions', '/dashboard/settings/roles', 'Settings')
ON CONFLICT (label) DO NOTHING;

-- Link default menu items to roles
-- SuperAdmin gets everything, Admin gets all except roles page maybe
INSERT INTO role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r, menu_items m
WHERE r.name = 'SuperAdmin'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

INSERT INTO role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r, menu_items m
WHERE r.name = 'Admin' AND m.label != 'Roles & Permissions'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

INSERT INTO role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id FROM roles r, menu_items m
WHERE r.name = 'User' AND m.label IN ('Dashboard', 'Marketplace', 'Account Settings')
ON CONFLICT (role_id, menu_item_id) DO NOTHING;
