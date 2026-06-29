# Authentication Debugging - Fix "Not authenticated" Error

## Problem
User masih mendapatkan error "Not authenticated" setelah login, dan console menunjukkan "IIIIIIIIIEEEEEEEEEEE Is Google token: false"

## Root Cause
Token yang diterima bukan dari Google OAuth, tapi dari login biasa (email/password). Middleware perlu handle kedua jenis token.

## Debugging Steps

### Step 1: Check Console Logs
Setelah login, lihat console browser untuk logs berikut:

```
=== MIDDLEWARE DEBUG ===
Request URL: https://yourdomain.com/dashboard/marketplace
Session Token exists: true
Token length: 1234
Token preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM...
IIIIIIIIIEEEEEEEEEEE Is Google token: false
Token Info: {
  issuer: undefined,  // ← Ini masalahnya
  audience: undefined,
  expires: 1711555200,
  expired: false,
  isGoogle: false
}
🔍 REGULAR JWT TOKEN DETECTED
Issuer: undefined
Audience: undefined
Expired: false
🔍 TOKEN VALIDATION
Token payload: { userId: "123", email: "user@example.com", ... }
Token expires: 2024-03-27T15:00:00.000Z
Current time: 2024-03-27T14:00:00.000Z
Is expired: false
✅ Token validation passed
```

### Step 2: Identify Token Type

#### Jika Google Token:
```
IIIIIIIIIEEEEEEEEEEE Is Google token: true
🔍 GOOGLE TOKEN DETECTED
✅ Issuer check: true
✅ Audience check: true
✅ Expiration check: true
```

#### Jika Regular JWT Token:
```
IIIIIIIIIEEEEEEEEEEE Is Google token: false
🔍 REGULAR JWT TOKEN DETECTED
Issuer: undefined
Audience: undefined
Expired: false
```

### Step 3: Fix Authentication Flow

#### Check Token Structure
Lihat console logs untuk "Token payload" dan pastikan:
- Token memiliki `userId` atau `sub`
- Token memiliki `email`
- Token tidak expired

#### Check Login Method
Pastikan user login dengan method yang benar:
- **Google OAuth** → Token dari Google
- **Email/Password** → Token dari sistem sendiri

### Step 4: Verify Token Creation

#### Check Login API
```bash
# Test login API
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# Expected response:
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name"
  }
}

# Check if session cookie is set
document.cookie
# Should contain: "session=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Check Google OAuth
```bash
# Test Google OAuth
GET /api/auth/google
# Redirect to Google OAuth
# After authorization, redirect back with token
```

### Step 5: Middleware Validation

#### Expected Console Output for Valid Token
```
🔍 TOKEN VALIDATION
Token payload: { userId: "123", email: "user@example.com", name: "User Name" }
Token expires: 2024-03-27T15:00:00.000Z
Current time: 2024-03-27T14:00:00.000Z
Is expired: false
✅ Token validation passed
```

#### Expected Console Output for Invalid Token
```
❌ Token validation failed: Token expired
# OR
❌ Token validation failed: Invalid token format
# OR
❌ Token validation failed: Token not found
```

## Troubleshooting

### Problem: Token exists but still "Not authenticated"

#### Check 1: Token Format
```javascript
// Di browser console
const token = document.cookie.match(/session=([^;]+)/)?.[1];
if (token) {
  const parts = token.split('.');
  console.log('Token parts:', parts.length);
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log('Token payload:', payload);
  }
}
```

#### Check 2: Token Expiration
```javascript
// Di browser console
const token = document.cookie.match(/session=([^;]+)/)?.[1];
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  const now = Math.floor(Date.now() / 1000);
  console.log('Token expires:', payload.exp);
  console.log('Current time:', now);
  console.log('Is expired:', payload.exp < now);
}
```

#### Check 3: API Response
```javascript
// Test /api/auth/me
fetch('/api/auth/me')
  .then(r => r.json())
  .then(data => {
    console.log('Auth response:', data);
    // Should return user data, not "Not authenticated"
  })
  .catch(error => {
    console.error('Auth error:', error);
  });
```

### Problem: Google OAuth not working

#### Check Environment Variables
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
```

#### Check Google Console
1. Pastikan Google Client ID benar
2. Pastikan redirect URL benar
3. Pastikan OAuth 2.0 enabled
4. Pastikan API keys valid

### Problem: Regular login not working

#### Check Database
```sql
-- Check user exists
SELECT * FROM users WHERE email = 'user@example.com';

-- Check password hash
SELECT password FROM users WHERE email = 'user@example.com';
```

#### Check JWT Secret
```env
JWT_SECRET=your-jwt-secret-key
# Should be at least 32 characters
```

## Expected Behavior After Fix

### Successful Authentication Flow
```
1. User login → Get JWT token
2. Middleware debug → Show token info
3. Token validation → ✅ Token validation passed
4. User can access protected routes → 200 OK
5. API calls work → Return user data
```

### Console Logs Should Show
```
=== MIDDLEWARE DEBUG ===
Session Token exists: true
IIIIIIIIIEEEEEEEEEEE Is Google token: false/true
🔍 REGULAR JWT TOKEN DETECTED / 🔍 GOOGLE TOKEN DETECTED
🔍 TOKEN VALIDATION
Token payload: { userId: "123", email: "user@example.com", ... }
✅ Token validation passed
```

## 🎯 **DEBUGGING COMPLETE!**

**Sekarang middleware akan menunjukkan debugging lengkap untuk kedua jenis token!** 🚀

- **Google tokens** → Deteksi dan validasi OAuth
- **Regular JWT tokens** → Deteksi dan validasi sistem
- **Console logs** → Lihat semua token info
- **Validation checks** → Pastikan token valid
- **Error handling** → Clear error messages

**Silakan login lagi dan lihat console logs untuk debugging!** ✨
