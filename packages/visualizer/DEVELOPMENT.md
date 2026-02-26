# Development Setup Guide

## Prerequisites

**Required Software:**
- Node.js: `^20.19.0 || >=22.12.0`
- pnpm: `^8.0.0` (package manager)
- Git (for workspace protocol resolution)

**Optional Tools:**
- VS Code (recommended IDE)
- Chrome/Edge (for development debugging)

## Installation

1. **Clone and install dependencies:**
```bash
cd nemo-cli
pnpm install
```

2. **Verify Visualizer package:**
```bash
ls packages/visualizer
```

3. **Start development server:**
```bash
# Method 1: Via CLI command (recommended)
nd visualize --open

# Method 2: Direct start
cd packages/visualizer
pnpm run dev
```

4. **Generate test data:**
```bash
# In your Next.js project
cd /path/to/nextjs-project
nd analyze --format ai
```

5. **Load test data:**
```bash
# Drag or select the generated ai-docs/deps.ai.json file in the Visualizer UI
```

## Environment Variables

**Development** (optional):
```env
VITE_PORT=3000
VITE_OPEN=true
VITE_DEBUG_PERFORMANCE=false
```

## Troubleshooting

**Issue:** "Cannot resolve @nemo-cli/deps"
**Solution:** Ensure you run `pnpm install` from workspace root

**Issue:** "Port 3000 is already in use"
**Solution:** Use `nd visualize --port 3001` for a different port

**Issue:** "Cannot find deps.ai.json"
**Solution:** Run `nd analyze` first to generate dependency data
