import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllArtifacts,
  getArtifactByDate,
  getMemorySnapshot,
  getDossier,
} from "@/lib/db";
import { SourceViewer } from "@/components/SourceViewer";
import { MemoryInspector } from "@/components/MemoryInspector";
import { DossierPanel } from "@/components/DossierPanel";

export function generateStaticParams() {
  return getAllArtifacts().map((a) => ({ date: a.date }));
}

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const artifact = getArtifactByDate(date);
  if (!artifact) notFound();

  const memory = getMemorySnapshot(artifact.id);
  const dossier = getDossier(artifact.id);
  const aesthetics: string[] = JSON.parse(artifact.aesthetic_used);

  const allArtifacts = getAllArtifacts().reverse();
  const currentIndex = allArtifacts.findIndex((a) => a.date === date);
  const prev = currentIndex > 0 ? allArtifacts[currentIndex - 1] : null;
  const next =
    currentIndex < allArtifacts.length - 1
      ? allArtifacts[currentIndex + 1]
      : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <time className="text-xs text-[var(--color-dim)] tabular-nums">{date}</time>
          <h1 className="text-sm font-medium mt-1">{artifact.tag}</h1>
          <div className="text-[10px] text-[var(--color-dim)] uppercase tracking-widest mt-1">
            {aesthetics.map((a) => a.replace(/_/g, " ")).join(" + ")}
          </div>
        </div>
        <div className="flex gap-3 text-[11px] text-[var(--color-dim)]">
          {prev && (
            <Link href={`/artifact/${prev.date}`} className="hover:text-[var(--color-fg)]">
              &larr; {prev.date}
            </Link>
          )}
          {next && (
            <Link href={`/artifact/${next.date}`} className="hover:text-[var(--color-fg)]">
              {next.date} &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* 1. The artifact — rendered live */}
      <section className="mb-8">
        <div className="w-full h-[500px] border border-[var(--color-border)] bg-[#080810]">
          <iframe
            src={`/artifacts/${artifact.filename}`}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        </div>
      </section>

      {/* 2. View Source / Download */}
      <section className="mb-8">
        <SourceViewer code={artifact.source_code} filename={artifact.filename} />
      </section>

      {/* 3. Reflection */}
      <section className="mb-8">
        <div className="text-[10px] tracking-widest uppercase text-[var(--color-dim)] mb-3">
          Reflection
        </div>
        <div className="text-sm leading-[1.8] max-w-2xl space-y-4">
          {artifact.reflection.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* 4. Memory Inspector */}
      {memory && (
        <section className="mb-8">
          <MemoryInspector
            memoryMd={memory.memory_md}
            capacityPct={memory.capacity_used_pct}
            entriesCount={memory.entries_count}
          />
        </section>
      )}

      {/* 5. Creation Dossier */}
      {dossier && (
        <section className="mb-8">
          <DossierPanel
            data={{
              commitsRead: JSON.parse(dossier.commits_read),
              skillsInvented: JSON.parse(dossier.skills_invented),
              skillsUsed: JSON.parse(dossier.skills_used),
              referencesPulled: JSON.parse(dossier.references_pulled),
              processNotes: dossier.process_notes,
              iterations: dossier.iterations,
            }}
          />
        </section>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-[var(--color-border)] text-xs text-[var(--color-dim)]">
        {prev ? (
          <Link href={`/artifact/${prev.date}`} className="hover:text-[var(--color-fg)]">
            &larr; {prev.tag}
          </Link>
        ) : (
          <span />
        )}
        <Link href="/timeline" className="hover:text-[var(--color-fg)]">
          All artifacts
        </Link>
        {next ? (
          <Link href={`/artifact/${next.date}`} className="hover:text-[var(--color-fg)]">
            {next.tag} &rarr;
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
