# One-Time JWT Token Implementation

## Konsep
JWT Token sekali pakai - setelah digunakan langsung di-destroy dan tidak bisa dipakai lagi.

## Implementation

### 1. JWT Blacklist System
- Token di-hash dan disimpan di `session_blacklist` table
- Setiap request cek apakah token sudah pernah dipakai
- Jika sudah pernah dipakai → 401 Unauthorized

### 2. Auto-Invalidate After Use
- Setiap API yang berhasil (2xx) akan auto-invalidate token
- Session cookie di-clear
- Token ditambahkan ke blacklist

## Testing

### Step 1: Login
```javascript
// Login dapat token
POST /api/auth/login
// Response: session cookie dengan JWT token
```

### Step 2: First Use (Works)
```javascript
// First API call - works
POST /api/vouchers/request
// Response: 201 OK + session cookie cleared
```

### Step 3: Second Use (Failed)
```javascript
// Second API call dengan token sama - failed
POST /api/vouchers/request  
// Response: 401 Unauthorized - token already used
```

## Expected Behavior

### ✅ First Request:
- Token valid → Success
- Token di-invalidate → Blacklisted
- Session cookie cleared → Need new login

### ❌ Second Request:
- Token di blacklist → 401 Unauthorized
- Error message: "JWT token already used"

## Security Benefits
- Token tidak bisa dipakai ulang
- Auto-logout setelah setiap action
- Mencegah token reuse attack
