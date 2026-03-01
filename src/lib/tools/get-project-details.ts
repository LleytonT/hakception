import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const getProjectDetails = tool({
  description:
    "Get full details of a project by ID, including readme content and all metadata. " +
    "Use this after finding a project via search_projects to read its README and details.",
  inputSchema: z.object({
    project_id: z.number().describe("The project ID to fetch"),
  }),
  execute: async ({ project_id }) => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, name, description, github_urls, devpost_url, readme, is_winner, desc_meta"
      )
      .eq("id", project_id)
      .single();

    if (error)
      throw new Error(`get_project_details failed: ${error.message}`);
    if (!data) throw new Error(`Project ${project_id} not found`);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      github_url: data.github_urls.length > 0 ? data.github_urls[0] : null,
      github_urls: data.github_urls,
      devpost_url: data.devpost_url,
      readme: data.readme ? data.readme.slice(0, 8000) : null,
      is_winner: data.is_winner,
      desc_meta: data.desc_meta,
    };
  },
});
