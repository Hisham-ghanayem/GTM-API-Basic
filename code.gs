/**
 * What: Adds a custom menu to the Google Sheet when opened
 * Why: Allows users to access the GTM add-on from the UI
 * How: Uses Spreadsheet UI service to create a new menu item
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GTM Versions')
    .addItem('Open Sidebar', 'showSidebar')
    .addToUi();
}

/**
 * What: Loads and displays the Sidebar HTML interface
 * Why: Provides users with dropdowns and buttons to fetch GTM data
 * How: Uses HtmlService to inject Sidebar.html into the UI
 */
function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Fetch GTM Versions');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * What: Fetches all GTM accounts the user has access to
 * Why: Needed to populate the first dropdown (Account selection)
 * How: Calls GTM API accounts endpoint with OAuth token
 */
function getAccounts() {
  const accessToken = ScriptApp.getOAuthToken();
  const url = 'https://www.googleapis.com/tagmanager/v2/accounts';
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  const json = JSON.parse(response.getContentText());
  return json.account || [];
}

/**
 * What: Fetches all containers within a selected account
 * Why: Required to move from Account → Container → Workspace drill-down
 * How: Uses GTM API containers endpoint and handles errors
 */
function getContainers(accountId) {
  const accessToken = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`;

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const json = JSON.parse(response.getContentText());
    return json.container || [];
  } catch (e) {
    Logger.log("❌ Error fetching containers: " + e.message);
    return [];
  }
}

/**
 * What: Retrieves workspaces for a specific container
 * Why: Workspaces are where actual tags/triggers/variables live
 * How: Calls the workspaces endpoint of the GTM API
 */
function getWorkspace(accountId, containerId) {
  const accessToken = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces`;

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const json = JSON.parse(response.getContentText());
    return json.workspace || [];
  } catch (error) {
    Logger.log("❌ Error fetching workspaces: " + error.message);
    return [];
  }
}

/**
 * What: Writes workspace details (name, description, fingerprint) to a sheet
 * Why: Gives the user a quick overview of their current workspaces
 * How: Fetches data, clears/creates sheet, appends rows
 */
function getWorkspaceData(accountId, containerId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "workspace";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  else sheet.clearContents();

  sheet.appendRow(["Name", "Description", "Fingerprint"]);

  const workspaces = getWorkspace(accountId, containerId);
  const rows = workspaces.map(w => [
    w.name || "No name",
    w.description || "No description",
    w.fingerprint || "No fingerprint"
  ]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return `✅ ${rows.length} workspaces written to the "${sheetName}" sheet.`;
}

/**
 * What: Fetches all GTM tags in a workspace
 * Why: Tags are the main tracking components that fire data
 * How: Calls GTM API using workspace ID
 */
function getTags(accountId, containerId, workspaceId) {
  const accessToken = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`;

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const json = JSON.parse(response.getContentText());
    return json.tag || [];
  } catch (error) {
    Logger.log("❌ Error fetching tags: " + error.message);
    return [];
  }
}

/**
 * What: Fetches all GTM triggers in a workspace
 * Why: Used to match trigger IDs to names in the tags sheet
 * How: Calls GTM API triggers endpoint
 */
function getTriggers(accountId, containerId, workspaceId) {
  const accessToken = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`;

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const json = JSON.parse(response.getContentText());
    return json.trigger || [];
  } catch (error) {
    Logger.log("❌ Error fetching triggers: " + error.message);
    return [];
  }
}

/**
 * What: Fetches all GTM variables in a workspace
 * Why: Get better idea about the workspace structure
 * How: Calls GTM API variables  endpoint
 */
function getVariables(accountId, containerId, workspaceId) {
  const accessToken = ScriptApp.getOAuthToken();
  const url = `https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`;

  try {
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });
    const json = JSON.parse(response.getContentText());
    return json.variable || [];
  } catch (error) {
    Logger.log("❌ Error fetching triggers: " + error.message);
    return [];
  }
}

/**
 * What: Writes variables information to the "Variables" sheet
 * Why: Allows users to audit, analyze, and jump into GTM directly
 * How:
 *  - Fetches tags + triggers
 *  - Builds rows with tag details, trigger names, and tagManagerUrl
 *  - Writes formatted data to Google Sheet
 */
function getVariablesData(accountId, containerId, workspaceId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Variables";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  else sheet.clearContents();

  sheet.appendRow([
    "Name", "Type", "Tag Manager URL"
  ]);

  const tags = getTags(accountId, containerId, workspaceId);
  const triggers = getTriggers(accountId, containerId, workspaceId);
  const variables = getVariables(accountId, containerId, workspaceId);

const rows = variables.map(n => [
  n.name || "No name",
  n.type || "Unknown",       
  n.tagManagerUrl || "N/A"
]);


  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return `✅ ${variables.length} Variables written to "Variables" sheet.`;
}
/**
 * What: Writes tag information to the "Tags" sheet
 * Why: Allows users to audit, analyze, and jump into GTM directly
 * How:
 *  - Fetches tags + triggers
 *  - Builds rows with tag details, trigger names, and tagManagerUrl
 *  - Writes formatted data to Google Sheet
 */
