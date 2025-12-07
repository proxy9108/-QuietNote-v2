/**
 * QuietNote Content Script
 * Runs on every webpage to inject the notes UI
 * Communicates with background worker for encryption/decryption
 */

// Store reference to injected UI
let quietNoteUI = null;
let isUIVisible = false;
const PAGE_URL = window.location.href;

/**
 * Send message to background worker with timeout
 */
function sendBackgroundMessage(message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Background message timeout'));
    }, timeout);

    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Create and inject the floating button
 */
function injectFloatingButton() {
  // Don't inject on special pages
  if (
    PAGE_URL.startsWith('chrome://') ||
    PAGE_URL.startsWith('about:') ||
    PAGE_URL.startsWith('chrome-extension://')
  ) {
    return;
  }

  // Check if already injected
  if (document.getElementById('quietnote-floating-btn')) {
    return;
  }

  // Create button container
  const button = document.createElement('div');
  button.id = 'quietnote-floating-btn';
  button.className = 'quietnote-btn';
  button.title = 'QuietNote - Click to add note (Ctrl+Shift+N)';
  button.innerHTML = '📝';

  // Inject stylesheet
  if (!document.getElementById('quietnote-content-styles')) {
    const link = document.createElement('link');
    link.id = 'quietnote-content-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles/content.css');
    document.head.appendChild(link);
  }

  // Button click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const response = await sendBackgroundMessage({
        type: 'CHECK_LOCK_STATUS'
      });

      if (response?.locked) {
        // Show PIN modal
        showPINModal(async (pin) => {
          try {
            const unlockResponse = await sendBackgroundMessage({
              type: 'UNLOCK',
              pin: pin
            });
            if (unlockResponse?.success) {
              showNoteEditor();
            } else {
              showNotification('Invalid PIN', 'error');
            }
          } catch (error) {
            showNotification('Error unlocking notes', 'error');
          }
        });
      } else {
        showNoteEditor();
      }
    } catch (error) {
      showNotification('Error accessing notes', 'error');
    }
  });

  // Drag functionality
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  button.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - button.offsetLeft;
    startY = e.clientY - button.offsetTop;
    button.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    button.style.left = (e.clientX - startX) + 'px';
    button.style.top = (e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    button.style.cursor = 'grab';
    // Save position
    const pos = {
      left: button.offsetLeft,
      top: button.offsetTop
    };
    chrome.storage.local.set({
      'quietnote-btn-position': pos
    });
  });

  document.body.appendChild(button);

  // Restore button position
  chrome.storage.local.get(['quietnote-btn-position'], (result) => {
    if (result['quietnote-btn-position']) {
      const pos = result['quietnote-btn-position'];
      button.style.left = pos.left + 'px';
      button.style.top = pos.top + 'px';
    }
  });
}

/**
 * Show note editor for current page
 */
async function showNoteEditor() {
  try {
    // Get current page note
    const response = await sendBackgroundMessage({
      type: 'GET_PAGE_NOTE',
      url: PAGE_URL
    });

    const note = response?.note || '';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'quietnote-modal';
    modal.innerHTML = `
      <div class="quietnote-modal-content">
        <div class="quietnote-modal-header">
          <h2>📝 Page Note</h2>
          <button class="quietnote-close-btn" aria-label="Close">✕</button>
        </div>
        <textarea class="quietnote-textarea" placeholder="Add a note for this page...">${escapeHtml(note)}</textarea>
        <div class="quietnote-modal-footer">
          <button class="quietnote-btn-save">Save</button>
          <button class="quietnote-btn-delete">Delete</button>
          <button class="quietnote-btn-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event handlers
    const closeBtn = modal.querySelector('.quietnote-close-btn');
    const cancelBtn = modal.querySelector('.quietnote-btn-cancel');
    const saveBtn = modal.querySelector('.quietnote-btn-save');
    const deleteBtn = modal.querySelector('.quietnote-btn-delete');
    const textarea = modal.querySelector('.quietnote-textarea');

    const closeModal = () => {
      modal.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', async () => {
      try {
        const content = textarea.value;
        await sendBackgroundMessage({
          type: 'SAVE_PAGE_NOTE',
          url: PAGE_URL,
          content: content
        });
        showNotification('Note saved', 'success');
        closeModal();
      } catch (error) {
        showNotification('Error saving note', 'error');
      }
    });

    deleteBtn.addEventListener('click', async () => {
      if (confirm('Delete this note?')) {
        try {
          await sendBackgroundMessage({
            type: 'DELETE_PAGE_NOTE',
            url: PAGE_URL
          });
          showNotification('Note deleted', 'success');
          closeModal();
        } catch (error) {
          showNotification('Error deleting note', 'error');
        }
      }
    });

    // Auto-focus textarea
    setTimeout(() => textarea.focus(), 100);

  } catch (error) {
    showNotification('Error loading note', 'error');
  }
}

/**
 * Show PIN modal for unlocking
 */
function showPINModal(callback) {
  const modal = document.createElement('div');
  modal.className = 'quietnote-modal quietnote-pin-modal';
  modal.innerHTML = `
    <div class="quietnote-modal-content quietnote-pin-content">
      <div class="quietnote-modal-header">
        <h2>🔒 Unlock Notes</h2>
      </div>
      <p class="quietnote-pin-prompt">Enter your PIN</p>
      <input type="password" class="quietnote-pin-input" maxlength="8" placeholder="••••" />
      <div class="quietnote-modal-footer">
        <button class="quietnote-btn-unlock">Unlock</button>
        <button class="quietnote-btn-cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const pinInput = modal.querySelector('.quietnote-pin-input');
  const unlockBtn = modal.querySelector('.quietnote-btn-unlock');
  const cancelBtn = modal.querySelector('.quietnote-btn-cancel');

  const closeModal = () => modal.remove();

  unlockBtn.addEventListener('click', () => {
    const pin = pinInput.value;
    closeModal();
    callback(pin);
  });

  cancelBtn.addEventListener('click', closeModal);

  pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      unlockBtn.click();
    }
  });

  setTimeout(() => pinInput.focus(), 100);
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `quietnote-notification quietnote-notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('quietnote-show');
  }, 10);

  setTimeout(() => {
    notification.classList.remove('quietnote-show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handle keyboard shortcuts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'KEYBOARD_SHORTCUT') {
    switch (request.command) {
      case 'new-page-note':
        showNoteEditor();
        break;
      case 'open-vault':
        chrome.runtime.sendMessage({ type: 'OPEN_VAULT' });
        break;
      case 'lock-now':
        chrome.runtime.sendMessage({ type: 'LOCK_NOW' });
        break;
      case 'toggle-sidebar':
        // Toggle sidebar visibility if implemented
        break;
    }
    sendResponse({ success: true });
  }
});

/**
 * Initialize content script
 */
function init() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => injectFloatingButton(), 100);
    });
  } else {
    setTimeout(() => injectFloatingButton(), 100);
  }

  // Check settings to see if injection is enabled
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || {};
    if (settings.enablePageNotes === false) {
      // Skip injection if disabled
      return;
    }
  });
}

// Start the content script
init();
