import { createMistral } from "@ai-sdk/mistral";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

// Primary: Mistral
const mistral = createMistral();
export const primaryModel = mistral("mistral-large-latest");

// Failover: Anthropic Claude
const anthropic = createAnthropic();
export const failoverModel = anthropic("claude-sonnet-4-20250514");

// Failover 2: OpenAI
const openai = createOpenAI();
export const fallbackModel = openai("gpt-4o");

// Default model used by agents
export const agentModel = primaryModel;
