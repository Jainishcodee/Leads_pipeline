// Image upload utilities for chat
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

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
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `image_${leadId}_${senderId}_${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, `chat-images/${leadId}/${fileName}`);
    
    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          console.error('Error uploading image:', error);
          reject(new Error('Failed to upload image'));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(new Error('Failed to get download URL'));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
