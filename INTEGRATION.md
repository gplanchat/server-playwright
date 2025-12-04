# AI Agent Integration Guide

This guide explains how to integrate the HTML test and correction system into an AI agent.

## 🎯 Key Concepts

An AI agent can use this system to:
1. **See** the render of an HTML page (via screenshot)
2. **Understand** problems (via AI analysis)
3. **Fix** code (via automatic generation)

## 📋 Architecture

```
AI Agent
  ↓
[Capture] → Screenshot + DOM + Metadata
  ↓
[Analysis] → Identified Issues + Recommendations
  ↓
[Correction] → Corrected HTML Code
```

## 🔌 Basic Integration

### Method 1: Direct Use of Functions

```javascript
import { testAndFix } from './src/test.js';

// The agent can call this function
async function agentFixHTML(htmlPath, userRequest) {
  const result = await testAndFix(htmlPath, {
    autoFix: true,
    viewport: { width: 1920, height: 1080 },
  });
  
  return {
    problems: result.analysis.problems,
    fixed: result.fix?.corrected,
    summary: `Detected ${result.analysis.problems.length} issues, fixed in ${result.fix?.corrected}`,
  };
}
```

### Method 2: Integration with Structured Prompts

```javascript
import { captureRender } from './src/capture.js';
import { analyzeRender } from './src/analyze.js';
import { fixRender } from './src/fix.js';

async function agentAnalyzeAndFix(htmlPath, context) {
  // 1. Capture
  const capture = await captureRender(htmlPath);
  
  // 2. Analysis with user context
  const analysis = await analyzeRender(
    capture.screenshot,
    capture.dom,
    capture.metadata,
    {
      criteria: context.criteria || 'default',
    }
  );
  
  // 3. Build an enriched prompt for the agent
  const agentPrompt = `
User context: ${context.userRequest}

Issues detected in HTML render:
${analysis.problems.map((p, i) => 
  `${i + 1}. [${p.severity}] ${p.category}: ${p.description}`
).join('\n')}

Complete analysis:
${analysis.analysis}

What would you like to do?
1. Automatically fix all issues
2. Fix only critical issues
3. Ask for more details on a specific issue
  `;
  
  // The agent can now use this prompt to decide
  return { agentPrompt, analysis, capture };
}
```

## 🤖 Integration with Agent Frameworks

### Example with LangChain

```javascript
import { testAndFix } from './src/test.js';
// Note: Adapt according to your LangChain integration with Mistral
import { HumanMessage, SystemMessage } from 'langchain/schema';

// Use your configured Mistral client
const model = yourMistralClient; // Configure according to your setup

async function langchainAgent(htmlPath, userRequest) {
  // Test the HTML
  const result = await testAndFix(htmlPath, { autoFix: false });
  
  // Build context for the agent
  const systemPrompt = `You are a web development expert. 
You analyze HTML rendering issues and propose corrections.`;
  
  const userPrompt = `
User request: ${userRequest}

Detected issues:
${result.analysis.problems.map(p => 
  `- [${p.severity}] ${p.description}`
).join('\n')}

What should I do?
  `;
  
  const response = await model.call([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);
  
  // If the agent decides to fix
  if (response.content.includes('fix') || response.content.includes('correct')) {
    const fix = await fixRender(htmlPath, result.analysis.resultPath, {
      autoApply: true,
    });
    return { action: 'fixed', file: fix.corrected };
  }
  
  return { action: 'analyzed', problems: result.analysis.problems };
}
```

### Example with AutoGPT / Autonomous Agent

```javascript
import { testAndFix } from './src/test.js';

// Define a capability for the agent
const htmlFixCapability = {
  name: 'test_and_fix_html',
  description: 'Tests and fixes an HTML file by analyzing its render',
  parameters: {
    htmlPath: {
      type: 'string',
      description: 'Path to the HTML file to test',
      required: true,
    },
    autoFix: {
      type: 'boolean',
      description: 'Automatically generate corrections',
      default: false,
    },
  },
  handler: async (params) => {
    const result = await testAndFix(params.htmlPath, {
      autoFix: params.autoFix,
    });
    
    return {
      success: true,
      problems: result.analysis.problems.length,
      fixed: result.fix ? true : false,
      details: result,
    };
  },
};

// The agent can now use this capability
// agent.use(htmlFixCapability);
```

## 🔧 Integration with MCP (Model Context Protocol)

If you're using MCP, you can expose these functions as tools:

