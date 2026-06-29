# Google OAuth Token Debugging & Validation

## Status: ✅ IMPLEMENTED

Middleware sekarang memiliki debugging lengkap untuk Google OAuth tokens dan validasi ID Token.

## Implementation Details

### 1. Middleware Debug Console Logs
```typescript
// Debug: Log session token info
console.log("=== MIDDLEWARE DEBUG ===");
console.log("Request URL:", request.url);
console.log("Session Token exists:", !!sessionToken);
if (sessionToken) {
  console.log("Token length:", sessionToken.length);
  console.log("Token preview:", sessionToken.slice(0, 50) + "...");
  
  // Check if it's a Google token
  const isGoogle = isGoogleToken(sessionToken);
  console.log("Is Google token:", isGoogle);
  
  // Get detailed token info
  const tokenInfo = getTokenInfo(sessionToken);
  if (tokenInfo) {
    console.log("Token Info:", {
      issuer: tokenInfo.issuer,
      audience: tokenInfo.audience,
      expires: tokenInfo.expires ? new Date(tokenInfo.expires * 1000).toISOString() : 'N/A',
      expired: tokenInfo.expired,
      isGoogle: tokenInfo.isGoogle,
    });
    
    // Google specific validation
    if (tokenInfo.isGoogle) {
      console.log("🔍 GOOGLE TOKEN DETECTED");
      console.log("✅ Issuer check:", tokenInfo.issuer === "https://accounts.google.com" || tokenInfo.issuer === "accounts.google.com");
      console.log("✅ Audience check:", tokenInfo.audience === process.env.GOOGLE_CLIENT_ID);
      console.log("✅ Expiration check:", !tokenInfo.expired);
      
      if (tokenInfo.expired) {
        console.log("❌ Google token expired!");
      }
    }
  }
}
```

### 2. Google ID Token Validation Library
```typescript
// lib/google-auth.ts
export async function verifyGoogleIdToken(idToken: string) {
  console.log("=== GOOGLE ID TOKEN VERIFICATION ===");
  console.log("Client ID:", GOOGLE_CLIENT_ID);
  
  try {
    // Decode JWT header to get key ID
    const [headerB64, payloadB64, signature] = idToken.split('.');
    const header = JSON.parse(atob(headerB64));
    const payload = JSON.parse(atob(payloadB64));
    
    // Check issuer
    const validIssuer = GOOGLE_ISSUERS.includes(payload.iss);
    console.log("Issuer (iss):", payload.iss);
    console.log("Valid issuer:", validIssuer);
    
    if (!validIssuer) {
      throw new Error(`Invalid issuer: ${payload.iss}`);
    }
    
    // Check audience
    const validAudience = payload.aud === GOOGLE_CLIENT_ID;
    console.log("Audience (aud):", payload.aud);
    console.log("Expected audience:", GOOGLE_CLIENT_ID);
    console.log("Valid audience:", validAudience);
    
    if (!validAudience) {
      throw new Error(`Invalid audience: ${payload.aud}`);
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const notExpired = payload.exp > now;
    console.log("Expires (exp):", new Date(payload.exp * 1000).toISOString());
    console.log("Current time:", new Date(now * 1000).toISOString());
    console.log("Not expired:", notExpired);
    
    if (!notExpired) {
      throw new Error(`Token expired: ${payload.exp}`);
    }
    
    // Get Google's public keys and verify signature
    const keys = await getGooglePublicKeys();
    const key = findKey(keys, header.kid);
    
    if (!key) {
      throw new Error(`Key not found: ${header.kid}`);
    }
    
    // Create SPKI from JWK and verify JWT signature
    const spki = await importSPKI(key.n + key.e, key.alg);
    const { payload: verifiedPayload } = await jwtVerify(idToken, spki, {
      issuer: GOOGLE_ISSUERS,
      audience: GOOGLE_CLIENT_ID,
    });
    
    console.log("✅ Token verified successfully!");
    console.log("Verified payload:", verifiedPayload);
    
    return verifiedPayload;
    
  } catch (error: any) {
    console.error("❌ Token verification failed:", error?.message || error);
    throw error;
  }
}
```

## Expected Console Output

