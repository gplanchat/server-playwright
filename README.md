# MCP Server - Playwright HTML Render

This project exposes HTML analysis and correction capabilities via the MCP (Model Context Protocol).

## 🚀 Installation

```bash
npm install
```

Make sure you have configured your Mistral API key in a `.env` file:

```bash
MISTRAL_API_KEY=your-api-key
```

## 📖 Usage

### Option 1: Using with npx (No Installation Required)

You can use this MCP server directly with `npx` without cloning the repository:

```bash
npx github:gplanchat/server-playwright
```

The MCP server communicates via stdio (standard input/output), allowing MCP clients to connect to it.

**Note**: Make sure you have the `MISTRAL_API_KEY` environment variable set, or create a `.env` file in your current directory.

### Option 2: Local Installation

If you've cloned the repository:

```bash
npm install
npm run mcp
```

### Configuration for Cursor

To use this MCP server with Cursor, add the following configuration to your Cursor settings:

1. Open Cursor settings
2. Search for "MCP" or "Model Context Protocol"
3. Add the following configuration:

**Using npx (Recommended):**

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

**Using local installation:**

```json
{
  "mcpServers": {
    "playwright-html-render": {
      "command": "node",
      "args": ["/path/to/server-playwright/src/mcp-server.js"],
      "env": {
        "MISTRAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

**Note**: 
- For npx usage, the `-y` flag automatically accepts the package installation prompt
- For local installation, replace `/path/to/server-playwright` with the absolute path to your project

### Configuration for Claude Desktop

To use with Claude Desktop, modify the MCP configuration file (usually `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

**Using npx (Recommended):**

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

**Using local installation:**

```json
{
  "mcpServers": {
    "playwright-html-render": {
      "command": "node",
      "args": ["/path/to/server-playwright/src/mcp-server.js"],
      "env": {
        "MISTRAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

## 🛠️ Available Tools

The MCP server exposes the following tools:

### 1. `capture_html_render`

Captures the render of an HTML page (screenshot, DOM, metadata).

**Parameters:**
- `htmlPath` (required): Path to HTML file or URL
- `viewport` (optional): Viewport size `{ width: 1920, height: 1080 }`
- `fullPage` (optional): Capture the entire page (default: `false`)

**Usage example:**
```json
{
  "name": "capture_html_render",
  "arguments": {
    "htmlPath": "https://example.com",
    "viewport": { "width": 1920, "height": 1080 }
  }
}
```

### 2. `analyze_html_render`

Analyzes an HTML render with AI vision to detect issues.

**Parameters:**
- `screenshotPath` (required): Path to screenshot PNG file
- `domPath` (required): Path to DOM HTML file
- `metadataPath` (required): Path to metadata JSON file
- `criteria` (optional): Analysis criteria (default: `"default"`)

**Usage example:**
```json
{
  "name": "analyze_html_render",
  "arguments": {
    "screenshotPath": "output/example-1234567890.png",
    "domPath": "output/example-1234567890.html",
    "metadataPath": "output/example-1234567890.json",
    "criteria": "default"
  }
}
```

### 3. `fix_html_render`

Fixes an HTML file based on an analysis.

**Parameters:**
- `originalHtmlPath` (required): Path to original HTML file
- `analysisPath` (required): Path to analysis JSON file
- `autoApply` (optional): Automatically apply corrections (default: `false`)

**Usage example:**
```json
{
  "name": "fix_html_render",
  "arguments": {
    "originalHtmlPath": "example.html",
    "analysisPath": "output/analysis-1234567890.json",
    "autoApply": false
  }
}
```

### 4. `test_and_fix_html`

Tests and fixes a complete HTML render (capture + analysis + correction).

**Parameters:**
- `htmlPath` (required): Path to HTML file or URL
- `viewport` (optional): Viewport size `{ width: 1920, height: 1080 }`
- `autoFix` (optional): Automatically generate corrections (default: `false`)
- `criteria` (optional): Analysis criteria (default: `"default"`)

**Usage example:**
```json
{
  "name": "test_and_fix_html",
  "arguments": {
    "htmlPath": "https://example.com",
    "viewport": { "width": 1920, "height": 1080 },
    "autoFix": true,
    "criteria": "default"
  }
}
```

### 5. `verify_html_render`

Verifies that an HTML render matches an expected detailed description or CSS specifications.

**Parameters:**
- `htmlPath` (required): Path to HTML file or URL to verify
- `expectedDescription` (required): Detailed description of expected render or CSS specifications
- `viewport` (optional): Viewport size `{ width: 1920, height: 1080 }`
- `fullPage` (optional): Capture the entire page (default: `false`)
- `verificationType` (optional): Verification type - `"auto"` (automatic detection), `"description"` (textual description), `"css"` (CSS specifications) (default: `"auto"`)

**Example with textual description:**
```json
{
  "name": "verify_html_render",
  "arguments": {
    "htmlPath": "https://example.com",
    "expectedDescription": "The page must contain a header with a logo on the left, a centered navigation menu with 5 links (Home, About, Services, Portfolio, Contact), and a 'Contact Us' button on the right. The header must have a white background and a height of 80px.",
    "verificationType": "description"
  }
}
```

**Example with CSS specifications:**
```json
{
  "name": "verify_html_render",
  "arguments": {
    "htmlPath": "example.html",
    "expectedDescription": ".header { background-color: #ffffff; height: 80px; display: flex; align-items: center; justify-content: space-between; } .logo { width: 150px; height: 50px; } .nav-menu { display: flex; gap: 20px; } .nav-menu a { color: #333; text-decoration: none; }",
    "verificationType": "css"
  }
}
```

**Response:**
```json
{
  "success": true,
  "conform": true,
  "score": 95,
  "discrepanciesCount": 1,
  "discrepancies": [
    {
      "severity": "minor",
      "property": "gap",
      "expected": "20px",
      "actual": "15px",
      "selector": ".nav-menu",
      "description": "The spacing between menu items is 15px instead of 20px",
      "suggested_fix": "Add gap: 20px; to .nav-menu"
    }
  ],
  "verificationPath": "output/verification-1234567890.md",
  "resultPath": "output/verification-1234567890.json"
}
```

## 🧪 Testing with MCP Inspector

You can test the MCP server with the official inspector:

```bash
npx @modelcontextprotocol/inspector node src/mcp-server.js
```

This will open a web interface to test the available tools.

## 📝 Notes

- The MCP server uses stdio for communication, so it must be launched by an MCP client
- Generated files are saved in the `output/` folder
- Make sure Playwright is installed: `npx playwright install chromium`
- The Mistral API key is required for analysis and correction tools

## 📚 Additional Documentation

- [NPX_USAGE.md](./NPX_USAGE.md) - Guide for using the server with `npx` without cloning
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [MISTRAL_SETUP.md](./MISTRAL_SETUP.md) - Mistral AI configuration guide
- [INTEGRATION.md](./INTEGRATION.md) - AI agent integration guide

## 🔧 Troubleshooting

### Server won't start

Check that:
- Node.js 18+ is installed
- Dependencies are installed (`npm install`)
- The Mistral API key is configured

### Capture errors

Make sure Playwright is installed:
```bash
npx playwright install chromium
```

### Analysis errors

Verify that your Mistral API key is valid and you have credits available.
