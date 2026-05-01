/**
 * Hermes Archaeology Museum — Gallery Logic
 */

(function () {
    const REGISTRY_URL = 'artifacts/artifacts.json';

    let artifacts = [];
    let activeFilter = 'all';
    let currentViewerIndex = -1;

    const gallery = document.getElementById('gallery');
    const timeline = document.getElementById('timeline');
    const viewerOverlay = document.getElementById('viewer-overlay');
    const viewerFrame = document.getElementById('viewer-frame');
    const viewerTitle = document.getElementById('viewer-title');

    async function init() {
        try {
            const resp = await fetch(REGISTRY_URL);
            const data = await resp.json();
            artifacts = data.artifacts || [];
            document.getElementById('artifact-count').textContent = artifacts.length;
            renderTimeline();
            renderGallery();
            bindFilters();
            bindViewer();
            bindKeyboard();
        } catch (e) {
            gallery.innerHTML = '<p style="padding:40px;color:#666">Failed to load artifacts. Run the generator first.</p>';
        }
    }

    function renderTimeline() {
        timeline.innerHTML = '';
        artifacts.forEach((a, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="tag">${esc(a.tag)}</span><span class="date">${a.date ? a.date.slice(0, 10) : ''}</span>`;
            li.addEventListener('click', () => openViewer(i));
            timeline.appendChild(li);
        });
    }

    function renderGallery() {
        gallery.innerHTML = '';
        const filtered = activeFilter === 'all'
            ? artifacts
            : artifacts.filter(a => a.type === activeFilter);

        if (filtered.length === 0) {
            gallery.innerHTML = '<p style="padding:40px;color:#666">No artifacts match this filter.</p>';
            return;
        }

        filtered.forEach((a) => {
            const globalIndex = artifacts.indexOf(a);
            const card = document.createElement('div');
            card.className = `card type-${a.type}`;
            card.dataset.index = globalIndex;

            const typeName = a.type.replace(/_/g, ' ');
            const statsHtml = buildStatsHtml(a.stats);

            card.innerHTML = `
                <div class="card-preview">
                    <iframe src="artifacts/${esc(a.filename)}" loading="lazy" sandbox="allow-scripts" tabindex="-1"></iframe>
                    <div class="overlay"></div>
                </div>
                <div class="card-info">
                    <div class="card-type">${esc(typeName)}</div>
                    <div class="card-title">${esc(a.title)}</div>
                    <div class="card-stats">${statsHtml}</div>
                    <div class="card-date">${a.date ? a.date.slice(0, 10) : ''}</div>
                </div>
            `;

            card.addEventListener('click', () => openViewer(globalIndex));
            gallery.appendChild(card);
        });
    }

    function buildStatsHtml(stats) {
        if (!stats) return '';
        const parts = [];
        if (stats.commits) parts.push(`<span>${stats.commits} commits</span>`);
        if (stats.merged_prs) parts.push(`<span>${stats.merged_prs} PRs</span>`);
        if (stats.files_changed) parts.push(`<span>${stats.files_changed} files</span>`);
        return parts.join('');
    }

    function bindFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = btn.dataset.type;
                renderGallery();
            });
        });
    }

    function openViewer(index) {
        if (index < 0 || index >= artifacts.length) return;
        currentViewerIndex = index;
        const a = artifacts[index];
        viewerFrame.src = 'artifacts/' + a.filename;
        viewerTitle.textContent = `${a.title} — ${a.type.replace(/_/g, ' ')}`;
        viewerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        timeline.querySelectorAll('li').forEach((li, i) => {
            li.classList.toggle('active', i === index);
        });
    }

    function closeViewer() {
        viewerOverlay.classList.remove('open');
        viewerFrame.src = '';
        document.body.style.overflow = '';
        currentViewerIndex = -1;
        timeline.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    }

    function prevArtifact() {
        if (currentViewerIndex > 0) openViewer(currentViewerIndex - 1);
    }

    function nextArtifact() {
        if (currentViewerIndex < artifacts.length - 1) openViewer(currentViewerIndex + 1);
    }

    function bindViewer() {
        document.getElementById('viewer-close').addEventListener('click', closeViewer);
        document.getElementById('viewer-prev').addEventListener('click', prevArtifact);
        document.getElementById('viewer-next').addEventListener('click', nextArtifact);
        viewerOverlay.addEventListener('click', (e) => {
            if (e.target === viewerOverlay) closeViewer();
        });
    }

    function bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (!viewerOverlay.classList.contains('open')) return;
            if (e.key === 'Escape') closeViewer();
            if (e.key === 'ArrowLeft') prevArtifact();
            if (e.key === 'ArrowRight') nextArtifact();
        });
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
