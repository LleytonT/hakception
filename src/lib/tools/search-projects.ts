import { tool, embed } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { embeddingModel } from "@/lib/ai/model";

export interface SearchProjectItem {
  id: number;
  name: string | null;
  description: string | null;
  github_url: string | null;
  similarity: number;
}

export interface SearchProjectsResult {
  projects: SearchProjectItem[];
  count: number;
}

export async function runProjectSearch(
  query: string,
  limit = 10,
  similarity_threshold = 0.3
): Promise<SearchProjectsResult> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: query,
  });

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("match_projects", {
    query_embedding: embedding,
    match_count: limit,
    similarity_threshold,
  });

  if (error) {
    throw new Error(`search_projects failed: ${error.message}`);
  }

  const projects = (data ?? [])
    .filter((project) => Array.isArray(project.github_urls) && project.github_urls.length > 0)
    .map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description ? project.description.slice(0, 300) : null,
      github_url: project.github_urls[0],
      similarity: project.similarity,
    }));

  return {
    projects,
    count: projects.length,
  };
}

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
    return runProjectSearch(query, limit, similarity_threshold);
  },
});
