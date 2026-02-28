export type TournamentStatus =
  | "pending"
  | "running"
  | "evaluating"
  | "completed"
  | "failed";

export type AgentRunStatus =
  | "pending"
  | "selecting"
  | "researching"
  | "planning"
  | "coding"
  | "testing"
  | "completed"
  | "failed";

export type AgentStepType = "tool_call" | "llm_response" | "error";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: number;
          created_at: string;
          name: string;
          description: string | null;
          github_urls: string | null;
          devpost_url: string | null;
          readme: string | null;
          embeddings: unknown | null;
          is_winner: boolean | null;
          desc_meta: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["projects"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
      };
      hackathons: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["hackathons"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["hackathons"]["Row"]>;
      };
      sponsors: {
        Row: {
          id: string;
          hackathon_id: string;
          name: string;
          description: string | null;
          doc_urls: string[];
          cached_docs: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["sponsors"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<Database["public"]["Tables"]["sponsors"]["Row"]>;
      };
      tournaments: {
        Row: {
          id: string;
          hackathon_id: string;
          status: TournamentStatus;
          agent_count: number;
          config: Record<string, unknown> | null;
          started_at: string | null;
          completed_at: string | null;
          winner_agent_run_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["tournaments"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["tournaments"]["Row"]>;
      };
      agent_runs: {
        Row: {
          id: string;
          tournament_id: string;
          agent_number: number;
          personality: string;
          status: AgentRunStatus;
          selected_project_id: number | null;
          selected_sponsor_id: string | null;
          extension_plan: string | null;
          code_changes: Record<string, string> | null;
          sandbox_id: string | null;
          sandbox_result: Record<string, unknown> | null;
          score: Record<string, unknown> | null;
          error: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_runs"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["agent_runs"]["Row"]>;
      };
      agent_steps: {
        Row: {
          id: string;
          agent_run_id: string;
          step_number: number;
          step_type: AgentStepType;
          tool_name: string | null;
          input: Record<string, unknown> | null;
          output: Record<string, unknown> | null;
          duration_ms: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_steps"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["agent_steps"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience type aliases
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Hackathon = Database["public"]["Tables"]["hackathons"]["Row"];
export type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
export type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
export type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"];
export type AgentStep = Database["public"]["Tables"]["agent_steps"]["Row"];
