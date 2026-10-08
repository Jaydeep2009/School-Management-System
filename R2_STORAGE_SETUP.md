# R2 Storage Setup Required for Assignment File Uploads

## Current Status
- ✅ Assignment creation works
- ✅ Assignment listing works  
- ❌ File upload fails - R2 storage not enabled

## Issue
The assignment file upload feature requires Cloudflare R2 (object storage) to store PDF files. R2 is currently disabled in your Cloudflare account.

## Error Messages
When trying to upload files, you'll see:
- `503 Service Unavailable`
- `"File storage is not configured. Please enable R2 storage in Cloudflare dashboard to upload files."`

## How to Enable R2 Storage

### Step 1: Enable R2 in Cloudflare Dashboard
1. Go to https://dash.cloudflare.com/
2. Select your account
3. Navigate to **R2** in the left sidebar
4. Click **"Enable R2"** or **"Get Started"**
5. Add a payment method (R2 has a generous free tier)
   - First 10 GB/month storage: FREE
   - First 1 million Class A operations/month: FREE
   - First 10 million Class B operations/month: FREE

### Step 2: Create the R2 Bucket
Once R2 is enabled, run this command:

```bash
cd apps/api
wrangler r2 bucket create sms-storage
```

### Step 3: Enable R2 in wrangler.jsonc
Uncomment the R2 configuration in `apps/api/wrangler.jsonc`:

```jsonc
// BEFORE (commented out):
// "r2_buckets": [
// 	{
// 		"binding": "BUCKET",
// 		"bucket_name": "sms-storage",
// 		"preview_bucket_name": "sms-storage"
// 	}
// ],

// AFTER (uncommented):
"r2_buckets": [
	{
		"binding": "BUCKET",
		"bucket_name": "sms-storage",
		"preview_bucket_name": "sms-storage"
	}
],
```

**Important**: Make sure the binding is `"BUCKET"` (not `"STORAGE"`) as the code expects `c.env.BUCKET`.

### Step 4: Redeploy the API
```bash
cd apps/api
wrangler deploy
```

### Step 5: Test File Upload
1. Go to Teacher Dashboard → Assignments
2. Create or open an assignment
3. Try uploading a PDF file
4. Should work without errors!

## R2 Pricing (as of 2024)
- **Storage**: $0.015/GB/month (after free 10 GB)
- **Class A operations**: $4.50/million (after free 1M) - writes, lists
- **Class B operations**: $0.36/million (after free 10M) - reads
- **Egress**: FREE within Cloudflare network

For a school with 1000 students and 100 assignments/month with PDFs:
- Estimated storage: ~5 GB = **FREE**
- Estimated operations: ~50K/month = **FREE**

## Alternative Solution (Without R2)
If you don't want to enable R2, we can implement an alternative approach:

### Option A: Store PDFs in Database (Simple)
- Store PDF files as base64 in D1 database
- Limitation: D1 has row size limits (~1MB)
- Good for small PDFs only

### Option B: External Storage Links
- Teachers provide Google Drive/Dropbox links instead
- No file upload needed
- Students click links to download

### Option C: Use Cloudflare Images (Not ideal for PDFs)
- Cloudflare Images is for images only
- Won't work for PDF documents

## Recommendation
**Enable R2** - it's the most robust solution and fits your use case perfectly. The free tier is generous enough for typical school usage.

## Current API Version
**Version**: `a449d3fb-cbd3-492e-9016-0693272dd2a1`
- Added helpful error message when R2 is not configured
- Prevents confusing 500 errors

## Testing After Setup
1. Enable R2 in dashboard
2. Create bucket: `wrangler r2 bucket create sms-storage`
3. Uncomment R2 config in wrangler.jsonc
4. Deploy: `wrangler deploy`
5. Test file upload on assignment detail page
