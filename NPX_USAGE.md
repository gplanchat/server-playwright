# Using the MCP Server with npx from GitHub

This guide explains how to use the MCP server directly with `npx` from GitHub without cloning the repository or publishing to npm.

## 🚀 Quick Start

You can use the MCP server directly from GitHub using `npx`:

```bash
npx github:gplanchat/server-playwright
```

Or with a specific branch:

```bash
npx github:gplanchat/server-playwright#main
```

Or with the full GitHub URL:

```bash
npx https://github.com/gplanchat/server-playwright
```

## 📋 Prerequisites

1. **Node.js 18+** installed
2. **Mistral API Key** configured as an environment variable
3. **Playwright** will be installed automatically on first use

## ⚙️ Configuration

### Set Environment Variable

Before using, make sure to set your Mistral API key:

```bash
export MISTRAL_API_KEY="your-api-key"
```

Or create a `.env` file in your current directory:

```bash
echo "MISTRAL_API_KEY=your-api-key" > .env
```

### Install Playwright (First Time Only)

On the first run, you may need to install Playwright:

```bash
npx playwright install chromium
```

## 🔧 Configuration for MCP Clients

### Cursor Configuration

Add this to your Cursor settings:

```json
{
  "mcpServers": {
    "playwright-html-render": {
      "command": "npx",
      "args": ["-y", "github:gplanchat/server-playwright"],
      "env": {
        "MISTRAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop Configuration

Add this to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "playwright-html-render": {
      "command": "npx",
      "args": ["-y", "github:gplanchat/server-playwright"],
      "env": {
        "MISTRAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 🧪 Testing

You can test the server directly:

```bash
npx -y github:gplanchat/server-playwright
```

Or use the MCP inspector:

```bash
npx @modelcontextprotocol/inspector npx -y github:gplanchat/server-playwright
```

## 📝 How It Works

When you run `npx github:username/repo`:

1. **npx** downloads the repository from GitHub
2. Installs dependencies automatically (`npm install`)
3. Executes the script defined in `package.json` → `bin` field
4. Caches the package for faster subsequent runs

## 🔄 Using Specific Branches or Tags

You can specify a branch, tag, or commit:

```bash
# Specific branch
npx github:gplanchat/server-playwright#develop

# Specific tag
npx github:gplanchat/server-playwright#v1.0.0

# Specific commit (first 7 characters)
npx github:gplanchat/server-playwright#abc1234
```

## ⚡ Performance Tips

- **First run**: May take longer as it downloads and installs dependencies
- **Subsequent runs**: Much faster as npx caches the package
- **Cache location**: `~/.npm/_npx/` (can be cleared if needed)

## 🐛 Troubleshooting

### Error: "Cannot find module"

Make sure the repository is public and accessible. If it's private, you'll need to use authentication or clone it locally.

### Error: "MISTRAL_API_KEY is required"

Set the environment variable:
```bash
export MISTRAL_API_KEY="your-key"
```

### Error: "Playwright browser not found"

Install Playwright:
```bash
npx playwright install chromium
```

### Slow first run

This is normal - npx needs to download the repository and install dependencies. Subsequent runs will be faster.

## 🔐 Using Private Repositories

For private repositories, you'll need to:

1. **Use GitHub token** in the URL:
```bash
npx github:gplanchat/server-playwright?token=YOUR_GITHUB_TOKEN
```

2. **Or clone locally** and use the local path instead.

## 📚 Alternative: Using a Specific Path

If you want to use a specific file path from the repository:

```json
{
  "mcpServers": {
    "playwright-html-render": {
      "command": "npx",
      "args": ["-y", "github:gplanchat/server-playwright/src/mcp-server.js"],
      "env": {
        "MISTRAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 🎯 Best Practices

1. **Use tags for production**: Pin to a specific version tag for stability
2. **Use main branch for development**: Always get the latest changes
3. **Set environment variables**: Don't hardcode API keys in config files
4. **Test first**: Always test with the inspector before using in production

## 📖 Related Documentation

- [README.md](./README.md) - Main documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [MISTRAL_SETUP.md](./MISTRAL_SETUP.md) - Mistral AI setup

