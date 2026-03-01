import { tool, embed } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { embeddingModel } from "@/lib/ai/model";

export const searchProjects = tool({
  description:
    "Search hackathon projects using semantic similarity. Describe what kind of project " +
    "you're looking for in natural language. Returns the most relevant projects ranked by " +
    "similarity. Only returns projects that have a GitHub repo.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Natural language description of the kind of project you want to find"
      ),
    limit: z
      .number()
      .min(1)
      .max(25)
      .default(10)
      .describe("Max results to return (1-25)"),
    similarity_threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.3)
      .describe(
        "Minimum similarity score (0-1). Lower = more results but less relevant"
      ),
  }),
  execute: async ({ query, limit, similarity_threshold }) => {
    // Generate embedding for the query via AI Gateway
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    });

    // Call the match_projects RPC (pgvector cosine similarity search)
    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("match_projects", {
      query_embedding: embedding,
      match_count: limit,
      similarity_threshold,
    });

    if (error) throw new Error(`search_projects failed: ${error.message}`);

    // Filter to only projects with at least one GitHub URL
    const projects = (data ?? [])
      .filter((p) => Array.isArray(p.github_urls) && p.github_urls.length > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ? p.description.slice(0, 300) : null,
        github_url: p.github_urls[0],
        similarity: p.similarity,
      }));

    return {
      projects,
      count: projects.length,
    };
  },
});
