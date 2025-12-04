# Mistral AI Configuration

This guide explains how to configure and use Mistral AI with this system.

## 🔑 Get a Mistral API Key

1. Go to [console.mistral.ai](https://console.mistral.ai)
2. Create an account or log in
3. Go to the "API Keys" section
4. Create a new API key
5. Copy the key (it will only be displayed once)

## ⚙️ Configuration

### Environment Variable

```bash
export MISTRAL_API_KEY="your-mistral-api-key"
```

### .env File (Recommended)

Create a `.env` file at the project root:

```bash
MISTRAL_API_KEY=your-mistral-api-key
```

Then load it in your shell:

```bash
source .env
```

## 🤖 Models Used

### For Analysis (Vision)

- **Default Model**: `pixtral-large-latest`
- **Description**: Multimodal model with vision capabilities
- **Usage**: Screenshot analysis to detect rendering issues

### For Correction

- **Default Model**: `mistral-large-latest`
- **Description**: High-performance language model for code generation
- **Usage**: Generation of corrected HTML code

## 📝 Usage Example

```javascript
import { testAndFix } from './src/test.js';

// Usage with default models
const result = await testAndFix('my-file.html', {
  autoFix: true,
  apiKey: process.env.MISTRAL_API_KEY,
});

// Usage with custom models
const result = await testAndFix('my-file.html', {
  autoFix: true,
  apiKey: process.env.MISTRAL_API_KEY,
  // Models can be overridden in analyze.js and fix.js
});
```

## 🔧 Available Models

### Vision Models

- `pixtral-large-latest` (recommended) - Most performant multimodal model
- `pixtral-12b-2409` - Specific version

### Language Models

- `mistral-large-latest` (recommended) - Most performant
- `mistral-medium-latest` - Performance/cost balance
- `mistral-small-latest` - Faster and more economical

## 💰 Costs

Check the [Mistral pricing page](https://mistral.ai/pricing/) for up-to-date costs.

Generally:
- Vision models (pixtral) are more expensive
- "large" models are more expensive but more performant
- "small" models are more economical

## 🐛 Troubleshooting

### Error: "MISTRAL_API_KEY is required"

Verify that the environment variable is properly set:

```bash
echo $MISTRAL_API_KEY
```

If empty, set it:

```bash
export MISTRAL_API_KEY="your-key"
```

### Error: "Invalid API key"

- Verify that the key is correct
- Make sure it hasn't expired
- Check that you have credits on your Mistral account

### Error: "Model not found"

- Verify that the model is available in your region
- Some models may require special access
- Use `pixtral-large-latest` for vision and `mistral-large-latest` for text

## 📚 Resources

- [Mistral AI Documentation](https://docs.mistral.ai/)
- [Mistral Node.js SDK](https://github.com/mistralai/mistral-sdk-js)
- [Mistral Console](https://console.mistral.ai)
