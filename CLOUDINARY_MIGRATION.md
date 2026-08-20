# Firebase Storage to Cloudinary Migration

This project has been fully migrated from Firebase Storage to Cloudinary for all file uploads.

## What Was Changed

### Files Migrated to Cloudinary
- **Profile avatar uploads** (`src/pages/Profile.tsx`) - User profile pictures
- **Chat image uploads** (`src/lib/imageUpload.ts`) - Images in lead chat conversations
- **Voice messages** (`src/lib/voiceRecording.ts`) - Audio recordings in chat
- **Lead file attachments** (`src/pages/LeadDetail.tsx`) - Document uploads on lead detail pages

### Files Removed
- `storage.rules` - Firebase Storage security rules (no longer needed)
- `storage.cors.json` - Firebase Storage CORS configuration (no longer needed)
- Firebase Storage imports removed from `src/lib/firebase.ts`

### Files Created
- **`src/lib/cloudinary.ts`** - Core Cloudinary utilities for file uploads with progress tracking

## Setting Up Cloudinary

### 1. Create a Cloudinary Account
1. Go to [cloudinary.com](https://cloudinary.com) and sign up for a free account
2. After logging in, you'll see your dashboard with your Cloud Name

### 2. Create an Upload Preset
1. Go to **Settings** > **Upload** tab
2. Scroll to **Upload presets** section
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: Choose a name (e.g., `mocha-pipeline-uploads`)
   - **Signing Mode**: Select **Unsigned** (required for frontend uploads)
   - **Folder**: Optionally set a folder path (e.g., `mocha-pipeline/`)
   - **Access mode**: Set to **Public** for publicly accessible URLs
   - Configure any other settings as needed (image transformations, etc.)
5. Click **Save**
6. Copy the preset name

### 3. Configure Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Cloudinary credentials in `.env`:
   ```env
   VITE_CLOUDINARY_CLOUD_NAME=your-actual-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-actual-upload-preset
   ```

3. **Important**: Never commit `.env` to version control. It's already in `.gitignore`.

## Technical Details

### Upload Function
All uploads now use the `uploadToCloudinary` function from `src/lib/cloudinary.ts`:

```typescript
import { uploadToCloudinary } from '@/lib/cloudinary';

const result = await uploadToCloudinary(file, (progress) => {
  console.log(`Upload progress: ${progress}%`);
});

console.log('File URL:', result.secure_url);
```

### File Types Supported
- **Images**: PNG, JPG, GIF, WebP (5MB limit)
- **Voice messages**: Audio files uploaded as 'video' resource type for compatibility
- **Documents**: All file types supported by Cloudinary

### Security Considerations
- Upload presets are **unsigned** for frontend uploads
- Configure upload restrictions in Cloudinary dashboard:
  - Maximum file size
  - Allowed file formats
  - Folder restrictions
- For production, consider:
  - Using signed uploads with a backend proxy
  - Enabling moderation for user-uploaded content

## Rollback (If Needed)

If you need to revert to Firebase Storage:
1. Checkout the last commit before migration
2. Restore `storage.rules` and `storage.cors.json`
3. Re-add Firebase Storage to `src/lib/firebase.ts`:
   ```typescript
   import { getStorage } from 'firebase/storage';
   export const storage = getStorage(app);
   ```

## Testing

After setup, test the following features:
1. **Profile page** - Upload a new avatar
2. **Lead chat** - Send an image message
3. **Lead chat** - Record and send a voice message
4. **Lead detail** - Upload a file attachment

All uploads should now use Cloudinary and URLs should start with `https://res.cloudinary.com/`.
