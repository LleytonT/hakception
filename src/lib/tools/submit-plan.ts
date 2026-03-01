import { tool } from "ai";
import { z } from "zod";

export const submitPlan = tool({
  description:
    "Submit your integration plan. Call this ONCE after selecting a project and sponsor, " +
    "BEFORE writing any code. Declares which project you chose, which sponsor, and your approach.",
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
      .max(1000)
      .describe(
        "1-3 sentence summary of how you will integrate the sponsor API into the project"
      ),
    files_to_modify: z
      .array(z.string())
      .describe("List of file paths you plan to create or modify"),
  }),
  execute: async (input) => {
    return {
      status: "plan_submitted" as const,
      ...input,
    };
  },
});
