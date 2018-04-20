// Cached DOM elements
/**
 * Call the document.getElementById one time and cache the element for further use
 */
const feedButton = document.getElementById("feed");
const inStatusFor = document.getElementById("daysPast");
const projectElement = document.getElementById("project");
const queryButton = document.getElementById("query");
const queryResult = document.getElementById("query-result");
const statusElement = document.getElementById("status");
const statusSelect = document.getElementById("statusSelect");
const userElement = document.getElementById("user");

// DOM Updates
/**
 * Updates the status in the DOM.
 * @param {string} message - the status message
 * @param {boolean} error - if the status is an error message. Prepends ERROR. to the message string
 */
const updateStatus = (message, error = false) => {
  statusElement.innerHTML = error ? `ERROR. ${message}` : message;
  statusElement.hidden = false;
};

// Response
const jsonResponse = "json";

// Project
/**
 * Project URL for the extension
 */
const projectURL = "https://jira.secondlife.com/rest/api/2/project/SUN";

/**
 * Validates the project exists.
 * @return {boolean} the validation object that contains errors and if the form is valid
 */
const checkProjectExists = async () => {
  try {
    return await make_request(projectURL, jsonResponse);
  } catch (errorMessage) {
    return false;
  }
};

// Query
/**
 * @typedef {Object} Valid
 * @property {boolean} valid if the request is valid
 * @property {Array} errors errors array
 */

/**
 * Validates the form values are correct.
 * @param {string} project - the jira project.
 * @param {number} status - the status of the ticket. (1 = Open| 3 = In Progress)
 * @param {number} inStatusFor - represents the number of days that the ticket has been in the status
 * @return {Valid} the validation object that contains errors and if the form is valid
 */
export const isValid = (project, status, inStatusFor) => {
  let errors = [];
  let invalidProject =
    "A valid project name is required and can not be empty example: (sunshine)";

  let invalidStatus =
    "A valid status is required and can not be empty example: (1 for Open or 3 for In process)";

  let invalidStatusFor =
    "A valid number of days is required and must be a positive number";

  if (!project) errors.push(invalidProject);
  if (!status) errors.push(invalidStatus);
  if (inStatusFor === "" || isNaN(inStatusFor) || inStatusFor < 0) {
    errors.push(invalidStatusFor);
  }

  if (errors.length) return { valid: false, errors };
  return { valid: true, errors: [] };
};

/**
 * Builds a query url for ticket status.
 * @param {string} project - the jira project.
 * @param {number} status - the status of the ticket. (1 = Open| 3 = In Progress)
 * @param {number} inStatusFor - represents the number of days that the ticket has been in the status
 * @return {string} the completed string that can be used in a http request
 */
export const queryURL = (project, status, inStatusFor, maxResults = 100) => {
  let baseURL = "https://jira.secondlife.com/rest/api/2/search?jql=";
  let queryString = `project=${project}+and+status=${status}+and+status+changed+to+${status}+before+-${inStatusFor}d&fields=id,status,key,assignee,summary&maxresults=${maxResults}`;
  return `${baseURL}${queryString}`;
};

/**
 * Builds an item template for the query.
 * @param {Array} items - The json items returned from the request
 * @return {string} the completed string that can be used in the table template
 */
export const buildQueryItems = items => {
  return items.map(i => {
    return `<tr>
              <td>${i.key}</td>
              <td>
                <span title="${i.fields.status.description}">
                  <img src="${i.fields.status.iconUrl}" />
                  <span>${i.fields.status.name}</span>
                </span>
              </td>
              <td>${i.fields.summary}</td>
            </tr>`;
  });
};

/**
 * Handles the query click event.
 */
const handleQueryClick = async () => {
  let project = projectElement.value;
  let status = statusSelect.value;
  let inStatus = inStatusFor.value;
  let title = "Ticket Status Query";
  let queryType = "query";
  let { valid, errors } = isValid(project, status, inStatus);

  if (!valid) {
    queryResult.hidden = true;
    return updateStatus(errors.join("<br/>"), true);
  }

  let url = queryURL(project, status, inStatus);
  updateStatus(`Performing JIRA search for ${url}`);
  let result = await make_request(url, jsonResponse);
  if (result) {
    let items = buildQueryItems(result.issues || []);
    buildResultsTable(items, title, queryType);
    updateStatus(`Query term: ${url}\n`);
  }
};

// Feed
/**
 * Builds a feed URL for the activity feed request.
 * @param {string} user - the user id for stream activity
 * @return {string} the completed string that can be used in the fetch request
 */
export const feedURL = user =>
  `https://jira.secondlife.com/activity?maxResults=50&streams=user+IS+${user}&providers=issues`;

