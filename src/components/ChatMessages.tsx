import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'model' | 'system' | 'error';
  text: string;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  onCopy: (text: string) => void;
  onShare: (text: string) => void;
}

export function ChatMessages({ messages, isLoading, scrollAreaRef, onCopy, onShare }: ChatMessagesProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    onCopy(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="flex flex-col gap-4 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex flex-col gap-1 rounded-lg p-4 max-w-[90%]",
              message.role === 'user' ? "ml-auto bg-emerald-600 text-white" : 
              message.role === 'model' ? "mr-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" : 
              message.role === 'system' ? "mx-auto bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 italic" :
              "mr-auto bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
            )}
          >
            <div className="text-sm whitespace-pre-wrap">{message.text}</div>
            
            {message.role === 'model' && (
              <div className="flex justify-end gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => handleCopy(message.text, message.id)}
                >
                  {copiedId === message.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon" 
                  className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => onShare(message.text)}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="mr-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-4 flex items-center gap-2">
            <div className="h-2 w-2 bg-emerald-600 rounded-full animate-pulse"></div>
            <div className="h-2 w-2 bg-emerald-600 rounded-full animate-pulse delay-150"></div>
            <div className="h-2 w-2 bg-emerald-600 rounded-full animate-pulse delay-300"></div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}