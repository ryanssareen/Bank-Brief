'use client';

import { Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

interface HeaderProps {
  onMenuClick: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';

  return (
    <header className="sticky top-0 z-30 bg-bg-card border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-bg-muted rounded-lg transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5 text-text-primary" />
        </button>
        <h2 className="text-lg font-semibold text-text-primary">
          {getGreeting()}, {firstName}
        </h2>
      </div>
      <button
        onClick={toggle}
        className="p-2 rounded-lg hover:bg-bg-muted transition-colors cursor-pointer"
        title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      >
        {theme === 'light' ? (
          <Moon className="h-5 w-5 text-text-secondary" />
        ) : (
          <Sun className="h-5 w-5 text-text-secondary" />
        )}
      </button>
    </header>
  );
}