/**
 * Builds a feed items array to be used in the results table.
 * @param {string} result - parsed xml document
 * @return {Array} an array of feed strings
 */
export const buildFeedItems = result => {
  let feed = result.getElementsByTagName("feed");
  let entries = feed[0].getElementsByTagName("entry");
  let items = [];

  for (let index = 0; index < entries.length; index++) {
    let html = entries[index].getElementsByTagName("title")[0].innerHTML;
    let updated = entries[index].getElementsByTagName("updated")[0].innerHTML;
    items.push(
      `<tr>
          <td>${new Date(updated).toLocaleString()}</td>
          <td>${domify(html)}</td>
      </tr>`
    );
  }
  return items;
};

/**
 * Handles the feed click event.
 */
const handleFeedClick = async () => {
  let url = feedURL(userElement.value);
  updateStatus(`Activity query: ${url}\n`);
  let result = await make_request(url);
  if (result) {
    let items = buildFeedItems(result);
    buildResultsTable(items, "JIRA Activity Query");
  }
};

// Results
/**
 * Builds a completed results table string.
 * @param {Array} items - array of string items
 * @param {string} queryName - Name of the table. this appends to the top of the result table
 * @param {string} queryType - the query type determines the table template : options: query|| null
 * @return {string} completed string
 */
export const resultsTable = (items, queryName, queryType = null) => {
  return `<h5>${queryName} Results</h5>
          <table width="100%">
            <thead>
            ${
              queryType === "query"
                ? "<tr><th>Issue</th><th>Status</th><th>Summary</th></tr>"
                : "<tr><th>Date</th><th>Activity</th></tr>"
            }

            </thead>
            <tbody>
              ${
                items.length
                  ? items.join("")
                  : `<tr><td colspan="3">There are no ${queryName} results</td></tr>`
              }
            </tbody>
          </table>`;
};

/**
 * Handles the DOM manipulation of the templates.
 * @param {Array} items - array of string items
 * @param {string} queryName - Name of the table. this appends to the top of the result table
 * @param {string} queryType - the query type determines the table template : options: query|| null
 */
const buildResultsTable = (items, queryName, queryType) => {
  let table = resultsTable(items, queryName, queryType);
  queryResult.innerHTML = "";
  queryResult.appendChild(
    document.createRange().createContextualFragment(table),
    queryResult
  );
  queryResult.hidden = false;
};

// Utility
/**
 * Parses an xml value into usable dom elements.
 * @param {string} str - string to parse
 * @return {string} parsed text content
 */
export const domify = str => {
  let dom = new DOMParser().parseFromString(
    "<!doctype html><body>" + str,
    "text/html"
  );
  return dom.body.textContent;
};

// Options
/**
 * Loads options from chrome.storage
 */
const loadOptions = () => {
  const options = { project: "Sunshine", user: "nyx.linden" };
  chrome.storage.sync.get(options, items => {
    projectElement.value = items.project;
    userElement.value = items.user;
  });
};

// Loaded Event Handler
/**
 * Handles the content loaded event and setup
 */
const handleContentLoaded = async () => {
  let exists = await checkProjectExists();
  // If the project does not exist then hide the form and update the status
  if (!exists) return;

  loadOptions();
  inStatusFor.value = 1;
  queryButton.onclick = () => handleQueryClick();
  feedButton.onclick = () => handleFeedClick();
};

// Request
/**
 * handles the XMLHttp request to the JIRA API.
 * @param {string} url - url of the API
 * @param {string} responseType - the type of response expected: json or undefined for xml
 * @return {Object} response Object
 */
const make_request = async (url, responseType) => {
  try {
    let response = await fetch(url, { credentials: "include" });

    if (!response.ok) {
      let json = await response.json();
      handleError(json, response.status);
      return false;
    }

    return handleResponse(response, responseType);
  } catch (err) {
    handleError({ errorMessages: ["Network Error"] });
  }
};

/**
 * handles the XMLHttp response from the API.
 * @param {Object} response - fetch response object
 * @param {string} responseType - the type of response expected: json or undefined for xml
 * @return {Object|text} response Object if the response type is json or an xml doc if undefined
 */
const handleResponse = async (response, responseType) => {
  return responseType === "json"
    ? await response.json()
    : new DOMParser().parseFromString(await response.text(), "text/xml");
};

/**
 * handles the XMLHttp errors from the API.
 * @param {Object} json - json result
 * @param {number} status - http status code
 */
const handleError = (json, status) => {
  let message = "";
  switch (status) {
    case 401:
      message = "You must be logged in to JIRA to see this project.";
      break;
    default:
      message = json.errorMessages.join("</br>");
  }
  updateStatus(message, true);
};

document.addEventListener("DOMContentLoaded", handleContentLoaded());
