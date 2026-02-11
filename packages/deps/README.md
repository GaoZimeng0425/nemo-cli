# `@nemo-cli/deps`

> Dependency analysis CLI for Next.js App Router projects

## Install

```bash
$ pnpm add @nemo-cli/deps --global
```

## Usage

```bash
# Analyze a Next.js project
nd analyze <path>

# Analyze src folder (still writes ai-docs under project root)
nd analyze ./src

# Query page component tree
nd page <route>

# Output as Graphviz DOT
nd analyze <path> --format dot --output deps.dot

# Output as JSON
nd analyze <path> --format json

# Output AI-friendly JSON (page map + node map)
nd analyze <path> --format ai --output ./ai-docs/deps.ai.json

# Run AI analysis with progress UI and per-component files
nd ai --input ./ai-docs/deps.ai.json

# Analyze specific route
nd analyze <path> --route /dashboard

# Show only leaf nodes
nd analyze <path> --leaves

# Show only orphan nodes
nd analyze <path> --orphans

# Highlight cycles in output
nd analyze <path> --cycles

# Limit analysis depth
nd analyze <path> --max-depth 3

# Follow external dependencies
nd analyze <path> --external

# Verbose output
nd analyze <path> --verbose
```

## Features

- **Next.js App Router Support**: Automatically detects and analyzes Next.js App Router routes
- **Multiple Output Formats**: Tree (default), JSON, Graphviz DOT
- **AI Output**: Page map + node map + cycle groups (tree output stays in `--format tree`)
- **AI Analysis Runner**: Interactive route selector + progress view + per-component outputs
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
nd analyze . --format dot --output deps.dot
dot -Tsvg deps.dot -o deps.svg
```

## Commands

### `analyze [options] <path>`
Analyzes dependencies of a Next.js project.

**Options:**
- `--format <type>` - Output format: tree, json, dot, or ai (default: tree)
- `--output <file>` - Output file path
- `--route <path>` - Analyze specific route only
- `--leaves` - Show only leaf nodes (no dependencies)
- `--orphans` - Show only orphan nodes (no importers)
- `--cycles` - Highlight circular dependencies
- `--max-depth <number>` - Limit analysis depth
- `--external` - Follow external dependencies
- `--no-ai-json` - Disable default `ai-docs/deps.ai.json` side output
- `--verbose` - Enable verbose output

Default behavior:
- `nd analyze` always writes `ai-docs/deps.ai.json` under project root
- `nd analyze --format ai` writes main output to `ai-docs/deps.ai.json` by default

### `page [options] <route>`
Queries page component tree from generated JSON.

**Options:**
- `--input <file>` - Input JSON file path (default: deps.json)
- `--format <type>` - Output format: tree or json (default: tree)

## Examples

```bash
# Basic analysis
nd analyze ./my-nextjs-app

# Generate SVG visualization
nd analyze ./my-nextjs-app --format dot --output deps.dot
dot -Tsvg deps.dot -o deps.svg

# Analyze specific route
nd analyze ./my-nextjs-app --route /dashboard

# Find circular dependencies
nd analyze ./my-nextjs-app --cycles

# Quick check for leaf nodes
nd analyze ./my-nextjs-app --leaves --format tree

# Query page component tree
nd page /dashboard --input deps.json
```

## License

ISC © [gaozimeng](https://github.com/GaoZimeng0425)
### `ai [options]`
Runs AI analysis for a selected page route and stores per-component results.

**Options:**
- `--input <file>` - Input AI JSON file (default: ai-docs/deps.ai.json)
- `--output <dir>` - Output directory (default: <appRoot>/ai-docs)
- `--route <path>` - Analyze a specific route (skip selector)
- `--engine <engine>` - AI engine: openai, google, zhipu, none
- `--model <name>` - Model name
- `--max-source-chars <number>` - Max source chars per component (default: 12000)
- `--fresh` - Ignore existing analysis results

**Output:**
- Component files: `ai-docs/components/**`
- Page index: `ai-docs/pages/<route>/page.json`

**AI Keys:**
- `OPENAI_API_KEY` for OpenAI
- `GOOGLE_API_KEY` for Google Gemini
- `ZHIPU_API_KEY` for Zhipu (glm)
If no `--engine` is provided, the runner will auto-detect based on available API keys.
Optional:
- `ZHIPU_BASE_URL` for custom Zhipu endpoint
