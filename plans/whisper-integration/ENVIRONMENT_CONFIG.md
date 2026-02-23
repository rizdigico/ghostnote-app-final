# Environment Configuration for Whisper API Integration

## OpenAI API Setup

### Step 1: Get Your OpenAI API Key

1. Visit the [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to [API Keys](https://platform.openai.com/account/api-keys)
4. Click "Create new secret key"
5. Give your key a meaningful name (e.g., "GhostNote Whisper API")
6. Copy the generated API key (it will not be shown again)

### Step 2: Configure Environment Variables

#### Development Environment

Create or update the `.env.local` file in your project root:

```bash
# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/account/api-keys
# Used for Whisper API transcription functionality
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Optional: OpenAI API Base URL (for proxies or custom endpoints)
# OPENAI_API_BASE_URL=https://api.openai.com/v1
```

#### Production Environment

Set the following environment variables in your hosting platform (Vercel, Netlify, etc.):

- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Production

### Step 3: Verify Configuration

#### Local Development

Run your development server to verify the configuration:

```bash
npm run dev
```

Test the API endpoint by making a request to `/api/repurpose/transcribe` using a tool like Postman or curl:

```bash
curl -X POST -F "file=@/path/to/audio-file.mp3" http://localhost:5173/api/repurpose/transcribe
```

#### Production Deployment

After deploying, verify the endpoint is working by testing it from your frontend application.

## API Key Security

### Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables for all deployments**
3. **Restrict API key permissions** (OpenAI allows key restrictions by IP address and resource type)
4. **Rotate keys periodically** (every 90 days recommended)
5. **Monitor API usage** in the OpenAI dashboard

### OpenAI API Key Restrictions

You can restrict your API key in the OpenAI dashboard to enhance security:

1. **IP Address Restrictions**: Only allow requests from specific IP addresses
2. **Resource Restrictions**: Limit access to specific API endpoints (e.g., only audio/transcriptions)
3. **Rate Limits**: Set custom rate limits per key

## Rate Limiting Configuration

### OpenAI Rate Limits

Whisper API has the following default rate limits:

- **Requests per minute**: 300
- **Tokens per minute**: 100,000
- **Concurrent requests**: 50

### Application Rate Limits

The application implements additional rate limiting:

- **Transcriptions per minute per user**: 5
- **File size limit**: 25MB
- **Accepted file types**: MP3, WAV, WebM, M4A, MP4, MOV

### Monitoring Usage

1. **OpenAI Dashboard**: Track API usage and costs at [https://platform.openai.com/usage](https://platform.openai.com/usage)
2. **Application Logs**: Check server logs for rate limit violations and errors
3. **Error Metrics**: Monitor 429 (rate limit) and 5xx (server error) responses

## Cost Estimation

### Whisper API Pricing

OpenAI Whisper API pricing is based on audio duration:

- **$0.006 per minute** (rounded to the nearest second)
- **Free tier**: No free tier for Whisper API

### Cost Calculator

| Audio Duration | Cost |
|----------------|------|
| 1 minute       | $0.006 |
| 5 minutes      | $0.03 |
| 10 minutes     | $0.06 |
| 30 minutes     | $0.18 |
| 60 minutes     | $0.36 |

### Cost Management

1. **Implement usage tracking** in your application
2. **Set budget alerts** in the OpenAI dashboard
3. **Add cost limits per user** based on subscription plans
4. **Compress audio files** before transcription
5. **Limit recording duration** in the frontend

## Debugging Common Issues

### API Key Not Found

**Error**: `OpenAI API key not configured`

**Solution**:
- Verify the `OPENAI_API_KEY` environment variable is set
- Check for typos in the API key
- Ensure the environment variable is loaded correctly

### Rate Limit Exceeded

**Error**: `Rate limit exceeded. Please wait 60 seconds before trying again.`

**Solution**:
- Reduce the number of concurrent transcription requests
- Increase rate limits in the API endpoint (requires OpenAI approval)
- Implement exponential backoff for retry logic

### File Size Too Large

**Error**: `File size exceeds 25MB limit`

**Solution**:
- Compress audio files before upload
- Increase the `MAX_FILE_SIZE` constant in the API endpoint
- Split large files into smaller chunks (advanced)

### Unsupported File Type

**Error**: `File type not supported`

**Solution**:
- Ensure the file extension matches the actual file type
- Convert the file to an accepted format (MP3, WAV, WebM, M4A, MP4, MOV)
- Update the `ACCEPTED_AUDIO_TYPES` or `ACCEPTED_VIDEO_TYPES` arrays

### CORS Issues

**Error**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
- Verify the CORS configuration in your hosting platform
- Check the `Access-Control-Allow-Origin` header in API responses
- Use proxy configuration for local development

## Proxy Configuration (Optional)

### Using a Custom Proxy

If you need to use a proxy server for OpenAI API calls, update the `OPENAI_API_BASE_URL` environment variable:

```bash
OPENAI_API_BASE_URL=https://your-proxy-server.com/v1
```

### Vercel Edge Function Configuration

For Vercel Edge Functions, add the following to `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type"
        }
      ]
    }
  ]
}
```

## Firewall Configuration

If you're running behind a corporate firewall, ensure the following domains are accessible:

- `api.openai.com` - OpenAI API endpoint
- `platform.openai.com` - OpenAI dashboard and documentation

## Summary

Proper configuration of the OpenAI API key and environment variables is essential for the Whisper API integration. Follow the steps in this guide to ensure a secure and reliable transcription service for your users.
