# Strict CSRF Validation - X-CSRF-Token Required

## Perubahan
Sekarang CSRF validation lebih strict:
- ❌ **Tidak ada fallback ke cookies**
- ✅ **Wajib X-CSRF-Token header**
- ❌ **Tanpa header = 403 Forbidden**

## Expected Behavior

### ✅ Browser dengan X-CSRF-Token (Works)
```javascript
// GET - Works
fetch('/api/debug/csrf');
// Response: 200 OK

// POST dengan X-CSRF-Token - Works
const token = getCookie('csrf_token');
fetch('/api/debug/csrf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token  // ← Required!
  }
});
// Response: 200 OK
```

### ❌ Browser tanpa X-CSRF-Token (Failed)
```javascript
// POST tanpa X-CSRF-Token - Failed!
fetch('/api/debug/csrf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
  // No X-CSRF-Token header
});
// Response: 403 Forbidden
{
  "error": "Forbidden - Invalid CSRF token",
  "message": "This action requires a valid X-CSRF-Token header from the browser"
}
```

### ❌ Postman (Always Failed)
```bash
# POST tanpa X-CSRF-Token - Failed!
curl -X POST http://localhost:3000/api/debug/csrf \
  -H "Content-Type: application/json" \
  -d '{}'
# Response: 403 Forbidden
```

## Testing Instructions

### Step 1: Check CSRF Token
```javascript
// Di browser console
function getCookie(name) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
}

const token = getCookie('csrf_token');
console.log('CSRF Token:', token?.slice(0, 10) + '...');
console.log('Token Length:', token?.length); // Should be 64
```

### Step 2: Test GET (Should Work)
```javascript
fetch('/api/debug/csrf')
  .then(r => r.json())
  .then(console.log);

// Expected: 200 OK
{
  "message": "CSRF Debug Endpoint",
  "csrf_info": {
    "from_cookies": "abc123...",
    "cookies_length": 64
  }
}
```

### Step 3: Test POST dengan X-CSRF-Token (Should Work)
```javascript
const token = getCookie('csrf_token');

fetch('/api/debug/csrf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token  // ← Required!
  }
})
  .then(r => r.json())
  .then(console.log);

// Expected: 200 OK
{
  "message": "CSRF validation passed!",
  "success": true,
  "csrf_info": {
    "validation": "passed",
    "token_source": "headers_only",
    "strict_mode": true
  }
}
```

### Step 4: Test POST tanpa X-CSRF-Token (Should Fail)
```javascript
fetch('/api/debug/csrf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
  // No X-CSRF-Token header
})
  .then(r => r.json())
  .then(console.log);

// Expected: 403 Forbidden
{
  "error": "Forbidden - Invalid CSRF token",
  "message": "This action requires a valid X-CSRF-Token header from the browser",
  "debug": {
    "csrf_header_received": "missing",
    "csrf_header_length": 0,
    "expected_length": 64,
    "strict_mode": true
  }
}
```

### Step 5: Test Postman (Should Fail)
```bash
# Should fail - no X-CSRF-Token header
curl -X POST http://localhost:3000/api/debug/csrf \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 403 Forbidden
```

## Frontend Behavior

### ✅ secureFetch Function (Updated)
```typescript
async function secureFetch(url: string, options: RequestInit = {}) {
  const token = getCSRFToken();
  
  // STRICT: Always require X-CSRF-Token for write operations
  if (options.method && options.method !== 'GET') {
    if (!token) {
      console.error('CSRF Token not found for:', url, options.method);
      return new Response(JSON.stringify({
        error: 'CSRF Token not found',
        message: 'Please refresh the page and try again'
      }), { status: 403 });
    }
    
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,  // ← Always added!
    };
  }
  
  return fetch(url, options);
}
```

### ✅ Marketplace Usage
```typescript
// All POST requests now automatically include X-CSRF-Token
await secureFetch("/api/vouchers/request", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});
// X-CSRF-Token automatically added!
```

## Server Logs

### ✅ Success Case (Browser with Header)
```
CSRF Validation (Strict): {
  method: "POST",
  url: "/api/debug/csrf",
  user: "user@example.com",
  csrfFromHeaders: "abc123...",
  csrfFromCookies: "abc123...",
  tokenLength: 64,
  strict: true
}
```

### ❌ Fail Case (No Header)
```
CSRF Validation (Strict): {
  method: "POST",
  url: "/api/debug/csrf", 
  user: "user@example.com",
  csrfFromHeaders: null,
  csrfFromCookies: "abc123...",
  tokenLength: 0,
  strict: true
}
```

### ❌ Postman Case
```
CSRF Validation (Strict): {
  method: "POST",
  url: "/api/debug/csrf",
  user: null,  // Not authenticated
  csrfFromHeaders: null,
  csrfFromCookies: null,
  tokenLength: 0,
  strict: true
}
```

## Error Messages

### ❌ Missing X-CSRF-Token Header
```json
{
  "error": "Forbidden - Invalid CSRF token",
  "message": "This action requires a valid X-CSRF-Token header from the browser",
  "debug": {
    "csrf_header_received": "missing",
    "csrf_header_length": 0,
    "expected_length": 64,
    "csrf_cookie_available": true,
    "strict_mode": true,
    "fix": "Add X-CSRF-Token header with 64-character token"
  }
}
```

### ❌ Invalid X-CSRF-Token Format
```json
{
  "error": "Forbidden - Invalid CSRF token", 
  "message": "This action requires a valid X-CSRF-Token header from the browser",
  "debug": {
    "csrf_header_received": "invalid_format",
    "csrf_header_length": 32,
    "expected_length": 64,
    "strict_mode": true,
    "fix": "Add X-CSRF-Token header with 64-character token"
  }
}
```

## Success Criteria

### ✅ Browser Test Results:
- [ ] GET `/api/debug/csrf` → 200 OK
- [ ] POST dengan X-CSRF-Token → 200 OK
- [ ] POST tanpa X-CSRF-Token → 403 Forbidden
- [ ] secureFetch auto-adds header → Works
- [ ] Console logs show token → 64 chars

### ❌ Postman Test Results:
- [ ] GET `/api/debug/csrf` → 200 OK (read-only)
- [ ] POST request → 403 Forbidden
- [ ] No X-CSRF-Token → Always blocked
- [ ] Server logs show missing → tokenLength = 0

## Security Benefits

### ✅ Strict Validation:
- **X-CSRF-Token required** → No exceptions
- **No cookie fallback** → Header-only validation
- **64-character validation** → Exact format required
- **Clear error messages** → Easy debugging

### ✅ External Tool Blocking:
- **Postman** → No X-CSRF-Token header
- **curl** → No X-CSRF-Token header  
- **Mobile apps** → No X-CSRF-Token header
- **API clients** → No X-CSRF-Token header

### ✅ System Access:
- **Browser** → Auto-adds X-CSRF-Token header
- **secureFetch** → Always includes header
- **Authenticated users** → Can access with header
- **Write operations** → Protected by header validation

**Sekarang X-CSRF-Token header WAJIB untuk semua write operations! 🛡️**

Tanpa header = 403 Forbidden, bahkan untuk browser yang sudah login! 🚀