### When User Logs in via Google
```
=== MIDDLEWARE DEBUG ===
Request URL: https://yourdomain.com/dashboard/marketplace
Session Token exists: true
Token length: 1234
Token preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM...
Is Google token: true
Token Info: {
  issuer: "https://accounts.google.com",
  audience: "your-google-client-id.apps.googleusercontent.com",
  expires: "2024-03-27T15:00:00.000Z",
  expired: false,
  isGoogle: true
}
🔍 GOOGLE TOKEN DETECTED
✅ Issuer check: true
✅ Audience check: true
✅ Expiration check: true
JWT Header: { alg: "RS256", kid: "key-id", typ: "JWT" }
JWT Payload: { iss: "https://accounts.google.com", aud: "your-google-client-id.apps.googleusercontent.com", sub: "123456789", email: "user@gmail.com", ... }
Issuer (iss): https://accounts.google.com
Audience (aud): your-google-client-id.apps.googleusercontent.com
Expires (exp): 2024-03-27T15:00:00.000Z
Expired?: false
====================
```

### When Token is Invalid/Expired
```
=== MIDDLEWARE DEBUG ===
Request URL: https://yourdomain.com/dashboard/marketplace
Session Token exists: true
Token length: 1234
Token preview: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM...
Is Google token: true
Token Info: {
  issuer: "https://accounts.google.com",
  audience: "your-google-client-id.apps.googleusercontent.com",
  expires: "2024-03-27T14:00:00.000Z",
  expired: true,
  isGoogle: true
}
🔍 GOOGLE TOKEN DETECTED
✅ Issuer check: true
✅ Audience check: true
✅ Expiration check: false
❌ Google token expired!
JWT Header: { alg: "RS256", kid: "key-id", typ: "JWT" }
JWT Payload: { iss: "https://accounts.google.com", aud: "your-google-client-id.apps.googleusercontent.com", sub: "123456789", email: "user@gmail.com", ... }
Issuer (iss): https://accounts.google.com
Audience (aud): your-google-client-id.apps.googleusercontent.com
Expires (exp): 2024-03-27T14:00:00.000Z
Expired?: true
====================
```

## Google OAuth 2.0 Validation Checklist

### ✅ Required Validations
- [x] **Issuer (iss)**: Must be from Google
  - Valid: `https://accounts.google.com` or `accounts.google.com`
  - Invalid: Other issuers

- [x] **Audience (aud)**: Must match your Client ID
  - Valid: `your-google-client-id.apps.googleusercontent.com`
  - Invalid: Other audience values

- [x] **Expiration (exp)**: Must not be expired
  - Valid: `exp > current_time`
  - Invalid: `exp <= current_time`

- [x] **Signature**: Must be valid (using Google's public keys)
  - Valid: Signature matches Google's public key
  - Invalid: Signature mismatch

## Testing Steps

### Step 1: Login via Google OAuth
```bash
# Navigate to login page
GET /login

# Click "Login with Google"
# Redirect to Google OAuth
# Authorize the app
# Redirect back to your app
```

### Step 2: Check Console Logs
```bash
# Open browser console
# Look for "=== MIDDLEWARE DEBUG ===" logs
# Verify all validation checks pass
```

### Step 3: Navigate to Protected Routes
```bash
# Navigate to dashboard
GET /dashboard/marketplace

# Check console logs for token validation
# Should see "🔍 GOOGLE TOKEN DETECTED"
# Should see all "✅" validation checks
```

### Step 4: Test Token Expiration
```bash
# Wait for token to expire (1 hour)
# Try to access protected route
# Should see "❌ Google token expired!"
# Should be redirected to login
```

## Environment Variables Required

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-jwt-secret
```

## Security Features Implemented

### ✅ Token Validation
- [x] Issuer validation
- [x] Audience validation  
- [x] Expiration validation
- [x] Signature validation (using Google's public keys)
- [x] Key rotation support (cached keys)

### ✅ Debug Features
- [x] Comprehensive console logging
- [x] Token structure analysis
- [x] Validation status reporting
- [x] Error handling and reporting

### ✅ Performance
- [x] Public key caching (1 hour)
- [x] Efficient token parsing
- [x] Minimal network requests

## 🎯 **IMPLEMENTATION COMPLETE!**

**Middleware sekarang memiliki debugging lengkap untuk Google OAuth tokens!** 🚀

- **Console logs** → Lihat semua token info di console
- **Google detection** → Otomatis deteksi Google tokens
- **Validation checks** → Issuer, audience, expiration, signature
- **Debug info** → Struktur JWT lengkap
- **Error handling** → Clear error messages

**Silakan login via Google dan lihat console logs untuk debugging!** ✨
