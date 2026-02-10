import { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, AtSign, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';
import { currentUser } from '@/data/mockData';
import { format, isToday, isYesterday } from 'date-fns';

interface ChatPanelProps {
  messages: ChatMessage[];
  leadId: string;
  onClose: () => void;
  onSendMessage?: (message: string) => void;
}

export function ChatPanel({ messages, leadId, onClose, onSendMessage }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage?.(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
      const msgDate = format(new Date(msg.createdAt), 'MMMM d, yyyy');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-background border-l border-border animate-slide-in-right md:rounded-none">
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
                const isSelf = message.senderId === currentUser.id;
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
                        <AvatarFallback className="bg-mocha-100 text-mocha-700 text-xs">
                          {message.senderName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn('flex flex-col', isSelf && 'items-end')}>
                      {!isSelf && (
                        <span className="text-xs text-muted-foreground mb-1 ml-1">
                          {message.senderName}
                        </span>
                      )}
                      <div className={cn(
                        isSelf ? 'chat-bubble-self' : 'chat-bubble-other'
                      )}>
                        {message.message}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 mx-1">
                        {formatMessageDate(new Date(message.createdAt))}
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
            <Paperclip className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          </Button>
          <div className="relative flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="input-mocha pr-16 md:pr-20 h-9 md:h-10 text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 md:gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7">
                <AtSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7 hidden sm:flex">
                <Smile className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
          <Button 
            className="btn-mocha flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
            size="icon"
            onClick={handleSend}
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
