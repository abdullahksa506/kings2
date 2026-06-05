# Work Session: Restaurant Voting Feature

**Date:** 2026-06-05
**Branch:** `feat/voting`
**Model:** Claude Opus 4.5

---

## Feature Request

The user requested a new restaurant selection mechanism with three modes:

1. **الخيار الدكتاتوري (Dictatorial Option)** - King directly picks the restaurant (existing behavior)
2. **الخيار الديموقراطي (Democratic Option)** - King selects 3 restaurants, triggers a vote that other users participate in
3. **قمع صوت الجمهور (Suppress Public Voice)** - After democratic vote completes, King can override the result

---

## Requirements Gathering

### Questions Asked & Answers Received:

| Question | Answer |
|----------|--------|
| How should the voting period work? | **Time-based (24 hours)** |
| Should votes be visible during voting? | **Open ballot with anonymous counts** (show "3 votes", not who voted) |
| How to handle ties? | **Random selection** among tied candidates |
| How should King input candidates? | **Type 3 names manually** |
| Can users change their vote? | **No, vote is final** |
| Can absent members vote? | **Yes, everyone votes** |
| When can King override? | **Only after vote ends** |

### Deployment Constraint:
User explicitly requested **no cron jobs** - wanted to keep deployment simple. Solution: lazy expiration check in RPC backend.

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  RestaurantVotingPanel.tsx                                  │
│  ├── Mode Selection (King only)                             │
│  ├── Candidate Entry (3 inputs)                             │
│  ├── Voting Interface (anonymous counts + timer)            │
│  ├── Results Display                                        │
│  └── Override Option (King only, post-vote)                 │
├─────────────────────────────────────────────────────────────┤
│  Dashboard.tsx (integration)                                │
│  SmartReminders.tsx (voting reminders)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Next.js API)                     │
├─────────────────────────────────────────────────────────────┤
│  /api/rpc/route.ts                                          │
│  ├── startRestaurantVoting   (King starts 24h vote)         │
│  ├── submitRestaurantVote    (Member casts vote)            │
│  ├── endRestaurantVoting     (King ends early / auto-end)   │
│  ├── overrideRestaurantResult (King overrides)              │
│  ├── cancelRestaurantVoting  (King cancels mid-vote)        │
│  └── autoEndExpiredRestaurantVoting() (lazy 24h check)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database (Firestore)                       │
├─────────────────────────────────────────────────────────────┤
│  weeks collection                                           │
│  └── WeekSession document                                   │
│      ├── restaurantVotingMode: "dictatorial" | "democratic" │
│      ├── restaurantCandidates: [string, string, string]     │
│      ├── restaurantVotes: Record<userName, restaurantName>  │
│      ├── restaurantVotingStartedAt: Timestamp               │
│      ├── restaurantVotingEndedAt: Timestamp                 │
│      ├── restaurantVotingActive: boolean                    │
│      ├── restaurantVotingResult: string                     │
│      ├── restaurantOverridden: boolean                      │
│      └── restaurantOverrideValue: string                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Modified

### 1. `src/lib/services.ts`

**Changes:**
- Added 9 new fields to `WeekSession` interface (lines 37-46)
- Added 5 new service methods (lines 243-262)

```typescript
// New WeekSession fields
restaurantVotingMode?: "dictatorial" | "democratic";
restaurantCandidates?: [string, string, string];
restaurantVotes?: Record<string, string>; // userName -> restaurantName
restaurantVotingStartedAt?: Timestamp | null;
restaurantVotingEndedAt?: Timestamp | null;
restaurantVotingActive?: boolean;
restaurantVotingResult?: string | null;
restaurantOverridden?: boolean;
restaurantOverrideValue?: string | null;

// New service methods
startRestaurantVoting(weekId, candidates)
submitRestaurantVote(weekId, restaurant)
endRestaurantVoting(weekId)
overrideRestaurantResult(weekId, restaurant)
cancelRestaurantVoting(weekId)
```

### 2. `src/app/api/rpc/route.ts`

**Changes:**
- Added rate limiting rules (lines 24-29)
- Added `RESTAURANT_VOTING_DURATION_MS` constant (24 hours)
- Added `autoEndExpiredRestaurantVoting()` helper function (lines 106-152)
- Added 5 new RPC action cases (lines 426-573)

**RPC Actions:**

| Action | Auth | Description |
|--------|------|-------------|
| `startRestaurantVoting` | King only | Validates 3 unique candidates, starts 24h timer |
| `submitRestaurantVote` | Members (not King) | Uses Firestore transaction, final vote |
| `endRestaurantVoting` | King only | Counts votes, handles ties with random selection |
| `overrideRestaurantResult` | King only | Only after voting ended |
| `cancelRestaurantVoting` | King only | Clears all voting state |

