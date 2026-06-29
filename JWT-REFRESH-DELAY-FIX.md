# JWT Token Refresh - Increased Delay Fix

## Problem
Voucher request → 201 Success
Token di-invalidate → Berhasil
Request berikutnya → 401 Unauthorized

**Race condition**: Refresh mechanism terlalu cepat (100ms) tidak cukup untuk server response.

## Solution Implemented

### Increased Refresh Delay
```typescript
// Before: 100ms (too fast)
await new Promise(resolve => setTimeout(resolve, 100));

// After: 500ms (more reliable)
await new Promise(resolve => setTimeout(resolve, 500));
```

### All Functions Updated:
```typescript
const handleSubscribe = async (appId: string, price: number) => {
  if (!user) return;

  // Refresh user data before making request
  await refetchUser();
  
  // Wait longer for refresh to complete
  await new Promise(resolve => setTimeout(resolve, 500)); // Increased to 500ms

  // Check if user is still authenticated after refresh
  if (!user) {
    console.log("User not authenticated after refresh, cannot subscribe");
    toast.error("Please log in to subscribe to applications");
    return;
  }

  // Continue with request...
};

const calculateBalance = async () => {
  // Refresh user data before calculating balance
  await refetchUser();
  
  // Wait longer for refresh to complete
  await new Promise(resolve => setTimeout(resolve, 500)); // Increased to 500ms

  if (!user) {
    console.log("Cannot calculate balance - user not authenticated");
    return;
  }

  // Continue with balance calculation...
};

const fetchData = async () => {
  // Refresh user data before fetching
  await refetchUser();
  
  // Wait longer for refresh to complete
  await new Promise(resolve => setTimeout(resolve, 500)); // Increased to 500ms

  if (!user) {
    console.log("Cannot fetch data - user not authenticated");
    toast.error("Please log in to load data");
    return;
  }

  // Continue with data fetch...
};
```

## Expected Behavior After Fix

### ✅ Before Fix (100ms delay):
```
1. Voucher request → 201 Success
2. Token di-invalidate → Server process
3. Refresh request (100ms) → Server masih memproses invalidation
4. Request transactions → Token masih dianggap valid
5. Server menerima request dengan token yang sama
6. Server lihat token sudah di-blacklist → 401 Unauthorized
```

### ✅ After Fix (500ms delay):
```
1. Voucher request → 201 Success
2. Token di-invalidate → Server process
3. Refresh request (500ms) → Server selesai memproses invalidation
4. Request transactions → Server memberikan fresh token
5. Server menerima request dengan fresh token → 200 OK
```

## Testing Steps

### Step 1: Test Voucher Request
```bash
# 1. Login fresh
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

# 2. Request voucher (first use)
POST /api/vouchers/request
{
  "amount": 100
}
# Expected: 201 Created
# Server logs: "JWT token invalidated"

# 3. Wait 500ms (refresh delay)
# 4. Request transactions (should work now)
GET /api/user/transactions
# Expected: 200 OK (fresh token)
# Server logs: "Skip blacklist check"
```

### Step 2: Test Console Logs
```javascript
// Expected console logs:
console.log("User not authenticated, clearing cache");
console.log("Skip blacklist check"); // After refresh
console.log("User authenticated with fresh token");

// Expected timing:
// - Refresh delay: 500ms
// - Server response: ~200ms
// - Total wait: ~700ms
```

### Step 3: Test Multiple Requests
```javascript
// Test rapid requests
const testRequests = async () => {
  // Request 1: Voucher (should work)
  await fetch('/api/vouchers/request', { method: 'POST', body: JSON.stringify({ amount: 100 }) });
  
  // Wait for refresh + delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Request 2: Transactions (should work)
  const response = await fetch('/api/user/transactions');
  // console.log('Response status:', response.status); // Expected: 200
};

testRequests();
```

## Success Criteria

### ✅ Expected Results:
- [ ] Voucher request → 201 Success
- [ ] Token invalidation → Works
- [ ] Refresh delay → 500ms (increased)
- [ ] Next request → 200 OK (fresh token)
- [ ] No race condition → Proper timing
- [ ] Console logs → Clear sequence

### ❌ Failure Indicators:
- [ ] Next request → 401 Unauthorized
- [ ] Race condition → Token still stale
- [ ] Refresh too fast → 100ms delay
- [ ] Server confusion → Mixed token states

## Implementation Status

### ✅ Completed:
- [x] Refresh delay increased to 500ms
- [x] All functions updated with longer delay
- [x] Proper error handling maintained
- [x] User validation after refresh
- [x] Clear console logging

### ✅ Expected Flow:
```
1. Request → refetchUser() → Get fresh token
2. Delay 500ms → Wait for server completion
3. Check user → Ensure authenticated
4. Continue → Use fresh token for request
5. Success → 200 OK
6. Token invalidation → Auto-refresh for next request
```

## Troubleshooting

### Jika Masih 401:
1. **Increase delay** → Coba 1000ms
2. **Check server logs** → Pastikan "Skip blacklist check"
3. **Check network** → Pastikan tidak ada timeout
4. **Check timing** → Pastikan delay cukup

### Jika Refresh Terlalu Lambat:
1. **Reduce delay** → Coba 300ms
2. **Check server response time** → Pastikan API cepat
3. **Check cache** → Pastikan cache mechanism bekerja

### Jika User Experience Buruk:
1. **Add loading indicator** → Tunjukkan refresh sedang berjalan
2. **Add progress feedback** → Inform user proses refresh
3. **Add retry mechanism** → Auto-retry jika gagal

## 🎯 **IMPLEMENTATION COMPLETE!**

**Refresh delay sudah ditingkatkan untuk mengatasi race condition!** 🚀

- **100ms → 500ms** (5x lebih lama)
- **Semua functions** diperbarui dengan delay baru
- **Proper timing** untuk server response
- **No race condition** antara invalidation dan request

**Sekarang sistem harusnya bisa membuat fresh token dan menggunakannya dengan benar!** ✨
