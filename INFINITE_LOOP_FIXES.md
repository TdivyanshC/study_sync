# Infinite Loop Fixes - React useEffect Dependencies

## Issues Fixed

### 1. **useStudySessionEnhanced.ts** - Timer and Heartbeat Loops
**Problem:** Object dependencies in useEffect causing infinite re-renders

**Location:** `frontend/src/hooks/useStudySessionEnhanced.ts`

**Before:**
```typescript
useEffect(() => {
  // ... timer logic
}, [store.isTimerRunning, store.currentSession]); // ❌ Object reference changes every render
```

**After:**
```typescript
useEffect(() => {
  // ... timer logic
}, [store.isTimerRunning, store.currentSession?.id, store.currentSession?.startTime]); // ✅ Primitive values
```

**Fixed Lines:**
- Line 319: Timer useEffect dependencies
- Line 334: Heartbeat useEffect dependencies

---

### 2. **useStreakEvents.ts** - Event Listener Loop
**Problem:** Callback functions in dependencies causing re-subscriptions

**Location:** `frontend/src/hooks/useStreakEvents.ts`

**Before:**
```typescript
useEffect(() => {
  // ... event listener setup
}, [userId, onStreakUpdated, onStreakContinuity, onStreakMilestone, onStreakBroken, onStreakBonus, enableDebug]);
// ❌ Callback functions change reference every render
```

**After:**
```typescript
useEffect(() => {
  // ... event listener setup
}, [userId, enableDebug]); // ✅ Only primitive values
```

**Fixed Line:** 166

---

### 3. **Home Screen XP Display** - Not Showing XP
**Problem:** XP field was set to 0 instead of fetching actual value

**Location:** `frontend/app/(tabs)/index.tsx`

**Before:**
```typescript
const [todayMetrics, setTodayMetrics] = useState({
  hoursStudied: 0,
  streak: 0,
  xpEarned: 0, // ❌ Always 0
  loading: true,
});

// In loadTodayMetrics:
setTodayMetrics({
  hoursStudied: ...,
  streak: xpStats.current_streak || 0,
  xpEarned: 0, // ❌ Not fetching actual XP
  loading: false,
});
```

**After:**
```typescript
const [todayMetrics, setTodayMetrics] = useState({
  hoursStudied: 0,
  streak: 0,
  xp: 0, // ✅ Renamed to xp
  level: 0, // ✅ Added level
  loading: true,
});

// In loadTodayMetrics:
setTodayMetrics({
  hoursStudied: Math.round((metrics.total_focus_time || 0) / 60 * 10) / 10,
  streak: xpStats.current_streak || 0,
  xp: xpStats.total_xp || 0, // ✅ Fetching actual XP
  level: xpStats.level || 0, // ✅ Fetching level
  loading: false,
});
```

**Display Update:**
```typescript
<Text style={styles.statNumber}>
  {todayMetrics.loading ? '...' : todayMetrics.xp} // ✅ Shows actual XP
</Text>
```

---

## Root Cause Analysis

### Why These Loops Happened:

1. **Object/Array Dependencies:**
   - React compares dependencies by reference, not value
   - Objects/arrays create new references on every render
   - New reference → useEffect runs → state update → re-render → new reference → infinite loop

2. **Function Dependencies:**
   - Callback functions passed as props create new references each render
   - Even with `useCallback`, parent re-renders can cause new function references
   - Solution: Don't include callbacks in dependencies, use them directly in handlers

3. **State Updates in useEffect:**
   - `setState` inside `useEffect` triggers re-render
   - If dependencies change on re-render, loop continues
   - Solution: Use primitive values or stable references as dependencies

---

## Best Practices to Avoid Infinite Loops:

### ✅ DO:
```typescript
// Use primitive values
useEffect(() => {
  // logic
}, [userId, count, isActive]);

// Use specific object properties
useEffect(() => {
  // logic
}, [user?.id, user?.name]);

// Use refs for stable references
const callbackRef = useRef(callback);
useEffect(() => {
  callbackRef.current = callback;
});
```

### ❌ DON'T:
```typescript
// Don't use objects directly
useEffect(() => {
  // logic
}, [user, config]); // ❌

// Don't use arrays directly
useEffect(() => {
  // logic
}, [items, data]); // ❌

// Don't include callbacks that change
useEffect(() => {
  // logic
}, [onUpdate, onDelete]); // ❌
```

---

## Testing Checklist

After these fixes, verify:

- [ ] Home screen loads without errors
- [ ] XP displays correctly (2,900 XP)
- [ ] Level displays correctly (Level 29)
- [ ] Streak displays correctly (3 days)
- [ ] Hours studied displays correctly (4.5 hours)
- [ ] Profile page loads without infinite loop errors
- [ ] No "Maximum update depth exceeded" errors in console
- [ ] Timer works without causing re-render loops
- [ ] Event listeners don't re-subscribe infinitely

---

## Current Test Data

From `backend/test_gamification_data.py`:

```
Username: jane_doe
XP: 2,900
Level: 29
Streak: 3 days
Today's Study Time: 270 minutes (4.5 hours)
Sessions Today: 6
Badges Earned: 3
```

All metrics should now display correctly on the frontend!
