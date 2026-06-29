# Postman Blocking Verification

## Masalah
Postman masih bisa akses API endpoints. Mari kita perbaiki dengan implementasi CSRF yang lebih strict.

## Solusi yang Sudah Dilakukan

### 1. API Level Protection
- **vouchers/request** → Sudah pakai `requireCSRF`
- **subscriptions/create** → Sudah pakai `requireCSRF`
- **applications** → Sudah pakai `requireCSRF`

### 2. Test Endpoints
- **/api/test/csrf** → Untuk verifikasi
- **GET** → Buka untuk semua
- **POST** → Hanya browser dengan CSRF

## Testing Instructions

### Test 1: Browser (Harus Berhasil)
```javascript
// Di browser console setelah login
const token = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token='))
  ?.split('=')[1];

// Test GET
fetch('/api/test/csrf')
  .then(r => r.json())
  .then(console.log);

// Test POST dengan CSRF
fetch('/api/test/csrf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  }
})
  .then(r => r.json())
  .then(console.log);
```

### Test 2: Postman (Harus Gagal)
```bash
# GET - Should work
GET http://localhost:3000/api/test/csrf

# POST - Should FAIL!
POST http://localhost:3000/api/test/csrf
Content-Type: application/json
{}

# Expected Response:
{
  "error": "Forbidden - Invalid CSRF token",
  "message": "This action requires a valid CSRF token from the browser"
}
```

### Test 3: Real API Endpoints
```bash
# Test vouchers request (should fail in Postman)
POST http://localhost:3000/api/vouchers/request
Content-Type: application/json
{}

# Test subscriptions create (should fail in Postman)
POST http://localhost:3000/api/subscriptions/create
Content-Type: application/json
{"applicationId": "test-id"}
```

## API Endpoints Status

### ✅ Protected with requireCSRF:
- `/api/applications` - POST
- `/api/vouchers/request` - POST  
- `/api/subscriptions/create` - POST
- `/api/test/csrf` - POST

### ❌ Need Protection:
- `/api/admin/transactions/[id]/approve` - POST
- `/api/admin/transactions/[id]/reject` - POST
- `/api/admin/users/[id]/grant-vouchers` - POST
- `/api/admin/users/[id]/reduce-vouchers` - POST
- `/api/admin/roles` - POST
- `/api/admin/menu-items` - POST
- `/api/admin/applications` - POST

## Next Steps

### 1. Test Current Protection
Test endpoint yang sudah diproteksi:
```bash
# Should fail in Postman
POST http://localhost:3000/api/vouchers/request
POST http://localhost:3000/api/subscriptions/create  
POST http://localhost:3000/api/applications
```

### 2. If Still Working
Jika Postman masih bisa akses, kemungkinan:
1. **Endpoint belum pakai requireCSRF**
2. **Middleware terlalu permisif**
3. **CSRF validation tidak strict**

### 3. Verification Commands
```bash
# Test 1: Check CSRF token in browser
console.log(getCookie('csrf_token'));

# Test 2: Try POST without CSRF (should fail)
curl -X POST http://localhost:3000/api/test/csrf \
  -H "Content-Type: application/json" \
  -d '{}'

# Test 3: Try POST with CSRF (should work in browser)
fetch('/api/test/csrf', {
  method: 'POST',
  headers: { 'X-CSRF-Token': getCookie('csrf_token') }
});
```

## Expected Results

### ✅ Browser:
- GET requests → 200 OK
- POST dengan CSRF → 200 OK
- CSRF token → 64 characters

### ❌ Postman:
- GET requests → 200 OK (read-only)
- POST requests → 403 Forbidden
- Error message → "Requires CSRF token from browser"

### 🔍 Debug Information:
Jika Postman masih bisa POST, response akan menunjukkan:
- `csrf_received: "null"`
- `csrf_length: 0`
- `expected_length: 64`
- `fix: "Add requireCSRF wrapper"`

## Troubleshooting

### Jika Postman Masih Bisa POST:
1. **Check endpoint** → Pastikan pakai `requireCSRF`
2. **Check middleware** → Pastikan tidak di-bypass
3. **Check headers** → Postman tidak punya CSRF token
4. **Check session** → User harus login dulu

### Jika Browser Juga Gagal:
1. **Check login** → User harus terautentikasi
2. **Check CSRF token** → Harus ada di cookie
3. **Check headers** → X-CSRF-Token harus terkirim

### Jika GET Juga Diblokir:
1. **Check public routes** → GET harus selalu bisa
2. **Check middleware** → Jangan terlalu strict
3. **Check session** → GET tidak butuh session untuk test

## Success Criteria

✅ **Browser POST works** (dengan CSRF token)
❌ **Postman POST fails** (403 Forbidden)
✅ **Clear error message** (Requires CSRF token)
✅ **Debug information** (Helps identify issue)

Jika semua criteria terpenuhi, Postman benar-benar diblokir! 🛡️
