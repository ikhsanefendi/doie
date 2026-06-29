# Token Missing User Identifier - Fix & Debug

## Problem
Error "Token missing user identifier" - JWT token tidak memiliki field `userId` atau `sub`.

## Root Cause
`createSession` function mengharapkan `user.id` tapi dipanggil dengan `user.userId` field, causing mismatch.

## Fixed Implementation

### ✅ Fixed createSession Calls

#### Google OAuth Callback (`/api/auth/google/callback/route.ts`)
```typescript
// BEFORE (WRONG):
const token = await createSession({
  userId: foundUser.id,  // ❌ Wrong field name
  email: foundUser.email,
  name: foundUser.name,
  roleId: foundUser.roleId || "",
});

// AFTER (CORRECT):
const token = await createSession({
  id: foundUser.id,      // ✅ Correct field name
  email: foundUser.email,
  name: foundUser.name,
  roleId: foundUser.roleId || "",
});
```

#### Login API (`/api/auth/login/route.ts`)
```typescript
// BEFORE (WRONG):
const token = await createSession({
  userId: foundUser.id,  // ❌ Wrong field name
  email: foundUser.email,
  name: foundUser.name,
  roleId: foundUser.roleId || '',
});

// AFTER (CORRECT):
const token = await createSession({
  id: foundUser.id,      // ✅ Correct field name
  email: foundUser.email,
  name: foundUser.name,
  roleId: foundUser.roleId || '',
});
```

### ✅ Enhanced createSession Function
```typescript
export async function createSession(user: any): Promise<string> {
  console.log("=== CREATE SESSION DEBUG ===");
  console.log("User object:", user);
  console.log("User ID:", user.id);
  console.log("User email:", user.email);
  console.log("User name:", user.name);
  console.log("User roleId:", user.roleId);
  
  const payload = {
    userId: user.id,      // ✅ Maps user.id to payload.userId
    email: user.email,
    name: user.name,
    roleId: user.roleId,
  };
  
  console.log("JWT Payload:", payload);
  console.log("=========================");

  const token = await jwtSign(
    payload,
    process.env.JWT_SECRET || "your-secret-key",
  );
  return token;
}
```

## Expected Behavior After Fix

### ✅ Successful Login Flow
```
1. User login (email/password or Google OAuth)
2. Console logs show:
=== CREATE SESSION DEBUG ===
User object: { id: "user-uuid", email: "user@example.com", name: "User Name", roleId: "role-uuid" }
User ID: user-uuid
User email: user@example.com
User name: User Name
User roleId: role-uuid
JWT Payload: { userId: "user-uuid", email: "user@example.com", name: "User Name", roleId: "role-uuid" }
=========================

3. Token created with userId field
4. Middleware validates token ✅
5. Dashboard loads successfully ✅
```

### ✅ Middleware Validation
```
=== MIDDLEWARE DEBUG ===
Request URL: http://localhost:3000/dashboard
Session Token exists: true
🔍 TOKEN VALIDATION
Token payload: { userId: "user-uuid", email: "user@example.com", name: "User Name", roleId: "role-uuid", exp: 1711555200 }
✅ Token validation passed
====================
```

## Testing Steps

### Step 1: Clear Existing Session
```bash
# Clear browser cookies
document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
```

### Step 2: Test Email/Password Login
```bash
# 1. Go to /login
# 2. Login with email/password
# 3. Check console logs for "CREATE SESSION DEBUG"
# 4. Navigate to /dashboard
# 5. Should work without redirect to login
```

### Step 3: Test Google OAuth Login
```bash
# 1. Go to /login
# 2. Click "Continue with Google"
# 3. Complete OAuth flow
# 4. Check console logs for "CREATE SESSION DEBUG"
# 5. Navigate to /dashboard
# 6. Should work without redirect to login
```

### Step 4: Verify Token Structure
```bash
# Test token debug API
GET /api/debug/token

# Expected response:
{
  "success": true,
  "message": "Token is valid",
  "debug": {
    "hasToken": true,
    "payload": {
      "userId": "user-uuid",        // ✅ Should be present
      "email": "user@example.com",
      "name": "User Name",
      "roleId": "role-uuid"
    },
    "validation": {
      "formatValid": true,
      "notExpired": true,
      "hasUserId": true,            // ✅ Should be true
      "valid": true
    }
  }
}
```

