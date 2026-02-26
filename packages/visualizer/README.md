# @nemo-cli/visualizer

Web-based dependency visualization tool for nemo-cli with force-directed graph layout.

## Installation

```bash
pnpm install
```

## Quick Start

### 1. Generate Dependency Data

In your Next.js or Node.js project:

```bash
nd analyze --format ai
```

This generates `ai-docs/deps.ai.json` with complete dependency information.

### 2. Launch Visualizer

```bash
nd visualize --open
```

Browser opens automatically at http://localhost:3001/

### 3. Upload and Visualize

Upload the generated `deps.ai.json` file to see your dependency graph!

## Usage

### Via CLI Command

```bash
# Default port 3001, auto-open browser
nd visualize --open

# Custom port
nd visualize --port 8080

# Start without opening browser
nd visualize
```

### Direct Development

```bash
cd packages/visualizer
pnpm run dev
```

## Development

### Generate Test Data

In your Next.js project:

```bash
nd analyze --format ai
```

This will generate `ai-docs/deps.ai.json`.

### Load Test Data

1. Open the visualizer at http://localhost:3000
2. Drag and drop or select the generated `deps.ai.json` file

## Architecture

```
packages/visualizer/
├── src/
│   ├── components/       # React components
│   │   ├── GraphView.tsx         # Main React Flow visualization
│   │   ├── DependencyNode.tsx    # Custom node component
│   │   ├── ControlPanel.tsx      # Filters and search
│   │   ├── NodeDetails.tsx       # Selected node info panel
│   │   ├── FileUploader.tsx      # File selection UI
│   │   └── ErrorBoundary.tsx     # Error handling
│   ├── lib/              # Utilities
│   │   ├── parser.ts             # JSON parsing with Zod
│   │   ├── parser.worker.ts      # Web Worker for parsing
│   │   ├── worker-wrapper.ts     # Worker orchestration
│   │   ├── graph-builder.ts      # Build React Flow graph
│   │   ├── file-opener.ts        # Open files in editor
│   │   └── layout/
│   │       ├── types.ts          # Layout interfaces
│   │       └── elk-strategy.ts   # ELK layout algorithm
│   ├── store/            # State management
│   │   └── useGraphStore.ts      # Zustand store
│   ├── types/            # Type definitions
│   │   └── index.ts              # Re-exports + extensions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── __tests__/            # Tests
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── failure-modes/    # Failure mode tests
│   ├── e2e/              # E2E tests
│   └── performance/      # Performance tests
├── index.html            # HTML entry
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Package configuration
```

## Features

- ✅ Interactive dependency graph visualization
- ✅ Force-directed layout using D3.js physics simulation
- ✅ Automatic node positioning with collision detection
- ✅ Drag, zoom, and pan support
- ✅ Cycle detection (SCC) highlighting
- ✅ Scope-based filtering (app/workspace/external)
- ✅ Page-based filtering
- ✅ Node search functionality
- ✅ Node details panel
- ✅ Web Worker JSON parsing
- ✅ Multiple layout algorithms (force/hierarchical/grid)
- ⚠️ Dynamic layout switching (UI ready, implementation pending)
- ⚠️ File opening in editor (implementation pending)
- ⚠️ Export to PNG/SVG (planned)

## Layout Algorithms

### Force-Directed (Default)

Uses D3.js force simulation for automatic node positioning:

- **Physics-based**: Repulsion forces prevent overlap
- **Smart clustering**: Related modules naturally group together
- **Clear visualization**: Optimal spacing for readability
- **Best for**: Large projects with complex dependencies

### Hierarchical

Tree-like layout showing dependency levels:

- **Layered structure**: Clear parent-child relationships
- **Topological ordering**: Dependencies flow from top to bottom
- **Best for**: Projects with clear module hierarchy

### Grid

Simple grid-based layout:

- **Fast computation**: Instant rendering
- **Predictable**: Easy to understand structure
- **Best for**: Small projects, testing, demos

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Visualization**: React Flow (node-based graphs)
- **Layout**: D3.js (force-directed), ELK (hierarchical)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Testing**: Vitest (unit), Playwright (E2E)
- **Validation**: Zod

## Contributing

When implementing features, follow these patterns:

1. **Type Safety**: All functions must have proper TypeScript types
2. **Immutability**: Never mutate state directly
3. **Error Handling**: Always handle errors with user-friendly messages
4. **Testing**: Write tests for all new functionality
5. **Code Style**: Follow existing patterns in the codebase

## License

ISC
