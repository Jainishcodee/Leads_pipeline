import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/auth/AuthContext';
import { timestampToDate } from '@/lib/firestore';
import { format } from 'date-fns';
import { collection, onSnapshot, orderBy, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BroadcastMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  organizationId: string;
  createdAt: Date;
}

interface BroadcastMessagesProps {
  organizationId: string;
  onClose?: () => void;
}

export function BroadcastMessages({ organizationId, onClose }: BroadcastMessagesProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Listen to broadcast messages
  useEffect(() => {
    if (!organizationId) return;

    setLoading(true);
    const messagesQuery = query(
      collection(db, 'broadcastMessages'),
      where('organizationId', '==', organizationId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            senderId: data.senderId,
            senderName: data.senderName,
            message: data.message,
            organizationId: data.organizationId,
            createdAt: timestampToDate(data.createdAt),
          } as BroadcastMessage;
        });
        setMessages(docs);
        setLoading(false);
        
        // Show notification for new messages (only for non-admins)
        if (!isAdmin && docs.length > 0) {
          const latestMessage = docs[docs.length - 1];
          if (latestMessage.senderId !== user?.uid) {
            toast.info(`${latestMessage.senderName}: ${latestMessage.message}`, {
              icon: <Bell className="w-4 h-4" />,
            });
          }
        }
      },
      (error) => {
        console.error('Failed to listen to messages:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId, user?.uid, isAdmin]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !organizationId || !isAdmin) return;

    try {
      setSending(true);
      await addDoc(collection(db, 'broadcastMessages'), {
        organizationId,
        senderId: user.uid,
        senderName: user.displayName || profile?.name || 'Admin',
        message: newMessage.trim(),
        createdAt: serverTimestamp(),
      });

      setNewMessage('');
      toast.success('Broadcast message sent to all team members');
    } catch (error) {
      console.error('Failed to send broadcast message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div ref={panelRef} className="fixed inset-0 md:inset-y-0 md:right-0 md:left-auto md:w-96 z-50 md:top-16 bg-background border-l flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold">Team Broadcast</h3>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Send messages to all members' : 'Messages from admin'}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No broadcast messages yet</p>
            {isAdmin && (
              <p className="text-xs text-muted-foreground mt-1">
                Send a message to notify all team members
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.senderId === user?.uid;
              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    isOwn ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {message.senderName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    'flex-1 space-y-1 max-w-[80%]',
                    isOwn && 'items-end'
                  )}>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{message.senderName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(message.createdAt, 'h:mm a')}
                      </p>
                    </div>
                    <div className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      isOwn 
                        ? 'bg-primary text-primary-foreground ml-auto' 
                        : 'bg-muted'
                    )}>
                      {message.message}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input - Only for admins */}
      {isAdmin && (
        <form onSubmit={handleSendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message to all team members..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={!newMessage.trim() || sending} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
