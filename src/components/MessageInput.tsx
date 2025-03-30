import { FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface MessageInputProps {
  userInput: string;
  setUserInput: (input: string) => void;
  isLoading: boolean;
  onSend: () => void;
  placeholder?: string;
}

export function MessageInput({
  userInput,
  setUserInput,
  isLoading,
  onSend,
  placeholder = "Type your message..."
}: MessageInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSend();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
      <Input
        type="text"
        value={userInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1"
      />
      <Button 
        type="submit" 
        disabled={isLoading || userInput.trim() === ''} 
        size="icon"
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </form>
  );
}