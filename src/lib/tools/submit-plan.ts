import { tool } from "ai";
import { z } from "zod";

export const submitPlan = tool({
  description:
    "Submit your integration plan. Call this ONCE after researching the project and sponsor. " +
    "This is your final deliverable — a high-level blueprint that a coding agent can implement.",
  inputSchema: z.object({
    project_id: z.number().describe("The ID of the selected project"),
    sponsor_id: z
      .string()
      .uuid()
      .describe("The ID of the selected sponsor"),
    project_name: z.string().describe("Name of the selected project"),
    sponsor_name: z.string().describe("Name of the selected sponsor"),
    plan_summary: z
      .string()
      .max(3000)
      .describe(
        "Detailed integration plan: what the integration does, which files to modify/create, " +
        "how to wire the sponsor API into the existing codebase, and any setup steps needed."
      ),
    integration_approach: z
      .string()
      .max(2000)
      .describe(
        "Technical approach: how to call the sponsor API, where to add the integration points, " +
        "data flow between existing code and the new API calls."
      ),
    api_endpoints_used: z
      .array(z.string())
      .describe(
        "List of specific sponsor API endpoints to use (e.g. 'GET /posts', 'POST /users')"
      ),
    files_to_modify: z
      .array(z.string())
      .describe("List of file paths to create or modify"),
  }),
  execute: async (input) => {
    return {
      status: "plan_submitted" as const,
      ...input,
    };
  },
});
