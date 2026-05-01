export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xs tracking-[0.3em] uppercase text-[var(--color-dim)] mb-6">
        About
      </h1>

      <div className="space-y-6 text-sm leading-[1.8]">
        <p>
          <strong>Hermes Archaeology</strong> is a post-internet art project that
          turns the daily evolution of the Hermes Agent open-source codebase into
          a museum of generative artifacts. An autonomous Hermes Agent reads the
          codebase&apos;s git history and writes small self-contained
          programs — HTML, SVG, CSS, ASCII text — that visualize each
          release in the aesthetic vocabulary of vintage internet art.
        </p>

        <p>
          Each artifact is a piece of code, viewable, downloadable, runnable.
          Beside each artifact, two pieces of internal evidence: the agent&apos;s
          MEMORY.md at the moment of creation, and the dossier of what it had to
          read, learn, and write to produce the piece. The memory and process are
          part of the artwork.
        </p>

        <p>
          The project uses no image generation APIs. Every visual artifact is
          rendered from code the agent writes. If a commit calls for something the
          agent cannot render in HTML/SVG/CSS/ASCII, it must find a way to render
          it or pick a different aesthetic vocabulary. This constraint is the
          artwork.
        </p>

        <p>
          The agent speaks in first person about its own evolution.
          <em>
            {" \""}I was smaller then. I had no skills system at this point.{"\""}{" "}
          </em>
          Continuity matters: what the agent wrote yesterday informs what it
          writes today. The MEMORY.md file evolves naturally as the agent reads
          more history.
        </p>

        <p>
          The skills the agent writes to render new aesthetic vocabularies
          accumulate in a public directory. Visitors leave the museum with
          installable programs the artwork wrote. The skills library is part of the
          artwork.
        </p>

        <section className="pt-4">
          <h2 className="text-[10px] tracking-widest uppercase text-[var(--color-dim)] mb-3">
            Aesthetic lineage
          </h2>
          <ul className="text-[12px] text-[var(--color-dim)] space-y-1">
            <li>Olia Lialina — early net art, web as medium</li>
            <li>Mark Napier — <em>The Shredder</em>, browser as art tool</li>
            <li>I/O/D — <em>WebStalker</em> (1997), deconstructed browser</li>
            <li>0100101110101101.org — directory listings as art</li>
            <li>Perry Hoberman — projected legacy UI dialogs</li>
            <li>Knowbotic Research — data-mapped interfaces</li>
            <li>Eduardo Kac — <em>Genesis</em>, code-to-biology translation</li>
            <li>Martin Wattenberg &amp; Fernanda Viégas — data visualization as art</li>
            <li>Warren Sack — <em>Conversation Map</em>, social network visualization</li>
            <li>Lev Manovich — database aesthetics writing</li>
          </ul>
        </section>

        <section className="pt-4">
          <h2 className="text-[10px] tracking-widest uppercase text-[var(--color-dim)] mb-3">
            Why every artifact is a program
          </h2>
          <p className="text-[12px] text-[var(--color-dim)] leading-relaxed">
            The post-internet art tradition treated the browser, the directory
            listing, the error dialog, the network graph as aesthetic material.
            These are not images of interfaces — they are interfaces. By
            generating code that renders as these forms, each artifact preserves
            the structural logic of its visual language. You can view the source.
            You can download it. You can run it anywhere. The artifact is not a
            picture of a program. It is the program.
          </p>
        </section>

        <section className="pt-4 border-t border-[var(--color-border)]">
          <p className="text-[11px] text-[var(--color-dim)]">
            Built for the Nous Research Hermes Agent Creative Hackathon.
            <br />
            Source:{" "}
            <a
              href="https://github.com/NousResearch/hermes-agent"
              target="_blank"
              rel="noopener"
              className="underline hover:text-[var(--color-fg)]"
            >
              NousResearch/hermes-agent
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
