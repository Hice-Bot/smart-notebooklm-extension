# Project Memory & Next Steps

## 🚨 NEXT ACTION REQUIRED: NotebookLM Enterprise API Integration

When we resume work on this project, our primary goal is to **implement a dual-method architecture**:

1. **Consumer Mode (Default):** Continue using our current background script "Stealth Mode" method to push data directly to the standard consumer Google NotebookLM (zero-setup required).
2. **Enterprise Mode (New):** Introduce a toggle in the UI (e.g., in `popup.html` or `options.html`) that allows users to authenticate via the **NotebookLM Enterprise API**.

### Technical Requirements for Enterprise Mode:
- **Manifest V3 Update:** Add the `identity` permission to `manifest.json`.
- **OAuth 2.0:** Set up an OAuth client ID in the Google Cloud Console (Workspace / Enterprise restricted).
- **Background Worker Logic:** Write a new API client (`NotebookLMEnterpriseClient`) within `background.js` to handle REST API calls to the official Enterprise API endpoint.

### Why we are doing this:
Google recently released the "NotebookLM Enterprise API" through Google Cloud for Workspace users. It provides an official REST API with OAuth 2.0 authentication. Providing this as an optional "Enterprise Mode" legitimizes our extension and allows organizations/universities to use it safely while complying with their strict data policies. 

### References:
- https://cloud.google.com/notebooklm/enterprise
- The API allows for creating notebooks, uploading files/sources, and managing sharing programmatically.
