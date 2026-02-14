# Slop Detector & Humanizer Implementation Plan

## Overview
The Slop Detector identifies generic AI phrases ("slop") in text and helps users rewrite them using their own Linguistic DNA. It includes:
- A dictionary of banned AI phrases
- A "Humanity Score" calculator
- An AI rewriter using the user's voice profile

## Architecture

### Phase 1: Slop Dictionary & Scanner

**File:** `config/slopDictionary.ts`

Categories and phrases:
```typescript
export const SLOP_DICTIONARY = {
  hype: ["game-changer", "cutting-edge", "revolutionize", "seamlessly", "unlock", 
         "leverage", "transform", "innovative", "disrupt", "elevate"],
  fluff: ["delve", "tapestry", "digital landscape", "in today's world", "underscore",
         "it is worth noting", "it goes without saying", "last but not least"],
  corporate: ["synergy", "align", "paradigm shift", "circle back", "deep dive",
              "move the needle", "low-hanging fruit", "think outside the box"],
  ai: ["as an AI", "I cannot", "please note", "however", "additionally",
       "in conclusion", "to summarize", "ultimately"]
};
```

**File:** `api/lib/slopScanner.ts`

```typescript
interface SlopIssue {
  word: string;
  index: number;
  length: number;
  category: string;
}

interface ScanResult {
  score: number; // 0-100 humanity score
  issues: SlopIssue[];
  totalSlopWords: number;
}
```

**Algorithm:**
- Start with 100 points
- Deduct 2 points per slop word found
- Minimum score is 0

### Phase 2: Fix-Slop API Endpoint

**File:** `api/content/fix-slop.ts`

**Endpoint:** `POST /api/content/fix-slop`

**Input:**
```json
{
  "sentence": "This is a sentence with delve and synergy",
  "voiceProfileId": "custom_abc123"
}
```

**Logic:**
1. Get the user's voice preset (reference text)
2. Call LLM with prompt: "Remove generic AI jargon. Use this voice style: {referenceText}"
3. Return rewritten text

### Phase 3: SlopEditor Frontend Component

**File:** `components/SlopEditor.tsx`

Features:
- Debounced scanning (500ms delay)
- Real-time highlighting (yellow for warnings, red for critical)
- Hover tooltips with "Humanize" button
- Score indicator (Green > 90, Yellow 70-90, Red < 70)
- "Fix All" button to rewrite all issues at once

### Phase 4: Integration

**File:** `components/Dashboard.tsx`

Add a "Slop Check" button in the Draft Input section that opens the SlopEditor overlay.

## Files to Create

| File | Purpose |
|------|---------|
| `config/slopDictionary.ts` | Dictionary of banned AI phrases |
| `api/lib/slopScanner.ts` | Scanner logic & score calculation |
| `api/content/fix-slop.ts` | API endpoint for rewriting |
| `components/SlopEditor.tsx` | Editor with highlighting |

## Files to Modify

| File | Changes |
|------|---------|
| `components/Dashboard.tsx` | Add Slop Check button & integrate editor |

## Implementation Details

### 1. Slop Dictionary (`config/slopDictionary.ts`)
- Extensible object structure
- Case-insensitive matching
- Easy to add new categories/words

### 2. Slop Scanner (`api/lib/slopScanner.ts`)
- Uses regex for fast matching
- Returns exact positions for highlighting
- Calculates humanity score

### 3. Fix-Slop Endpoint (`api/content/fix-slop.ts`)
- Uses same LLM as main rewriting
- Incorporates user's voice profile
- Rate limited (like other API endpoints)

### 4. SlopEditor Component
- Custom text overlay for highlighting
- Debounced input to prevent lag
- Tooltip with "Humanize" button per issue
- "Fix All" for bulk rewriting

## UI/UX Flow

1. User writes/pastes text in Draft Input
2. Clicks "Check for Slop" button
3. Editor highlights problematic words:
   - Yellow underline: Warning (hype/fluff)
   - Red underline: Critical (corporate/AI clichés)
4. Score displayed: "Humanity Score: 85/100"
5. Hover over highlighted word → tooltip shows:
   - "⚠️ AI Fluff Detected"
   - "✨ Humanize" button
6. Click "Humanize" → API call → replaces word
7. Click "Fix All" → rewrites entire text

## Optimization

- **Debouncing:** 500ms delay before scanning
- **Lazy Loading:** Only load fix endpoint when needed
- **Caching:** Cache scan results for unchanged text

## Testing Checklist

- [ ] Detect "delve" in text
- [ ] Detect "synergy" in text
- [ ] Score calculation accuracy
- [ ] Highlight positioning
- [ ] Tooltip shows correct category
- [ ] Humanize button calls API
- [ ] Fix All rewrites entire text
- [ ] Works with different voice profiles