## Common Issues & Solutions

### Issue 1: Still Getting "Token missing user identifier"
**Console Logs:**
```
❌ Token missing userId/sub field
```

**Debug Steps:**
```bash
# 1. Check createSession logs
# Look for "CREATE SESSION DEBUG" in console

# 2. Check user object structure
# Should show: User ID: user-uuid

# 3. Check token debug API
# GET /api/debug/token
# Look for payload.userId field
```

**Solution:**
```bash
# 1. Restart development server
# 2. Clear browser cookies
# 3. Login again
# 4. Verify createSession logs show correct user.id
```

### Issue 2: User ID is undefined/null
**Console Logs:**
```
User ID: undefined
JWT Payload: { userId: undefined, ... }
```

**Solution:**
```bash
# 1. Check database query result
# 2. Verify user object has id field
# 3. Check database schema for users table
```

### Issue 3: Token created but middleware still fails
**Console Logs:**
```
CREATE SESSION DEBUG: ✅ Shows correct user
MIDDLEWARE DEBUG: ❌ Token missing userId/sub field
```

**Solution:**
```bash
# 1. Check token signing/verification
# 2. Verify JWT_SECRET is same for both functions
# 3. Check token is not corrupted
```

## Debug Commands

### Browser Console
```javascript
// Check current token
const token = document.cookie.match(/session=([^;]+)/)?.[1];
if (token) {
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(atob(parts[1]));
    console.log('Token payload:', payload);
    console.log('Has userId:', !!payload.userId);
    console.log('UserId value:', payload.userId);
  }
}

// Test token debug
fetch('/api/debug/token')
  .then(r => r.json())
  .then(console.log);
```

### Server Logs
```bash
# Look for createSession logs
grep "CREATE SESSION DEBUG" logs/app.log

# Look for middleware logs
grep "TOKEN VALIDATION" logs/app.log
```

## Expected Console Logs After Fix

### ✅ Email/Password Login
```
=== CREATE SESSION DEBUG ===
User object: { id: "abc-123", email: "user@example.com", name: "User Name", roleId: "role-456" }
User ID: abc-123
User email: user@example.com
User name: User Name
User roleId: role-456
JWT Payload: { userId: "abc-123", email: "user@example.com", name: "User Name", roleId: "role-456" }
=========================

=== MIDDLEWARE DEBUG ===
Request URL: http://localhost:3000/dashboard
Session Token exists: true
🔍 TOKEN VALIDATION
Token payload: { userId: "abc-123", email: "user@example.com", name: "User Name", roleId: "role-456", exp: 1711555200 }
✅ Token validation passed
====================
```

### ✅ Google OAuth Login
```
Creating session for user: def-789
=== CREATE SESSION DEBUG ===
User object: { id: "def-789", email: "user@gmail.com", name: "Google User", roleId: "role-456" }
User ID: def-789
User email: user@gmail.com
User name: Google User
User roleId: role-456
JWT Payload: { userId: "def-789", email: "user@gmail.com", name: "Google User", roleId: "role-456" }
=========================

=== MIDDLEWARE DEBUG ===
Request URL: http://localhost:3000/dashboard
Session Token exists: true
🔍 TOKEN VALIDATION
Token payload: { userId: "def-789", email: "user@gmail.com", name: "Google User", roleId: "role-456", exp: 1711555200 }
✅ Token validation passed
====================
```

## 🎯 **FIX COMPLETE!**

**"Token missing user identifier" issue sudah diperbaiki!** 🚀

### ✅ What Was Fixed:
1. **createSession calls** → Fixed field name from `userId` to `id`
2. **Google OAuth callback** → Correct user object structure
3. **Login API** → Correct user object structure
4. **Debug logging** → Added comprehensive logging
5. **Token validation** → Now properly recognizes userId field

### ✅ Expected Result:
- [x] Login (email/password) → Dashboard loads
- [x] Login (Google OAuth) → Dashboard loads
- [x] Token has userId field → Middleware validates
- [x] No more "Token missing user identifier" errors
- [x] Clear debug logs for troubleshooting

**Silakan login lagi dan test dashboard access!** ✨
