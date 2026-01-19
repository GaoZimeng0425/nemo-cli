# AGENTS

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>algorithmic-art</name>
<description>Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations.</description>
<location>project</location>
</skill>

<skill>
<name>brand-guidelines</name>
<description>Applies Anthropic's official brand colors and typography to any sort of artifact that may benefit from having Anthropic's look-and-feel. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.</description>
<location>project</location>
</skill>

<skill>
<name>canvas-design</name>
<description>Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations.</description>
<location>project</location>
</skill>

<skill>
<name>doc-coauthoring</name>
<description>Guide users through a structured workflow for co-authoring documentation. Use when user wants to write documentation, proposals, technical specs, decision docs, or similar structured content. This workflow helps users efficiently transfer context, refine content through iteration, and verify the doc works for readers. Trigger when user mentions writing docs, creating proposals, drafting specs, or similar documentation tasks.</description>
<location>project</location>
</skill>

<skill>
<name>docx</name>
<description>"Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. When Claude needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks"</description>
<location>project</location>
</skill>

<skill>
<name>frontend-design</name>
<description>Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.</description>
<location>project</location>
</skill>

<skill>
<name>internal-comms</name>
<description>A set of resources to help me write all kinds of internal communications, using the formats that my company likes to use. Claude should use this skill whenever asked to write some sort of internal communications (status reports, leadership updates, 3P updates, company newsletters, FAQs, incident reports, project updates, etc.).</description>
<location>project</location>
</skill>

<skill>
<name>mcp-builder</name>
<description>Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).</description>
<location>project</location>
</skill>

<skill>
<name>pdf</name>
<description>Comprehensive PDF manipulation toolkit for extracting text and tables, creating new PDFs, merging/splitting documents, and handling forms. When Claude needs to fill in a PDF form or programmatically process, generate, or analyze PDF documents at scale.</description>
<location>project</location>
</skill>

<skill>
<name>pptx</name>
<description>"Presentation creation, editing, and analysis. When Claude needs to work with presentations (.pptx files) for: (1) Creating new presentations, (2) Modifying or editing content, (3) Working with layouts, (4) Adding comments or speaker notes, or any other presentation tasks"</description>
<location>project</location>
</skill>

<skill>
<name>skill-creator</name>
<description>Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.</description>
<location>project</location>
</skill>

<skill>
<name>slack-gif-creator</name>
<description>Knowledge and utilities for creating animated GIFs optimized for Slack. Provides constraints, validation tools, and animation concepts. Use when users request animated GIFs for Slack like "make me a GIF of X doing Y for Slack."</description>
<location>project</location>
</skill>

<skill>
<name>template</name>
<description>Replace with description of the skill and when Claude should use it.</description>
<location>project</location>
</skill>

<skill>
<name>theme-factory</name>
<description>Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. There are 10 pre-set themes with colors/fonts that you can apply to any artifact that has been creating, or can generate a new theme on-the-fly.</description>
<location>project</location>
</skill>

<skill>
<name>web-artifacts-builder</name>
<description>Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts requiring state management, routing, or shadcn/ui components - not for simple single-file HTML/JSX artifacts.</description>
<location>project</location>
</skill>

<skill>
<name>webapp-testing</name>
<description>Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.</description>
<location>project</location>
</skill>

<skill>
<name>xlsx</name>
<description>"Comprehensive spreadsheet creation, editing, and analysis with support for formulas, formatting, data analysis, and visualization. When Claude needs to work with spreadsheets (.xlsx, .xlsm, .csv, .tsv, etc) for: (1) Creating new spreadsheets with formulas and formatting, (2) Reading or analyzing data, (3) Modify existing spreadsheets while preserving formulas, (4) Data analysis and visualization in spreadsheets, or (5) Recalculating formulas"</description>
<location>project</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>

## Build Commands

### Development
```bash
pnpm dev              # Start development in parallel across all packages
pnpm dev:email        # Start email service development
pnpm dev:slack        # Start Slack bot development
```

### Building
```bash
pnpm build            # Build all packages in parallel
pnpm build-dts        # Build declaration files for all packages
```

### Testing
```bash
vitest                # Run all tests
vitest run            # Run tests once
vitest run <file>     # Run single test file
pnpm coverage         # Generate coverage report
```

### Code Quality
```bash
pnpm format           # Format code with Biome
pnpm check            # Run Biome check (lint + format) across all packages
pnpm compile          # TypeScript type checking (no emit)
```

### Package Management
```bash
pnpm knip             # Detect unused files and dependencies
pnpm release          # Create new release
pnpm release:dry      # Dry run release
```

## Code Style Guidelines

### Formatting & Linting
- **Tool**: Biome (replaces ESLint/Prettier)
- **Indentation**: 2 spaces
- **Line width**: 120 characters
- **Semicolons**: As needed (Biome preference)
- **Quotes**: Single quotes for strings, double for JSX
- **Trailing commas**: ES5 compatible

### Import Organization
Imports are auto-organized by Biome with this priority:
1. Bun/Node.js built-ins
2. External npm packages (excluding @nemo-cli/*)
3. React
4. Package protocols, URLs
5. External packages (excluding @nemo-cli/*)
6. Blank line separator
7. Internal @nemo-cli/* packages
8. Aliases and path imports

### TypeScript Configuration
- **Strict mode**: Enabled
- **Module system**: ES modules (`"type": "module"`)
- **Target**: Current Node.js LTS
- **Declaration files**: Generated for all packages
- **Path aliases**: Configured for monorepo structure

### Error Handling
- Use centralized `handleError` utility from `@nemo-cli/shared`
- Error messages should be user-friendly via `ErrorMessage` component
- Async operations use `xASync` wrapper for consistent error handling
- Log errors with appropriate context using `log.error`

### Naming Conventions
- **Files**: kebab-case for directories, camelCase for files
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **Packages**: kebab-case with @nemo-cli scope

### Package Structure
- Monorepo with pnpm workspaces
- Each package has its own package.json and TypeScript config
- Shared utilities in `@nemo-cli/shared`
- UI components in `@nemo-cli/ui`
- Domain-specific packages: git, file, ai, mail, package

### Commit Message Convention
Follows conventional commits with these types:
- `feat`: New features
- `fix`: Bug fixes  
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Testing
- `build`: Build system
- `ci`: CI/CD
- `chore`: Maintenance
- `revert`: Revert changes
- `wip`: Work in progress
- `release`: Release

**Scopes**: git, shared, ai, ui, packages, mail

### React Component Rules (from .cursor/rules)
- Use function components only (no class components)
- Style with TailwindCSS
- State management with zustand
- PropTypes type definitions required
- Code splitting with dynamic imports

### Testing
- **Framework**: Vitest
- **Test location**: `packages/*/__tests__/**/*.{test,spec}.{js,ts}`
- **Coverage**: Run with `pnpm coverage`
- **Single test**: `vitest run path/to/test.test.ts`

### Development Workflow
1. Run `pnpm dev` for parallel development
2. Use `pnpm check` before committing
3. Follow commit message convention (enforced by commitlint)
4. Use `pnpm knip` to detect unused dependencies
5. Build with `pnpm build` before release

### Environment Configuration
- Use `.env.example` as template
- Environment variables loaded via dotenv
- Config loading with `unconfig` utility
- Support for multiple config formats

### Performance Considerations
- Use `es-toolkit` for optimized utility functions
- Lazy load heavy dependencies
- Prefer async/await over Promise chains
- Use appropriate data structures (Maps, Sets)
