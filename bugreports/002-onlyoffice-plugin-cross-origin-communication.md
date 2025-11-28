# Bug Report: ONLYOFFICE Plugin Cross-Origin Communication
**bug_id** : 002  
**Date:** 2025-11-28  
**Status:** RESOLVED  
**Severity:** High  

---

## Summary

When clicking on proofreading issues in the sidebar, the corresponding text in the ONLYOFFICE document should be highlighted/selected. The feature wasn't working because the custom ONLYOFFICE plugin couldn't receive search commands from the React frontend due to cross-origin restrictions.

---

## Symptoms

1. Proofreading panel shows issues correctly ✅
2. Clicking on an issue logs `[USER ACTION] Issue clicked` ✅
3. `[IFRAME] Setting search command on window: CALIFORINA` ✅
4. `[Paralegal Plugin] Initialized - starting command polling` ✅
5. **NO plugin log showing command received** ❌
6. Text in document is NOT highlighted ❌
7. No errors in console (silent failure during polling)

---

## Root Cause

**Cross-origin isolation** between the React frontend and the ONLYOFFICE plugin:

- React app runs on `localhost:5173` (Vite dev server)
- `editor.html` runs on `localhost:5173` (same origin as React)
- ONLYOFFICE editor runs on `localhost:8080` (Document Server)
- The plugin runs inside ONLYOFFICE's iframe hierarchy on `localhost:8080`

The original approach tried to set `window.paralegalSearchCommand` on the editor.html window and have the plugin poll for it by traversing up the iframe chain. However, **cross-origin security** prevented the plugin from reading properties on windows from a different origin.

```
┌─────────────────────────────────────────────────────────────┐
│  React App (localhost:5173)                                  │
│  └── iframe: editor.html (localhost:5173)                   │
│       └── window.paralegalSearchCommand = {...} ✅ SET      │
│            └── OnlyOffice iframe (localhost:8080)           │
│                 └── Plugin iframe (localhost:8080)          │
│                      └── Cannot read parent window ❌       │
└─────────────────────────────────────────────────────────────┘
```

---

## Attempted Fixes (Did NOT Work)

### 1. Window Property Polling (Original Approach)
```javascript
// Plugin code - traverse up iframe chain
function findCommandWindow() {
  var current = window;
  while (current.parent && current.parent !== current) {
    if (current.paralegalSearchCommand) return current;
    current = current.parent; // Blocked by cross-origin!
  }
}
```
**Result:** Failed - `SecurityError` when accessing cross-origin parent windows

### 2. localStorage Communication
```javascript
// editor.html
localStorage.setItem('paralegalSearchCommand', JSON.stringify({...}));

// Plugin
var cmd = localStorage.getItem('paralegalSearchCommand');
```
**Result:** Failed - Each origin has its own localStorage. Plugin on `:8080` cannot see localStorage from `:5173`

### 3. Direct Window Property Access from Plugin
```javascript
// Plugin trying to access top-level window
if (window.top.paralegalSearchCommand) { ... }
```
**Result:** Failed - Same cross-origin restriction

---

## Working Solution: postMessage + callCommand

The solution uses **postMessage API** which is designed for cross-origin communication, combined with **Asc.plugin.callCommand()** to access the document API in the correct context.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  React App (localhost:5173)                                  │
│  └── postMessage to iframe                                   │
│       └── editor.html (localhost:5173)                      │
│            └── postMessage to child frames (broadcasts)     │
│                 └── OnlyOffice iframe (localhost:8080)      │
│                      └── Plugin receives message ✅         │
│                           └── callCommand() accesses Api    │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

**1. editor.html - Broadcast via postMessage**
```javascript
function searchAndSelect(text) {
  var msg = { type: 'PARALEGAL_SEARCH', text: text, timestamp: Date.now() };
  
  // Recursively post to all reachable frames
  function postToAllFrames(win, depth) {
    if (depth > 10) return;
    try {
      win.postMessage(msg, '*');
    } catch(e) {}
    try {
      for (var i = 0; i < win.frames.length; i++) {
        postToAllFrames(win.frames[i], depth + 1);
      }
    } catch(e) {}
  }
  
  postToAllFrames(window, 0);
  
  // Also post directly to iframe elements
  var iframes = document.getElementsByTagName('iframe');
  for (var i = 0; i < iframes.length; i++) {
    try {
      iframes[i].contentWindow.postMessage(msg, '*');
    } catch(e) {}
  }
}
```

