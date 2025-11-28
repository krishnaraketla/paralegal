<!-- 9abfb351-935f-429e-9d92-135b6ad0f404 9c23e5f3-0d39-4c28-9ed5-c756552d62a4 -->
# Apply Fix Functionality Plan

## Current State

The search-and-select flow works via:

1. React sends `SEARCH_AND_SELECT` to `editor.html`
2. `editor.html` broadcasts `PARALEGAL_SEARCH` to all frames
3. Plugin receives via `message` event listener
4. Plugin uses `callCommand()` with `Api.GetDocument().Search().Select()`

The apply fix currently fails because it relies on the Automation API connector (`createConnector`), which is only available in ONLYOFFICE Developer Edition (paid). The free Community Server doesn't support it.

## Solution

Follow the same postMessage + plugin pattern used for search-and-select:

### 1. Update `editor.html` - Add replace broadcast

Modify `applyIssue()` to broadcast a `PARALEGAL_REPLACE` message (same pattern as `searchAndSelect()`):

```javascript
function applyIssue(issue) {
  var msg = { 
    type: 'PARALEGAL_REPLACE', 
    find: issue.find,
    replace: issue.replace,
    issueId: issue.id,
    timestamp: Date.now() 
  };
  // Broadcast to all frames (same as searchAndSelect)
}
```

### 2. Update `code.js` (plugin) - Handle replace messages

Add a message listener for `PARALEGAL_REPLACE` and implement replacement using `callCommand()`:

```javascript
if (event.data.type === 'PARALEGAL_REPLACE') {
  handleSearchAndReplace(event.data.find, event.data.replace, event.data.issueId);
}

function handleSearchAndReplace(findText, replaceText, issueId) {
  Asc.scope.findText = findText;
  Asc.scope.replaceText = replaceText;
  
  window.Asc.plugin.callCommand(function() {
    var doc = Api.GetDocument();
    var results = doc.Search(Asc.scope.findText, true);
    if (results && results.length > 0) {
      results[0].SetText(Asc.scope.replaceText);
      return { success: true, found: results.length };
    }
    return { success: false, found: 0 };
  }, true); // true = isCalcRecalc (update document)
}
```

### 3. Regenerate gzipped plugin file

```bash
cd onlyoffice-plugin/paralegal/scripts && gzip -kf code.js
```

## Files to Modify

- [frontend/public/editor.html](frontend/public/editor.html) - Broadcast `PARALEGAL_REPLACE` message
- [onlyoffice-plugin/paralegal/scripts/code.js](onlyoffice-plugin/paralegal/scripts/code.js) - Handle replace and call API
- `onlyoffice-plugin/paralegal/scripts/code.js.gz` - Regenerate after changes

### To-dos

- [ ] Modify editor.html applyIssue() to broadcast PARALEGAL_REPLACE via postMessage
- [ ] Add PARALEGAL_REPLACE handler and handleSearchAndReplace() in code.js
- [ ] Regenerate code.js.gz and restart ONLYOFFICE container