import { gateway } from "@ai-sdk/gateway";

// All models accessed through Vercel AI Gateway with a single API key.
// Gateway handles routing, rate limits, and failover.

// Primary: Mistral (fast, cost-effective for agent tool loops)
export const primaryModel = gateway("mistral/mistral-large-latest");

// Failover: Anthropic Claude
export const failoverModel = gateway("anthropic/claude-sonnet-4-20250514");

// Failover 2: OpenAI
export const fallbackModel = gateway("openai/gpt-4o");

// Default model used by agents
export const agentModel = primaryModel;

// Judge model (needs strong reasoning for evaluation)
export const judgeModel = gateway("anthropic/claude-sonnet-4-20250514");
