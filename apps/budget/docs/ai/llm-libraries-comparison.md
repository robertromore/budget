# JavaScript LLM Libraries Comparison

## Executive Summary

Four major JavaScript LLM libraries serve different use cases:

| Aspect | Vercel AI SDK | LangChain.js | @themaximalist/llm.js | rahuldshetty/llm.js |
|--------|---------------|--------------|----------------------|---------------------|
| **Primary Use** | Full-stack AI framework | Comprehensive AI framework | Cloud API wrapper | Browser-based local inference |
| **Where Models Run** | Cloud providers | Cloud + Local | Cloud providers | Client device (WebAssembly) |
| **Framework Support** | React, Svelte, Vue, Solid | Framework-agnostic | Framework-agnostic | Browser-only |
| **Model Size** | Any | Any | Any | Small only (≤1B params) |
| **API Cost** | Per-token pricing | Per-token pricing | Per-token pricing | Free (runs locally) |
| **Complexity** | Medium | High | Low | Low |
| **Bundle Size** | ~50KB | ~200KB+ | ~15KB | ~100KB + models |
| **Best For** | SvelteKit apps | Complex AI workflows | Simple LLM calls | Privacy/offline |

---

## Library 1: Vercel AI SDK (`ai`)

**Repository:** https://github.com/vercel/ai
**Install:** `npm install ai`
**NPM:** ~500K weekly downloads

### Overview
Production-ready SDK from Vercel with first-class support for modern web frameworks including SvelteKit. Designed for building AI-powered applications with streaming, hooks, and multi-modal capabilities.

### Supported Providers (25+)
- OpenAI (GPT-4, GPT-4o, o1)
- Anthropic (Claude 3.5, Claude 3)
- Google (Gemini)
- Mistral
- Cohere
- Amazon Bedrock
- Azure OpenAI
- Groq
- Fireworks
- Together AI
- Replicate
- OpenRouter
- xAI (Grok)
- DeepSeek
- And more...

### Key Features
- **Streaming** - First-class streaming support with backpressure handling
- **Framework Hooks** - `useChat`, `useCompletion` for React/Svelte/Vue
- **Tool Calling** - Structured tool/function execution with type safety
- **Structured Output** - Zod schema validation for responses
- **Multi-modal** - Image, audio, file attachments
- **Generative UI** - Stream React/Svelte components from LLM
- **RAG Support** - Built-in embeddings and retrieval patterns
- **Middleware** - Request/response interceptors
- **Edge Runtime** - Optimized for Vercel Edge, Cloudflare Workers
- **TypeScript** - Full type safety

### Basic Usage
```typescript
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Simple completion
const { text } = await generateText({
  model: openai('gpt-4'),
  prompt: 'Normalize this payee: WALMART #1234 SUPERCENTER'
});

// Streaming
const result = await streamText({
  model: openai('gpt-4'),
  messages: [
    { role: 'system', content: 'You are a financial assistant' },
    { role: 'user', content: 'Categorize: Coffee at Starbucks' }
  ]
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}

// Structured output with Zod
import { z } from 'zod';
const { object } = await generateObject({
  model: openai('gpt-4'),
  schema: z.object({
    payee: z.string(),
    category: z.string(),
    confidence: z.number()
  }),
  prompt: 'Parse: AMAZON MKTPLACE PMTS'
});
```

### SvelteKit Integration
```svelte
<script lang="ts">
  import { useChat } from '@ai-sdk/svelte';

  const { messages, input, handleSubmit } = useChat({
    api: '/api/chat'
  });
</script>

<form onsubmit={handleSubmit}>
  <input bind:value={$input} />
  <button type="submit">Send</button>
</form>

{#each $messages as message}
  <div>{message.role}: {message.content}</div>
{/each}
```

### Advantages
1. **SvelteKit native** - First-class Svelte support with hooks
2. **Production-proven** - Used by thousands of Vercel apps
3. **Type-safe** - Full TypeScript with Zod integration
4. **Streaming optimized** - Best-in-class streaming support
5. **Well documented** - Excellent docs and examples
6. **Active development** - Frequent updates, responsive team
7. **Edge-ready** - Optimized for serverless/edge deployment
8. **Provider ecosystem** - 25+ providers via `@ai-sdk/*` packages

