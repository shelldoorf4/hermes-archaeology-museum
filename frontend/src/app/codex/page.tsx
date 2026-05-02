import skillsData from "@/data/skills.json";
import LibraryGrid from "@/components/LibraryGrid";

export const dynamic = "force-static";
export const revalidate = 3600;

export default function CodexPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-14 animate-in">
        <h1 className="text-[11px] tracking-[0.3em] uppercase text-[var(--color-muted)]">
          Codex
        </h1>
      </div>

      <LibraryGrid categories={skillsData.categories} />
    </div>
  );
}
