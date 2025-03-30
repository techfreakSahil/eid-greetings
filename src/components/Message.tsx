import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { AlertCircle, Bot, User, Copy, Share2 } from "lucide-react";

interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'model' | 'system' | 'error';
    text: string;
  };
  onCopy: (text: string) => void;
  onShare: (text: string) => void;
}

export function Message({ message, onCopy, onShare }: MessageProps) {
  const isUser = message.role === 'user';
  const isModel = message.role === 'model';
  const isSystem = message.role === 'system';
  const isError = message.role === 'error';

  return (
    <div
      className={cn(
        "flex items-end gap-2 p-3 rounded-lg mb-3 max-w-[85%] md:max-w-[75%]",
        isUser ? "ml-auto bg-emerald-600 text-white" : "mr-auto bg-card text-card-foreground shadow-sm border",
        isSystem && "bg-blue-100 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 max-w-[95%] text-sm italic",
        isError && "bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 max-w-[95%]"
      )}
    >
      <Avatar className={cn("h-6 w-6", isUser && "order-last ml-2", !isUser && "mr-2")}>
        <AvatarFallback className={cn("text-xs",
          isUser ? "bg-emerald-700 text-white" : "bg-muted",
          isSystem && "bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-100",
          isError && "bg-red-200 dark:bg-red-700 text-red-700 dark:text-red-200"
        )}>
          {isUser ? <User size={14}/> : isError ? <AlertCircle size={14}/> : isSystem ? <Bot size={14}/>: <Bot size={14}/>}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col w-full">
        <p className="whitespace-pre-wrap break-words text-sm md:text-base">{message.text}</p>
        {isModel && (
          <div className="flex gap-2 mt-2 self-end">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => onCopy(message.text)} title="Copy">
              <Copy size={14}/>
            </Button>
            {typeof navigator.share === 'function' && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => onShare(message.text)} title="Share">
                <Share2 size={14}/>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}