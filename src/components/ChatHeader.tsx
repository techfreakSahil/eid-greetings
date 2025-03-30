import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export function ChatHeader() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
          <Image src="/logo.png" alt="Eid Mubarak" width={32} height={32} />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Eid Mubarak Generator</h2>
          <p className="text-xs text-muted-foreground">Create beautiful Eid greetings</p>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}