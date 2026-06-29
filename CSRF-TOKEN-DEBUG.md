# CSRF Token Debugging - Token Tidak Ditemukan

## Masalah
```
CSRF Validation (Strict): {
  csrfFromHeaders: 'undefined...',  // ← Tidak ada token di headers
  csrfFromCookies: '6fb093266e...', // ← Ada token di cookies
  tokenLength: 0                 // ← Length = 0 (karena undefined)
}
```

**Root Cause:** `getCSRFToken()` function tidak menemukan token dari cookies.

## Debugging Steps

### Step 1: Check Browser Console
Buka browser console dan refresh halaman marketplace:

```javascript
// 1. Check semua cookies
console.log('All cookies:', document.cookie);

// 2. Check CSRF cookie spesifik
const cookies = document.cookie.split('; ');
const csrfCookie = cookies.find(row => row.trim().startsWith('csrf_token='));
console.log('CSRF cookie found:', csrfCookie);

// 3. Check token extraction
if (csrfCookie) {
  const token = csrfCookie.split('=')[1];
  console.log('CSRF token:', token);
  console.log('CSRF token length:', token?.length);
}
```

### Step 2: Check Server Logs (Middleware)
Lihat server logs untuk middleware:

```
Middleware: Setting CSRF token: {
  url: "http://localhost:3000/dashboard/marketplace",
  token: "abc123...",
  length: 64,
  httpOnly: false,
  path: "/"
}
```

### Step 3: Test Manual Token Setting
Jika token tidak ada, coba manual:

```javascript
// Di browser console
document.cookie = "csrf_token=test123456789012345678901234567890123456789012345678901234567890; path=/; SameSite=strict";

// Test token
console.log('Manual token:', getCookie('csrf_token'));
```

## Possible Solutions

### Solution 1: Fix Cookie Parsing
Jika `getCSRFToken()` tidak bekerja:

```typescript
function getCSRFToken(): string | null {
  // Debug semua cookies
  console.log('Raw cookies:', document.cookie);
  
  // Split dan trim dengan benar
  const cookies = document.cookie.split(';').map(c => c.trim());
  console.log('Split cookies:', cookies);
  
  // Cari CSRF cookie
  const csrfCookie = cookies.find(cookie => 
    cookie.startsWith('csrf_token=')
  );
  console.log('CSRF cookie found:', csrfCookie);
  
  if (csrfCookie) {
    const token = csrfCookie.substring('csrf_token='.length);
    console.log('Extracted token:', token?.slice(0, 10) + '...');
    console.log('Token length:', token?.length);
    return token;
  }
  
  return null;
}
```

### Solution 2: Check Cookie Domain
Pastikan cookie domain benar:

```javascript
// Check cookie details
console.log('Cookie details:');
document.cookie.split(';').forEach(cookie => {
  const [name, value] = cookie.trim().split('=');
  if (name === 'csrf_token') {
    console.log('Name:', name);
    console.log('Value:', value?.slice(0, 10) + '...');
    console.log('Length:', value?.length);
  }
});
```

### Solution 3: Force Token Refresh
Jika token tidak ada, refresh halaman:

```javascript
// Refresh untuk dapat token baru
window.location.reload();

// Atau request token baru
fetch('/api/debug/csrf')
  .then(r => r.json())
  .then(data => {
    console.log('Token from server:', data.csrf_info);
  });
```

## Expected Console Output

### ✅ Working Case:
```
All cookies: "session=abc123; csrf_token=6fb093266e789012345678901234567890123456789012345678901234567890; user_id=456"
CSRF cookie found: "csrf_token=6fb093266e789012345678901234567890123456789012345678901234567890"
CSRF token extracted: "6fb093266e..."
CSRF token length: 64
SecureFetch Debug: {
  url: "/api/vouchers/request",
  method: "POST",
  csrfToken: "6fb093266e...",
  tokenLength: 64
}
```

### ❌ Broken Case:
```
All cookies: "session=abc123; user_id=456"
CSRF cookie found: undefined
CSRF cookie not found!
SecureFetch Debug: {
  url: "/api/vouchers/request", 
  method: "POST",
  csrfToken: null,
  tokenLength: 0
}
```

## Server vs Client Debug

### ✅ Server Logs (Should Show):
```
Middleware: Setting CSRF token: {
  url: "/dashboard/marketplace",
  token: "6fb093266e...",
  length: 64,
  httpOnly: false,
  path: "/"
}
```

### ❌ Client Logs (Current Issue):
```
All cookies: "session=abc123; csrf_token=6fb093266e..."  ← Token ada
CSRF cookie found: undefined                              ← Tidak ditemukan?!
CSRF cookie not found!                                 ← Padahal ada
```

## Fix Implementation

### Update getCSRFToken Function:
```typescript
function getCSRFToken(): string | null {
  const cookies = document.cookie;
  console.log('All cookies:', cookies);
  
  // Debug: split cookies
  const cookieArray = cookies.split(';').map(c => c.trim());
  console.log('Cookie array:', cookieArray);
  
  // Cari dengan multiple methods
  let csrfCookie = cookieArray.find(row => row.startsWith('csrf_token='));
  
  // Alternative method
  if (!csrfCookie) {
    csrfCookie = cookieArray.find(row => row.includes('csrf_token'));
  }
  
  console.log('CSRF cookie found:', csrfCookie);
  
  if (csrfCookie) {
    const parts = csrfCookie.split('=');
    const token = parts.length > 1 ? parts[1] : '';
    console.log('CSRF token extracted:', token?.slice(0, 10) + '...');
    console.log('CSRF token length:', token?.length || 0);
    return token || null;
  }
  
  console.log('CSRF cookie not found!');
  return null;
}
```

## Testing After Fix

### Step 1: Refresh Page
1. Buka `/dashboard/marketplace`
2. Check console untuk middleware logs
3. Check console untuk client logs

### Step 2: Test Voucher Request
```javascript
// Test voucher request
const token = getCSRFToken();
console.log('Token before request:', token?.slice(0, 10) + '...');

fetch('/api/vouchers/request', {
  method: 'POST',
  headers: { 'X-CSRF-Token': token }
});
```

### Step 3: Check Server Response
Server logs should show:
```
CSRF Validation (Strict): {
  method: 'POST',
  user: 'ikhsanefendi59@gmail.com',
  csrfFromHeaders: '6fb093266e...',  ← ← Should show token!
  tokenLength: 64               ← ← Should be 64!
}
```

## Success Criteria

### ✅ Console Logs:
- [ ] All cookies menunjukkan csrf_token
- [ ] CSRF cookie found menunjukkan cookie
- [ ] Token extracted menunjukkan 64 chars
- [ ] SecureFetch Debug menunjukkan tokenLength = 64

### ✅ Server Logs:
- [ ] Middleware men-set token dengan length = 64
- [ ] CSRF Validation menunjukkan csrfFromHeaders ada
- [ ] Token length = 64
- [ ] Response 200 OK

**Setelah diperbaiki, token harus ditemukan dan terkirim dengan benar! 🎯**
