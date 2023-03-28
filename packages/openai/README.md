<p align="center">
Use chatGPT on your terminal
</p>

# Pre-requisite

You'll need to have your own `OpenAi` API key to operate this package.

1. Go to [OpenAI](https://platform.openai.com/account/api-keys)
2. Select `+ Create new secret key`
3. Copy generated key

# Get Started

## Install

```bash
npm install @nemo-cli/openai --global
```

or

```bash
pnpm add @nemo-cli/openai --global
```

## Usage

### Reserve the API key for accessing openai

```bash
openai key
```

### Choose the model you want to use

```bash
openai model
```

### Choose Prompt to Chat

```bash
openai chat
```

### Add Custom Prompt to Chat

```bash
openai --new
```

### Set Token Limit

```bash
openai --limit
```

### Reset Prompt(Clear Custom Prompts)

```bash
openai --reset
```

### Other

```bash
openai -h
```
