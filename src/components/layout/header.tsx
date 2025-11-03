import { Shield } from 'lucide-react';
import { ThemeToggle } from '../theme-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="font-headline text-xl font-bold text-primary">
            ShellCheck AI
          </h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