```javascript
// mcp-tools.js
import { testAndFix, captureRender, analyzeRender, fixRender } from './src/index.js';

export const mcpTools = [
  {
    name: 'capture_html_render',
    description: 'Captures the render of an HTML page (screenshot + DOM + metadata)',
    inputSchema: {
      type: 'object',
      properties: {
        htmlPath: {
          type: 'string',
          description: 'Path to HTML file or URL',
        },
        viewport: {
          type: 'object',
          properties: {
            width: { type: 'number', default: 1920 },
            height: { type: 'number', default: 1080 },
          },
        },
      },
      required: ['htmlPath'],
    },
    handler: async (params) => {
      return await captureRender(params.htmlPath, {
        viewport: params.viewport,
      });
    },
  },
  {
    name: 'analyze_html_render',
    description: 'Analyzes an HTML render with AI vision to detect issues',
    inputSchema: {
      type: 'object',
      properties: {
        screenshotPath: { type: 'string' },
        domPath: { type: 'string' },
        metadataPath: { type: 'string' },
      },
      required: ['screenshotPath', 'domPath', 'metadataPath'],
    },
    handler: async (params) => {
      return await analyzeRender(
        params.screenshotPath,
        params.domPath,
        params.metadataPath
      );
    },
  },
  {
    name: 'fix_html_render',
    description: 'Fixes an HTML file based on an analysis',
    inputSchema: {
      type: 'object',
      properties: {
        originalHtmlPath: { type: 'string' },
        analysisPath: { type: 'string' },
        autoApply: { type: 'boolean', default: false },
      },
      required: ['originalHtmlPath', 'analysisPath'],
    },
    handler: async (params) => {
      return await fixRender(params.originalHtmlPath, params.analysisPath, {
        autoApply: params.autoApply,
      });
    },
  },
  {
    name: 'test_and_fix_html',
    description: 'Completely tests and fixes an HTML file (capture + analysis + correction)',
    inputSchema: {
      type: 'object',
      properties: {
        htmlPath: { type: 'string' },
        autoFix: { type: 'boolean', default: false },
        viewport: {
          type: 'object',
          properties: {
            width: { type: 'number', default: 1920 },
            height: { type: 'number', default: 1080 },
          },
        },
      },
      required: ['htmlPath'],
    },
    handler: async (params) => {
      return await testAndFix(params.htmlPath, {
        autoFix: params.autoFix,
        viewport: params.viewport,
      });
    },
  },
];
```

## 🎨 Example Usage with a Conversational Assistant

```javascript
// assistant.js
import { testAndFix } from './src/test.js';

class HTMLFixAssistant {
  async handleMessage(userMessage, htmlPath) {
    // Analyze user intent
    const wantsFix = userMessage.toLowerCase().includes('fix') || 
                     userMessage.toLowerCase().includes('correct');
    
    // Test the HTML
    const result = await testAndFix(htmlPath, { autoFix: wantsFix });
    
    // Build response
    if (result.analysis.problems.length === 0) {
      return {
        message: "✅ No issues detected in the HTML render!",
        type: 'success',
      };
    }
    
    if (wantsFix && result.fix) {
      return {
        message: `✅ I've fixed ${result.analysis.problems.length} issues.\n\n` +
                 `Corrected file: ${result.fix.corrected}\n` +
                 `Diff: ${result.fix.diff}`,
        type: 'success',
        files: {
          corrected: result.fix.corrected,
          diff: result.fix.diff,
        },
      };
    }
    
    // List problems
    const problemsList = result.analysis.problems
      .slice(0, 5)
      .map((p, i) => `${i + 1}. [${p.severity}] ${p.description}`)
      .join('\n');
    
    return {
      message: `I've detected ${result.analysis.problems.length} issues:\n\n${problemsList}\n\n` +
               `Would you like me to fix them automatically?`,
      type: 'info',
      problems: result.analysis.problems,
      canFix: true,
    };
  }
}

// Usage
const assistant = new HTMLFixAssistant();
const response = await assistant.handleMessage(
  "Can you check this HTML file?",
  "path/to/file.html"
);
console.log(response.message);
```

## 🔄 Recommended Workflow for an Agent

1. **Detection**: Agent detects that an HTML file needs to be tested
2. **Capture**: Automatic render capture
3. **Analysis**: Analysis with AI vision
4. **Decision**: Agent decides if corrections are needed
5. **Correction**: Generation of corrections (with or without application)
6. **Validation**: Agent can re-test to validate corrections

## 📝 Best Practices

1. **Always capture before analyzing**: The screenshot is essential for analysis
2. **Validate corrections**: Re-test after correction to verify
3. **Preserve context**: Keep metadata and analyses for reference
4. **Ask for confirmation**: For important corrections, ask for validation
5. **Handle errors**: Plan fallbacks if the AI API fails

## 🚀 Complete Example

See `example-usage.js` for a complete integration example.
