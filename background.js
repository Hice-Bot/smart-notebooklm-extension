chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "processToNotebookLM") {
        handleProcess(request.data)
            .then(result => sendResponse(result))
            .catch(err => {
                console.error(err);
                sendResponse({ success: false, error: err.message });
            });
        return true; // Keep message channel open for async response
    }
});

async function handleProcess(pageData) {
    const syncData = await chrome.storage.sync.get(['apiKey']);
    const localData = await chrome.storage.local.get(['notebooks']);
    const config = { apiKey: syncData.apiKey, notebooks: localData.notebooks };

    if (!config.apiKey) {
        throw new Error('Please configure your Gemini API Key in the Extension Options.');
    }

    if (!config.notebooks || config.notebooks.length === 0) {
        throw new Error('No notebooks configured. Please add them in Options.');
    }

    // Format notebooks for the AI prompt
    const notebooksListText = config.notebooks.map(nb => `- Name: "${nb.name}" | Description: ${nb.description}`).join('\n');

    const prompt = `You are a smart assistant that categorizes web content into predefined notebooks. 
Here are the available notebook options:
${notebooksListText}

Here is the web page the user wants to save:
Title: ${pageData.title}
URL: ${pageData.url}
Description: ${pageData.description}
Content Snippet: ${pageData.content.substring(0, 1500)}

Review the web page content and the available notebooks. Decide which notebook is the absolute best fit. 
You MUST respond with EXACTLY the "Name" from the list above, nothing else. No quotes, formatting, or explanation.`;

    // Call Gemini API to evaluate
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.apiKey}`;
    const aiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.1
            }
        })
    });

    if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Gemini API Error: ${aiResponse.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await aiResponse.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
        throw new Error("Unable to parse AI response.");
    }

    const chosenName = rawText.trim();

    // Find matching notebook from user settings
    let selectedNotebook = config.notebooks.find(nb => nb.name.trim().toLowerCase() === chosenName.toLowerCase());

    // Fuzzy match fallback
    if (!selectedNotebook) {
        selectedNotebook = config.notebooks.find(nb => chosenName.includes(nb.name) || nb.name.includes(chosenName));
    }

    // Default fallback if AI completely hallucinated
    if (!selectedNotebook) {
        console.warn("AI hallucinated or failed to pick a valid name:", chosenName);
        selectedNotebook = config.notebooks[0];
    }

    // Open the target NotebookLM instance in a completely hidden window
    const backgroundWindow = await chrome.windows.create({
        url: selectedNotebook.url,
        state: "minimized",
        focused: false
    });

    const tab = backgroundWindow.tabs[0];

    try {
        // Just give it enough time to load the base HTML to extract tokens
        await new Promise(r => setTimeout(r, 2000));

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (sourceUrl) => {
                return new Promise(async (resolve, reject) => {
                    try {
                        console.log("[Smart NotebookLM] Direct API Injection starting...");

                        // 1. Grab notebook ID from current URL
                        const match = window.location.href.match(/\/notebook\/([a-f0-9-]+)/i);
                        if (!match) throw new Error("Could not extract notebook ID from URL");
                        const notebookId = match[1];

                        // 2. Google uses WIZ internal data structure. We can extract tokens from the HTML source.
                        const html = document.documentElement.innerHTML;
                        const atMatch = html.match(/"SNlM0e":"([^"]+)"/);
                        const blMatch = html.match(/"cfb2h":"([^"]+)"/);

                        if (!atMatch || !blMatch) {
                            throw new Error("Could not find auth tokens. Make sure you are logged in.");
                        }

                        const at = atMatch[1];
                        const bl = blMatch[1];

                        // 3. Construct the Google RPC payload
                        const isYoutube = sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be");
                        const args = [
                            [
                                isYoutube
                                    ? [null, null, null, null, null, null, null, [sourceUrl]]
                                    : [null, null, [sourceUrl]]
                            ],
                            notebookId,
                            [2]
                        ];

                        const fReq = [
                            [
                                [
                                    "izAoDd",
                                    JSON.stringify(args),
                                    null,
                                    "generic"
                                ]
                            ]
                        ];

                        const body = new URLSearchParams();
                        body.append("f.req", JSON.stringify(fReq));
                        body.append("at", at);

                        const executeUrl = `https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute?rpcids=izAoDd&bl=${bl}&authuser=0`;

                        console.log("[Smart NotebookLM] Sending API request to add source...");
                        const response = await fetch(executeUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
                            },
                            body: body.toString()
                        });

                        const text = await response.text();
                        console.log("[Smart NotebookLM] RPC Response received");

                        if (response.ok && (text.includes("wrb.fr") || text.includes("izAoDd"))) {
                            console.log("[Smart NotebookLM] Source successfully added via internal API!");
                            resolve(true);
                        } else {
                            reject("Bad RPC Response: " + text.substring(0, 50));
                        }
                    } catch (err) {
                        console.error("[Smart NotebookLM] API Error:", err);
                        reject(err.toString());
                    }
                });
            },
            args: [pageData.url]
        });

        // Wait a little extra time to ensure submission finishes before we kill the window
        await new Promise(r => setTimeout(r, 1000));

    } catch (e) {
        console.error("API injection failed:", e);
    } finally {
        if (backgroundWindow) {
            await chrome.windows.remove(backgroundWindow.id);
        }
    }

    return { success: true, notebook: selectedNotebook };
}
