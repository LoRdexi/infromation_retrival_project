// --- Get references to all the important HTML elements ---
const searchBtn = document.getElementById('search-btn');
const queryInput = document.getElementById('query');
const resultsDiv = document.getElementById('results');
const statusDiv = document.getElementById('status');
const modelSelect = document.getElementById('model_type');
const bm25ParamsDiv = document.getElementById('bm25-params');
const hybridParamsDiv = document.getElementById('hybrid-params');
const hybridWeightSlider = document.getElementById('hybrid_weight');
const weightValueSpan = document.getElementById('weight-value');
const hybridTypeSelect = document.getElementById('hybrid_type');
const hybridWeightWrapper = document.getElementById('hybrid-weight-wrapper');
const nerToggle = document.getElementById('ner-rerank-toggle');
const clusterToggle = document.getElementById('cluster-rerank-toggle');
const suggestionsBox = document.getElementById('suggestions-box');
const alternativeSuggestionsDiv = document.getElementById('alternative-suggestions');
let suggestionTimeout; // A variable to hold the timeout for suggestion fetching

// --- Add event listeners to interactive elements ---
modelSelect.addEventListener('change', toggleParams); // When the model is changed, show/hide relevant params
hybridWeightSlider.addEventListener('input', () => { weightValueSpan.textContent = hybridWeightSlider.value; }); // Update the weight value display as the slider moves
hybridTypeSelect.addEventListener('change', toggleHybridWeight); // Show/hide the BM25 weight depending on the chosen hybrid type
searchBtn.addEventListener('click', performSearch); // When the search button is clicked, start a search
queryInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); }); // Also search when Enter is pressed in the input box
queryInput.addEventListener('input', handleSuggestionInput); // When the user types, fetch suggestions
// Hide the suggestion box if the user clicks anywhere else on the page
document.addEventListener('click', (e) => {
    if (!queryInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.classList.add('hidden');
    }
});

// --- Initial setup when the page loads ---
toggleParams(); // Set the initial visibility of parameter sections based on the default model
toggleHybridWeight(); // Set the initial visibility of the BM25 weight slider
weightValueSpan.textContent = hybridWeightSlider.value; // Set the initial text for the slider value

// --- Define all the functions for page interactivity ---

// Shows or hides the parameter sections based on the selected model
function toggleParams() {
    const selectedModel = modelSelect.value;
    // Show BM25 params if 'bm25' or 'hybrid' is selected, otherwise hide them
    bm25ParamsDiv.classList.toggle('hidden', !(selectedModel === 'bm25' || selectedModel === 'hybrid'));
    // Show hybrid params only if 'hybrid' is selected
    hybridParamsDiv.classList.toggle('hidden', selectedModel !== 'hybrid');
}

// Hides the BM25-weight slider when 'serial' hybrid is chosen (the weight only applies to parallel/fusion)
function toggleHybridWeight() {
    hybridWeightWrapper.classList.toggle('hidden', hybridTypeSelect.value === 'serial');
}

// Handles fetching suggestions as the user types
async function handleSuggestionInput() {
    clearTimeout(suggestionTimeout); // Clear any previous pending suggestion request
    const query = queryInput.value;

    // Don't fetch suggestions if the input is empty
    if (query.length < 1) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    // Wait 250ms after the user stops typing before sending the request (debouncing)
    suggestionTimeout = setTimeout(async () => {
        const dataset = document.getElementById('dataset').value;
        try {
            const response = await fetch(`/suggest/?dataset_name=${encodeURIComponent(dataset)}&query=${encodeURIComponent(query)}`);
            const suggestions = await response.json();
            displaySuggestions(suggestions);
        } catch (error) {
            console.error("Suggestion fetch failed:", error);
        }
    }, 250);
}

// Displays the fetched suggestions in the suggestions box
function displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }
    suggestionsBox.innerHTML = ''; // Clear previous suggestions
    suggestions.forEach(suggestion => {
        const div = document.createElement('div');
        div.textContent = suggestion;
        div.className = 'suggestion-item';
        // When a suggestion is clicked, fill the input with it and hide the box
        div.onclick = () => {
            queryInput.value = suggestion;
            suggestionsBox.classList.add('hidden');
            queryInput.focus();
        };
        suggestionsBox.appendChild(div);
    });
    suggestionsBox.classList.remove('hidden'); // Show the box
}

