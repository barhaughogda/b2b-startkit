# Zenthea Theme System Documentation

This document describes the comprehensive theme switching system implemented for the Zenthea healthcare platform, including light, dark, and high contrast modes with system theme detection.

## 🎨 Available Themes

### Light Theme
- **Purpose**: Standard daytime use with optimal readability
- **Colors**: Zenthea brand colors with light backgrounds
- **Use Case**: Default theme for most users

### Dark Theme
- **Purpose**: Low-light environments and user preference
- **Colors**: Optimized for dark backgrounds with proper contrast
- **Use Case**: Night mode, reduced eye strain

### High Contrast Theme
- **Purpose**: Accessibility and visual impairments
- **Colors**: Maximum contrast ratios for better visibility
- **Use Case**: Users with visual impairments, accessibility needs

## 🚀 Getting Started

### Basic Usage

```tsx
import { ZentheaThemeProvider } from '@/lib/theme-context';
import { ThemeToggle } from '@/components/ui/theme-toggle';

function App() {
  return (
    <ZentheaThemeProvider>
      <div>
        <ThemeToggle />
        {/* Your app content */}
      </div>
    </ZentheaThemeProvider>
  );
}
```

### Using Theme Context

```tsx
import { useTheme } from '@/lib/theme-context';

function MyComponent() {
  const { theme, setTheme, systemTheme, isSystemTheme } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>System theme: {systemTheme}</p>
      <p>Using system theme: {isSystemTheme ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

## 🧩 Components

### ZentheaThemeProvider

The main theme provider component that manages theme state and persistence.

**Props:**
- `children`: React.ReactNode - Child components
- `defaultTheme`: Theme - Default theme (default: 'light')
- `storageKey`: string - localStorage key (default: 'zenthea-theme')

**Features:**
- Automatic system theme detection
- localStorage persistence
- Theme switching with smooth transitions
- Accessibility support

### ThemeToggle

A button component for cycling through themes.

**Props:**
- `className?: string` - Additional CSS classes
- `showLabel?: boolean` - Show theme label (default: false)
- `variant?: 'default' | 'outline' | 'ghost'` - Button variant (default: 'ghost')
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: 'md')

**Usage:**
```tsx
<ThemeToggle />
<ThemeToggle showLabel />
<ThemeToggle variant="outline" size="lg" />
```

### ThemeButton

Individual theme selection buttons.

**Props:**
- `targetTheme`: 'light' | 'dark' | 'high-contrast' - Target theme
- `className?: string` - Additional CSS classes
- `children?: React.ReactNode` - Button content

**Usage:**
```tsx
<ThemeButton targetTheme="light">Light</ThemeButton>
<ThemeButton targetTheme="dark">Dark</ThemeButton>
<ThemeButton targetTheme="high-contrast">High Contrast</ThemeButton>
```

### ThemeSelector

A complete theme selection interface.

**Props:**
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
<ThemeSelector />
```

## 🎯 Theme Context API

### useTheme Hook

Returns the current theme context with the following properties:

```tsx
interface ThemeContextType {
  theme: Theme;                    // Current theme
  setTheme: (theme: Theme) => void; // Set specific theme
  systemTheme: 'light' | 'dark';   // System preference
  isSystemTheme: boolean;          // Whether using system theme
  toggleTheme: () => void;         // Cycle through themes
}
```

### Theme Management

```tsx
const { theme, setTheme, toggleTheme, systemTheme, isSystemTheme } = useTheme();

// Set specific theme
setTheme('dark');

// Cycle through themes (light -> dark -> high-contrast -> light)
toggleTheme();

// Check if using system theme
if (isSystemTheme) {
  console.log(`Using system theme: ${systemTheme}`);
}
```

## 🎨 CSS Integration

### Theme Classes

The theme system automatically applies CSS classes to the document root:

```css
/* Light theme */
html.light { /* light theme styles */ }

/* Dark theme */
html.dark { /* dark theme styles */ }

/* High contrast theme */
html.high-contrast { /* high contrast styles */ }
```

### Data Attributes

The system also sets a `data-theme` attribute for CSS targeting:

```css
[data-theme="light"] { /* light theme styles */ }
[data-theme="dark"] { /* dark theme styles */ }
[data-theme="high-contrast"] { /* high contrast styles */ }
```

### CSS Variables

All themes use CSS custom properties defined in `globals.css`:

