// Voice recording utilities for chat using Cloudinary
import { uploadToCloudinary } from './cloudinary';

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Failed to access microphone. Please check permissions.');
    }
  }

  stopRecording(): Promise<{ blob: Blob; duration: number }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Stop all tracks
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        
        resolve({ blob, duration });
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.audioChunks = [];
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}

export async function uploadVoiceRecording(
  blob: Blob,
  leadId: string,
  senderId: string
): Promise<string> {
  try {
    const timestamp = Date.now();
    const fileName = `voice_${leadId}_${senderId}_${timestamp}.webm`;
    
    // Create a File object from the Blob for better upload handling
    const file = new File([blob], fileName, { type: 'audio/webm' });
    
    const result = await uploadToCloudinary(file, {
      folder: `mocha-pipeline/voice-messages/${leadId}`,
      resourceType: 'video', // Cloudinary uses 'video' resource type for audio files
      tags: ['voice', 'lead', leadId, senderId]
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading voice recording:', error);
    throw new Error('Failed to upload voice recording');
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
