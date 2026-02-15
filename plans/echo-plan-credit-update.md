# Echo Plan Credit Update Implementation Plan

## Overview
Update the display text for the Echo (free) plan from "5 Credits / Day" to "10 Credits / Day" to match the already-updated backend logic.

## Current State Analysis

### Already Updated (Backend Logic)
- **`AuthContext.tsx:92`** - Default credits set to `10` for new users
- **`components/Dashboard.tsx:911`** - UI display shows `{dailyCredits} / 10`

### Display Text Needing Update
1. **`components/PricingModal.tsx:91`** - Echo plan features list
2. **`components/LandingPage.tsx:720`** - Echo plan features on landing page

## Implementation Plan

### Step 1: Update PricingModal.tsx
- File: `components/PricingModal.tsx`
- Line: 91
- Change: `'5 Credits / Day'` → `'10 Credits / Day'`

### Step 2: Update LandingPage.tsx  
- File: `components/LandingPage.tsx`
- Line: 720
- Change: `'5 Credits / Day'` → `'10 Credits / Day'`

## Risk Assessment
- **Risk Level**: LOW
- The backend logic is already functioning with 10 credits per day
- Only UI text is being updated
- No breaking changes to existing functionality

## Verification
After implementation, verify:
1. PricingModal displays "10 Credits / Day" for Echo plan
2. LandingPage displays "10 Credits / Day" for Echo plan  
3. Dashboard still correctly shows credits as `X / 10`
4. No other functionality is affected
