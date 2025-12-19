# OAuth Parameter Passing Fix

## Issue Identified

After the initial OAuth redirect fix, a new issue emerged where the authorization code wasn't being passed to the auth callback route, resulting in:

```
LOG  🔔 OAuth callback received
LOG  URL params: {}
ERROR OAuth callback error: No authorization code found in callback
```

## Root Cause

The deep link handler in `_layout.tsx` was navigating to `/auth/callback` but wasn't passing the URL parameters (specifically the `code` parameter) to the route.

**Before:**
```typescript
router.push('/auth/callback'); // Parameters lost!
```

**After:**
```typescript
// Extract parameters from URL
const urlObj = new URL(url);
const params = Object.fromEntries(urlObj.searchParams.entries());

console.log('📋 Extracted OAuth parameters:', params);

// Navigate to auth callback with parameters
router.push({
  pathname: '/auth/callback',
  params: params
});
```

## Changes Made

### 1. Enhanced Deep Link Parameter Passing (`frontend/app/_layout.tsx`)

**Key improvements:**
- Extract URL parameters using `URL` and `URLSearchParams`
- Convert parameters to object format for Expo Router
- Use `router.push({ pathname, params })` to preserve parameters
- Added detailed logging for debugging

### 2. Enhanced Auth Callback Debugging (`frontend/app/auth/callback.tsx`)

**Added comprehensive debugging:**
```typescript
console.log('🔔 OAuth callback received');
console.log('URL params:', params);
console.log('All params object:', JSON.stringify(params, null, 2));

if (!code) {
  console.error('❌ No code found in params. Available params:', Object.keys(params));
  console.error('❌ Full params object:', params);
  throw new Error(`No authorization code found in callback. Available params: ${Object.keys(params).join(', ')}`);
}
```

## Navigation Flow (Updated)

1. **Deep link received**: `exp://192.168.1.9:8081?code=78b7afaa-af04-4aa9-b7db-a5f5c1cfd70d`
2. **Deep link handler extracts**: `{ code: "78b7afaa-af04-4aa9-b7db-a5f5c1cfd70d" }`
3. **Navigate with parameters**: `router.push({ pathname: '/auth/callback', params: { code: "..." } })`
4. **Auth callback receives**: `params.code = "78b7afaa-af04-4aa9-b7db-a5f5c1cfd70d"`
5. **Success**: Authorization code found → session exchange → navigate to home

## Debugging Information

When testing, look for these log entries:

### Successful Flow:
```
LOG  🔗 Deep link handler processing URL: exp://192.168.1.9:8081?code=...
LOG  📋 Extracted OAuth parameters: {code: "..."}
LOG  🔄 OAuth callback detected, navigating to auth callback
LOG  🔔 OAuth callback received
LOG  URL params: {code: "..."}
LOG  All params object: {"code": "..."}
LOG  ✅ Authorization code received
```

### Failed Flow (if still broken):
```
LOG  🔗 Deep link handler processing URL: exp://192.168.1.9:8081?code=...
LOG  📋 Extracted OAuth parameters: {code: "..."}
LOG  🔄 OAuth callback detected, navigating to auth callback
LOG  🔔 OAuth callback received
LOG  URL params: {}
LOG  All params object: {}
ERROR ❌ No code found in params. Available params: []
```

## Testing the Fix

1. Start the app and attempt Google OAuth
2. Check console logs for "📋 Extracted OAuth parameters"
3. Verify auth callback receives the parameters
4. Confirm successful navigation to home page

## Additional Notes

- This fix ensures URL parameters are properly passed through the routing system
- Enhanced debugging will help identify any remaining parameter passing issues
- The solution maintains compatibility with Expo Router's parameter passing system