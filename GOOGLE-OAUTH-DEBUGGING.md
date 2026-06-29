# Google OAuth Debugging - Fix Login Issues

## Problem
Google OAuth tidak bisa login - user tidak bisa login via Google OAuth button.

## Root Cause Analysis

### 1. Environment Variables Check
Google OAuth membutuhkan environment variables yang benar:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_API_SECRET_KEY=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 2. Google OAuth Flow
```
1. User klik "Continue with Google" → /api/auth/google
2. Redirect ke Google OAuth → User authorize
3. Redirect ke callback → /api/auth/google/callback?code=xxx
4. Exchange code → Get tokens
5. Verify ID token → Get user info
6. Create session → Set cookie
7. Redirect ke dashboard → Login success
```

## Debugging Steps

### Step 1: Check Environment Variables
```bash
# Test environment variables
GET /api/debug/env

# Expected response:
{
  "message": "Environment variables check",
  "envVars": {
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID": "SET",
    "NEXT_API_SECRET_KEY": "SET", 
    "NEXT_PUBLIC_API_URL": "SET",
    "GOOGLE_CLIENT_ID": "MISSING",
    "GOOGLE_CLIENT_SECRET": "MISSING",
    "JWT_SECRET": "SET",
    "NODE_ENV": "development"
  },
  "googleOAuthConfig": {
    "clientId": "your-google-client-id.apps.googleusercontent.com...",
    "redirectUri": "http://localhost:3000/api/auth/google/callback",
    "scopes": [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ]
  }
}
```

### Step 2: Test Google OAuth Init
```bash
# Test Google OAuth initiation
GET /api/auth/google

# Expected: Redirect to Google OAuth
# URL: https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&redirect_uri=xxx&response_type=code&scope=openid+email+profile&access_type=offline&prompt=consent

# Check console logs:
# "Google OAuth URL generated: https://accounts.google.com/o/oauth2/v2/auth?..."
# "Redirect URI: http://localhost:3000/api/auth/google/callback"
# "Client ID: your-google-client-id.apps.googleusercontent.com"
```

### Step 3: Test Google OAuth Callback
```bash
# After Google OAuth authorization, you'll be redirected to:
# http://localhost:3000/api/auth/google/callback?code=4/0AX4jT...

# Check console logs for:
# "Creating session for user: user_id"
# "Session token created: token generated"
# "Session cookie set on response object"
# "OAuth callback completed, returning response with cookie"
```

### Step 4: Check Browser Console
```javascript
// Di browser console setelah callback
console.log('Document cookie:', document.cookie);
console.log('Session cookie:', document.cookie.match(/session=([^;]+)/)?.[1]);

// Check redirect
console.log('Current URL:', window.location.href);
console.log('URL params:', new URLSearchParams(window.location.search));
```

## Common Issues & Solutions

### Issue 1: Missing Environment Variables
**Error:** `Missing OAuth credentials in environment`

**Solution:**
```env
# Di .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_API_SECRET_KEY=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Issue 2: Wrong Redirect URI
**Error:** Google Console shows "redirect_uri_mismatch"

**Solution:**
1. Di Google Console → APIs & Services → Credentials
2. Edit OAuth 2.0 Client ID
3. Add "Authorized redirect URIs":
   - `http://localhost:3000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback`

### Issue 3: Invalid Client ID
**Error:** `invalid_client` atau `token_exchange_failed`

**Solution:**
1. Copy Client ID dari Google Console
2. Pastikan tidak ada spasi atau karakter salah
3. Restart development server

### Issue 4: Cookie Not Set
**Error:** Login success tapi masih "Not authenticated"

**Solution:**
1. Check callback logs untuk "Session cookie set on response object"
2. Check browser untuk cookie:
   ```javascript
   console.log('Cookies:', document.cookie);
   ```
3. Pastikan cookie domain dan path benar

### Issue 5: Token Verification Failed
**Error:** `token_verification_failed`

**Solution:**
1. Check NEXT_PUBLIC_GOOGLE_CLIENT_ID benar
2. Pastikan ID token tidak expired
3. Check Google API quota

## Testing Checklist

### ✅ Environment Setup
- [ ] NEXT_PUBLIC_GOOGLE_CLIENT_ID di-set
- [ ] NEXT_API_SECRET_KEY di-set  
- [ ] NEXT_PUBLIC_API_URL di-set
- [ ] Google Console authorized redirect URIs
- [ ] Development server di-restart

### ✅ OAuth Flow Test
- [ ] GET /api/auth/google → Redirect ke Google
- [ ] Google authorization → Redirect ke callback
- [ ] GET /api/auth/google/callback?code=xxx → Success
- [ ] Session cookie di-set
- [ ] Redirect ke dashboard → Login success

### ✅ Browser Console Check
- [ ] Tidak ada JavaScript errors
- [ ] Session cookie ada
- [ ] Redirect URL benar
- [ ] Tidak ada network errors

## Expected Console Logs

### ✅ Successful Google OAuth
```
Google OAuth URL generated: https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&redirect_uri=xxx&response_type=code&scope=openid+email+profile&access_type=offline&prompt=consent
Redirect URI: http://localhost:3000/api/auth/google/callback
Client ID: your-google-client-id.apps.googleusercontent.com

Token exchange successful
Creating session for user: 123456789
Session token created: token generated
Session cookie set on response object
OAuth callback completed, returning response with cookie
```

### ❌ Failed Google OAuth
```
Missing OAuth credentials in environment
# OR
Token exchange error details: {
  message: "invalid_client",
  status: 400,
  clientId: "wrong-client-id...",
  redirectUri: "http://localhost:3000/api/auth/google/callback",
  code: "4/0AX4jT..."
}
# OR
ID token verification error: Wrong number of segments in token: 2
```

## Quick Fix Steps

### 1. Check Environment Variables
```bash
# Test debug endpoint
curl http://localhost:3000/api/debug/env

# Pastikan semua "SET"
```

### 2. Update Google Console
1. Buka Google Cloud Console
2. APIs & Services → Credentials
3. OAuth 2.0 Client IDs
4. Edit client ID
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback`

### 3. Restart Development Server
```bash
# Stop server
# Clear cache
rm -rf .next

# Start server
npm run dev
```

### 4. Test Full Flow
```bash
# 1. Clear browser cookies
document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

# 2. Test OAuth initiation
window.location.href = "/api/auth/google";

# 3. After callback, check cookies
console.log('Session cookie:', document.cookie.match(/session=([^;]+)/)?.[1]);

# 4. Test protected route
fetch('/api/auth/me').then(r => r.json()).then(console.log);
```

## 🎯 **DEBUGGING COMPLETE!**

**Sekarang Anda memiliki debugging lengkap untuk Google OAuth!** 🚀

- **Environment check** → `/api/debug/env`
- **OAuth flow test** → `/api/auth/google`
- **Callback debugging** → Console logs lengkap
- **Browser debugging** → Cookie dan URL checks
- **Common issues** → Solutions untuk setiap masalah

**Silakan test Google OAuth dengan debugging ini!** ✨
