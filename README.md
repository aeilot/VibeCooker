# VibeCooker

A home-cooking app built with Next.js. Choose ingredients you have or identify them from a photo, let a ReAct agent create recipes, give feedback as you cook, and explicitly save the taste preferences you want it to remember.

## Getting started

Requires Node.js 24 or later.

```bash
npm install
npm run dev
```

Open [your local kitchen](http://localhost:3000). In “My Kitchen,” enter your provider, a model ID available to your account, and your API key. OpenRouter and the official DeepSeek API are supported. The app uses your own key, with no shared platform key or developer environment variables required.

- Recipe generation and step adjustments require a model that supports tool calling.
- For OpenRouter, use the full `provider/model-name` ID and choose a model with tool calling. Photo recognition also requires image input and structured output support.
- DeepSeek defaults to `deepseek-flash` through the official Chat Completions API, with thinking disabled for the tool loop. Photo recognition uses JSON output with local schema validation; vision support may differ across other DeepSeek models.
- “Test connection” checks text requests only. Tool calling and vision capabilities are checked when their respective features are used.
- Without a key, you can try a clearly labeled demo using fixed templates. Demo recipes are not intended as actual cooking guidance, and the demo does not simulate image recognition.

## Features

- Browse ingredient categories, select and search ingredients, and add or remove them manually.
- Take a photo on mobile or upload an image, compress it locally, and confirm each recognized ingredient before adding it.
- Set servings, available time, taste preferences, cookware, dietary restrictions, and whether to allow original dishes.
- Run a ReAct loop with structured tools: read the kitchen, consult cooking principles, submit for validation, and revise when needed.
- Generate 6 or 9 alternatives, each using a subset of your ingredients, with quantities, missing ingredients, steps, and observable cues.
- Inspect reproducible ingredient availability, time margin, and simplicity scores, with MMR diversity ranking and food chemistry explanations with sources.
- Cook one step at a time with restorable timers, text and quick feedback, revisions to remaining steps, and clarification questions.
- Validate that completed steps stay unchanged, step IDs remain unique, and known dietary restrictions are respected.
- Rate dishes, save recipes in a cookbook, and explicitly save or delete long-term taste preferences.
- Use mobile layouts, keyboard navigation, native dialog focus management, and reduced motion support.

## Architecture and limitations

The current version uses Next.js App Router, React, TypeScript, AI SDK 7 `ToolLoopAgent`, and Zod. Frontend components live in `src/components/`, model integration and tools in `src/lib/server/agent.ts`, and the HTTP endpoint in `src/app/api/agent/route.ts`.

An early design considered the eve persistent agent runtime. The first version uses an AI SDK tool loop created per request, so per-user BYOK credentials do not need to be serialized into background workflows. The agent has no file, shell, web search, or arbitrary code execution tools.

All API requests undergo input validation, request size and tool-round limits, and timeouts. Model outputs are accepted only after programmatic validation. Tool traces contain action summaries without exposing internal chain of thought.

### Storage and credentials

Ingredients, kitchen settings, cooking progress, the cookbook, and preferences are stored in the current browser’s `localStorage` with versioned schema validation. Refreshing restores progress and timer targets. There is no cloud database, sign-in, cross-device sync, or coordination between tabs. Timers do not send background notifications after the browser closes.

API keys stay in React session memory. Each request sends the key in an Authorization header to the Next.js server, which forwards it to the selected provider. Keys are not written to browser persistent storage, application logs, model prompts, or recipe records. You must re-enter your key after refreshing. Production deployments should use HTTPS and review the hosting platform’s request-header logging policy.

Photos are resized and converted to JPEG in the browser, then sent to the model provider you configure. They are not saved in recipe records. The server validates image signatures and size, and recognition results require your confirmation.

### Cooking and personalization

The model can invent dishes, but AI-generated plans have no guarantee of practical testing. Ingredient restrictions are enforced through prompts and a limited programmatic alias list; this is not a complete allergen database or food safety certification. The system does not infer freshness, safe doneness, or nutritional values from images.

Cooking feedback applies to the current session only. Text is stored as a long-term preference and included in future generation only when you choose to remember it on the rating screen. The app does not train a model or use a vector database or complex preference optimization.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Unit and integration tests cover dietary restriction checks, protection of completed steps, plan revisions, and API input boundaries. Agent tests use the official AI SDK mock provider to verify real multi-step tool calling, rejection of invalid outputs, and acceptance of revisions without model charges.

Browser tests use Chrome and cover the complete demo flow, photo confirmation, non-persistence of API keys, and mobile layouts. Photo tests intercept model responses. Real model quality, provider quotas, and photo recognition accuracy require verification with your own valid API key.

All illustrations are original SVGs created for this project, not photographs of generated dishes. Fonts include system fallbacks, so the app remains usable when Google Fonts is unavailable.

Provider integration references: [OpenRouter Quickstart](https://openrouter.ai/docs/quickstart), [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [DeepSeek tool calling](https://api-docs.deepseek.com/guides/tool_calls/), and [DeepSeek image understanding](https://api-docs.deepseek.com/guides/vision/).

## Pairing model and scientific limitations

Each candidate uses a subset of the available ingredients, and candidates are alternatives to one another. After checking explicit restrictions, the app calculates a practical score: `Q=100*(0.45A+0.30E+0.25C)`, where A is ingredient-type availability, E is time margin, and C is simplicity based on the number of main ingredients. Unselected ingredients, including oil and salt, still need confirmation. Matching currently uses names and aliases without verifying actual quantities in grams. These weights are product heuristics, not an experimentally validated formula for flavor or the result of personalized training.

Diversity uses greedy selection: choose the highest Q first, then maximize `0.75*(Q/100)+0.25*(1-max J)`, where J is the Jaccard similarity between a candidate’s main ingredient set and those already selected. The model does not represent sensory differences caused by cooking techniques, and lower similarity does not imply better taste. Scores use a snapshot of the kitchen at generation time; later ingredient edits do not silently change earlier scores.

Food chemistry explanations are triggered by ingredient categories and techniques and include original sources. They describe general mechanisms and conditional inferences. The app does not integrate molecular composition, concentration, odor thresholds, or experimental reaction parameters from FlavorGraph or FlavorDB. It does not calculate chemical similarity, reaction rates, predicted temperatures, or the probability of a dish tasting good. The theoretical subset count illustrates the combination space; the system does not enumerate every combination.

## Internationalization

Use the language switcher in the upper-right corner to switch instantly between Simplified Chinese and English. A separate `vibecooker-locale` cookie remembers the language, which the server uses for the page language and metadata. The client keeps `html.lang` and the title in sync. Switching languages does not reload the page, clear the in-memory API key, or change local kitchen data.

Dictionaries live in `src/lib/i18n/` and are accessed in React through `I18nProvider` and `useI18n`. The interface, ingredient categories and 178 ingredients, placeholders, accessible names, errors, live announcements, demo content, scientific explanations, and dates are localized. English names and common plurals work for search and standard ingredient matching. Ingredient IDs, schema enums, and saved data remain stable.

The frontend sends an enum-validated `x-ui-locale` with model requests. The server passes language requirements for new recipes, image descriptions, and cooking replies to the model and localizes API errors. Existing AI-generated free text and user notes retain their original language; historical content is not automatically translated through model calls. Compliance with the requested language still depends on the model.
