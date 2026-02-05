# `@nemo-cli/deps`

> Dependency analysis CLI for Next.js App Router projects

## Install

```bash
$ pnpm add @nemo-cli/deps --global
```

## Usage

```bash
# Analyze a Next.js project
ndeps analyze <path>

# Output as Graphviz DOT
ndeps analyze <path> --format dot --output deps.dot

# Output as JSON
ndeps analyze <path> --format json

# Analyze specific route
ndeps analyze <path> --route /dashboard

# Show only leaf nodes
ndeps analyze <path> --leaves

# Show only orphan nodes
ndeps analyze <path> --orphans

# Highlight cycles in output
ndeps analyze <path> --cycles

# Limit analysis depth
ndeps analyze <path> --max-depth 3

# Follow external dependencies
ndeps analyze <path> --external

# Verbose output
ndeps analyze <path> --verbose
```

## Features

- **Next.js App Router Support**: Automatically detects and analyzes Next.js App Router routes
- **Multiple Output Formats**: Tree (default), JSON, Graphviz DOT
- **Cycle Detection**: Identifies circular dependencies
- **Leaf/Orphan Detection**: Finds unused or terminal dependencies
- **Configurable Depth**: Limit analysis to specific depth levels
- **Module System Detection**: Supports ES6 modules, CommonJS, and dynamic imports

## Output Formats

### Tree
Hierarchical tree visualization with emoji markers for different node types:

- 🚀 Entry points (routes/pages)
- 🍃 Leaf nodes (no dependencies)
- ⚠️ Dynamic imports
- Dashed lines: CommonJS modules

### JSON
Structured JSON output with full graph data, statistics, and route metadata.

### DOT
Graphviz DOT format for generating visual dependency graphs:

```bash
ndeps analyze . --format dot --output deps.dot
dot -Tsvg deps.dot -o deps.svg
```

## Examples

```bash
# Basic analysis
ndeps analyze ./my-nextjs-app

# Generate SVG visualization
ndeps analyze ./my-nextjs-app --format dot --output deps.dot
dot -Tsvg deps.dot -o deps.svg

# Analyze specific route
ndeps analyze ./my-nextjs-app --route /dashboard

# Find circular dependencies
ndeps analyze ./my-nextjs-app --cycles

# Quick check for leaf nodes
ndeps analyze ./my-nextjs-app --leaves --format tree
```

## License

ISC © [gaozimeng](https://github.com/GaoZimeng0425)