### Disadvantages
1. **API costs** - Cloud provider pricing applies
2. **Bundle size** - Larger than minimal wrappers
3. **Learning curve** - More concepts than simple wrappers
4. **Vercel-centric** - Some features optimized for Vercel platform

### Best For
- **SvelteKit applications** (like your budget app)
- Production applications needing streaming
- Teams wanting type safety and structured output
- Applications needing Svelte-specific hooks

---

## Library 2: LangChain.js

**Repository:** https://github.com/langchain-ai/langchainjs
**Install:** `npm install langchain @langchain/core`
**NPM:** ~300K weekly downloads

### Overview
Comprehensive framework for building LLM-powered applications. Provides abstractions for chains, agents, memory, and retrieval-augmented generation (RAG).

### Supported Providers
- OpenAI
- Anthropic
- Google (Vertex AI, Gemini)
- Azure OpenAI
- AWS Bedrock
- Cohere
- Hugging Face
- Ollama (local)
- Fireworks
- Together AI
- 30+ more via integrations

### Key Features
- **Chains** - Compose multiple LLM calls into workflows
- **Agents** - Autonomous agents with tool use and reasoning
- **Memory** - Conversation history and context management
- **RAG** - Document loaders, text splitters, vector stores
- **Structured Output** - Schema-based response parsing
- **Streaming** - Token-by-token streaming
- **Callbacks** - Logging, tracing, debugging hooks
- **LangSmith** - Observability and debugging platform
- **Templates** - Prompt templates with variables
- **Output Parsers** - JSON, CSV, regex parsing

### Basic Usage
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({ model: 'gpt-4' });

// Simple completion
const response = await model.invoke([
  new SystemMessage('You are a financial assistant'),
  new HumanMessage('Categorize: Coffee at Starbucks')
]);

// With structured output
import { z } from 'zod';
const structuredModel = model.withStructuredOutput(
  z.object({
    category: z.string(),
    confidence: z.number()
  })
);

const result = await structuredModel.invoke('Categorize: WALMART GROCERY');

// Chains
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate('Normalize this payee: {payee}'),
  model,
  (response) => response.content
]);

const normalized = await chain.invoke({ payee: 'WALMART #1234' });
```

### Advantages
1. **Comprehensive** - Everything for complex AI apps
2. **Agents** - Autonomous reasoning with tools
3. **RAG built-in** - Document processing, embeddings, vector stores
4. **Memory** - Conversation state management
5. **Observability** - LangSmith for debugging/tracing
6. **Large community** - Extensive examples and tutorials
7. **Local models** - Ollama and HuggingFace support

### Disadvantages
1. **Complexity** - Steep learning curve
2. **Bundle size** - Large dependency tree
3. **Abstraction overhead** - May be overkill for simple use cases
4. **Fast-moving API** - Frequent breaking changes
5. **Over-engineering risk** - Easy to over-complicate

### Best For
- Complex AI workflows with multiple steps
- Applications needing agents and autonomous reasoning
- RAG applications with document retrieval
- Teams wanting full observability (LangSmith)
- Projects that may grow to complex AI features

---

## Library 3: @themaximalist/llm.js

**Repository:** https://github.com/themaximal1st/llm.js
**Install:** `npm install @themaximalist/llm.js`

### Overview
Zero-dependency unified interface for cloud LLM providers. The simplest option for basic LLM calls without framework overhead.

### Supported Providers
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google (Gemini)
- Groq
- xAI (Grok)
- DeepSeek
- Ollama (local models)

### Key Features
- **Unified API** - Same interface across all providers
- **Streaming** - Real-time response streaming
- **Tool/Function Calling** - Structured function execution
- **Parsers** - Built-in JSON, XML, Markdown code block parsing
- **Attachments** - Image and document support
- **Cost Tracking** - Automatic token counting and cost calculation
- **Thinking Mode** - Support for reasoning models
- **Model Discovery** - Query available models per provider

### Basic Usage
```javascript
import LLM from "@themaximalist/llm.js"

