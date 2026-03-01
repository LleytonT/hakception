import { tool } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const fetchSponsorDocs = tool({
  description:
    "Fetch documentation for a sponsor. Returns cached docs if available, " +
    "otherwise fetches from the sponsor's doc URLs and caches the result.",
  inputSchema: z.object({
    sponsor_id: z
      .string()
      .uuid()
      .describe("The sponsor ID to fetch docs for"),
  }),
  execute: async ({ sponsor_id }) => {
    const supabase = createAdminClient();

    const { data: sponsor, error } = await supabase
      .from("sponsors")
      .select("id, name, description, doc_urls, cached_docs")
      .eq("id", sponsor_id)
      .single();

    if (error)
      throw new Error(`fetch_sponsor_docs failed: ${error.message}`);
    if (!sponsor) throw new Error(`Sponsor ${sponsor_id} not found`);

    if (sponsor.cached_docs) {
      return {
        sponsor_name: sponsor.name,
        sponsor_description: sponsor.description,
        docs: sponsor.cached_docs,
      };
    }

    const docTexts: string[] = [];
    for (const url of sponsor.doc_urls) {
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const text = await res.text();
          docTexts.push(`--- ${url} ---\n${text.slice(0, 6000)}`);
        } else {
          docTexts.push(`--- ${url} ---\n[HTTP ${res.status}]`);
        }
      } catch {
        docTexts.push(`--- ${url} ---\n[Failed to fetch]`);
      }
    }

    const combinedDocs = docTexts.join("\n\n");

    await supabase
      .from("sponsors")
      .update({ cached_docs: combinedDocs })
      .eq("id", sponsor_id);

    return {
      sponsor_name: sponsor.name,
      sponsor_description: sponsor.description,
      docs: combinedDocs,
    };
  },
});
