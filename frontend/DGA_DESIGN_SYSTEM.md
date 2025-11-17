# DGA Design System Implementation

## Overview
Complete implementation of the Dubai Government Authority (DGA) Design System for the M-CHAT frontend application.

## Design Tokens

### Color System

#### Primary Palette - SA Green Series
- `sa-50` through `sa-950` - Complete green color scale
- Used as primary brand color throughout the application
- Mapped to `primary` for backward compatibility

#### Neutral / Gray Palette
- `gray-50` through `gray-950` - Complete neutral scale
- Used for backgrounds, borders, typography, and surfaces

#### Semantic Colors
- **Error/Danger**: `error-50` through `error-900` (DGA standard)
- **Warning**: `warning-50` through `warning-900` (DGA standard)
- **Success**: `success-50` through `success-900` (DGA standard)
- **Info/Blue**: `info-50` through `info-900` (DGA standard)

### Gradient Pairs
All gradient pairs are available as CSS variables:
- `--grad-600-500`
- `--grad-700-600`
- `--grad-950-600`
- `--grad-800-600`
- `--grad-800-700`
- `--grad-900-700`

### Typography

#### Font Families
- **Tajawal**: Heading font (h1-h6)
- **IBM Plex Sans Arabic**: Body text (default)
- **Inter**: English UI elements

#### Font Sizes
- `text-xs`: 12px
- `text-sm`: 14px
- `text-base`: 16px
- `text-lg`: 18px
- `text-xl`: 20px
- `text-2xl`: 24px
- `text-3xl`: 30px
- `text-4xl`: 36px
- `text-5xl`: 48px

## Dark Mode Support

### Implementation
- Class-based dark mode using `dark:` prefix
- Automatic theme detection on app load
- Theme preference stored in localStorage
- Respects system preference if no stored preference

### Theme Variables
Light and dark mode theme variables are defined:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--border-primary`, `--border-secondary`
- `--surface`, `--surface-elevated`

## Usage

### Using Colors
```tsx
// SA Primary colors
<div className="bg-sa-500 text-white">...</div>

// Semantic colors
<div className="bg-error-500 text-white">...</div>
<div className="bg-success-500 text-white">...</div>

// Neutral colors
<div className="bg-gray-100 text-gray-900">...</div>
```

### Using Gradients
```tsx
<div className="gradient-primary">...</div>
<div className="gradient-900-700">...</div>
```

### Dark Mode
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">
  ...
</div>
```

### Typography
```tsx
<h1 className="font-display">Heading uses Tajawal</h1>
<p className="font-sans">Body uses IBM Plex Sans Arabic</p>
<span className="font-english">English UI uses Inter</span>
```

## Dark Mode Hook

Use the `useDarkMode` hook to manage theme switching:

```tsx
import { useDarkMode } from './hooks/useDarkMode';

function MyComponent() {
  const { isDark, toggle, enable, disable } = useDarkMode();
  
  return (
    <button onClick={toggle}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
```

## Component Updates

All UI components have been updated to:
- Use DGA color tokens
- Support dark mode
- Follow DGA typography guidelines
- Maintain backward compatibility

## Files Modified

1. `tailwind.config.js` - Complete color palette and typography configuration
2. `src/index.css` - Design tokens, CSS variables, dark mode support
3. `src/main.tsx` - Theme initialization
4. `src/hooks/useDarkMode.ts` - Dark mode management hook
5. UI Components - Updated to use new design tokens

## Backward Compatibility

- `primary-*` maps to `sa-*` colors
- `success-*` uses DGA success colors (different from SA green)
- `danger-*` maps to `error-*` colors
- `secondary-*` maps to `info-*` colors