// Simple completion
const response = await LLM("Normalize this payee name: WALMART #1234")

// With options
const response = await LLM("Parse this transaction", {
  model: "gpt-4",
  parser: "json",
  stream: true
})

// With message history
const response = await LLM([
  { role: "system", content: "You are a financial assistant" },
  { role: "user", content: "Categorize: Coffee purchase at Starbucks" }
])
```

### Advantages
1. **Simplest API** - Minimal learning curve
2. **Zero dependencies** - Lightweight, no bloat (~15KB)
3. **Provider flexibility** - Easy to switch providers
4. **Cost tracking** - Built-in cost awareness
5. **Production-proven** - Used in 6+ production applications
6. **Local model support** - Ollama integration

### Disadvantages
1. **Limited features** - No RAG, agents, or memory
2. **No framework hooks** - Manual integration required
3. **Smaller community** - Fewer examples/resources
4. **No TypeScript types** - JavaScript only
5. **Basic streaming** - Less sophisticated than AI SDK

### Best For
- Simple LLM integrations without framework overhead
- Prototyping and experimentation
- Backend services with straightforward needs
- Teams wanting minimal dependencies

---

## Library 4: rahuldshetty/llm.js

**Repository:** https://github.com/rahuldshetty/llm.js
**Install:** Download release package from GitHub

### Overview
Browser-based LLM inference using WebAssembly. Runs small language models directly on client devices without server communication.

### Supported Models
- TinyLLaMA (1B, 1.1B variants)
- GPT-2 (124M parameters)
- Tiny Mistral
- Tiny StarCoder Py
- Qwen models
- TinySolar
- Pythia
- Mamba
- Custom GGUF-formatted models

### Key Features
- **Client-side inference** - No server required
- **WebAssembly powered** - Near-native performance
- **Web Worker support** - Non-blocking background processing
- **Model caching** - IndexedDB storage for faster subsequent loads
- **Response structuring** - CFG Grammar and JSON schema guidance
- **Pure JavaScript** - No external dependencies
- **Offline capable** - Works without internet after model download

### Basic Usage
```javascript
import { LLM } from './llm.js'

const llm = new LLM('GGUF_CPU', modelUrl)

