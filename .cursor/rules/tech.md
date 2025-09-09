# Technology Stack

## Framework & Runtime
- **Next.js 15.5.0** with App Router
- **React 19.1.1** with TypeScript
- **Node.js** runtime environment

## Build System
- **Turbopack** for fast development and builds
- **TypeScript 5.9.2** for type safety
- **Biome** for linting and formatting (replaces ESLint/Prettier)

## UI & Styling
- **Tailwind CSS 4.1.12** for utility-first styling
- **shadcn/ui** components (New York style variant)
- **Radix UI** primitives for accessible components
- **Lucide React** for icons
- **class-variance-authority** for component variants

## Key Libraries
- **@tanstack/react-table** for data tables
- **@tanstack/react-query** for data fetching and caching
- **axios** for HTTP requests
- **@tanstack/react-form** for form handling
- **zod** for data validation
- **next-themes** for theme switching
- **sonner** for toast notifications
- **cmdk** for command palette functionality
- **docusign-esign** for Docusign integration

## Development Tools
- **pnpm** as package manager
- **Biome** for code quality (linting + formatting)
- Path aliases configured (`@/*` → `./src/*`)

## Common Commands

### Development
```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production with Turbopack
pnpm start        # Start production server
```

### Code Quality
```bash
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
```

### Package Management
```bash
pnpm install      # Install dependencies
pnpm add <pkg>    # Add new dependency
```

## Configuration Notes
- Biome is configured for React/Next.js with recommended rules
- TypeScript strict mode enabled
- 2-space indentation, enforced by Biome
- Import organization automated via Biome
- Use `cn()` utility from `@/utils/tw` for className merging
- Import path aliases: `@/components`, `@/lib`, `@/utils, @/hooks`
- Client Components must have `"use client"` directive
- Prefer Server Components unless interactivity required
