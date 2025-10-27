import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4">
        <Shield className="h-7 w-7 text-primary" />
        <h1 className="font-headline text-xl font-bold text-primary">
          ShellCheck AI
        </h1>
      </div>
    </header>
  );
}