llm.load_worker().then(() => {
  llm.run({
    prompt: "Categorize: Coffee at Starbucks",
    max_tokens: 100,
    temperature: 0.7
  }, (result) => {
    console.log(result.content)
  })
})
```

### Advantages
1. **Zero API costs** - Free after initial setup
2. **Complete privacy** - Data never leaves the device
3. **Offline capable** - Works without internet
4. **No rate limits** - Unlimited local inference
5. **Edge deployment** - Perfect for mobile/edge scenarios

### Disadvantages
1. **Limited model quality** - Only small models (~1B parameters)
2. **Device constraints** - Performance varies by hardware
3. **Initial download** - Models are 500MB-2GB
4. **Memory usage** - Significant RAM requirements
5. **Slower than cloud** - For complex tasks
6. **Browser-only** - No Node.js support
7. **Less mature** - Smaller community

### Best For
- Privacy-critical applications
- Offline-first requirements
- Simple text tasks (classification, extraction)
- Cost-sensitive deployments with high volume
- Edge/mobile applications

---

## Recommendation for Budget App

### Primary Recommendation: Vercel AI SDK (`ai`)

**Rationale:**

1. **SvelteKit Native** - First-class Svelte support with `@ai-sdk/svelte` hooks. Your app uses SvelteKit, making this the most natural fit.

2. **Structured Output** - Built-in Zod integration matches your existing validation patterns. Perfect for parsing transaction data into typed objects.

3. **Streaming** - Excellent streaming support for real-time feedback during long operations (batch processing, narrative generation).

4. **TypeScript** - Full type safety aligns with your codebase's TypeScript usage.

5. **Provider Flexibility** - 25+ providers via modular `@ai-sdk/*` packages. Start with OpenAI, easily switch to Claude or local Ollama.

6. **Production Ready** - Battle-tested by thousands of Vercel apps, well-documented, actively maintained.

### Alternative: LangChain.js

Consider if you need:
- Complex multi-step AI workflows
- Autonomous agents with tool use
- RAG with document retrieval
- LangSmith observability

However, LangChain's complexity may be overkill for your current use cases.

### Not Recommended: @themaximalist/llm.js

While simpler, you'd lose:
- SvelteKit hooks for streaming UI
- TypeScript types
- Structured output with Zod
- Active community and documentation

### Optional Hybrid: rahuldshetty/llm.js

Could complement cloud LLM for:
- Offline fallback (basic categorization)
- Privacy mode option for users
- Reducing API costs for simple tasks

---

## Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Budget App AI Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 Vercel AI SDK (Primary)                 ││
│  │  @ai-sdk/openai | @ai-sdk/anthropic | @ai-sdk/svelte   ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  Features:                                              ││
│  │  - Transaction parsing (generateObject)                 ││
│  │  - Payee normalization (generateText)                   ││
│  │  - Category suggestions (streamObject)                  ││
│  │  - Anomaly explanations (streamText)                    ││
│  │  - Financial narratives (streamText)                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │            rahuldshetty/llm.js (Optional)              ││
│  │                  Browser WebAssembly                    ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  Features:                                              ││
│  │  - Offline categorization fallback                      ││
│  │  - Privacy mode (data stays on device)                  ││
│  │  - Simple yes/no classifications                        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Comparison

| Library | Setup Cost | Per-Request Cost | Monthly (500 requests) |
|---------|------------|------------------|------------------------|
| Vercel AI SDK | Free | ~$0.001-0.01/req | $0.50-5.00 |
| LangChain.js | Free | ~$0.001-0.01/req | $0.50-5.00 |
| @themaximalist/llm.js | Free | ~$0.001-0.01/req | $0.50-5.00 |
| rahuldshetty/llm.js | Free | Free | Free |

*Cloud costs are provider-dependent. GPT-3.5-turbo ~$0.002/1K tokens, GPT-4 ~$0.03/1K tokens*

---

## Quick Start with Vercel AI SDK

```bash
# Install dependencies
bun add ai @ai-sdk/openai @ai-sdk/svelte

# Set environment variable
echo "OPENAI_API_KEY=sk-..." >> .env
```

```typescript
// src/lib/server/ai/llm.ts
import { createOpenAI } from '@ai-sdk/openai';

export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// src/lib/server/ai/payee-normalizer.ts
import { generateText } from 'ai';
import { openai } from './llm';

export async function normalizePayee(rawName: string): Promise<string> {
  const { text } = await generateText({
    model: openai('gpt-3.5-turbo'),
    system: 'You normalize messy bank transaction payee names into clean, standardized names. Return only the normalized name.',
    prompt: rawName
  });
  return text.trim();
}
```

---

## Summary Matrix

| Feature | Vercel AI SDK | LangChain.js | llm.js (cloud) | llm.js (browser) |
|---------|--------------|--------------|----------------|------------------|
| SvelteKit hooks | ✅ Native | ❌ Manual | ❌ Manual | ❌ Manual |
| TypeScript | ✅ Full | ✅ Full | ❌ JS only | ❌ JS only |
| Streaming | ✅ Excellent | ✅ Good | ✅ Basic | ❌ No |
| Structured output | ✅ Zod | ✅ Zod | ✅ JSON parser | ✅ CFG Grammar |
| RAG/Agents | ✅ Basic | ✅ Full | ❌ No | ❌ No |
| Bundle size | ~50KB | ~200KB+ | ~15KB | ~100KB |
| Learning curve | Medium | High | Low | Low |
| Privacy mode | ❌ Cloud | ❌ Cloud | ❌ Cloud | ✅ Local |
| Offline support | ❌ No | ❌ No | ❌ No | ✅ Yes |

**Verdict:** Use **Vercel AI SDK** as primary for its SvelteKit integration, TypeScript support, and excellent streaming. Consider **rahuldshetty/llm.js** as optional for privacy/offline features.
