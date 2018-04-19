/*
* In order to test please run 'npm i'
* To test run 'npm test' in your terminal
*/

const main = require("./main");

// Project Tests

// Query Tests
describe("Query Tests", () => {
  test("Validates the form correctly", () => {
    let { valid, errors } = main.isValid("", "", "");
    expect(valid).toEqual(false);
    expect(errors.length).toEqual(3);
  });

  test("builds the correct query URL", () => {
    let url = main.queryURL("Sunshine", 1, 1);
    expect(url).toEqual(
      "https://jira.secondlife.com/rest/api/2/search?jql=project=Sunshine+and+status=1+and+status+changed+to+1+before+-1d&fields=id,status,key,assignee,summary&maxresults=100"
    );
  });

  test("builds the correct items", () => {
    let items = [
      {
        key: 1,
        fields: {
          status: {
            description: "test",
            iconUrl: "testURL",
            name: "testName"
          },
          summary: "testSummary"
        }
      }
    ];
    let results = main.buildQueryItems(items);
    expect(results.length).toEqual(1);
    expect(results[0].replace(/(\s)/gm, "")).toEqual(
      '<tr><td>1</td><td><spantitle="test"><imgsrc="testURL"/><span>testName</span></span></td><td>testSummary</td></tr>'
    );
  });
});

// Feed Tests
describe("Feed Tests", () => {
  test("builds the correct activity URL", () => {
    let url = main.feedURL("testuser");
    expect(url).toEqual(
      "https://jira.secondlife.com/activity?maxResults=50&streams=user+IS+testuser&providers=issues"
    );
  });
});

// Results Tests
describe("Results Tests", () => {
  test("builds the correct table", () => {
    let items = [
      {
        key: 1,
        fields: {
          status: {
            description: "test",
            iconUrl: "testURL",
            name: "testName"
          },
          summary: "testSummary"
        }
      }
    ];
    let itemsResult = main.buildQueryItems(items);
    let results = main.resultsTable(itemsResult, "test query", "query");
    expect(results.replace(/(\s)/gm, "")).toEqual(
      '<h5>testqueryResults</h5><tablewidth="100%"><thead><tr><th>Issue</th><th>Status</th><th>Summary</th></tr></thead><tbody><tr><td>1</td><td><spantitle="test"><imgsrc="testURL"/><span>testName</span></span></td><td>testSummary</td></tr></tbody></table>'
    );
  });
});

// Utility Tests
describe("Utility Tests", () => {
  test("Domify builds the correct text value", () => {
    let str = main.domify("<div><span>test</span></div>");
    console.log(str);
    expect(str).toEqual("test");
  });
});

// TODO: some tests require some mocking which is not included currently
