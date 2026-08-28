# Design System - Restaurant Theme

## Overview

The BeYours Engine restaurant theme uses a comprehensive design system built on shadcn/ui and Tailwind CSS v4, providing a consistent and accessible UI across all restaurant types.

## Setup

### Dependencies

- **shadcn/ui**: Component library with customizable primitives
- **Tailwind CSS v4**: Utility-first CSS framework
- **Lucide React**: Icon library
- **clsx + tailwind-merge**: Utility class composition

### Configuration Files

- `components.json`: shadcn/ui configuration
- `app/globals.css`: Design tokens and CSS variables
- `lib/utils.ts`: Utility functions (cn helper)

## Design Tokens

### Color System

All colors are defined using HSL values with CSS variables for easy theming and dark mode support.

#### Base Colors

```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 22 100% 50%;        /* Orange - Restaurant brand color */
--secondary: 210 40% 96.1%;
--muted: 210 40% 96.1%;
--accent: 210 40% 96.1%;
--destructive: 0 84.2% 60.2%;
--border: 214.3 31.8% 91.4%;
```

#### Component Colors

```css
--card: 0 0% 100%;
--popover: 0 0% 100%;
--input: 214.3 31.8% 91.4%;
--ring: 22 100% 50%;
```

#### Restaurant-Specific Colors

```css
--success: 142 76% 36%;        /* Green for success states */
--warning: 38 92% 50%;         /* Yellow for warnings */
--info: 217 91% 60%;           /* Blue for information */
```

#### Order Status Colors

```css
--status-pending: 38 92% 50%;      /* Yellow - Order pending */
--status-confirmed: 217 91% 60%;   /* Blue - Order confirmed */
--status-preparing: 25 95% 53%;    /* Orange - Being prepared */
--status-ready: 142 76% 36%;       /* Green - Ready for pickup */
--status-delivered: 262 83% 58%;   /* Purple - Delivered */
--status-cancelled: 0 84% 60%;     /* Red - Cancelled */
```

### Typography

#### Font Families

- **Sans (Body)**: Inter - Clean, modern sans-serif for body text
- **Heading**: Poppins - Bold, friendly font for headings and emphasis

#### Font Variables

```css
--font-sans: var(--font-inter);
--font-heading: var(--font-poppins);
```

#### Usage in Components

```tsx
<h1 className="font-heading">Welcome to Our Restaurant</h1>
<p className="font-sans">Browse our delicious menu items...</p>
```

### Spacing & Layout

- **Border Radius**: `--radius: 0.5rem` (8px) - Consistent rounded corners
- **Container**: Use Tailwind's container utilities with max-width constraints

## Using Colors in Components

### With Tailwind Classes

```tsx
<button className="bg-primary text-primary-foreground">
  Order Now
</button>

<div className="bg-card text-card-foreground">
  Card content
</div>

<span className="text-status-ready">Ready</span>
```

### With CSS Variables

```tsx
<div style={{ backgroundColor: 'hsl(var(--success))' }}>
  Success message
</div>
```

## Dark Mode

Dark mode is automatically supported through CSS variables. Toggle dark mode by adding the `dark` class to the `<html>` element.

```tsx
// Example dark mode toggle
<html className={isDark ? 'dark' : ''}>
```

## Component Utilities

### cn() Helper

The `cn()` utility combines class names and properly merges Tailwind classes to avoid conflicts.

```tsx
import { cn } from "@/lib/utils"

<button
  className={cn(
    "bg-primary text-white",
    isLoading && "opacity-50 cursor-not-allowed",
    className
  )}
>
  Click me
</button>
```

## Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
cd apps/themes
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# etc...
```

Components will be added to `components/ui/` and can be customized as needed.

## Theme Customization

### Changing Primary Color

Update the `--primary` variable in `app/globals.css`:

```css
:root {
  --primary: 22 100% 50%;  /* Orange (default) */
  /* or */
  --primary: 142 76% 36%;  /* Green for eco-friendly restaurants */
  /* or */
  --primary: 262 83% 58%;  /* Purple for fine dining */
}
```

### Restaurant Type Themes

The design system supports 6 predefined themes:

1. **Fast Food**: Orange primary, bold typography
2. **Pizzeria**: Red primary, Italian-inspired
3. **Chinese**: Red/gold accents, traditional feel
4. **Fine Dining**: Dark, elegant, minimal
5. **Café**: Warm browns, cozy aesthetic
6. **Sushi**: Clean, modern, Japanese-inspired

## Best Practices

### Accessibility

- Always use semantic HTML elements
- Ensure sufficient color contrast (WCAG AA minimum)
- Include ARIA labels for interactive elements
- Support keyboard navigation

### Performance

- Use `font-display: swap` for custom fonts (already configured)
- Minimize custom CSS; prefer Tailwind utilities
- Tree-shake unused styles in production

### Consistency

- Use design tokens instead of arbitrary values
- Follow the component composition pattern from shadcn/ui
- Keep custom components in `components/ui/` directory
- Document new components with JSDoc comments

## Chart Colors

For data visualization (charts, graphs):

```css
--chart-1: 12 76% 61%;   /* Coral */
--chart-2: 173 58% 39%;  /* Teal */
--chart-3: 197 37% 24%;  /* Dark Blue */
--chart-4: 43 74% 66%;   /* Yellow */
--chart-5: 27 87% 67%;   /* Orange */
```

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**Version**: 1.0.0
**Last Updated**: February 15, 2026
**Maintained by**: BeYours Team
