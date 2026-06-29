# Debug Session Blacklist Issue

## Masalah
Setelah logout, token masih bisa digunakan untuk API calls.

## Debugging Steps

### 1. Pastikan Migration Sudah Dijalankan
```bash
POST http://localhost:3000/api/admin/migrate/session-blacklist
```

### 2. Test dengan Debug Endpoint
```bash
# Sebelum logout
GET http://localhost:3000/api/debug/auth
Cookie: session=YOUR_SESSION_TOKEN

# Expected: 200 OK dengan user data
```

### 3. Logout
```bash
POST http://localhost:3000/api/auth/logout
Cookie: session=YOUR_SESSION_TOKEN
```

### 4. Test Lagi dengan Debug Endpoint
```bash
# Setelah logout
GET http://localhost:3000/api/debug/auth
Cookie: session=YOUR_SESSION_TOKEN

# Expected: 401 Unauthorized
```

### 5. Cek Console Logs
Lihat console server untuk logs:
- `invalidateSession: Starting session invalidation`
- `invalidateSession: Session blacklisted successfully`
- `isSessionBlacklisted: Checking if token is blacklisted`
- `isSessionBlacklisted: Token blacklisted: true/false`

### 6. Cek Database Manual
```sql
SELECT * FROM session_blacklist 
WHERE reason = 'logout' 
ORDER BY invalidated_at DESC;
```

## Yang Saya Sudah Perbaiki

### ✅ isSessionBlacklisted() - Lebih Efisien
```typescript
// Sebelumnya: Loop semua entries (inefisien)
for (const blacklisted of blacklistedSessions) {
  const isMatch = await compare(token, blacklisted.tokenHash);
  if (isMatch) return true;
}

// Sekarang: Direct query (efisien)
const tokenHash = await hash(token, SALT_ROUNDS);
const blacklisted = await db
  .select()
  .from(sessionBlacklist)
  .where(eq(sessionBlacklist.tokenHash, tokenHash))
  .limit(1);
return blacklisted.length > 0;
```

### ✅ Logging Lengkap
- `invalidateSession()` → Log saat mem-blacklist
- `isSessionBlacklisted()` → Log saat cek blacklist
- `getCurrentUser()` → Log saat validasi session

### ✅ Debug Endpoint
- `/api/debug/auth` → Test authentication dengan detail logging

## Test Instructions

1. **Login** → Dapatkan session token
2. **Test Debug** → `GET /api/debug/auth` → Harus 200
3. **Logout** → `POST /api/auth/logout` → Harus 200
4. **Test Debug Lagi** → `GET /api/debug/auth` → Harus 401
5. **Cek Console** → Lihat semua logs
6. **Cek Database** → Verify token di-blacklist

## Expected Console Output

### Saat Logout:
```
invalidateSession: Starting session invalidation
invalidateSession: Invalidating session for user: USER_ID
invalidateSession: Session blacklisted successfully for user: USER_ID
```

### Saat Test Setelah Logout:
```
getCurrentUser: Checking token validity
isSessionBlacklisted: Checking if token is blacklisted
isSessionBlacklisted: Token blacklisted: true
Blacklisted token detected, clearing session
```

Jika masih tidak berfungsi, lihat console logs untuk menemukan masalahnya!
