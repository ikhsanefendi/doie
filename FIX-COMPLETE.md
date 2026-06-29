# Fix Complete - Database & CSRF Token Issues

## Masalah yang Diperbaiki

### ✅ 1. Database Table Fixed
- **Error**: `session_blacklist" does not exist`
- **Solution**: Migration endpoint dibuat dan dijalankan
- **Result**: Table berhasil dibuat

### ✅ 2. CSRF Token Detection Improved
- **Error**: `csrfFromHeaders: 'undefined...'` (token tidak ditemukan)
- **Solution**: Regex method + fallback method
- **Result**: Token harusnya bisa ditemukan sekarang

## Testing Instructions

### Step 1: Verify Migration Success
Buka browser dan akses:
```
http://localhost:3000/api/migrate/session-blacklist
```
Expected Response:
```json
{
  "success": true,
  "message": "Session blacklist table created successfully"
}
```

### Step 2: Test CSRF Token Detection
Refresh halaman marketplace dan lihat console:

#### ✅ Expected Console Logs:
```
All cookies: "session=abc123; csrf_token=6fb093266e789012345678901234567890123456789012345678901234567890"
CSRF token extracted (regex): "6fb093266e..."
CSRF token length: 64
```

#### ✅ Expected Server Logs:
```
Middleware: Setting CSRF token: {
  url: "/dashboard/marketplace",
  token: "6fb093266e...",
  length: 64,
  httpOnly: false,
  path: "/"
}
```

### Step 3: Test Voucher Request (Should Work)
```javascript
// Di browser console setelah refresh
const token = getCSRFToken();
console.log('Token before request:', token?.slice(0, 10) + '...');
console.log('Token length:', token?.length);

// Test voucher request
fetch('/api/vouchers/request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify({ amount: 100 })
})
.then(r => r.json())
.then(console.log);
```

Expected Response:
```json
{
  "success": true,
  "message": "Voucher request submitted successfully"
}
```

Expected Server Logs:
```
CSRF Validation (Strict): {
  method: 'POST',
  user: 'ikhsanefendi59@gmail.com',
  csrfFromHeaders: '6fb093266e...',  // ← Should show token!
  tokenLength: 64,                     // ← Should be 64!
  strict: true
}
```

### Step 4: Test Postman (Should Fail)
```bash
# Should fail - no CSRF token
curl -X POST http://localhost:3000/api/vouchers/request \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

Expected Response:
```json
{
  "error": "Forbidden - Invalid CSRF token",
  "message": "This action requires a valid X-CSRF-Token header from browser"
}
```

## Debug Information

### ✅ Working Case (Browser):
```
Client Console:
All cookies: "session=abc123; csrf_token=6fb093266e..."
CSRF token extracted (regex): "6fb093266e..."
CSRF token length: 64

SecureFetch Debug: {
  url: "/api/vouchers/request",
  method: "POST",
  csrfToken: "6fb093266e...",
  tokenLength: 64
}

Server Logs:
CSRF Validation (Strict): {
  method: 'POST',
  user: 'ikhsanefendi59@gmail.com',
  csrfFromHeaders: '6fb093266e...',
  tokenLength: 64,
  strict: true
}
```

### ❌ Broken Case (Current Issue):
```
Client Console:
All cookies: "session=abc123; csrf_token=6fb093266e..."
CSRF cookie found (fallback): undefined
CSRF cookie not found!

SecureFetch Debug: {
  csrfToken: null,
  tokenLength: 0
}

Server Logs:
CSRF Validation (Strict): {
  csrfFromHeaders: 'undefined...',
  tokenLength: 0
}
```

## Enhanced getCSRFToken Function

### ✅ Regex Method (Primary):
```typescript
const match = cookies.match(/csrf_token=([^;]+)/);
if (match && match[1]) {
  console.log('CSRF token extracted (regex):', match[1].slice(0, 10) + '...');
  console.log('CSRF token length:', match[1].length);
  return match[1];
}
```

### ✅ Fallback Method (Secondary):
```typescript
const csrfCookie = cookies
  .split('; ')
  .find(row => row.trim().startsWith('csrf_token='));

if (csrfCookie) {
  const token = csrfCookie.split('=')[1];
  console.log('CSRF token extracted (fallback):', token?.slice(0, 10) + '...');
  return token;
}
```

## Success Criteria

### ✅ Database Migration:
- [ ] POST `/api/migrate/session-blacklist` → 200 OK
- [ ] Table `session_blacklist` created
- [ ] No more "does not exist" errors

### ✅ CSRF Token Detection:
- [ ] Console shows "All cookies" dengan csrf_token
- [ ] Console shows "CSRF token extracted (regex)"
- [ ] Console shows "CSRF token length: 64"
- [ ] secureFetch Debug shows tokenLength = 64

### ✅ Voucher Request:
- [ ] Browser POST request → 200 OK
- [ ] Server logs show csrfFromHeaders ada
- [ ] Server logs show tokenLength = 64
- [ ] Response success

### ❌ Postman Blocking:
- [ ] POST request → 403 Forbidden
- [ ] Server logs show csrfFromHeaders null
- [ ] Server logs show tokenLength = 0
- [ ] Clear error message

## Troubleshooting

### Jika Token Masih Tidak Ditemukan:
1. **Refresh halaman** → Get new CSRF token
2. **Check cookies** → `document.cookie` harus ada csrf_token
3. **Check console** → Lihat "All cookies" log
4. **Check regex** → Test di console: `/csrf_token=([^;]+)/.exec(cookies)`

### Jika Migration Gagal:
1. **Check server running** → `localhost:3000` harus aktif
2. **Check endpoint** → `/api/migrate/session-blacklist` harus ada
3. **Check database** → PostgreSQL harus connected
4. **Check logs** → Lihat error details

### Jika Postman Masih Bisa:
1. **Check server logs** → Harus show tokenLength = 0
2. **Check response** → Harus 403 Forbidden
3. **Check headers** → Tidak boleh ada X-CSRF-Token

**Setelah kedua fix diterapkan, aplikasi Anda harusnya bisa melakukan voucher request! 🎯**

Browser → Bisa akses dengan CSRF token
Postman → Diblokir tanpa CSRF token
Database → Session blacklist table exists
