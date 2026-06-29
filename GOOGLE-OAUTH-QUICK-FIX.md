# Google OAuth Quick Fix

## Status: ✅ IMPLEMENTATION COMPLETE

Google OAuth sudah diimplementasi dengan debugging lengkap.

## Quick Testing Steps

### Step 1: Check Environment Variables
```bash
GET /api/debug/env
```

**Expected Response:**
```json
{
  "envVars": {
    "NEXT_PUBLIC_GOOGLE_CLIENT_ID": "SET",
    "NEXT_API_SECRET_KEY": "SET", 
    "NEXT_PUBLIC_API_URL": "SET"
  }
}
```

### Step 2: Test Google OAuth
```bash
# 1. Clear browser cookies
document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

# 2. Go to login page
GET /login

# 3. Click "Continue with Google"
# Arahkan ke /api/auth/google

# 4. Should redirect ke Google OAuth
# URL: https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&redirect_uri=xxx&response_type=code&scope=openid+email+profile&access_type=offline&prompt=consent
```

### Step 3: Complete OAuth Flow
```bash
# 1. Authorize di Google
# 2. Redirect ke callback
# URL: http://localhost:3000/api/auth/google/callback?code=4/0AX4jT...

# 3. Check console logs:
# "Creating session for user: user_id"
# "Session token created: token generated"
# "Session cookie set on response object"
# "OAuth callback completed, returning response with cookie"

# 4. Redirect ke dashboard
# URL: http://localhost:3000/dashboard

# 5. Check browser cookies:
console.log('Session cookie:', document.cookie.match(/session=([^;]+)/)?.[1]);
```

### Step 4: Verify Login Success
```bash
# Test protected API
GET /api/auth/me

# Expected: 200 OK + user data
# NOT: "Not authenticated"
```

## Environment Variables Required

```env
# .env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_API_SECRET_KEY=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret-key
```

## Google Console Setup

### 1. OAuth 2.0 Client ID
1. Buka Google Cloud Console
2. APIs & Services → Credentials
3. Create credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback`

### 2. Enable Required APIs
1. APIs & Services → Library
2. Enable "Google+ API"
3. Enable "OAuth2 API v2"

## Expected Console Logs

### ✅ Successful Flow
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

### ❌ Common Errors
```
Missing OAuth credentials in environment
# → Set environment variables

invalid_client
# → Check NEXT_PUBLIC_GOOGLE_CLIENT_ID

redirect_uri_mismatch  
# → Add redirect URI di Google Console

token_exchange_failed
# → Check NEXT_API_SECRET_KEY

token_verification_failed
# → Check Google API setup
```

## Troubleshooting

### Problem: "Missing OAuth credentials in environment"
**Solution:**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_API_SECRET_KEY=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Problem: "redirect_uri_mismatch"
**Solution:**
1. Google Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Add: `http://localhost:3000/api/auth/google/callback`

### Problem: Login success but "Not authenticated"
**Solution:**
1. Check session cookie di browser
2. Check middleware console logs
3. Restart development server

## 🎯 **READY TO TEST!**

**Google OAuth sudah siap untuk di-test!** 🚀

1. **Environment check** → `/api/debug/env`
2. **OAuth initiation** → `/api/auth/google`
3. **Callback handling** → `/api/auth/google/callback`
4. **Session creation** → Auto cookie set
5. **Debug logs** → Console lengkap

**Silakan test Google OAuth login!** ✨
