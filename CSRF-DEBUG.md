# CSRF Debugging - Sistem Anda vs External Tools

## Masalah
Sistem Anda (browser) juga terblock oleh CSRF protection. Seharusnya:
- ✅ **Browser (sistem Anda)** → Bisa akses dengan CSRF token
- ❌ **Postman (external tools)** → Diblokir tanpa CSRF token

## Solusi yang Sudah Dilakukan

### 1. Enhanced CSRF Validation
- **Headers优先** → Cek X-CSRF-Token header dulu
- **Cookie fallback** → Jika tidak ada, cek dari cookies
- **Debug logging** → Lihat sumber token di console
- **Better error messages** → Info detail untuk debugging

### 2. Frontend Improvements
- **Debug logging** → Lihat token di browser console
- **Warning system** → Jika token tidak ditemukan
- **Better error handling** → Informasi yang jelas

### 3. Debug Endpoint
- **/api/debug/csrf** → Untuk testing dan debugging
- **GET** → Lihat token availability
- **POST** → Test CSRF validation

## Debugging Instructions

### Step 1: Check CSRF Token di Browser
```javascript
// Di browser console setelah login
console.log('CSRF Token Debug:');
console.log('Cookie:', document.cookie);
console.log('CSRF Token:', getCookie('csrf_token'));
console.log('Token Length:', getCookie('csrf_token')?.length);

// Helper function
function getCookie(name) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
}
```

### Step 2: Test Debug Endpoint
```javascript
// Test GET - Lihat token info
fetch('/api/debug/csrf')
  .then(r => r.json())
  .then(console.log);

// Expected Response:
{
  "message": "CSRF Debug Endpoint",
  "authenticated": true,
  "csrf_info": {
    "from_cookies": "abc123...",
    "cookies_length": 64,
    "expected_length": 64
  }
}
```

### Step 3: Test POST dengan CSRF Token
```javascript
// Test POST dengan CSRF token
const token = getCookie('csrf_token');

fetch('/api/debug/csrf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  }
})
  .then(r => r.json())
  .then(console.log);

// Expected Response:
{
  "message": "CSRF validation passed!",
  "success": true,
  "csrf_info": {
    "validation": "passed",
    "token_source": "headers",
    "token_length": 64
  }
}
```

### Step 4: Test POST tanpa CSRF Token (Browser)
```javascript
// Test POST tanpa CSRF token (should fail)
fetch('/api/debug/csrf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(r => r.json())
  .then(console.log);

// Expected Response:
{
  "error": "Forbidden - Invalid CSRF token",
  "debug": {
    "csrf_from_headers": "missing",
    "csrf_from_cookies": "present",
    "final_token": "present",
    "token_length": 64
  }
}
```

### Step 5: Test dengan Postman
```bash
# GET - Should work
curl -X GET http://localhost:3000/api/debug/csrf

# Expected: 200 OK dengan csrf_info kosong

# POST - Should fail
curl -X POST http://localhost:3000/api/debug/csrf \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 403 Forbidden
{
  "error": "Forbidden - Invalid CSRF token",
  "debug": {
    "csrf_from_headers": "missing",
    "csrf_from_cookies": "missing",
    "final_token": "missing"
  }
}
```

## Expected Results

### ✅ Browser (Sistem Anda):
```javascript
// GET Request
GET /api/debug/csrf
// Response: 200 OK
// csrf_info: { cookies_length: 64, from_cookies: "abc123..." }

// POST dengan CSRF
POST /api/debug/csrf
Headers: X-CSRF-Token: abc123...
// Response: 200 OK
// csrf_info: { validation: "passed", token_source: "headers" }

// POST tanpa CSRF (fallback to cookies)
POST /api/debug/csrf
Headers: (no X-CSRF-Token)
// Response: 200 OK
// csrf_info: { validation: "passed", token_source: "cookies" }
```

### ❌ Postman (External Tools):
```bash
# GET Request
GET /api/debug/csrf
# Response: 200 OK
# csrf_info: { cookies_length: 0, from_cookies: null }

# POST Request
POST /api/debug/csrf
# Response: 403 Forbidden
# debug: { csrf_from_headers: "missing", csrf_from_cookies: "missing" }
```

## Console Logs untuk Debugging

### ✅ Browser Console (Should See):
```
SecureFetch Debug: {
  url: "/api/vouchers/request",
  method: "POST", 
  csrfToken: "abc123...",
  tokenLength: 64
}

CSRF Validation: {
  method: "POST",
  url: "/api/vouchers/request",
  csrfFromHeaders: "abc123...",
  csrfFromCookies: "abc123...",
  finalToken: "abc123...",
  tokenLength: 64
}
```

### ❌ Postman (Should See in Server Logs):
```
CSRF Validation: {
  method: "POST",
  url: "/api/vouchers/request", 
  csrfFromHeaders: null,
  csrfFromCookies: null,
  finalToken: null,
  tokenLength: 0
}
```

## Troubleshooting

### Jika Browser Masih Diblokir:

1. **Check CSRF Token**:
   ```javascript
   console.log('CSRF Token:', getCookie('csrf_token'));
   // Should be 64 characters
   ```

2. **Check Login Status**:
   ```javascript
   fetch('/api/auth/me')
     .then(r => r.json())
     .then(console.log);
   // Should return user data
   ```

3. **Check Console Logs**:
   - Lihat "SecureFetch Debug" logs
   - Lihat "CSRF Validation" logs
   - Pastikan token length = 64

### Jika Postman Masih Bisa Akses:

1. **Check Server Logs**:
   - Lihat "CSRF Validation" logs
   - Pastikan tokenLength = 0
   - Pastikan finalToken = null

2. **Check Response**:
   - Should be 403 Forbidden
   - Should have debug information

## Success Criteria

### ✅ Browser Test Results:
- [ ] GET `/api/debug/csrf` → 200 OK dengan token
- [ ] POST dengan CSRF header → 200 OK
- [ ] POST tanpa header → 200 OK (fallback ke cookies)
- [ ] Console logs menunjukkan token length = 64

### ❌ Postman Test Results:
- [ ] GET `/api/debug/csrf` → 200 OK tanpa token
- [ ] POST request → 403 Forbidden
- [ ] Server logs menunjukkan tokenLength = 0
- [ ] Debug info menunjukkan "missing" token

Jika semua criteria terpenuhi, sistem Anda bisa akses tapi Postman diblokir! 🎯
