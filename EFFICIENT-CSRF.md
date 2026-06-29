# Efficient CSRF Implementation

## Konsep
CSRF token hanya untuk write operations (POST/PUT/DELETE) di API level. Middleware tetap ringan, protection diimplementasikan per-endpoint.

## Architecture

### 1. Middleware (Ringan)
- **Session validation** → JWT format + expiration
- **CSRF token generation** → Untuk page requests
- **No CSRF validation** → Di middleware untuk performance

### 2. API Level Protection
- **requireCSRF wrapper** → Untuk write operations
- **GET requests** → Tidak perlu CSRF
- **POST/PUT/DELETE** → Wajib CSRF token

## Implementation

### Middleware (Ringan & Cepat)
```typescript
// Hanya basic validation + CSRF token generation
export function middleware(request: NextRequest) {
  // Public routes → Allow
  // Session check → Basic JWT validation
  // Page requests → Add CSRF token cookie
  // API requests → No CSRF validation (fast)
}
```

### API Wrapper (Selective Protection)
```typescript
import { requireCSRF } from '@/lib/api-csrf';

// GET - No CSRF needed
export async function GET(request: NextRequest) {
  return NextResponse.json({ data: [] });
}

// POST - CSRF required
export const POST = requireCSRF(async (request: NextRequest, user: any) => {
  // Logic hanya bisa diakses dari browser dengan CSRF token
  return NextResponse.json({ success: true });
});
```

## Access Control

### ✅ Browser (Sistem Anda)
- **GET /api/applications** → 200 OK (no CSRF)
- **POST /api/applications** → 200 OK (with CSRF token)
- **CSRF token** → Auto dari cookie

### ❌ External Tools (Postman/curl)
- **GET /api/applications** → 200 OK (read-only)
- **POST /api/applications** → 403 Forbidden (no CSRF)
- **CSRF token** → Tidak accessible

### ✅ Background Logging
- **POST /api/admin/activity-logs** → 200 OK (public route)
- **No CSRF required** → Background operations

## Performance Benefits

### ✅ Fast Middleware
- **No CSRF validation** → Di middleware
- **Basic JWT only** → Format + expiration check
- **Quick cookie operations** → Token generation only

### ✅ Selective Protection
- **GET requests** → No overhead
- **POST/PUT/DELETE** → CSRF validation only
- **API endpoints** → Protection per-endpoint

### ✅ Efficient Validation
- **Simple format check** → 64 character string
- **No database lookup** → Stateless validation
- **Fast execution** → Minimal overhead

## Usage Examples

### Frontend Implementation
```typescript
// Helper function
function getCSRFToken(): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrf_token=`);
  return parts.pop()?.split(';').shift() || null;
}

// Secure fetch
async function secureFetch(url: string, options: RequestInit = {}) {
  const token = getCSRFToken();
  
  if (options.method && options.method !== 'GET' && token) {
    options.headers = {
      ...options.headers,
      'X-CSRF-Token': token,
    };
  }
  
  return fetch(url, options);
}

// Usage
const response = await secureFetch('/api/applications', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### API Endpoint Examples
```typescript
// Read operations - No CSRF
export async function GET(request: NextRequest) {
  const data = await getData();
  return NextResponse.json(data);
}

// Write operations - CSRF required
export const POST = requireCSRF(async (request: NextRequest, user: any) => {
  const data = await request.json();
  const result = await createData(data, user.id);
  return NextResponse.json(result);
});

export const PUT = requireCSRF(async (request: NextRequest, user: any) => {
  const data = await request.json();
  const result = await updateData(data, user.id);
  return NextResponse.json(result);
});

export const DELETE = requireCSRF(async (request: NextRequest, user: any) => {
  const { id } = await request.json();
  await deleteData(id, user.id);
  return NextResponse.json({ success: true });
});
```

## Testing

### Browser Test (Should Work)
```javascript
// GET request
fetch('/api/applications');
// Response: 200 OK

// POST request dengan CSRF
fetch('/api/applications', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCookie('csrf_token')
  },
  body: JSON.stringify(data)
});
// Response: 200 OK
```

### Postman Test (Should Fail for Write)
```bash
# GET request - Works
curl -X GET http://localhost:3000/api/applications
# Response: 200 OK

# POST request - Fails
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"name":"test"}'
# Response: 403 Forbidden - Invalid CSRF token
```

## Security Benefits

### ✅ System Trust
- **CSRF token** → Hanya dari browser Anda
- **Session validation** → User authentication
- **Write protection** → Hanya sistem Anda
- **Read access** → Terbuka untuk debugging

### ✅ External Tool Blocking
- **Postman** → Read-only access
- **curl** → Read-only access
- **Mobile apps** → Read-only access
- **API clients** → Read-only access

### ✅ Performance Optimized
- **Fast middleware** → Minimal latency
- **Selective protection** → No unnecessary overhead
- **Efficient validation** → Simple format check
- **Scalable** → Works under high load

## Migration Steps

### 1. Update API Endpoints
```typescript
// Tambahkan requireCSRF wrapper untuk write operations
export const POST = requireCSRF(async (request, user) => {
  // Your existing logic
});
```

### 2. Update Frontend
```typescript
// Ganti fetch dengan secureFetch
import { secureFetch } from '@/lib/client-utils';

const response = await secureFetch('/api/data', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### 3. Test Coverage
- **Browser functionality** → Should work
- **Postman access** → Should be read-only
- **Performance** → Should be fast

## Result

**Sistem Anda tetap terpercaya dan performa tinggi!** 🚀

- **Browser** → Full access dengan CSRF
- **External tools** → Read-only access
- **Performance** → Middleware ringan
- **Security** → Write operations terlindungi
