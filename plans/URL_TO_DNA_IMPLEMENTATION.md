# URL-to-DNA Voice Cloning Implementation Plan

## Overview
This feature allows users to create "Linguistic DNA" profiles by scraping content from a URL (blog posts, LinkedIn articles, newsletters) instead of manually pasting text.

## Architecture

### Phase 1: Backend Service (Scraper)

**File:** `api/lib/urlScraper.ts`

Using the lightweight `https://r.jina.ai/` approach for URL scraping:
- Jina AI's reader API extracts clean content from URLs
- Returns title, text content, and metadata
- No heavy puppeteer/cheerio needed

```typescript
// Service: urlScraper.ts
interface ScrapeResult {
  success: boolean;
  textContent: string;
  sourceTitle: string;
  sourceUrl: string;
  charCount: number;
  error?: string;
}
```

### Phase 2: API Endpoint

**File:** `api/voice/scrape.ts`

**Endpoint:** `POST /api/voice/scrape`

**Input:**
```json
{ "url": "https://linkedin.com/posts/..." }
```

**Output:**
```json
{
  "success": true,
  "textContent": "...",
  "sourceTitle": "Article Title",
  "sourceUrl": "https://...",
  "charCount": 5000
}
```

**Security Features:**
- Rate limiting: 5 scrapes/minute per user
- SSRF protection: Block internal IPs
- Input sanitization
- Timeout: 10 seconds
- Minimum text: 500 characters

### Phase 3: Frontend Components

**Component 1:** `components/UrlImportCard.tsx`
- URL input field
- "Clone Voice" button with loading states
- Error handling UI
- Placed in the Tone Preset section

**Component 2:** `components/DnaPreviewModal.tsx`
- Shows scraped content summary
- Displays detected voice characteristics
- Mimicry intensity slider
- Save to library button

### Phase 4: Integration

**File:** `components/Dashboard.tsx`
- Add URL import button next to preset selector
- Handle the new tab: 'url'
- Integrate with existing preset system
- Check preset limits before saving

## Files to Create

| File | Purpose |
|------|---------|
| `api/lib/urlScraper.ts` | URL scraping service |
| `api/voice/scrape.ts` | API endpoint |
| `components/UrlImportCard.tsx` | URL input UI |
| `components/DnaPreviewModal.tsx` | DNA preview & save UI |

## Files to Modify

| File | Changes |
|------|---------|
| `components/Dashboard.tsx` | Add URL tab, integrate components |
| `types.ts` | Add URL import types |
| `dbService.ts` | Add URL-sourced preset handling |

## Implementation Details

### 1. URL Scraper Service (`api/lib/urlScraper.ts`)

```typescript
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // 1. Validate URL format
  // 2. Check for SSRF (block internal IPs)
  // 3. Use jina.ai reader API
  // 4. Clean and sanitize content
  // 5. Return structured result
}
```

### 2. API Endpoint (`api/voice/scrape.ts`)

- Uses edge runtime (like existing generate.ts)
- Rate limited: 5 requests/minute per user
- Validates authentication
- Returns cleaned text content

### 3. Frontend Integration

**Dashboard.tsx Changes:**
- New tab: 'url' (in addition to text/file/bulk)
- URL input in the reference section
- Opens DNA Preview modal after scraping
- Saves as voice preset with metadata: `{ source: 'url', url: '...' }`

### 4. Preset Limits

- URL-sourced presets count toward the user's preset limit
- Echo: 2 total, Clone: 10 total, Syndicate: unlimited

## Security Measures

1. **SSRF Protection:**
   - Block localhost, 127.0.0.1, 0.0.0.0
   - Block private IP ranges (10.x, 192.168.x)
   - Block AWS internal IPs

2. **Rate Limiting:**
   - 5 scrapes per minute per user
   - Track by user ID or IP

3. **Input Validation:**
   - Valid URL format required
   - Maximum URL length: 2048 chars

4. **Content Sanitization:**
   - Remove scripts, styles
   - Strip HTML tags
   - Limit content length (max 50,000 chars)

## UI/UX Flow

1. User clicks "URL" tab in the input source
2. User pastes a URL (LinkedIn, blog, newsletter)
3. User clicks "Clone Voice" 
4. Loading state: "Scanning syntax..."
5. On success: Opens DNA Preview Modal
   - Shows page title
   - Shows text summary
   - Shows detected voice characteristics
6. User adjusts mimicry intensity (slider)
7. User clicks "Save to Library"
8. Preset saved with URL metadata

## Dependencies

No new npm dependencies needed - using jina.ai's free reader API:
- `GET https://r.jina.ai/<url>` returns clean markdown

## Testing Checklist

- [ ] Scrape LinkedIn article
- [ ] Scrape blog post
- [ ] Scrape newsletter
- [ ] Handle blocked sites (403)
- [ ] Handle short content (<500 chars)
- [ ] Handle invalid URLs
- [ ] Rate limiting works
- [ ] Preset limit enforced for URL imports
- [ ] UI shows loading states correctly
- [ ] Error states display properly
