# CSRF Token Implementation

## Konsep
Hanya sistem Anda (frontend) yang bisa menggunakan API karena membutuhkan CSRF token yang hanya tersedia di browser.

## Cara Kerja

### 1. Token Generation
- **Browser request** → Middleware generate CSRF token
- **Token disimpan** → Di cookie (httpOnly: false)
- **Token valid** → 1 jam

### 2. API Protection
- **GET requests** → Tidak perlu CSRF (read-only)
- **POST/PUT/DELETE** → Wajib include CSRF token
- **Invalid token** → 403 Forbidden

### 3. External Tools (Postman/curl)
- **Tidak ada CSRF token** → 403 Forbidden
- **Tidak bisa akses cookie** → HttpOnly tidak membantu
- **Hanya sistem Anda** → Yang bisa generate token

## Implementation

### Frontend Usage

#### 1. React Hook
```typescript
import { useCSRFToken, useSecureFetch } from '@/hooks/use-csrf';

function MyComponent() {
  const csrfToken = useCSRFToken();
  const secureFetch = useSecureFetch();

  const handleSubmit = async () => {
    const response = await secureFetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  };
}
```

#### 2. Manual Implementation
```typescript
import { getCSRFToken, fetchWithCSRF } from '@/lib/client-csrf';

// Get token from cookie
const token = getCSRFToken();

// Use secure fetch
const response = await fetchWithCSRF('/api/applications', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

#### 3. Manual Headers
```typescript
const token = getCookie('csrf_token');

fetch('/api/applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify(data)
});
```

### API Endpoint Examples

#### ✅ Valid Request (From Browser)
```javascript
// Browser dengan CSRF token
fetch('/api/applications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': 'abc123...'
  },
  body: JSON.stringify(data)
});
// Response: 200 OK
```

#### ❌ Invalid Request (Postman/curl)
```bash
# Postman tanpa CSRF token
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
# Response: 403 Forbidden - Invalid CSRF token
```

#### ✅ GET Request (No CSRF Needed)
```bash
curl -X GET http://localhost:3000/api/applications
# Response: 200 OK (GET tidak perlu CSRF)
```

## Security Benefits

### ✅ External Tool Protection
- **Postman** → Tidak bisa akses POST/PUT/DELETE
- **curl** → Tidak bisa akses POST/PUT/DELETE  
- **Mobile Apps** → Tidak bisa akses POST/PUT/DELETE
- **Third-party** → Tidak bisa akses POST/PUT/DELETE

### ✅ Internal System Access
- **Frontend** → Bisa akses semua API
- **GET requests** → Bisa dari mana saja (read-only)
- **POST/PUT/DELETE** → Hanya dari browser dengan token

### ✅ CSRF Attack Prevention
- **Cross-origin requests** → Tidak punya CSRF token
- **Form submissions** → Butuh valid token
- **API calls** → Butuh valid token

## Testing

### 1. Browser Test (Should Work)
```javascript
// Di browser console
fetch('/api/applications', {
  method: 'GET'
});
// Response: 200 OK

fetch('/api/applications', {
  method: 'POST',
  headers: { 'X-CSRF-Token': getCookie('csrf_token') }
});
// Response: 200 OK
```

### 2. Postman Test (Should Fail for POST)
```bash
# GET - Should work
curl -X GET http://localhost:3000/api/applications
# Response: 200 OK

# POST - Should fail
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
# Response: 403 Forbidden
```

### 3. CSRF Token Endpoint
```bash
# Get CSRF token
GET http://localhost:3000/api/csrf/token
# Response: { "csrfToken": "abc123...", "message": "CSRF token generated successfully" }
```

## Migration Steps

### 1. Update Frontend
```typescript
// Ganti semua fetch calls
// Sebelumnya:
fetch('/api/applications', { method: 'POST', body: data });

// Sekarang:
import { useSecureFetch } from '@/hooks/use-csrf';
const secureFetch = useSecureFetch();
secureFetch('/api/applications', { method: 'POST', body: data });
```

### 2. Update API Calls
```typescript
// Tambahkan CSRF token header
headers: {
  'Content-Type': 'application/json',
  'X-CSRF-Token': getCSRFToken()
}
```

### 3. Test Coverage
- ✅ Browser functionality
- ❌ External tool access
- ✅ GET requests work everywhere
- ❌ POST/PUT/DELETE blocked externally

## Result

**Hanya sistem Anda yang bisa menggunakan API untuk write operations!** 🛡️

- **Frontend** → Full access
- **Postman/curl** → Read-only access (GET only)
- **External tools** → Blocked from write operations
- **Security** → CSRF protection + session validation
