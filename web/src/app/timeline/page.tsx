import Link from "next/link";
import { getAllArtifacts } from "@/lib/db";

export const dynamic = "force-static";
export const revalidate = 3600;

export default function TimelinePage() {
  const artifacts = getAllArtifacts().reverse();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xs tracking-[0.3em] uppercase text-[var(--color-dim)] mb-2">
          Timeline
        </h1>
        <p className="text-sm text-[var(--color-dim)]">
          {artifacts.length} artifacts, chronological.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {artifacts.map((art) => {
          const aesthetics: string[] = JSON.parse(art.aesthetic_used);
          return (
            <Link
              key={art.id}
              href={`/artifact/${art.date}`}
              className="group border border-[var(--color-border)] hover:border-[var(--color-fg)] transition-colors"
            >
              <div className="h-[140px] bg-[#080810] overflow-hidden relative">
                <iframe
                  src={`/artifacts/${art.filename}`}
                  className="w-[400%] h-[400%] origin-top-left pointer-events-none"
                  style={{ transform: "scale(0.25)" }}
                  loading="lazy"
                  sandbox="allow-scripts"
                  tabIndex={-1}
                />
              </div>
              <div className="px-3 py-2 bg-white">
                <div className="text-[10px] tabular-nums text-[var(--color-dim)]">
                  {art.date}
                </div>
                <div className="text-[11px] font-medium mt-0.5 truncate">
                  {art.tag}
                </div>
                <div className="text-[9px] text-[var(--color-dim)] uppercase tracking-wider mt-0.5">
                  {aesthetics[0]?.replace(/_/g, " ")}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
