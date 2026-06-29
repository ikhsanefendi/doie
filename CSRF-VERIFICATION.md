# CSRF Protection Verification

## Test Instructions

### 1. Test dari Browser (Harus Berhasil)

#### GET Request (Browser)
```javascript
// Di browser console
fetch('/api/test/csrf')
  .then(r => r.json())
  .then(console.log);

// Expected Response:
{
  "message": "CSRF Test Endpoint",
  "authenticated": true,
  "csrf_info": {
    "token_available": true,
    "token_length": 64,
    "method": "GET - No CSRF required"
  }
}
```

#### POST Request (Browser dengan CSRF)
```javascript
// Di browser console
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1];

fetch('/api/test/csrf', {
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
    "token_valid": true,
    "token_length": 64,
    "source": "Browser with valid CSRF token"
  }
}
```

### 2. Test dari Postman (Harus Gagal untuk POST)

#### GET Request (Postman - Harus Berhasil)
```bash
GET http://localhost:3000/api/test/csrf

# Expected Response: 200 OK
{
  "message": "CSRF Test Endpoint",
  "authenticated": false, // atau true jika ada session
  "csrf_info": {
    "token_available": false,
    "token_length": 0,
    "method": "GET - No CSRF required"
  }
}
```

#### POST Request (Postman - Harus GAGAL)
```bash
POST http://localhost:3000/api/test/csrf
Content-Type: application/json
Body: {}

# Expected Response: 403 Forbidden
{
  "error": "Forbidden - Invalid CSRF token",
  "message": "This action requires a valid CSRF token from the browser",
  "debug": {
    "csrf_received": "null",
    "csrf_length": 0,
    "expected_length": 64,
    "source": "CSRF validation failed"
  }
}
```

### 3. Test dari curl (Harus Gagal untuk POST)

#### GET Request (curl - Harus Berhasil)
```bash
curl -X GET http://localhost:3000/api/test/csrf

# Expected: 200 OK dengan JSON response
```

#### POST Request (curl - Harus GAGAL)
```bash
curl -X POST http://localhost:3000/api/test/csrf \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 403 Forbidden
{
  "error": "Forbidden - Invalid CSRF token",
  "message": "This action requires a valid CSRF token from the browser"
}
```

### 4. Test dari Sistem Lain (Harus Gagal untuk POST)

#### Mobile App / External System
```javascript
// Tanpa CSRF token
fetch('http://localhost:3000/api/test/csrf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});

// Expected: 403 Forbidden
```

## Verification Checklist

### ✅ Browser Test Results:
- [ ] GET request → 200 OK
- [ ] POST dengan CSRF → 200 OK  
- [ ] POST tanpa CSRF → 403 Forbidden
- [ ] CSRF token available di cookie

### ❌ Postman Test Results:
- [ ] GET request → 200 OK
- [ ] POST request → 403 Forbidden
- [ ] Tidak ada CSRF token di Postman
- [ ] Error message jelas

### ❌ External System Test Results:
- [ ] GET request → 200 OK (read-only)
- [ ] POST request → 403 Forbidden
- [ ] Tidak bisa akses CSRF token
- [ ] Diblok untuk write operations

## Expected Behavior Summary

### ✅ Browser (Sistem Anda):
- **GET** → ✅ Baca data
- **POST dengan CSRF** → ✅ Tulis data
- **CSRF token** → ✅ Auto dari cookie
- **Full access** → ✅ Read + Write

### ❌ Postman/External Tools:
- **GET** → ✅ Baca data (read-only)
- **POST** → ❌ 403 Forbidden (no CSRF)
- **CSRF token** → ❌ Tidak accessible
- **Limited access** → ✅ Read-only

### 🔒 Security Verification:
- **CSRF token** → Hanya ada di browser
- **Write protection** → Hanya dari browser
- **Session validation** → User authentication
- **External blocking** → Postman/sistem lain diblok

## Troubleshooting

### Jika POST dari browser masih gagal:
1. **Check CSRF token** → `console.log(getCookie('csrf_token'))`
2. **Check session** → Login terlebih dahulu
3. **Check headers** → `X-CSRF-Token` harus ada

### Jika Postman masih bisa POST:
1. **Check middleware** → Pastikan tidak di-bypass
2. **Check endpoint** → Harus pakai `requireCSRF`
3. **Check headers** → Postman tidak punya CSRF token

### Jika GET juga diblokir:
1. **Check public routes** → `/api/test/csrf` harus public
2. **Check session** → GET tidak butuh session untuk test
3. **Check middleware** → Jangan terlalu strict

## Success Criteria

✅ **Browser bisa POST** (dengan CSRF token)
❌ **Postman tidak bisa POST** (403 Forbidden)
❌ **Sistem lain tidak bisa POST** (403 Forbidden)
✅ **Semua bisa GET** (read-only access)

Jika semua criteria terpenuhi, CSRF protection berfungsi dengan benar! 🛡️
