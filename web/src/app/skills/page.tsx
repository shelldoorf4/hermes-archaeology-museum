import { getAllSkills, getArtifactByDate } from "@/lib/db";
import { getDb } from "@/lib/db";

export const dynamic = "force-static";
export const revalidate = 3600;

function getArtifactById(id: number | null) {
  if (!id) return null;
  return getDb()
    .prepare("SELECT date, tag FROM artifacts WHERE id = ?")
    .get(id) as { date: string; tag: string } | undefined;
}

export default function SkillsPage() {
  const skills = getAllSkills();

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-xs tracking-[0.3em] uppercase text-[var(--color-dim)] mb-2">
          Skills Library
        </h1>
        <p className="text-sm text-[var(--color-dim)] leading-relaxed max-w-xl">
          Every skill the agent invented during this project. Each is a portable
          SKILL.md file — installable into any Hermes Agent. The skills directory
          is part of the artwork: it is the agent&apos;s evolving generative art
          toolkit, made by itself.
        </p>
        <p className="text-xs text-[var(--color-dim)] mt-3">
          {skills.length} skills
        </p>
      </div>

      <div className="space-y-4">
        {skills.map((skill) => {
          const firstArtifact = getArtifactById(skill.first_used_on_artifact);
          return (
            <div
              key={skill.id}
              className="border border-[var(--color-border)] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-3">
                    <code className="text-sm font-medium">{skill.name}</code>
                    <span className="text-[9px] uppercase tracking-widest text-[var(--color-dim)] px-1.5 py-0.5 border border-[var(--color-border)]">
                      {skill.category}
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--color-dim)] mt-2 leading-relaxed">
                    {skill.description}
                  </p>
                  <div className="flex gap-4 mt-2 text-[10px] text-[var(--color-dim)]">
                    <span>Created: {skill.created_on_date}</span>
                    {firstArtifact && (
                      <a
                        href={`/artifact/${firstArtifact.date}`}
                        className="hover:text-[var(--color-fg)] underline"
                      >
                        First used: {firstArtifact.tag}
                      </a>
                    )}
                  </div>
                </div>
                <a
                  href={`/api/skills/${encodeURIComponent(skill.name)}`}
                  download={`${skill.name}.md`}
                  className="shrink-0 text-[11px] px-3 py-1.5 border border-[var(--color-border)] hover:border-[var(--color-fg)] transition-colors"
                >
                  Download SKILL.md
                </a>
              </div>

              {/* Install command */}
              <div className="mt-3 text-[11px] bg-[var(--color-surface)] px-3 py-2 border border-[var(--color-border)]">
                <code className="text-[var(--color-dim)]">
                  hermes skills install https://hermes-archaeology.vercel.app/api/skills/{skill.name}
                </code>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
