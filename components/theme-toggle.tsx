'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 rounded-xl border border-border/50 text-muted-foreground', className)}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-9 w-9 rounded-xl border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all cursor-pointer',
            className,
          )}
          aria-label="Select theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn('flex items-center gap-2 cursor-pointer', theme === 'light' && 'font-semibold text-primary')}
        >
          <Sun className="h-4 w-4 text-amber-500" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn('flex items-center gap-2 cursor-pointer', theme === 'dark' && 'font-semibold text-primary')}
        >
          <Moon className="h-4 w-4 text-primary" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn('flex items-center gap-2 cursor-pointer', theme === 'system' && 'font-semibold text-primary')}
        >
          <Laptop className="h-4 w-4 text-muted-foreground" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SimpleThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 rounded-xl border border-border/50 text-muted-foreground', className)}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative h-9 w-9 rounded-xl border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all cursor-pointer',
        className,
      )}
      title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
      aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="h-4 w-4 text-primary hover:text-primary-glow transition-colors" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
