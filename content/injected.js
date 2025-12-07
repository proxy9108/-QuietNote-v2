/**
 * QuietNote Injected Script
 * Runs in page context (not in content script sandbox)
 * Used for accessing window object and page-specific functionality
 */

(function() {
  'use strict';

  // Listen for messages from content script
  window.addEventListener('message', function(event) {
    // Only accept messages from ourselves
    if (event.source !== window) return;

    if (event.data.type && event.data.type === 'QUIETNOTE_PAGE_ACTION') {
      // Handle page-specific actions
      const action = event.data.action;

      switch (action) {
        case 'GET_PAGE_SELECTION':
          // Get currently selected text on page
          const selection = window.getSelection().toString();
          window.postMessage({
            type: 'QUIETNOTE_PAGE_ACTION_RESPONSE',
            action: 'GET_PAGE_SELECTION',
            data: selection
          }, '*');
          break;

        case 'HIGHLIGHT_TEXT':
          // Highlight text on page if needed
          if (event.data.text) {
            const found = window.find(event.data.text);
            window.postMessage({
              type: 'QUIETNOTE_PAGE_ACTION_RESPONSE',
              action: 'HIGHLIGHT_TEXT',
              data: found
            }, '*');
          }
          break;

        case 'GET_PAGE_METADATA':
          // Get page title and meta info
          const metadata = {
            title: document.title,
            url: window.location.href,
            description: document.querySelector('meta[name="description"]')?.content || '',
            favicon: document.querySelector('link[rel="icon"]')?.href || ''
          };
          window.postMessage({
            type: 'QUIETNOTE_PAGE_ACTION_RESPONSE',
            action: 'GET_PAGE_METADATA',
            data: metadata
          }, '*');
          break;
      }
    }
  });

  // Signal that injected script is loaded
  window.postMessage({
    type: 'QUIETNOTE_INJECTED_READY'
  }, '*');
})();
