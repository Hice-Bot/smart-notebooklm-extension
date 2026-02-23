document.getElementById('optionsLink').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

document.getElementById('processBtn').addEventListener('click', async () => {
    const btn = document.getElementById('processBtn');
    const statusEl = document.getElementById('status');
    const targetNbEl = document.getElementById('targetNb');

    btn.disabled = true;
    statusEl.innerText = "Extracting page content...";
    targetNbEl.innerText = "";

    try {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: extractPageDetails,
        });

        if (!injectionResults || injectionResults.length === 0) {
            statusEl.innerText = "Error extracting content from this page.";
            btn.disabled = false;
            return;
        }

        const pageData = injectionResults[0].result;
        pageData.url = currentTab.url;

        statusEl.innerText = "AI is reviewing contents and available Notebooks...";

        // Use promise for sendMessage (Manifest V3 native)
        const response = await chrome.runtime.sendMessage({ action: "processToNotebookLM", data: pageData });

        btn.disabled = false;
        if (response && response.success) {
            statusEl.innerText = "Match found!";
            targetNbEl.innerText = `Matched: ${response.notebook.name}`;

            // Automatically close the popup slightly after success to maintain a clean UI experience
            setTimeout(() => window.close(), 1500);
        } else {
            statusEl.innerText = "Error: " + (response ? response.error : "Unknown error.");
        }
    } catch (error) {
        btn.disabled = false;
        statusEl.innerText = "Error: " + (error.message || "Extension context invalidated or unknown error");
    }
});

function extractPageDetails() {
    const title = document.title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const description = descriptionMeta ? descriptionMeta.getAttribute('content') : '';

    // Grab a basic snippet of the page text (up to ~3000 chars to save tokens)
    const bodyText = document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000);

    return {
        title: title,
        description: description,
        content: bodyText
    };
}