**2. Plugin code.js - Listen for messages + use callCommand**
```javascript
window.Asc.plugin.init = function(data) {
  // Listen for postMessage from parent frames
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'PARALEGAL_SEARCH' && event.data.text) {
      handleSearchAndSelect(event.data.text);
    }
  }, false);
};

function handleSearchAndSelect(searchText) {
  // Pass data via Asc.scope (callCommand runs in isolated context)
  Asc.scope.searchText = searchText;
  
  window.Asc.plugin.callCommand(function() {
    var searchText = Asc.scope.searchText;
    var oDocument = Api.GetDocument();
    
    var aSearchResults = oDocument.Search(searchText, true);
    if (aSearchResults && aSearchResults.length > 0) {
      aSearchResults[0].Select();
      return { found: aSearchResults.length };
    }
    return { found: 0 };
  }, false, false, function(result) {
    console.log('[Paralegal Plugin] Search result:', result);
  });
}
```

### Critical Detail: Api Access

The `Api` object (ONLYOFFICE document API) is **only available inside `callCommand()`**. Attempting to use it directly in the plugin context results in `ReferenceError: Api is not defined`.

```javascript
// ❌ WRONG - Api is not defined in plugin context
function handleSearchAndSelect(text) {
  var doc = Api.GetDocument(); // ReferenceError!
}

// ✅ CORRECT - Api is available inside callCommand
function handleSearchAndSelect(text) {
  Asc.scope.searchText = text;
  window.Asc.plugin.callCommand(function() {
    var doc = Api.GetDocument(); // Works!
  });
}
```

### Deployment Note: Gzipped Files

OnlyOffice may serve gzipped versions of plugin files. After editing `code.js`, you must also update `code.js.gz`:

```bash
cd onlyoffice-plugin/paralegal/scripts
gzip -kf code.js
```

Or remove the .gz file and restart the container:
```bash
rm code.js.gz
docker restart onlyoffice-docs
```

---

## Files Changed

- `frontend/public/editor.html` (modified `searchAndSelect` function)
- `onlyoffice-plugin/paralegal/scripts/code.js` (added message listener + callCommand)
- `onlyoffice-plugin/paralegal/scripts/code.js.gz` (regenerated)

---

## Console Log Comparison

### Before Fix (Not Working)
```
[IFRAME] Setting search command on window: CALIFORINA
[Paralegal Plugin] Initialized - starting command polling
// No "Received command" log - plugin never sees the command
```

### After Fix (Working)
```
[IFRAME] Broadcasting search via postMessage: CALIFORINA
[IFRAME] Posted to child iframe 0
[Paralegal Plugin] Received postMessage: {type: 'PARALEGAL_SEARCH', text: 'CALIFORINA', ...}
[Paralegal Plugin] Processing search from postMessage: CALIFORINA
[Paralegal Plugin] Searching for: CALIFORINA
[Paralegal Plugin] Found 1 matches (case-sensitive: true)
```

---

## Lessons Learned

1. **Cross-origin restrictions are strict** - Cannot access window properties, localStorage, or DOM across different origins (even different ports on localhost)

2. **postMessage works across origins** - It's the standard mechanism for cross-origin iframe communication

3. **ONLYOFFICE plugins run in isolated context** - The `Api` object is only available inside `callCommand()`, not in the regular plugin scope

4. **Use `Asc.scope` to pass data into callCommand** - Since callCommand runs in an isolated context, you can't use closure variables

5. **Check for gzipped files** - OnlyOffice serves `.gz` versions of plugin files which must be updated when source changes

6. **Verbose logging is essential** - Adding logs at each step of the communication chain helped identify exactly where the flow was breaking

---

## References

- postMessage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- ONLYOFFICE Plugin Tutorial: https://api.onlyoffice.com/plugin/basic
- ONLYOFFICE callCommand: https://api.onlyoffice.com/plugin/callcommand
- Same-Origin Policy: https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy

