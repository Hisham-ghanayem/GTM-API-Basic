/**
 * What: Adds a custom menu to the Google Sheet on open.
 * Why: Provides users an entry point to launch the GTM sidebar interface.
 * How: Uses Spreadsheet UI service to create a new menu item linked to `showSidebar()`.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GTM Versions')
    .addItem('Open Sidebar', 'showSidebar')
    .addToUi();
}

/**
 * What: Opens the sidebar UI from the Sidebar.html file.
 * Why: Loads the HTML interface to let users fetch GTM account data interactively.
 * How: Uses HtmlService to load 'Sidebar.html' and inject it into the sidebar panel.
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Fetch GTM Versions');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * What: Retrieves GTM account list using the Tag Manager API.
 * Why: Needed to populate the first dropdown so users can select an account.
 * How: Uses Apps Script OAuth token to authenticate, fetches JSON, logs result, and returns account array.
 */
function getAccounts() {
  const accessToken = ScriptApp.getOAuthToken();
  const url = 'https://www.googleapis.com/tagmanager/v2/accounts';
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  const json = JSON.parse(response.getContentText());
  const accounts = json.account || [];

  accounts.forEach(acc => {
    Logger.log(`🧾 Account: ${acc.name} | ID: ${acc.accountId}`);
  });

  return accounts;
}

/**
 * What: Retrieves GTM containers for a selected account.
 * Why: Containers are required to access workspaces and other resources.
 * How: Makes a GET request to GTM API's containers endpoint using accountId and logs the result.
 */
function getContainers(accountId) {
  const accessToken = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`;
  Logger.log("👉 Fetching containers for account: " + accountId);

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const json = JSON.parse(response.getContentText());
    Logger.log("✅ Container response: " + response.getContentText());
    return json.container || [];
  } catch (e) {
    Logger.log("❌ Error fetching containers: " + e.message);
    return [];
  }
}

/**
 * What: Retrieves all workspaces for a given account and container.
 * Why: Workspaces are the environments where tags/triggers/variables are created.
 * How: Makes a GTM API request using both accountId and containerId, parses and logs the result.
 */
function getWorkspace(accountId, containerId) {
  const accessToken = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;
  Logger.log(`🧪 Fetching workspaces for account: ${accountId}, container: ${containerId}`);

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const json = JSON.parse(response.getContentText());
    Logger.log("✅ Workspaces fetched: " + JSON.stringify(json));
    return json.workspace || [];
  } catch (error) {
    Logger.log("❌ Error fetching workspaces: " + error.message);
    return [];
  }
}

/**
 * What: Writes basic workspace data (name, description, fingerprint) to the "workspace" sheet.
 * Why: Gives the user a clear, readable snapshot of their GTM workspaces in Google Sheets.
 * How:
 *   1. Clears or creates a 'workspace' sheet
 *   2. Appends a header row
 *   3. Loops through fetched workspaces and appends one row per workspace
 */
function getWorkspaceData(accountId, containerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "workspace";
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }

  sheet.appendRow(["Name", "Description", "Fingerprint"]);

  const workspaces = getWorkspace(accountId, containerId);
  workspaces.forEach(w => {
    sheet.appendRow([
      w.name || "No name",
      w.description || "No description",
      w.fingerprint || "No fingerprint"
    ]);
  });

  return `✅ ${workspaces.length} workspaces written to the "${sheetName}" sheet.`;
}
