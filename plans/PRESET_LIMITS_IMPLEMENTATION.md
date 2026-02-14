# Preset Limits Implementation Plan

## Problem Statement

The application has preset limits defined in the codebase but they are not being enforced:
- **Echo plan**: Limited to 2 custom presets
- **Clone plan**: Limited to 10 custom presets
- **Syndicate plan**: Unlimited custom presets

Currently, all plans allow unlimited custom presets because the limit check is missing in the preset save flow.

## Analysis

### Existing Code Structure

1. **Preset Limits Defined** in [`types.ts`](../../types.ts:17):
   ```typescript
   export const PRESET_LIMITS: Record<UserPlan, number> = {
     echo: 2,
     clone: 10,
     syndicate: -1, // -1 means unlimited
   };
   ```

2. **Helper Function** in [`constants.ts`](../../constants.ts:4):
   ```typescript
   export function canAddPreset(plan: UserPlan, currentPresetCount: number): boolean {
     const limit = PRESET_LIMITS[plan];
     if (limit === -1) return true; // Unlimited
     return currentPresetCount < limit;
   }
   ```

3. **User Plan** in [`Dashboard.tsx`](../../components/Dashboard.tsx:124):
   ```typescript
   const userPlan = user?.plan || 'echo';
   ```

4. **Presets Loaded** in [`dbService.ts`](../../dbService.ts:138):
   - Returns system presets + user custom presets
   - Custom presets have `isCustom: true` property

5. **Save Preset Handler** in [`Dashboard.tsx`](../../components/Dashboard.tsx:156-178):
   - Currently does NOT check preset limits before saving

## Implementation Steps

### Step 1: Import Required Functions (Dashboard.tsx)

Add import for `canAddPreset` from `../constants`:

```typescript
import { canAddPreset, getPresetLimit } from '../constants';
```

### Step 2: Calculate Custom Preset Count (Dashboard.tsx)

Add a derived value after the presets state is populated:

```typescript
// Count custom presets (user-created, not system presets)
const customPresetCount = presets.filter(p => p.isCustom === true).length;

// Check if user can add more presets
const canAddMorePresets = canAddPreset(userPlan, customPresetCount);

// Get the limit for display
const presetLimit = getPresetLimit(userPlan);
```

### Step 3: Modify Save Preset Button (Dashboard.tsx)

Disable the save preset button when limit is reached:

```typescript
// In the save preset button, add disabled state:
disabled={activeTab !== 'text' || !referenceText.trim() || !canAddMorePresets}
```

Also add a tooltip showing the limit when disabled due to limit reached:

```typescript
{!canAddMorePresets && (
  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border">
    {userPlan === 'syndicate' ? 'Share with team instead' : `Limit reached (${presetLimit} presets)`}
  </div>
)}
```

### Step 4: Add Limit Check in handleSavePreset (Dashboard.tsx)

Add validation at the start of the save function:

```typescript
const handleSavePreset = async () => {
  // Check preset limit
  if (!canAddMorePresets) {
    setErrorMessage(`You have reached your preset limit (${presetLimit} custom presets). Upgrade to add more.`);
    setShowSavePresetModal(false);
    return;
  }
  
  if (!newPresetName.trim() || !user) return;
  // ... rest of the function
};
```

### Step 5: Add Visual Indicator in Save Modal (Dashboard.tsx)

Add a status message in the save preset modal showing current count:

```typescript
// Inside the save preset modal, add:
{presetLimit !== -1 && (
  <p className="text-xs text-textMuted mb-4">
    {customPresetCount} / {presetLimit} custom presets used
  </p>
)}
```

### Step 6: Show Upgrade Option When Limit Reached (Dashboard.tsx)

Instead of just showing an error, show the upgrade modal:

```typescript
const handleSavePreset = async () => {
  // Check preset limit
  if (!canAddMorePresets) {
    setShowSavePresetModal(false);
    setShowUpgradeModal(true);
    return;
  }
  // ...
};
```

## Files to Modify

| File | Changes |
|------|---------|
| `components/Dashboard.tsx` | Add import, calculate custom preset count, modify button, add limit check in handler, add visual indicator |

## Testing Checklist

1. **Echo plan user**: 
   - Should be able to create 2 custom presets
   - Should see error/upgrade prompt on 3rd attempt
   - "Save Preset" button should show remaining count

2. **Clone plan user**:
   - Should be able to create 10 custom presets
   - Should see error/upgrade prompt on 11th attempt

3. **Syndicate plan user**:
   - Should have unlimited custom presets (no limit)
   - "Save Preset" button should not show limit

4. **Delete preset behavior**:
   - Deleting a preset should free up space for another preset

## Edge Cases

- User with no presets (count = 0) should be able to create presets
- Shared team presets should NOT count against individual user limit
- System presets should NOT count (only user-created with `isCustom: true`)

## Summary

The implementation adds a simple check before allowing users to save new custom presets, utilizing the existing `PRESET_LIMITS` and `canAddPreset` helper functions that were already defined but not being used. This ensures each plan adheres to its documented limits without breaking any existing functionality.
