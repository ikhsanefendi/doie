# Test Script for Session Security

## Prerequisites
- Database migration for session_blacklist must be run
- Application must be running

## Test Steps

### 1. Login and Get Session Token
```bash
# Login via browser or API
# Copy the session cookie value
```

### 2. Test Authenticated Endpoint
```bash
# Test with valid session
curl -X GET http://localhost:3000/api/auth/me/check \
  -H "Cookie: session=YOUR_SESSION_TOKEN_HERE"

# Expected Response:
{
  "message": "Authenticated successfully",
  "authenticated": true,
  "user": { "id": "...", "email": "...", "name": "..." }
}
```

### 3. Logout
```bash
# Logout via API
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Cookie: session=YOUR_SESSION_TOKEN_HERE"

# Expected Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 4. Test After Logout (Should Fail)
```bash
# Test with the same token after logout
curl -X GET http://localhost:3000/api/auth/me/check \
  -H "Cookie: session=YOUR_SESSION_TOKEN_HERE"

# Expected Response:
{
  "error": "Unauthorized",
  "message": "No valid session found",
  "authenticated": false
}
```

### 5. Test Other Protected Endpoints
```bash
# Test any other protected API endpoint
curl -X GET http://localhost:3000/api/applications \
  -H "Cookie: session=YOUR_SESSION_TOKEN_HERE"

# Expected Response:
{
  "error": "Unauthorized",
  "authenticated": false
}
```

## Expected Behavior

### ✅ Before Logout:
- Session token is valid
- All protected endpoints work
- User data is returned

### ✅ After Logout:
- Session token is blacklisted in database
- All API calls return 401 Unauthorized
- Browser cookies are cleared
- Token cannot be reused

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

-- Expected: 1 row with the blacklisted session
```

## Troubleshooting

### If authentication still works after logout:
1. Check if session_blacklist table exists
2. Verify JWT secret is consistent
3. Check browser cookies are actually cleared
4. Verify getCurrentUser() is being called

### If you get "Origin header required" error:
1. Add Origin header for API requests from tools
2. Or use browser for testing

### If middleware doesn't catch invalid tokens:
1. Check if JWT verification is working
2. Verify token format (3 parts separated by dots)
3. Check token expiration
