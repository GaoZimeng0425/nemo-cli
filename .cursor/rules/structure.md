# Project Structure

## Root Directory
```
├── src/                    # Source code
├── public/                 # Static assets
├── .kiro/                  # Kiro configuration
├── .next/                  # Next.js build output
├── node_modules/           # Dependencies
└── [config files]          # Various config files
```

## Source Organization (`src/`)
```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── favicon.ico        # Site favicon
├── components/            # Reusable components
│   └── ui/               # shadcn/ui components
├── hooks/                # Custom React hooks
└── utils/                # Utility functions
    └── tw.ts             # Tailwind utility (cn function)
```

## Key Conventions

### File Naming
- **Components**: PascalCase (e.g., `Button.tsx`, `AlertDialog.tsx`)
- **Pages**: lowercase (e.g., `page.tsx`, `layout.tsx`)
- **Utilities**: camelCase (e.g., `tw.ts`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTheme.ts`)

### Import Patterns
- Use path aliases: `@/components`, `@/utils`, `@/hooks`
- Absolute imports preferred over relative for cross-directory imports
- Group imports: external libraries first, then internal modules

### Component Structure
- UI components in `src/components/ui/` follow shadcn/ui patterns
- Use `cn()` utility from `@/utils/tw` for className merging
- Implement variants with `class-variance-authority`
- Export both component and any related types/utilities

### Styling Guidelines
- Tailwind utility classes for styling
- CSS variables for theming (defined in globals.css)
- Use `data-slot` attributes for component identification
- Responsive design with mobile-first approach

### TypeScript Patterns
- Strict mode enabled
- Use `React.ComponentProps<"element">` for extending HTML elements
- Define prop interfaces for complex components
- Leverage `VariantProps` for component variants

### App Router Structure
- Pages as `page.tsx` files in route directories
- Layouts as `layout.tsx` files
- Use Server Components by default
- Client Components marked with `"use client"`
