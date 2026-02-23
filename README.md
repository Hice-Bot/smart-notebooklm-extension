# Smart NotebookLM Chrome Extension

This Chrome Extension creates a seamless bridge between your web browsing and your Google NotebookLM instances. Instead of manually copying links and deciding which notebook they belong to, this extension uses AI (via the Gemini API) to read the content of the current webpage and automatically route it to the best-matching Notebook.

## Features:
- **One-Click Analysis**: Extracts the main content of the current tab.
- **AI Matching**: Sends the web content and your list of available notebooks to the Gemini LLM. The AI decides which notebook is the most relevant.
- **Smart Assignment**: Automatically opens the chosen NotebookLM and copies the page URL and title to your clipboard, allowing you to easily paste it directly into your Notebook's sources.

## Setup Instructions:

1. **Load the Extension into Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (toggle switch in the top right corner).
   - Click the **Load unpacked** button.
   - Select the `SmartNotebookLM` directory you just created.

2. **Configure Your API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/) and grab a free Gemini API Key.
   - Click the extension icon in your toolbar, then click "Extension Settings".
   - Paste your API key.

3. **Configure Your Notebooks**:
   - Still in "Extension Settings", add the Notebooks you want to route information to.
   - **Name**: A readable name for the Notebook (e.g., "AI Research", "Personal Finances").
   - **Notebook URL**: The specific URL of your NotebookLM instance (e.g., `https://notebooklm.google.com/notebook/abc-123`).
   - **Description**: Add some context so the AI knows what this notebook is about. (e.g., "Latest research and news regarding AI agents.", "My bank statements, tax forms, and crypto investments").
   - Make sure to **Save Configuration**.

## How to Use:
1. Navigate to an interesting web page or article.
2. Click the Smart NotebookLM extension icon.
3. Click **"Send to NotebookLM"**.
4. Wait a few seconds while the LLM thinks.
5. The extension will automatically open the matched NotebookLM tab.
6. The URL and title are automatically placed into your clipboard — you just need to paste (Ctrl+V) into NotebookLM as a source! 

*Note: NotebookLM does not currently possess a public API to automatically inject resources via a third-party script, so this extension acts as your smart, automated "router" to bring you right where you need to go.*
