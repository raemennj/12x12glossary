document.addEventListener('DOMContentLoaded', () => {
    const termList      = document.getElementById('termList');
    const searchInput   = document.getElementById('searchInput');
    const clearSearchBtn= document.getElementById('clearSearch');
    const statsEl       = document.getElementById('stats');
    const noResultsEl   = document.getElementById('noResults');
    const sortToggleBtn = document.getElementById('sortToggle');
    const filterRow     = document.getElementById('filterRow');

    let allEntries   = [];
    let activeFilter = 'all';   // 'all' | 'step-N' | 'trad-N'
    let sortOrder    = 'alpha'; // 'alpha' | 'page'

    // Page ranges for each chapter (from pdf_to_json.py CHAPTERS)
    const CHAPTER_PAGES = {
        'step-1':  [21,  24],  'step-2':  [25,  33],  'step-3':  [34,  41],
        'step-4':  [42,  54],  'step-5':  [55,  62],  'step-6':  [63,  69],
        'step-7':  [70,  76],  'step-8':  [77,  82],  'step-9':  [83, 103],
        'step-10': [104,113],  'step-11': [114,125],  'step-12': [126,145],
        'trad-1':  [146,149],  'trad-2':  [150,155],  'trad-3':  [156,160],
        'trad-4':  [161,163],  'trad-5':  [164,166],  'trad-6':  [167,170],
        'trad-7':  [171,175],  'trad-8':  [176,181],  'trad-9':  [182,185],
        'trad-10': [186,187],  'trad-11': [188,193],  'trad-12': [184,188],
    };

    // ── Data loading ──────────────────────────────────────────────────────────

    async function loadData() {
        try {
            const response = await fetch('glossary.json');
            if (!response.ok) throw new Error('Could not fetch glossary.json');
            const data = await response.json();

            allEntries = data.entries
                ? Object.values(data.entries)
                : data;

            statsEl.textContent = `${allEntries.length} Terms`;
            applyFiltersAndSearch();
        } catch (error) {
            console.error('Error loading data:', error);
            termList.innerHTML = `<div class="loading-state">
                <div class="no-results-icon">⚠️</div>
                <p>Failed to load terms.</p>
                <span class="subtext">Please ensure glossary.json exists.</span>
            </div>`;
        }
    }

    // ── Core pipeline: filter → search → sort → render ────────────────────────

    function applyFiltersAndSearch() {
        const raw   = searchInput.value.trim();
        const query = raw.toLowerCase();
        const isPageSearch = /^\d+$/.test(query);
        const searchPageNum = isPageSearch ? parseInt(query, 10) : null;

        let results = allEntries;

        // 1. Chapter filter
        if (activeFilter !== 'all') {
            const [start, end] = CHAPTER_PAGES[activeFilter];
            results = results.filter(e =>
                (e.pages || []).some(p => Number(p) >= start && Number(p) <= end)
            );
        }

        // 2. Search (term name only, or page number)
        if (query) {
            if (isPageSearch) {
                results = results.filter(e =>
                    (e.pages || []).some(p => Number(p) === searchPageNum)
                );
            } else {
                results = results.filter(e => {
                    const name = (e.word || e.name || '').toLowerCase();
                    return name.includes(query);
                });
            }
        }

        // 3. Sort
        if (sortOrder === 'page') {
            results = [...results].sort((a, b) => {
                const minA = Math.min(...(a.pages || [Infinity]));
                const minB = Math.min(...(b.pages || [Infinity]));
                return minA - minB;
            });
        } else {
            results = [...results].sort((a, b) => {
                const nA = (a.word || a.name || '').toLowerCase();
                const nB = (b.word || b.name || '').toLowerCase();
                return nA.localeCompare(nB);
            });
        }

        renderTerms(results, isPageSearch ? '' : query, searchPageNum);
    }

    // ── Rendering ─────────────────────────────────────────────────────────────

    function highlightText(text, query) {
        if (!query) return text;
        const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return text.replace(new RegExp(`(${safe})`, 'gi'), '<mark>$1</mark>');
    }

    function renderTerms(entries, query, searchPageNum) {
        termList.innerHTML = '';

        if (entries.length === 0) {
            noResultsEl.style.display = 'flex';
            return;
        }
        noResultsEl.style.display = 'none';

        const fragment = document.createDocumentFragment();
        let animIndex = 0;

        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'term-card';
            card.style.animationDelay = `${Math.min(animIndex * 0.04, 0.6)}s`;
            animIndex++;

            const termName = entry.word || entry.name || 'Unknown Term';
            const defText  = entry.definition || 'No definition specified.';
            const pages    = entry.pages || [];

            // Highlight only the term name (not the definition)
            const displayName = query ? highlightText(termName, query) : termName;

            // Page numbers — simple text, highlight matched page
            let pagesHtml = '';
            if (pages.length > 0) {
                const pageNums = pages.map(pg => {
                    const isHighlight = searchPageNum !== null && Number(pg) === searchPageNum;
                    return isHighlight ? `<span class="page-highlight">${pg}</span>` : pg;
                }).join(', ');
                pagesHtml = `<div class="term-pages">p. ${pageNums}</div>`;
            }

            card.innerHTML = `
                <div class="term-word">${displayName}</div>
                <div class="term-def">${defText}</div>
                ${pagesHtml}
            `;

            fragment.appendChild(card);
        });

        termList.appendChild(fragment);
    }

    // ── Event listeners ───────────────────────────────────────────────────────

    // Search input — debounced
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFiltersAndSearch, 150);
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        applyFiltersAndSearch();
    });

    // Chapter filter chips
    filterRow.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        filterRow.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter;
        applyFiltersAndSearch();
    });

    // Sort toggle
    sortToggleBtn.addEventListener('click', () => {
        sortOrder = sortOrder === 'alpha' ? 'page' : 'alpha';
        sortToggleBtn.textContent = sortOrder === 'alpha' ? 'A–Z' : 'p.#';
        sortToggleBtn.classList.toggle('sort-active', sortOrder === 'page');
        applyFiltersAndSearch();
    });

    // ── Init ──────────────────────────────────────────────────────────────────
    loadData();
});
