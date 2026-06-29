# Session Security Testing Guide

## Problem Statement
Setelah logout, cookie/session token seharusnya tidak bisa digunakan lagi untuk API calls. Postman atau tools lain seharusnya mendapatkan 401 Unauthorized.

## Current Implementation

### Multi-Layer Security
1. **Middleware Layer**: Basic JWT validation (format + expiration)
2. **API Layer**: Full validation including blacklist check via `getCurrentUser()`
3. **Database Layer**: Session blacklist table with hashed tokens

### Flow After Logout
1. **Logout API**: Token hashed + stored in session_blacklist table
2. **Cookie Cleared**: Session cookie removed from browser
3. **Middleware**: Basic validation (allows through to API layer)
4. **API Layer**: `getCurrentUser()` checks blacklist → Returns null
5. **Response**: 401 Unauthorized

## Testing Steps

### 1. Setup Database Migration
```bash
# Run migration to create session_blacklist table
POST http://localhost:3000/api/admin/migrate/session-blacklist
```

### 2. Login and Get Session Token
```bash
# Login via browser or API
# Copy the session cookie value from browser dev tools
```

### 3. Test Valid Session (Before Logout)
```bash
# Test with valid session
GET http://localhost:3000/api/auth/verify
Cookie: session=YOUR_SESSION_TOKEN_HERE

# Expected Response (200 OK):
{
  "message": "Authenticated successfully",
  "authenticated": true,
  "user": { 
    "id": "...", 
    "email": "...", 
    "name": "...",
    "roleId": "..."
  },
  "timestamp": "2026-03-24T...",
  "note": "This endpoint requires valid, non-blacklisted session"
}
```

### 4. Logout (Blacklist Token)
```bash
# Logout via API
POST http://localhost:3000/api/auth/logout
Cookie: session=YOUR_SESSION_TOKEN_HERE

# Expected Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 5. Test After Logout (Should Fail)
```bash
# Test with the same token after logout
GET http://localhost:3000/api/auth/verify
Cookie: session=YOUR_SESSION_TOKEN_HERE

# Expected Response (401 Unauthorized):
{
  "error": "Unauthorized",
  "message": "Session invalid or expired"
}
```

### 6. Test Other Protected Endpoints
```bash
# Test any other protected API endpoint
GET http://localhost:3000/api/applications
Cookie: session=YOUR_SESSION_TOKEN_HERE

# Expected Response (401 Unauthorized):
{
  "error": "Unauthorized",
  "message": "Session invalid or expired"
}
```

### 7. Test with Postman/curl
```bash
# Test with Postman or curl after logout
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Cookie: session=YOUR_SESSION_TOKEN_HERE"

# Expected: 401 Unauthorized
```

## Expected Behavior

### ✅ Before Logout:
- Session token is valid
- All protected endpoints work
- User data is returned
- Postman/curl work

### ✅ After Logout:
- Session token is blacklisted in database
- All API calls return 401 Unauthorized
- Browser cookies are cleared
- Token cannot be reused in Postman/curl

### ✅ Security Headers:
- All responses include security headers
- Cookies are cleared with proper attributes
- Session is invalidated immediately

## Database Verification

```sql
-- Check if session is blacklisted
SELECT * FROM session_blacklist 
WHERE user_id = 'YOUR_USER_ID' 
AND reason = 'logout' 
ORDER BY invalidated_at DESC;

-- Expected: 1 row with the blacklisted session hash
```

## Troubleshooting

### If authentication still works after logout:
1. **Check session_blacklist table exists**:
   ```sql
   \d session_blacklist
   ```

2. **Verify token is blacklisted**:
   ```sql
   SELECT COUNT(*) FROM session_blacklist WHERE reason = 'logout';
   ```

3. **Check getCurrentUser() is being called**:
   - All protected APIs should use `getCurrentUser()`
   - Or use `withAuth()` wrapper

4. **Verify JWT secret is consistent**:
   - Same secret used for signing and verification

### If you get "Origin header required" error:
1. **Add Origin header** for API requests from tools
2. **Or use browser** for testing

### If middleware doesn't catch invalid tokens:
1. **Check JWT verification** in `getCurrentUser()`
2. **Verify token format** (3 parts separated by dots)
3. **Check token expiration**

## Security Features Demonstrated

### ✅ Immediate Invalidation:
- Logout → Token instantly blacklisted
- No grace period → Cannot be reused
- Database storage → Persistent across restarts

### ✅ Hash Storage:
- Never store raw tokens
- bcrypt.compare() for verification
- Collision resistant

### ✅ Multi-Layer Protection:
- Middleware → Basic validation
- API Layer → Full validation + blacklist
- Database → Persistent blacklist

### ✅ Tool Support:
- Postman → Works before logout, 401 after
- curl → Same behavior
- Browser → Cookies cleared automatically

## Success Criteria

1. ✅ **Before Logout**: Postman/curl can access APIs
2. ✅ **After Logout**: Same token returns 401 Unauthorized
3. ✅ **Database**: Token hash appears in session_blacklist
4. ✅ **Browser**: Cookies cleared, user logged out
5. ✅ **Security**: No way to reuse blacklisted token

If all these criteria are met, the session security is working correctly! 🛡️
