// Image upload utilities for chat using Cloudinary
import { uploadToCloudinary, formatFileSize } from './cloudinary';

// Maximum file size: 5MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function uploadChatImage(
  file: File,
  leadId: string,
  senderId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image size exceeds 5MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  try {
    const result = await uploadToCloudinary(file, {
      folder: `mocha-pipeline/chat-images/${leadId}`,
      resourceType: 'image',
      onProgress,
      tags: ['chat', 'lead', leadId, senderId]
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}

export { formatFileSize };
