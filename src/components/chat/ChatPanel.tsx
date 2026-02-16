import { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Mic, StopCircle, Smile, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { timestampToDate } from '@/lib/firestore';
import { VoiceRecorder, formatDuration } from '@/lib/voiceRecording';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { uploadChatImage, MAX_IMAGE_SIZE, formatFileSize } from '@/lib/imageUpload';

interface ChatPanelProps {
  messages: ChatMessage[];
  leadId: string;
  onClose: () => void;
  onSendMessage?: (message: string, messageType?: 'text' | 'voice' | 'image', voiceBlob?: Blob, voiceDuration?: number, imageUrl?: string, imageName?: string) => Promise<void> | void;
}

export function ChatPanel({ messages, leadId, onClose, onSendMessage }: ChatPanelProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.cancelRecording();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const handleSend = async () => {
    if (newMessage.trim()) {
      await onSendMessage?.(newMessage, 'text');
      setNewMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const startVoiceRecording = async () => {
    try {
      voiceRecorderRef.current = new VoiceRecorder();
      await voiceRecorderRef.current.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start recording');
    }
  };

  const stopVoiceRecording = async () => {
    if (!voiceRecorderRef.current) return;

    try {
      const { blob, duration } = await voiceRecorderRef.current.stopRecording();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      setIsRecording(false);
      setRecordingDuration(0);

      // Send voice message
      await onSendMessage?.('Voice message', 'voice', blob, duration);
    } catch (error) {
      toast.error('Failed to save voice recording');
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.cancelRecording();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    // Check file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Image is too large. Maximum size is 5MB. Your image is ${formatFileSize(file.size)}`);
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to send images');
      return;
    }

    try {
      setUploadingImage(true);
      setUploadProgress(0);

      const imageUrl = await uploadChatImage(
        file,
        leadId,
        user.uid,
        (progress) => setUploadProgress(progress)
      );

      // Send image message
      await onSendMessage?.(file.name, 'image', undefined, undefined, imageUrl, file.name);
      
      toast.success('Image sent successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday, ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    msgs.forEach(msg => {
      const msgDate = format(timestampToDate(msg.createdAt), 'MMMM d, yyyy');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const sortedMessages = [...messages].sort(
    (a, b) => timestampToDate(a.createdAt).getTime() - timestampToDate(b.createdAt).getTime()
  );
  const groupedMessages = groupMessagesByDate(sortedMessages);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background)/0.8)] backdrop-blur-sm border-l border-border animate-slide-in-right md:rounded-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border safe-area-inset-top">
        <h3 className="font-semibold text-sm md:text-base">Lead Chat</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 md:h-10 md:w-10">
          <X className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">
                {isToday(new Date(group.messages[0].createdAt)) ? 'Today' : group.date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Messages in group */}
            <div className="space-y-4">
              {group.messages.map((message) => {
                const isSelf = !!user && message.senderId === user.uid;
                const isSystem = message.isSystemMessage;

                if (isSystem) {
                  return (
                    <div key={message.id} className="text-center">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {message.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={message.id} 
                    className={cn('flex gap-3', isSelf && 'flex-row-reverse')}
                  >
                    {!isSelf && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={message.senderAvatar} />
                        <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xs">
                          {message.senderName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn('flex flex-col', isSelf && 'items-end')}>
                      {!isSelf && (
                        <div className="flex items-center gap-1.5 mb-1 ml-1">
                          <span className="text-xs text-muted-foreground">
                            {message.senderName}
                          </span>
                          {(message.senderRole === 'admin' || message.senderRole === 'superadmin') && (
                            <span className="text-xs text-blue-600 font-medium">
                              ({message.senderRole === 'superadmin' ? 'Super Admin' : 'Admin'})
                            </span>
                          )}
                        </div>
                      )}
                      <div className={cn(
                        isSelf ? 'chat-bubble-self' : 'chat-bubble-other'
                      )}>
                        {message.messageType === 'voice' && message.voiceUrl ? (
                          <VoiceMessagePlayer 
                            voiceUrl={message.voiceUrl} 
                            duration={message.voiceDuration || 0}
                            isSelf={isSelf}
                          />
                        ) : message.messageType === 'image' && message.imageUrl ? (
                          <div className="flex flex-col gap-2">
                            <img 
                              src={message.imageUrl} 
                              alt={message.imageName || 'Image'}
                              className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(message.imageUrl, '_blank')}
                            />
                            {message.imageName && (
                              <span className="text-xs opacity-70">{message.imageName}</span>
                            )}
                          </div>
                        ) : (
                          message.message
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 mx-1">
                        {formatMessageDate(timestampToDate(message.createdAt))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 md:p-4 border-t border-border safe-area-inset-bottom">
        {uploadingImage ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <div className="flex-1">
                <div className="text-sm font-medium">Uploading image...</div>
                <div className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</div>
              </div>
            </div>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-medium">{formatDuration(recordingDuration)}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={cancelVoiceRecording}
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              className="btn-mocha h-9 w-9"
              size="icon"
              onClick={stopVoiceRecording}
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              id="file-input" 
              className="hidden"
              onChange={handleFileSelect}
            />
            <label htmlFor="file-input">
              <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10" asChild>
                <span>
                  <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                </span>
              </Button>
            </label>
            
            {/* Emoji Picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                  <Smile className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 border-0" align="start">
                <EmojiPicker 
                  onEmojiClick={handleEmojiClick}
                  width={300}
                  height={400}
                />
              </PopoverContent>
            </Popover>

            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 input-mocha h-9 md:h-10 text-sm"
            />

            {/* Voice Recording Button */}
            {!newMessage.trim() && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
                onClick={startVoiceRecording}
              >
                <Mic className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              </Button>
            )}
            
            {/* Send Button */}
            {newMessage.trim() && (
              <Button 
                className="btn-mocha flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
                size="icon"
                onClick={handleSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
