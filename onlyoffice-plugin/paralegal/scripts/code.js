/**
 * Paralegal OnlyOffice Plugin
 * 
 * Polls for search commands from the parent application.
 * The command is set on a window property in the iframe chain.
 * 
 * Flow:
 * 1. React app triggers editor.html to set window.paralegalSearchCommand
 * 2. Plugin polls by traversing up the iframe chain
 * 3. Plugin executes the search command and clears it
 */

(function(window, undefined) {
  var lastProcessedTimestamp = 0;
  var pollInterval = null;
  
  window.Asc.plugin.init = function(data) {
    console.log('[Paralegal Plugin] Initialized - starting command polling and message listener');
    
    // Listen for postMessage from parent frames (cross-origin communication)
    window.addEventListener('message', function(event) {
      console.log('[Paralegal Plugin] Received postMessage:', event.data);
      if (event.data && event.data.type === 'PARALEGAL_SEARCH' && event.data.text) {
        console.log('[Paralegal Plugin] Processing search from postMessage:', event.data.text);
        handleSearchAndSelect(event.data.text);
      }
    }, false);
    
    // Keep polling as backup for same-origin scenarios
    pollInterval = setInterval(checkForCommands, 300);
  };
  
  /**
   * Find the window that has the paralegalSearchCommand property
   * by traversing up the iframe chain
   */
  function findCommandWindow() {
    var current = window;
    var maxDepth = 10; // Prevent infinite loops
    var depth = 0;
    
    while (depth < maxDepth) {
      try {
        // Check current window
        if (current.paralegalSearchCommand) {
          return current;
        }
        
        // Try parent
        if (current.parent && current.parent !== current) {
          current = current.parent;
          depth++;
        } else {
          break;
        }
      } catch (e) {
        // Cross-origin access denied, try a different approach
        break;
      }
    }
    
    // Also check top window directly
    try {
      if (window.top && window.top.paralegalSearchCommand) {
        return window.top;
      }
    } catch (e) {
      // Cross-origin
    }
    
    return null;
  }
  
  /**
   * Check for new commands from the React app
   */
  function checkForCommands() {
    try {
      var cmdWindow = findCommandWindow();
      if (!cmdWindow || !cmdWindow.paralegalSearchCommand) return;
      
      var command = cmdWindow.paralegalSearchCommand;
      
      // Skip if we already processed this command (based on timestamp)
      if (!command.timestamp || command.timestamp <= lastProcessedTimestamp) return;
      
      lastProcessedTimestamp = command.timestamp;
      console.log('[Paralegal Plugin] Received command:', command);
      
      // Clear the command to prevent re-processing
      cmdWindow.paralegalSearchCommand = null;
      
      if (command.type === 'searchAndSelect' && command.text) {
        handleSearchAndSelect(command.text);
      }
      
    } catch (e) {
      // Silently ignore cross-origin errors during polling
      if (e.name !== 'SecurityError') {
        console.error('[Paralegal Plugin] Error checking commands:', e);
      }
    }
  }
  
  /**
   * Search for text in the document and select the first occurrence.
   * This will scroll the document to show the selected text.
   * Uses callCommand to access the Api object in the proper context.
   */
  function handleSearchAndSelect(searchText) {
    console.log('[Paralegal Plugin] Searching for:', searchText);
    
    // Pass data to the command via Asc.scope (callCommand runs in isolated context)
    Asc.scope.searchText = searchText;
    
    window.Asc.plugin.callCommand(function() {
      var searchText = Asc.scope.searchText;
      var oDocument = Api.GetDocument();
      
      if (!oDocument) {
        return { error: 'Could not get document API' };
      }
      
      // Search for the text (second param: true = case sensitive)
      var aSearchResults = oDocument.Search(searchText, true);
      
      if (aSearchResults && aSearchResults.length > 0) {
        // Select the first result - this also scrolls to it
        aSearchResults[0].Select();
        return { found: aSearchResults.length, caseSensitive: true };
      } else {
        // Try case-insensitive search as fallback
        aSearchResults = oDocument.Search(searchText, false);
        if (aSearchResults && aSearchResults.length > 0) {
          aSearchResults[0].Select();
          return { found: aSearchResults.length, caseSensitive: false };
        }
      }
      
      return { found: 0 };
    }, false, false, function(result) {
      if (result && result.error) {
        console.error('[Paralegal Plugin] Search error:', result.error);
      } else if (result && result.found > 0) {
        console.log('[Paralegal Plugin] Found', result.found, 'matches (case-sensitive:', result.caseSensitive + ')');
      } else {
        console.log('[Paralegal Plugin] No matches found for:', searchText);
      }
    });
  }

  /**
   * Handle button clicks (cleanup when plugin closes)
   */
  window.Asc.plugin.button = function(id) {
    console.log('[Paralegal Plugin] Closing, stopping polling');
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    this.executeCommand("close", "");
  };

})(window);
