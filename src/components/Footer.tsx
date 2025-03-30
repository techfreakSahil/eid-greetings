import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-2 text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
      <div className="flex items-center justify-center gap-1">
        <span>Made with</span> 
        <Heart className="h-3 w-3 text-red-500 fill-red-500" /> 
        <span>by <a href="https://github.com/techfreakSahil" className="hover:text-slate-700 underline dark:hover:text-slate-300">Sahil</a> for Eid al-Fitr {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}