// The main function to perform a search
async function performSearch() {
    // Gather all the data from the form into a single payload object
    const payload = {
        query: queryInput.value,
        dataset_name: document.getElementById('dataset').value,
        model_type: modelSelect.value,
        k1: parseFloat(document.getElementById('bm25_k1').value),
        b: parseFloat(document.getElementById('bm25_b').value),
        enable_ner_reranking: nerToggle.checked,
        enable_cluster_reranking: clusterToggle.checked,
        hybrid_bm25_weight: parseFloat(hybridWeightSlider.value),
        hybrid_type: hybridTypeSelect.value,
        top_k: 10
    };

    // Don't search if the query is empty
    if (!payload.query.trim()) {
        statusDiv.innerHTML = `<p class="status-error">الرجاء إدخال استعلام للبحث.</p>`;
        return;
    }

    // Update the UI to show that a search is in progress
    statusDiv.innerHTML = '<div class="loader"></div><p class="status-msg">جاري البحث…</p>';
    resultsDiv.innerHTML = ''; // Clear old results
    alternativeSuggestionsDiv.innerHTML = ''; // Clear old suggestions
    searchBtn.disabled = true; // Disable the button to prevent multiple clicks

    // Fetch alternative suggestions (spelling, logs) in parallel with the main search
    fetchAlternativeSuggestions(payload.dataset_name, payload.query);

    try {
        // Send the payload to our Flask backend's /search endpoint
        const response = await fetch('/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const results = await response.json();
        // If the response was not OK, throw an error with the message from the backend
        if (!response.ok) throw new Error(results.error || 'حدث خطأ غير معروف.');
        
        statusDiv.innerHTML = ''; // Clear the status message
        displayResults(results); // Display the new results
    } catch (error) {
        // If an error occurred, show it in the status div
        statusDiv.innerHTML = `<p class="status-error">فشل البحث: ${error.message}</p>`;
    } finally {
        // Re-enable the search button, whether the search succeeded or failed
        searchBtn.disabled = false;
    }
}

// Renders the search results on the page
function displayResults(results) {
    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<p class="results-empty">لم يتم العثور على نتائج.</p>';
        return;
    }
    resultsDiv.innerHTML = ''; // Clear any previous results
    // Loop through each result and build a card for it
    results.forEach((result, i) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.animationDelay = (i * 0.06) + 's'; // staggered entrance

        // Header: rank, document id, optional cluster tag, and the relevance score
        const head = document.createElement('div');
        head.className = 'result-head';
        const clusterBadge = (result.cluster_id !== undefined && result.cluster_id >= 0)
            ? `<span class="badge badge-cluster">مجموعة ${result.cluster_id}</span>` : '';
        head.innerHTML = `
            <span class="result-meta">
                <span class="result-rank">${i + 1}</span>
                <span class="result-id">#${result.doc_id}</span>
            </span>
            <span class="result-badges">
                ${clusterBadge}
                <span class="badge badge-score">
                    <span class="score-label">Relevance</span>
                    <span class="score-value">${result.score.toFixed(4)}</span>
                </span>
            </span>`;

        // Body: the original document text (textContent keeps any HTML in docs harmless)
        const text = document.createElement('p');
        text.className = 'result-text';
        text.textContent = result.original_text;

        card.appendChild(head);
        card.appendChild(text);
        resultsDiv.appendChild(card);
    });
}

// Fetches and displays alternative suggestions
async function fetchAlternativeSuggestions(dataset, query) {
    try {
        const response = await fetch(`/suggest-alternatives/?dataset_name=${encodeURIComponent(dataset)}&query=${encodeURIComponent(query)}`);
        const suggestions = await response.json();
        displayAlternativeSuggestions(suggestions);
    } catch (error) {
        console.error("Alternative suggestion fetch failed:", error);
    }
}

// Displays the alternative suggestions (spelling correction, query logs)
function displayAlternativeSuggestions(suggestions) {
    alternativeSuggestionsDiv.innerHTML = ''; // Clear previous suggestions
    let content = '';

    // Display corrected query if available
    if (suggestions.corrected_query) {
        content += `<p>هل تقصد: <a href="#" onclick="runNewSearch('${suggestions.corrected_query}'); return false;">${suggestions.corrected_query}</a></p>`;
    }

    // Display suggestions from query logs
    if (suggestions.log_suggestions && suggestions.log_suggestions.length > 0) {
        const logLinks = suggestions.log_suggestions.map(q =>
            `<a href="#" onclick="runNewSearch('${q}'); return false;">${q}</a>`
        ).join('، ');
        content += `<p>استعلامات مشابهة: ${logLinks}</p>`;
    }

    if (content) {
        alternativeSuggestionsDiv.innerHTML = `<div class="alt-card">${content}</div>`;
    }
}

// Runs a new search with a suggested query
function runNewSearch(query) {
    queryInput.value = query;
    performSearch();
}
