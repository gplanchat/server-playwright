# Quick Start Guide

## Installation in 3 Steps

### 1. Install Dependencies

```bash
cd html-render-agent
npm install
```

### 2. Configure Mistral AI API Key

**Option 1: .env File (Recommended)**

Create a `.env` file at the project root:

```bash
echo "MISTRAL_API_KEY=your-mistral-api-key" > .env
```

**Option 2: Environment Variable**

```bash
export MISTRAL_API_KEY="your-mistral-api-key"
```

> 💡 Get your key at [console.mistral.ai](https://console.mistral.ai)
> 
> The system automatically loads the `.env` file if it exists.

### 3. Test with the Example

```bash
# Simple test (capture + analysis)
npm run test example.html

# Test with automatic correction
npm run test example.html --fix

# Test with simulated AI agent
npm run example example.html "Check this HTML file"
```

## Basic Usage

### Complete Test of an HTML File

```bash
npm run test my-file.html --fix
```

This will:
1. ✅ Capture the render (screenshot + DOM)
2. ✅ Analyze with AI vision
3. ✅ Generate corrections

### Step-by-Step Usage

```bash
# 1. Capture
npm run capture my-file.html

# 2. Analyze (uses files generated in output/)
npm run analyze output/my-file-*.png output/my-file-*.html output/my-file-*.json

# 3. Fix
npm run fix my-file.html output/analysis-*.json
```

## Integration in Your Code

```javascript
import { testAndFix } from './src/test.js';

// Automatic test and correction
const result = await testAndFix('my-file.html', {
  autoFix: true,
  viewport: { width: 1920, height: 1080 },
});

console.log('Problems:', result.analysis.problems.length);
console.log('Corrected file:', result.fix?.corrected);
```

## Generated Files Structure

After execution, you'll find in `output/`:

```
output/
├── my-file-1234567890.png      # Screenshot
├── my-file-1234567890.html     # Captured DOM
├── my-file-1234567890.json     # Metadata
├── analysis-1234567890.md      # Detailed analysis
├── analysis-1234567890.json   # Structured analysis
├── my-file-corrected-*.html    # Corrected HTML
└── my-file-diff-*.md           # Modification diff
```

## Next Steps

- 📖 Read [README.md](README.md) for more details
- 🔌 Check [INTEGRATION.md](INTEGRATION.md) to integrate with an AI agent
- 🧪 Test with the provided `example.html`

## Troubleshooting

### Error: "MISTRAL_API_KEY is required"
→ Set the environment variable: `export MISTRAL_API_KEY="your-key"`

### Error: "Cannot find module 'playwright'"
→ Install dependencies: `npm install`

### Screenshot is empty
→ Verify that the HTML file is valid and paths are correct
