document.addEventListener('DOMContentLoaded', () => {
    const termList = document.getElementById('termList');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const statsEl = document.getElementById('stats');
    const noResultsEl = document.getElementById('noResults');

    let allEntries = [];
    
    // Fetch data
    async function loadData() {
        try {
            const response = await fetch('glossary.json');
            if(!response.ok) throw new Error("Could not fetch glossary.json");
            const data = await response.json();
            
            // Convert object to array for easier handling
            if (data.entries) {
                allEntries = Object.values(data.entries).sort((a, b) => {
                    const nameA = (a.word || a.name || "").toLowerCase();
                    const nameB = (b.word || b.name || "").toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            } else {
                // Fallback if data structure is just an array
                allEntries = data;
            }
            
            statsEl.textContent = `${allEntries.length} Terms`;
            renderTerms(allEntries);
        } catch (error) {
            console.error('Error loading data:', error);
            termList.innerHTML = `<div class="loading-state">
                <div class="no-results-icon">⚠️</div>
                <p>Failed to load terms.</p>
                <span class="subtext">Please ensure glossary.json exists and you are online.</span>
            </div>`;
        }
    }

    // Highlight helper
    function highlightText(text, query) {
        if (!query) return text;
        // Escape characters for regex
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeQuery})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Render terms
    function renderTerms(entries, query = '', searchPageNum = null) {
        termList.innerHTML = '';
        
        if (entries.length === 0) {
            noResultsEl.style.display = 'flex';
            return;
        }
        
        noResultsEl.style.display = 'none';
        const fragment = document.createDocumentFragment();
        
        // We limit animation delays so we don't have extremely long delays for the 500th term
        let animIndex = 0;

        entries.forEach((entry) => {
            const card = document.createElement('div');
            card.className = 'term-card';
            // Stagger animation delay up to a max
            card.style.animationDelay = `${Math.min(animIndex * 0.04, 0.6)}s`;
            animIndex++;
            
            const termName = entry.word || entry.name || "Unknown Term";
            const defText = entry.definition || "No definition specified.";
            const pages = entry.pages || [];
            
            // Highlight name and def if there's a text query
            const displayName = query && !searchPageNum ? highlightText(termName, query) : termName;
            const displayDef = query && !searchPageNum ? highlightText(defText, query) : defText;

            // Render page badges, highlighting the searched page
            let pagesHtml = '';
            if (pages.length > 0) {
                // Determine if we should show a specific subset or all pages. For now just show all
                pagesHtml = `<div class="term-pages">` + pages.map(pg => {
                    const isHighlight = searchPageNum !== null && Number(pg) === searchPageNum;
                    return `<span class="page-badge ${isHighlight ? 'highlight' : ''}">${pg}</span>`;
                }).join('') + `</div>`;
            }

            card.innerHTML = `
                <div class="term-header">
                    <div class="term-word">${displayName}</div>
                    ${pagesHtml}
                </div>
                <div class="term-def">${displayDef}</div>
            `;
            
            fragment.appendChild(card);
        });
        
        termList.appendChild(fragment);
    }

    // Search functionality
    let searchTimeout;
    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
            renderTerms(allEntries);
            return;
        }

        // Check if query is purely numeric (for page search)
        const isPageSearch = /^\d+$/.test(query);
        let results = [];
        let searchPageNum = null;

        if (isPageSearch) {
            searchPageNum = parseInt(query, 10);
            results = allEntries.filter(entry => {
                if (!entry.pages) return false;
                return entry.pages.some(p => Number(p) === searchPageNum);
            });
            renderTerms(results, '', searchPageNum);
        } else {
            results = allEntries.filter(entry => {
                const termName = (entry.word || entry.name || "").toLowerCase();
                const termDef = (entry.definition || "").toLowerCase();
                return termName.includes(query) || termDef.includes(query);
            });
            renderTerms(results, query, null);
        }
    }

    // Debounced search to maintain performance on mobile
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 150);
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        performSearch();
    });

    // Initial load
    loadData();
});
