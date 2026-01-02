'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ThemeToggle({ 
  className, 
  showLabel = false, 
  variant = 'ghost',
  size = 'default' 
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        );
      case 'dark':
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      default:
        return (
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        );
    }
  };

  const getThemeLabel = () => {
    return theme.charAt(0).toUpperCase() + theme.slice(1).replace('-', ' ');
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        "transition-colors duration-200",
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
      title={`Current theme: ${getThemeLabel()}. Click to cycle through themes.`}
    >
      {getThemeIcon()}
      {showLabel && (
        <span className="ml-2 text-sm">
          {getThemeLabel()}
        </span>
      )}
    </Button>
  );
}

// Individual theme buttons for more control
export function ThemeButton({ 
  targetTheme, 
  className, 
  children, 
  ...props 
}: {
  targetTheme: 'light' | 'dark' | 'system';
  className?: string;
  children?: React.ReactNode;
} & React.ComponentProps<typeof Button>) {
  const { theme, setTheme } = useTheme();
  const isActive = theme === targetTheme;

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      size="sm"
      onClick={() => setTheme(targetTheme)}
      className={cn(
        "transition-all duration-200",
        isActive && "ring-2 ring-primary",
        className
      )}
      {...props}
    >
      {children || targetTheme.charAt(0).toUpperCase() + targetTheme.slice(1).replace('-', ' ')}
    </Button>
  );
}

// Theme selector dropdown component
export function ThemeSelector({ className }: { className?: string }) {
  const { theme } = useTheme();

  return (
    <Card className={cn("p-4", className)}>
      <CardContent className="p-0">
        <div className="flex flex-col space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Theme</div>
          <div className="flex space-x-2">
            <ThemeButton targetTheme="light">
              Light
            </ThemeButton>
            <ThemeButton targetTheme="dark">
              Dark
            </ThemeButton>
            <ThemeButton targetTheme="system">
              System
            </ThemeButton>
          </div>
          <div className="text-xs text-muted-foreground">
            Current: {theme.charAt(0).toUpperCase() + theme.slice(1)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}