```css
:root {
  /* Light theme variables */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... */
}

.dark {
  /* Dark theme variables */
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}

[data-theme="high-contrast"] {
  /* High contrast variables */
  --background: 0 0% 100%;
  --foreground: 0 0% 0%;
  /* ... */
}
```

## 🔧 Configuration

### Custom Storage Key

```tsx
<ZentheaThemeProvider storageKey="my-app-theme">
  {/* Your app */}
</ZentheaThemeProvider>
```

### Default Theme

```tsx
<ZentheaThemeProvider defaultTheme="dark">
  {/* Your app */}
</ZentheaThemeProvider>
```

## ♿ Accessibility Features

### WCAG 2.1 AA Compliance
- All themes meet minimum contrast ratios
- High contrast theme provides maximum accessibility
- Color is not the only means of conveying information

### Keyboard Navigation
- Theme toggles are keyboard accessible
- Focus indicators are clearly visible
- Tab order is logical and consistent

### Screen Reader Support
- Proper ARIA labels on theme controls
- Semantic HTML structure
- Descriptive button text and titles

### System Integration
- Automatic system theme detection
- Respects user's OS preference
- Smooth transitions between themes

## 🧪 Testing

### Manual Testing
1. **Theme Switching**: Test all theme transitions
2. **Persistence**: Verify theme persists across browser sessions
3. **System Detection**: Test with different OS theme settings
4. **Accessibility**: Test with screen readers and keyboard navigation

### Automated Testing
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ZentheaThemeProvider } from '@/lib/theme-context';

test('theme switching works', () => {
  render(
    <ZentheaThemeProvider>
      <ThemeToggle />
    </ZentheaThemeProvider>
  );
  
  const toggle = screen.getByRole('button');
  fireEvent.click(toggle);
  
  // Verify theme change
  expect(document.documentElement).toHaveClass('dark');
});
```

## 🚀 Migration Guide

### From Existing Theme System

If you have an existing theme system:

1. **Replace Theme Provider**:
   ```tsx
   // Old
   import { ThemeProvider } from './old-theme';
   
   // New
   import { ZentheaThemeProvider } from '@/lib/theme-context';
   ```

2. **Update Theme Toggle**:
   ```tsx
   // Old
   import { ThemeToggle } from './old-components';
   
   // New
   import { ThemeToggle } from '@/components/ui/theme-toggle';
   ```

3. **Update CSS Classes**:
   ```css
   /* Old */
   .theme-light { }
   .theme-dark { }
   
   /* New */
   .light { }
   .dark { }
   .high-contrast { }
   ```

### Gradual Migration

You can migrate gradually by:

1. Adding the new theme provider alongside the old one
2. Testing the new system in a separate branch
3. Gradually replacing theme controls
4. Removing the old system once migration is complete

## 📚 Best Practices

### Theme Usage
- Use semantic theme names (light, dark, high-contrast)
- Provide clear visual feedback for theme changes
- Test all components across all themes
- Consider user preferences and accessibility needs

### Performance
- Theme switching is optimized for smooth transitions
- CSS variables provide efficient theme switching
- Minimal JavaScript overhead

### User Experience
- Provide multiple ways to change themes
- Show current theme clearly
- Respect system preferences by default
- Provide accessibility options

## 🔍 Troubleshooting

### Common Issues

1. **Theme not persisting**:
   - Check localStorage is available
   - Verify storage key is correct
   - Check for browser privacy settings

2. **System theme not detected**:
   - Ensure `useEffect` runs on client side
   - Check media query support
   - Verify event listeners are properly attached

3. **CSS not updating**:
   - Check CSS class names match theme names
   - Verify CSS variables are defined
   - Check for CSS specificity issues

### Debug Mode

Enable debug logging:

```tsx
<ZentheaThemeProvider storageKey="zenthea-theme-debug">
  {/* Your app */}
</ZentheaThemeProvider>
```

Check browser console for theme change logs.

## 🎯 Future Enhancements

### Planned Features
- **Theme Presets**: Custom theme configurations
- **Color Customization**: User-defined color schemes
- **Animation Controls**: Configurable transition speeds
- **Theme Scheduling**: Automatic theme switching based on time

### Extension Points
- Custom theme providers
- Additional theme variants
- Enhanced accessibility features
- Integration with design systems

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: Zenthea Development Team