function getTagsData(accountId, containerId, workspaceId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Tags";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  else sheet.clearContents();

  sheet.appendRow([
    "Name", "Type", "Tag ID", "Live Only", "Priority",
    "Firing Triggers", "Parameters", "Tag Manager URL"
  ]);

  const tags = getTags(accountId, containerId, workspaceId);
  const triggers = getTriggers(accountId, containerId, workspaceId);

  const rows = tags.map(tag => [
    tag.name || "No name",
    tag.type || "Unknown",
    tag.tagId || "N/A",
    tag.liveOnly === true ? "Yes" : tag.liveOnly === false ? "No" : "N/A",
    tag.priority?.value || "Not set",
    formatFiringTriggers(tag, triggers),
    formatTagParameters(tag.parameter),
    tag.tagManagerUrl || "N/A"
  ]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return `✅ ${tags.length} tags written to "Tags" sheet.`;
}

/**
 * What: Converts firingTriggerId[] to readable names
 * Why: Improves sheet readability and UX by showing trigger names
 * How: Matches each ID to trigger name using a lookup
 */
function formatFiringTriggers(tag, triggers) {
  return Array.isArray(tag.firingTriggerId)
    ? tag.firingTriggerId.map(id => {
        const match = triggers.find(t => t.triggerId === id);
        return match ? `${match.name} (ID: ${id})` : `Unknown (${id})`;
      }).join(", ")
    : "None";
}

/**
 * What: Formats a parameter array into "key : value" string
 * Why: Provides a readable summary of parameters used in each tag
 * How: Maps each param to "key : value", joins with " || "
 */
function formatTagParameters(paramArray) {
  if (!Array.isArray(paramArray)) return "None";
  return paramArray.map(p => `${p.key} : ${p.value}`).join(" || ");
}

// 🔹 Write Triggers to sheet
function getTriggersData(accountId, containerId, workspaceId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Triggers";
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) sheet = ss.insertSheet(sheetName);
  else sheet.clearContents();

  sheet.appendRow([
    "Name", "Type", "Trigger ID", "Custom Event Filter", "Filter", "Auto Event Filter",
    "Wait For Tags", "Finger Print", "Parent Folder Id", "Selector", "Notes", "parameter", "Quick Edit Link"
  ]);

  const triggers = getTriggers(accountId, containerId, workspaceId);

  const rows = triggers.map(trigger => [
    trigger.name || "No name",
    trigger.type || "Unknown",
    trigger.triggerId || "N/A",
    formatCustomEventFilter(trigger.customEventFilter),
    formatTriggersFilter(trigger.filter),
    formatAutoEventFilter(trigger.autoEventFilter),
    formatWaitForTags(trigger.waitForTags, trigger.type),
    trigger.fingerprint || "N/A",
    trigger.parentFolderId || "N/A",
    trigger.selector?.value || "N/A", // ✅ FIXED: use .value from Parameter object
    trigger.note || "No Note found",
    trigger.parameter?.value || "N/A", 
    trigger.tagManagerUrl	|| "Not Available"

  ]);

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  return `✅ ${rows.length} triggers written to "Triggers" sheet.`;
}

// 🔹 Helpers: Format filters and condition arrays
function formatCustomEventFilter(filter) {
  return Array.isArray(filter)
    ? filter.map(f => {
        const arg0 = f.parameter?.find(p => p.key === "arg0")?.value || "";
        const arg1 = f.parameter?.find(p => p.key === "arg1")?.value || "";
        const type = f.type || "unknown";

        if (arg0 === "{{_event}}") {
          return `event ${type} "${arg1}"`;
        } else if (arg0 && arg1) {
          return `${arg0} ${type} "${arg1}"`;
        } else {
          return `unknown condition`;
        }
      }).join(" | ")
    : "None";
}

function formatTriggersFilter(filter) {
  return formatCustomEventFilter(filter);
}

function formatAutoEventFilter(filter) {
  return formatCustomEventFilter(filter);
}

// 🔹 Helper: Format Wait for Tags based on supported types
function formatWaitForTags(value, type) {
  const supported = ["linkClick", "formSubmit"];
  if (!supported.includes(type)) {
    return `Wait for tag not supported for ${type}`;
  }

  return value === true
    ? "Enabled"
    : value === false
    ? "Disabled"
    : "Unknown";
}

const IMPORTANT_KEYS = ["eventName", "eventValue", "currency", "userId", "conversionId"];

function formatSmartTagParameters(paramArray) {
  if (!Array.isArray(paramArray)) return "None";
  
  return paramArray
    .filter(p => IMPORTANT_KEYS.includes(p.key))
    .map(p => `${p.key}: ${p.value}`)
    .join(" || ");
}
