/**
 * Supabase data layer.
 *
 * The site is read-only at runtime. We use the public anon key (safe to ship
 * to the browser) and rely on RLS policies in `database.sql` to restrict
 * writes to the backend service-role key.
 *
 * Pages run on the server with `force-static` + ISR (`revalidate = 3600`),
 * so each call hits Supabase at most once per hour per route.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local (or your hosting " +
      "provider's environment)."
  );
}

let _client: SupabaseClient | null = null;

export function getDb(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Types — match `database.sql`. JSONB columns are decoded automatically.
// ---------------------------------------------------------------------------

export interface CommitInfo {
  sha?: string;
  message?: string;
  author?: string;
  date?: string;
}

export interface ArtifactStats {
  commits?: number;
  merged_prs?: number;
  contributors?: number;
  [key: string]: unknown;
}

export interface Artifact {
  id: number;
  date: string;
  tag: string;
  commits: CommitInfo[];
  render_format: string;
  source_code: string;
  filename: string;
  title: string;
  reflection: string;
  aesthetic_used: string[];
  release_name: string;
  stats: ArtifactStats;
  created_at: string;
}

export interface MemorySnapshot {
  id: number;
  artifact_id: number;
  memory_md: string;
  capacity_used_pct: number;
  entries_count: number;
}

export interface CreationDossier {
  id: number;
  artifact_id: number;
  commits_read: CommitInfo[];
  skills_invented: string[];
  skills_used: string[];
  references_pulled: string[];
  process_notes: string;
  iterations: number;
}

export interface InventedSkill {
  id: number;
  name: string;
  created_on_date: string;
  category: string;
  content: string;
  description: string;
  download_count: number;
  first_used_on_artifact: number | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAllArtifacts(): Promise<Artifact[]> {
  const { data, error } = await getDb()
    .from("artifacts")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Artifact[];
}

export async function getArtifactByDate(date: string): Promise<Artifact | undefined> {
  const { data, error } = await getDb()
    .from("artifacts")
    .select("*")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as Artifact | undefined;
}

export async function getMemorySnapshot(
  artifactId: number
): Promise<MemorySnapshot | undefined> {
  const { data, error } = await getDb()
    .from("memory_snapshots")
    .select("*")
    .eq("artifact_id", artifactId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as MemorySnapshot | undefined;
}

export async function getDossier(
  artifactId: number
): Promise<CreationDossier | undefined> {
  const { data, error } = await getDb()
    .from("creation_dossiers")
    .select("*")
    .eq("artifact_id", artifactId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as CreationDossier | undefined;
}

export async function getAllSkills(): Promise<InventedSkill[]> {
  const { data, error } = await getDb()
    .from("invented_skills")
    .select("*")
    .order("created_on_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InventedSkill[];
}

export async function getSkillByName(name: string): Promise<InventedSkill | undefined> {
  const { data, error } = await getDb()
    .from("invented_skills")
    .select("*")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return (data ?? undefined) as InventedSkill | undefined;
}

export async function getAllMemorySnapshots(): Promise<
  (MemorySnapshot & { date: string; tag: string })[]
> {
  const { data, error } = await getDb()
    .from("memory_snapshots")
    .select("*, artifacts!inner(date, tag)")
    .order("artifacts(date)", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const a = row.artifacts as { date: string; tag: string };
    return {
      ...(row as unknown as MemorySnapshot),
      date: a.date,
      tag: a.tag,
    };
  });
}