**Lazy Expiration Check:**
```typescript
// Called before submitRestaurantVote and endRestaurantVoting
async function autoEndExpiredRestaurantVoting(weekRef) {
    // Check if voting is active
    // Check if 24h have passed since restaurantVotingStartedAt
    // If expired: count votes, pick winner (random on tie), update week
}
```

### 3. `src/components/RestaurantVotingPanel.tsx` (NEW FILE)

**Complete new component (~400 lines) handling all voting states:**

```typescript
interface RestaurantVotingPanelProps {
    currentWeek: WeekSession;
    userName: string;
    isKing: boolean;
    onRefresh: () => void;
    restaurant: string;        // For dictatorial mode
    setRestaurant: (value: string) => void;
}
```

**UI States:**
1. **Default** - Restaurant text input + "الخيار الديموقراطي" button (King only)
2. **Mode Selection** - 3 candidate inputs + start button (King only)
3. **Voting Active** - 3 candidate buttons with vote counts, 24h countdown timer
4. **Voting Ended** - Results display, override option (King only)

**Features:**
- Real-time countdown timer (hours/minutes/seconds)
- Anonymous vote counts with progress bars
- Purple theme for voting UI (distinct from amber restaurant theme)
- Confirmation dialogs for destructive actions

### 4. `src/components/Dashboard.tsx`

**Changes:**
- Added import for `RestaurantVotingPanel` (line 27)
- Replaced restaurant input section with new component (lines 1513-1520)

```tsx
<RestaurantVotingPanel
    currentWeek={currentWeek}
    userName={user?.name || ""}
    isKing={isKing}
    onRefresh={fetchWeek}
    restaurant={restaurant}
    setRestaurant={setRestaurant}
/>
```

### 5. `src/components/SmartReminders.tsx`

**Changes:**
- Added `Vote` icon import (line 4)
- Added restaurant voting reminder (lines 124-135)

```typescript
if (!isKing && currentWeek.restaurantVotingActive && !hasVotedRestaurant) {
    items.push({
        id: "restaurant-vote-pending",
        severity: "high",
        icon: Vote,
        title: "صوّت على المطعم! 🗳️",
        body: "التصويت الديموقراطي مفتوح. اختر مطعمك المفضل.",
    });
}
```

---

## User Flow

### Flow 1: Dictatorial (Default)
```
King → Types restaurant name → Saves choices → Done
```

### Flow 2: Democratic
```
King → Clicks "الخيار الديموقراطي"
     → Enters 3 restaurant names
     → Clicks "ابدأ التصويت (24 ساعة)"
     → Members see voting UI with 3 options
     → Members vote (final, no changing)
     → Vote counts display anonymously
     → After 24h OR King clicks "إنهاء التصويت":
         → Winner determined (random on tie)
         → Restaurant set automatically
```

### Flow 3: Override (Post-Vote)
```
After democratic vote ends:
King → Clicks "قمع صوت الجمهور"
     → Enters different restaurant name
     → Confirms override
     → New restaurant set, marked as overridden
```

---

## Edge Cases Handled

| Case | Handling |
|------|----------|
| Tie votes | Random selection among tied candidates |
| No votes cast | Random selection from 3 candidates |
| 24h expires | Lazy auto-end on next RPC call |
| Cancel mid-vote | Clears all voting fields, reverts to dictatorial |
| Override same as winner | Still marked as overridden for transparency |
| King tries to vote | Blocked with error message |
| Double voting | Blocked - "صوتك محفوظ ولا يمكن تغييره" |
| Empty/duplicate candidates | Validation error on start |

---

## Verification

### TypeScript Diagnostics
All modified files passed TypeScript checks with no errors:
- `src/lib/services.ts` ✓
- `src/app/api/rpc/route.ts` ✓
- `src/components/RestaurantVotingPanel.tsx` ✓
- `src/components/Dashboard.tsx` ✓
- `src/components/SmartReminders.tsx` ✓

### Testing Checklist
- [ ] King can start voting with 3 candidates
- [ ] Members see voting options and can vote
- [ ] Vote counts display anonymously
- [ ] 24h countdown timer works
- [ ] King can end voting early
- [ ] Tie-breaker randomly selects winner
- [ ] King can override result after voting ends
- [ ] King can cancel voting mid-way
- [ ] Smart reminder shows for members who haven't voted
- [ ] Real-time updates work (Firestore onSnapshot)

---

## Plan File

The detailed implementation plan was saved at:
`C:\Users\HishamAlkahtani\.claude\plans\vivid-bouncing-treehouse.md`

---

## Session Statistics

- **Total files created:** 1 (RestaurantVotingPanel.tsx)
- **Total files modified:** 4 (services.ts, route.ts, Dashboard.tsx, SmartReminders.tsx)
- **Lines of code added:** ~550
- **New RPC actions:** 5
- **New service methods:** 5
- **New WeekSession fields:** 9
