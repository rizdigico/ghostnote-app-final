// --- URL Scraper Service ---
// Uses jina.ai's reader API to extract clean content from URLs

export interface ScrapeResult {
  success: boolean;
  textContent: string;
  sourceTitle: string;
  sourceUrl: string;
  charCount: number;
  error?: string;
}

// --- SECURITY: SSRF Protection ---
// Block internal/private IP addresses to prevent SSRF attacks
function isInternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Block localhost variants
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname === '0.0.0.0' ||
        hostname === '::1') {
      return true;
    }
    
    // Block private IP ranges
    // 10.x.x.x
    if (hostname.startsWith('10.')) return true;
    // 172.16.x.x - 172.31.x.x
    if (hostname.startsWith('172.16.') || hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') || hostname.startsWith('172.19.') ||
        hostname.startsWith('172.20.') || hostname.startsWith('172.21.') ||
        hostname.startsWith('172.22.') || hostname.startsWith('172.23.') ||
        hostname.startsWith('172.24.') || hostname.startsWith('172.25.') ||
        hostname.startsWith('172.26.') || hostname.startsWith('172.27.') ||
        hostname.startsWith('172.28.') || hostname.startsWith('172.29.') ||
        hostname.startsWith('172.30.') || hostname.startsWith('172.31.')) {
      return true;
    }
    // 192.168.x.x
    if (hostname.startsWith('192.168.')) return true;
    // 169.254.x.x (link-local)
    if (hostname.startsWith('169.254.')) return true;
    
    return false;
  } catch {
    return true; // Invalid URL
  }
}

// --- SECURITY: URL Validation ---
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Only allow http and https
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// --- CONTENT Cleaning ---
function cleanContent(html: string): string {
  // Remove HTML tags to get plain text
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '\n');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&/g, '&');
  text = text.replace(/</g, '<');
  text = text.replace(/>/g, '>');
  text = text.replace(/"/g, '"');
  text = text.replace(/'/g, "'");
  
  // Clean up whitespace
  text = text.replace(/[\r\n]+/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();
  
  // Remove multiple consecutive newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

// --- MAIN SCRAPER FUNCTION ---
export async function scrapeUrl(url: string, timeout: number = 10000): Promise<ScrapeResult> {
  // Validate URL format
  if (!url || typeof url !== 'string') {
    return {
      success: false,
      textContent: '',
      sourceTitle: '',
      sourceUrl: '',
      charCount: 0,
      error: 'URL is required'
    };
  }
  
  // Add protocol if missing
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }
  
  // Validate URL
  if (!isValidUrl(targetUrl)) {
    return {
      success: false,
      textContent: '',
      sourceTitle: '',
      sourceUrl: '',
      charCount: 0,
      error: 'Invalid URL format'
    };
  }
  
  // SSRF Check
  if (isInternalUrl(targetUrl)) {
    return {
      success: false,
      textContent: '',
      sourceTitle: '',
      sourceUrl: '',
      charCount: 0,
      error: 'Cannot access internal URLs'
    };
  }
  
  // URL length limit
  if (targetUrl.length > 2048) {
    return {
      success: false,
      textContent: '',
      sourceTitle: '',
      sourceUrl: '',
      charCount: 0,
      error: 'URL too long (max 2048 characters)'
    };
  }
  
  try {
    // Use jina.ai reader API
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl)}`;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GhostNote-AI/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 403) {
        return {
          success: false,
          textContent: '',
          sourceTitle: '',
          sourceUrl: targetUrl,
          charCount: 0,
          error: 'Access to this site is blocked. Try pasting text manually.'
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          textContent: '',
          sourceTitle: '',
          sourceUrl: targetUrl,
          charCount: 0,
          error: 'Page not found (404)'
        };
      }
      return {
        success: false,
        textContent: '',
        sourceTitle: '',
        sourceUrl: targetUrl,
        charCount: 0,
        error: `Failed to fetch URL (${response.status})`
      };
    }
    
    const data = await response.json();
    
    // Extract content from jina.ai response
    const title = data.title || '';
    const content = data.content || '';
    
    // Clean the content
    const cleanedContent = cleanContent(content);
    
    // Check minimum content length
    if (cleanedContent.length < 500) {
      return {
        success: false,
        textContent: '',
        sourceTitle: title,
        sourceUrl: targetUrl,
        charCount: cleanedContent.length,
        error: 'Not enough content found (minimum 500 characters required). Try pasting text manually.'
      };
    }
    
    // Limit content length
    const maxLength = 50000;
    const finalContent = cleanedContent.length > maxLength 
      ? cleanedContent.substring(0, maxLength) 
      : cleanedContent;
    
    return {
      success: true,
      textContent: finalContent,
      sourceTitle: title || extractDomain(targetUrl),
      sourceUrl: targetUrl,
      charCount: finalContent.length
    };
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        textContent: '',
        sourceTitle: '',
        sourceUrl: targetUrl,
        charCount: 0,
        error: 'Request timed out. The site may be slow or unavailable.'
      };
    }
    
    return {
      success: false,
      textContent: '',
      sourceTitle: '',
      sourceUrl: targetUrl,
      charCount: 0,
      error: error.message || 'Failed to scrape URL'
    };
  }
}

// Helper to extract domain for title fallback
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Unknown Source';
  }
}
