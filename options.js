document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('add-notebook').addEventListener('click', addNotebookField);
document.getElementById('sync-btn').addEventListener('click', syncNotebooks);

function addNotebookField(name = '', url = '', description = '') {
  const container = document.getElementById('notebooks-container');
  const div = document.createElement('div');
  div.className = 'notebook-item';
  div.innerHTML = `
    <div class="form-group"><input type="text" class="nb-name" placeholder="Notebook Name" value="${name}"></div>
    <div class="form-group"><input type="text" class="nb-url" placeholder="Notebook URL (e.g. https://notebooklm.google.com/notebook/123)" value="${url}"></div>
    <div class="form-group"><input type="text" class="nb-desc" placeholder="Topic Description (to help LLM decide)" value="${description}"></div>
    <button class="btn btn-secondary remove-btn" style="background:#dc3545; padding:5px;">Remove</button>
  `;
  div.querySelector('.remove-btn').addEventListener('click', () => {
    container.removeChild(div);
  });
  container.appendChild(div);
}

async function saveOptions() {
  const apiKey = document.getElementById('apiKey').value;
  const notebookItems = document.querySelectorAll('.notebook-item');
  const notebooks = [];

  notebookItems.forEach(item => {
    const name = item.querySelector('.nb-name').value;
    const url = item.querySelector('.nb-url').value;
    const desc = item.querySelector('.nb-desc').value;
    if (name && url) {
      notebooks.push({ name, url, description: desc });
    }
  });

  try {
    await chrome.storage.sync.set({ apiKey });
    await chrome.storage.local.set({ notebooks });
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  } catch (err) {
    console.error("Error saving options:", err);
  }
}

async function restoreOptions() {
  try {
    const syncData = await chrome.storage.sync.get(['apiKey']);
    if (syncData.apiKey) document.getElementById('apiKey').value = syncData.apiKey;

    const localData = await chrome.storage.local.get(['notebooks']);
    document.getElementById('notebooks-container').innerHTML = '';

    if (localData.notebooks && localData.notebooks.length > 0) {
      localData.notebooks.forEach(nb => {
        addNotebookField(nb.name, nb.url, nb.description);
      });
    } else {
      addNotebookField(); // default empty one
    }
  } catch (err) {
    console.error("Error restoring options:", err);
  }
}

async function syncNotebooks() {
  const status = document.getElementById('status');
  status.style.color = 'blue';
  status.innerText = 'Syncing notebooks in background... (Please wait up to 15 seconds)';
  status.style.display = 'block';

  try {
    const tab = await chrome.tabs.create({ url: 'https://notebooklm.google.com/', active: false });

    // Give the page a moment to initialize before injecting
    await new Promise(r => setTimeout(r, 2000));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return new Promise((resolve) => {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;

            // Look for the specific Angular buttons containing the project IDs
            const buttons = Array.from(document.querySelectorAll('button[aria-labelledby^="project-"]'));

            if (buttons.length > 0) {
              clearInterval(interval);

              const dataMap = new Map();
              buttons.forEach(btn => {
                const label = btn.getAttribute('aria-labelledby');
                if (!label) return;

                // Extract the UUID from strings like "project-3f0c065c-b492-4176-ac85-d6e68a177156-title"
                const match = label.match(/project-([a-f0-9-]{32,36})/i);
                if (match) {
                  const id = match[1];
                  const url = `https://notebooklm.google.com/notebook/${id}`;

                  // Try to find the associated title element using the ID
                  const titleElem = document.getElementById(`project-${id}-title`);
                  let nameStr = titleElem ? titleElem.innerText.trim() : "";

                  if (!nameStr) {
                    nameStr = btn.innerText.trim() || btn.getAttribute('aria-label') || "";
                  }

                  nameStr = nameStr.replace(/\n+/g, ' - ');

                  if (!dataMap.has(id)) {
                    dataMap.set(id, {
                      name: nameStr || "Untitled Notebook",
                      url: url,
                      description: "Auto-synced from Google NotebookLM"
                    });
                  }
                }
              });

              const notebookLinks = Array.from(dataMap.values());
              resolve(notebookLinks);

            } else if (attempts >= 30) {
              // Time out after 15 seconds
              clearInterval(interval);
              resolve([]);
            }
          }, 500);
        });
      }
    });

    await chrome.tabs.remove(tab.id);

    const scraped = (results && results[0] && results[0].result) ? results[0].result : [];

    if (scraped.length > 0) {
      const uniqueScraped = [];
      const seenScrapedUrls = new Set();
      for (const nb of scraped) {
        if (!seenScrapedUrls.has(nb.url)) {
          seenScrapedUrls.add(nb.url);
          uniqueScraped.push(nb);
        }
      }

      // Fetch existing
      const localData = await chrome.storage.local.get(['notebooks']);
      let existingNotebooks = localData.notebooks || [];
      const existingUrls = new Set(existingNotebooks.map(n => n.url));

      let addedCount = 0;
      uniqueScraped.forEach(nb => {
        if (!existingUrls.has(nb.url)) {
          existingNotebooks.push(nb);
          addedCount++;
        }
      });

      // Save it back and refresh UI
      await chrome.storage.local.set({ notebooks: existingNotebooks });
      await restoreOptions();

      status.style.color = 'green';
      status.innerText = `Sync complete! Located ${uniqueScraped.length} notebooks. Added ${addedCount} new ones.`;
      setTimeout(() => status.style.display = 'none', 4000);
    } else {
      status.style.color = 'red';
      status.innerText = 'No notebooks found. Please login to NotebookLM manually, then try again.';
      setTimeout(() => status.style.display = 'none', 4000);
    }
  } catch (err) {
    status.style.color = 'red';
    status.innerText = 'Error syncing: ' + err.message;
    console.error(err);
  }
}
