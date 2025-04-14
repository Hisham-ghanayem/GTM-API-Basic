# GTM Helper MVP

🎯 A Google Sheets + Google Apps Script tool to fetch GTM account, container, and workspace data using the Tag Manager API v2.

## Features
- Load GTM Accounts, Containers, and Workspaces via sidebar UI
- Write workspace metadata (name, description, fingerprint) into Google Sheets
- Ready to extend with Tags, Triggers, and Variables support

## How to Use
1. Open the Google Sheet
2. Click the “GTM Versions” menu → “Open Sidebar”
3. Select Account → Container → Workspace
4. Click “Fetch Workspace Data”

## Tech Stack
- Google Apps Script (server-side)
- HTML + JS in Sidebar
- GTM API v2

## Next Steps
- Add Tag, Trigger, Variable fetch
- Transition to Node.js + Firebase for user-auth and scale
