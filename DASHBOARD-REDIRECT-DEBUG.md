# Dashboard Redirect to Login - Debug & Fix

## Problem
User di `/dashboard` lalu balik lagi ke `/login` - middleware menganggap token tidak valid.

## Root Cause Analysis
Middleware terlalu strict dan menghapus cookie saat token validation gagal, tanpa memberikan informasi yang jelas tentang kenapa token tidak valid.

## Debugging Steps

### Step 1: Check Token Debug Analysis
```bash
# Test token analysis
GET /api/debug/token

# Expected response for valid token:
{
  "success": true,
  "message": "Token is valid",
  "debug": {
    "hasToken": true,
    "tokenLength": 1234,
    "tokenPreview": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "partsCount": 3,
    "header": {
      "alg": "RS256",
      "typ": "JWT",
      "kid": "key-id"
    },
    "payload": {
      "userId": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "roleId": "role-id",
      "exp": 1711555200,
      "expiresAt": "2024-03-27T15:00:00.000Z",
      "isExpired": false,
      "hasUserId": true,
      "currentTime": "2024-03-27T14:00:00.000Z"
    },
    "validation": {
      "formatValid": true,
      "notExpired": true,
      "hasUserId": true,
      "valid": true
    }
  }
}

# Expected response for invalid token:
{
  "success": false,
  "error": "Token validation failed",
  "debug": {
    "hasToken": true,
    "validation": {
      "formatValid": false,
      "notExpired": false,
      "hasUserId": false,
      "valid": false
    }
  }
}
```

### Step 2: Check Middleware Console Logs
```bash
# Buka browser console
# Navigate ke /dashboard
# Lihat middleware logs:

# ✅ Valid token:
=== MIDDLEWARE DEBUG ===
Request URL: http://localhost:3000/dashboard
Session Token exists: true
Token length: 1234
Token preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
🔍 TOKEN VALIDATION
Token payload: { userId: "123", email: "user@example.com", ... }
✅ Token validation passed
====================

# ❌ Invalid token:
=== MIDDLEWARE DEBUG ===
Request URL: http://localhost:3000/dashboard
Session Token exists: true
Token length: 1234
Token preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
🔍 TOKEN VALIDATION
Token payload: { userId: "123", email: "user@example.com", ... }
❌ Token expired - exp: 1711555200 current: 1711558800
❌ Request URL: http://localhost:3000/dashboard
❌ Session exists: true
🔄 Redirecting to login with error info
====================
```

### Step 3: Check Login Page Error Display
```bash
# Setelah redirect ke login, URL akan:
# http://localhost:3000/login?error=token_validation_failed&message=Token%20expired

# Login page akan menampilkan error:
"Token validation failed. Please try logging in again."
```

## Common Issues & Solutions

### Issue 1: Token Expired
**Console Logs:**
```
❌ Token expired - exp: 1711555200 current: 1711558800
```

**Solution:**
```bash
# 1. Clear browser cookies
document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

# 2. Login lagi
# 3. Check token expiration di /api/debug/token
```

### Issue 2: Invalid Token Format
**Console Logs:**
```
❌ Invalid token format - parts count: 2
Token preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Solution:**
```bash
# 1. Check token format harus 3 parts dengan . separator
# 2. Clear cookies dan login lagi
# 3. Pastikan JWT signing benar
```

### Issue 3: Missing User ID
**Console Logs:**
```
❌ Token missing userId/sub field
```

**Solution:**
```bash
# 1. Check token creation di auth.ts
# 2. Pastikan createSession mengirim userId
# 3. Verify token payload di /api/debug/token
```

### Issue 4: Google OAuth Token Issues
**Console Logs:**
```
🔍 GOOGLE TOKEN DETECTED
✅ Issuer check: true
✅ Audience check: false  # ← Problem
❌ Google token expired!
```

**Solution:**
```bash
# 1. Check NEXT_PUBLIC_GOOGLE_CLIENT_ID
# 2. Verify Google Console redirect URI
# 3. Check token audience vs client ID
```

## Fixed Implementation

### ✅ Middleware Improvements
```typescript
// Don't delete cookie, just redirect for debugging
if (request.nextUrl.pathname.startsWith("/api")) {
  return NextResponse.json({ 
    error: "Unauthorized", 
    message: error?.message || "Token validation failed",
    debug: {
      hasToken: !!sessionToken,
      tokenLength: sessionToken?.length || 0,
      error: error?.message || "Unknown error"
    }
  }, { status: 401 });
}

// For non-API routes, redirect to login with error info
const loginUrl = new URL("/login", request.url);
loginUrl.searchParams.set("error", "token_validation_failed");
loginUrl.searchParams.set("message", error?.message || "Token validation failed");

return NextResponse.redirect(loginUrl);
```

### ✅ Login Page Error Display
```typescript
const errorMap: Record<string, string> = {
  // ... existing errors
  token_validation_failed: message || "Token validation failed. Please try logging in again.",
};
```

### ✅ Token Debug Analysis
```typescript
// /api/debug/token
// Provides detailed token analysis:
// - Token format validation
// - Expiration check
// - User ID presence
// - Payload structure
// - Validation status
```

## Testing Checklist

### ✅ Before Fix
- [ ] User login → Get token
- [ ] Navigate to /dashboard → Redirect to login
- [ ] No clear error message
- [ ] Cookie deleted automatically
- [ ] Hard to debug root cause

### ✅ After Fix
- [ ] User login → Get token
- [ ] Navigate to /dashboard → Should work
- [ ] If fails → Clear error message
- [ ] Cookie preserved for debugging
- [ ] Detailed debug information

## Quick Debug Commands

### Browser Console
```javascript
// Check current token
const token = document.cookie.match(/session=([^;]+)/)?.[1];
console.log('Token:', token);

// Check token structure
if (token) {
  const parts = token.split('.');
  console.log('Parts count:', parts.length);
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log('Payload:', payload);
    console.log('Expires:', payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A');
    console.log('Expired:', payload.exp ? payload.exp < Math.floor(Date.now() / 1000) : 'N/A');
  }
}

// Test token debug API
fetch('/api/debug/token')
  .then(r => r.json())
  .then(console.log);
```

### Server Logs
```bash
# Look for middleware logs
tail -f logs/middleware.log

# Look for OAuth logs
tail -f logs/oauth.log
```

## Expected Behavior After Fix

### ✅ Successful Flow
```
1. User login → Get valid token
2. Navigate to /dashboard → Middleware validates token
3. Console: "✅ Token validation passed"
4. Dashboard loads → User authenticated
5. API calls work → Return user data
```

### ✅ Failed Flow (with debugging)
```
1. User login → Get invalid/expired token
2. Navigate to /dashboard → Middleware validates token
3. Console: "❌ Token validation failed: Token expired"
4. Redirect to login → URL: /login?error=token_validation_failed&message=Token%20expired
5. Login page → Shows "Token validation failed. Please try logging in again."
6. Debug API → /api/debug/token shows detailed token info
```

## 🎯 **DEBUGGING COMPLETE!**

**Sekarang Anda memiliki debugging lengkap untuk dashboard redirect issue!** 🚀

- **Middleware tidak menghapus cookie** → Preserve untuk debugging
- **Clear error messages** → User tahu kenapa gagal
- **Detailed console logs** → Lihat exactly kenapa token invalid
- **Token debug API** → `/api/debug/token` untuk analysis
- **Login page error display** → Show specific error messages

**Silakan test dashboard access dengan debugging ini!** ✨
