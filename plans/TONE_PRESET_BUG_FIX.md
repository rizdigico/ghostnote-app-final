# Tone Preset Bug Fix - Implementation Plan

## Problem Statement

When users select "Casual Tech Bro" as the base voice, they can use tone presets (storyteller, minimalist, viral, academic, closer) as style injections. However, when they change the base voice to something else like "Angry Chef", the tone preset gets auto-set and cannot be changed to other options.

## Root Cause Analysis

### The Issue

There are **TWO separate issues** causing this behavior:

### Issue 1: Conflicting UI Controls

In `components/Dashboard.tsx`, there are TWO controls that both modify the same `selectedPresetId` state:

1. **StyleMixer Component** (lines 933-941):
   - "THE BASE (Primary Voice)" dropdown - shows only non-system presets (base voices)
   - "Add Style Injection" button - adds system presets as injections
   - Uses `onPrimaryVoiceChange` handler

2. **Separate "Tone Preset" Dropdown** (lines 944-951):
   - Shows ALL presets (system + voice + custom)
   - Uses `handlePresetChange` handler
   - Both controls update the SAME `selectedPresetId` state

When user changes base voice via StyleMixer, it updates `selectedPresetId`. The separate dropdown also uses the same state, causing conflicts.

### Issue 2: Preset Loading Order

In `dbService.ts` line 155:
```javascript
return [...SYSTEM_PRESETS, ...VOICE_PRESETS, ...userVoices];
```

The loading order is:
1. SYSTEM_PRESETS (tone presets) - "The Closer", "The Storyteller", etc.
2. VOICE_PRESETS (base voices) - "Casual Tech Bro", "Angry Chef", etc.
3. User custom presets

When app loads, default selection is `voices[0].id` = "sys-closer" (a TONE preset, not a base voice). This creates confusion because:
- The initial "base voice" is actually a tone preset
- The system treats it as a base voice, not an injection

### Issue 3: Inconsistent State Handling

When the base voice changes, there's no proper state management to:
- Clear or preserve existing injections
- Ensure the base voice is always from VOICE_PRESETS (not SYSTEM_PRESETS)
- Prevent the wrong preset type from being selected as base voice

## Solution

### Fix 1: Separate Base Voice and Tone Preset States

**In `components/Dashboard.tsx`:**

1. Keep `selectedPresetId` for the main "Tone Preset" dropdown (current behavior)
2. Add NEW state `baseVoiceId` specifically for the StyleMixer's base voice
3. Update StyleMixer to use `baseVoiceId` instead of `selectedPresetId`

```typescript
// Add new state
const [baseVoiceId, setBaseVoiceId] = useState<string>('');

// New handler for StyleMixer
const handleBaseVoiceChange = (voiceId: string) => {
  setBaseVoiceId(voiceId);
  // Update reference text for the base voice
  const preset = presets.find(p => p.id === voiceId);
  if (preset) {
    setReferenceText(preset.referenceText);
  }
};
```

### Fix 2: Filter Base Voice Options

**In `components/StyleMixer.tsx`:**

Ensure the base voice dropdown only shows base voices (non-system presets):

```typescript
// Filter system presets (for injections) vs user presets (for base)
const systemPresets = presets.filter(p => p.is_system_preset === true);
const baseVoicePresets = presets.filter(p => !p.is_system_preset || p.isCustom);
```

### Fix 3: Set Default to First Base Voice

**In `dbService.ts`:**

When loading presets, set default selection to first VOICE_PRESET instead of first SYSTEM_PRESET:

```javascript
async getVoicePresets(userId: string): Promise<VoicePreset[]> {
  // ... existing code ...
  
  // Return with default selection being first voice preset (not system preset)
  const allPresets = [...SYSTEM_PRESETS, ...VOICE_PRESETS, ...userVoices];
  return allPresets;
}
```

Or better: Return a separate method to get the default base voice:

```javascript
getDefaultBaseVoiceId(): string {
  return 'casual-tech'; // Default to "Casual Tech Bro"
}
```

### Fix 4: Update Dashboard to Use Correct Default

**In `components/Dashboard.tsx`:**

```typescript
useEffect(() => {
  const loadData = async () => {
    if (user) {
      try {
        const voices = await dbService.getVoicePresets(user.id);
        setPresets(voices);
        
        // Set default to a base voice, not a system preset
        const defaultBaseVoice = voices.find(p => 
          p.id === 'casual-tech' || !p.is_system_preset
        );
        
        if (defaultBaseVoice) {
          setSelectedPresetId(defaultBaseVoice.id);
          setBaseVoiceId(defaultBaseVoice.id);
          setReferenceText(defaultBaseVoice.referenceText);
        } else if (voices.length > 0) {
          setSelectedPresetId(voices[0].id);
          setBaseVoiceId(voices[0].id);
          setReferenceText(voices[0].referenceText);
        }
      } catch (err) {
        console.error("Failed to load presets", err);
      }
    }
  };
  loadData();
}, [user]);
```

## Implementation Steps

### Step 1: Update Dashboard.tsx
- Add `baseVoiceId` state
- Create `handleBaseVoiceChange` handler
- Pass `baseVoiceId` to StyleMixer instead of `selectedPresetId`
- Update initial load logic to default to base voice

### Step 2: Update StyleMixer.tsx
- Ensure proper filtering of presets for base voice dropdown
- Ensure injection dropdown shows all presets except current base voice

### Step 3: Update dbService.ts (optional)
- Optionally update default selection logic

## Files to Modify

1. `components/Dashboard.tsx`
   - Add `baseVoiceId` state
   - Add `handleBaseVoiceChange` function
   - Update StyleMixer props
   - Update initial load logic

2. `components/StyleMixer.tsx` (if needed)
   - Verify filtering logic

3. `dbService.ts` (optional)
   - Update default selection logic

## Testing Scenarios

1. **Initial Load**: App should default to "Casual Tech Bro" as base voice
2. **Change Base Voice**: Selecting "Angry Chef" should update base voice without affecting injections
3. **Add Injection**: Should be able to add any tone preset as injection regardless of base voice
4. **Remove Injection**: Should be able to remove injections
5. **Mix and Match**: Should be able to use any base voice with any combination of tone presets

## Backward Compatibility

- Existing user presets should continue to work
- The change is purely UI/state management
- No API changes required
