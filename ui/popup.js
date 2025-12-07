/**
 * QuietNote Popup Script
 * Handles UI interactions and state management
 */

class PopupManager {
  constructor() {
    this.isLocked = true;
    this.notes = [];
    this.currentEditingNoteId = null;
    this.lockTimer = null;
    this.init();
  }

  async init() {
    try {
      // Request initial state from background worker
      const response = await this.sendMessage({ type: 'GET_POPUP_STATE' });
      this.isLocked = response?.locked ?? true;
      this.notes = response?.notes ?? [];

      // Update UI
      this.updateLockStatus();
      this.attachEventListeners();
      this.loadNotes();

      // Start lock timer if unlocked
      if (!this.isLocked) {
        this.startLockTimer();
      }
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showLoadingState(false);
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Background message timeout'));
      }, 5000);

      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  attachEventListeners() {
    // Lock/Unlock buttons
    const unlockBtn = document.querySelector('.unlock-btn');
    unlockBtn?.addEventListener('click', () => this.showUnlockForm());

    const lockBtn = document.querySelector('.lock-btn');
    lockBtn?.addEventListener('click', () => this.lock());

    // Unlock form
    const unlockForm = document.getElementById('unlock-form');
    const pinInput = document.getElementById('pin-input');
    const unlockFormBtn = unlockForm?.querySelector('.btn-primary');
    const cancelBtn = unlockForm?.querySelector('.btn-secondary');

    unlockFormBtn?.addEventListener('click', () => this.unlock(pinInput.value));
    cancelBtn?.addEventListener('click', () => this.hideUnlockForm());
    pinInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.unlock(pinInput.value);
      }
    });

    // Settings button
    const settingsBtn = document.querySelector('.settings-btn');
    settingsBtn?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // New note button
    document.querySelector('.new-note-btn')?.addEventListener('click', () => {
      this.showNoteEditor(null);
    });

    // Note editor
    const modalClose = document.querySelector('.modal-close');
    const cancelBtn2 = document.querySelector('.cancel-btn');
    const saveBtn = document.querySelector('.save-note-btn');

    modalClose?.addEventListener('click', () => this.hideNoteEditor());
    cancelBtn2?.addEventListener('click', () => this.hideNoteEditor());
    saveBtn?.addEventListener('click', () => this.saveNote());
  }

  updateLockStatus() {
    const lockStatus = document.getElementById('lock-status');
    const mainContent = document.getElementById('main-content');
    const lockBtn = document.querySelector('.lock-btn');
    const lockTimer = document.getElementById('lock-timer');

    if (this.isLocked) {
      lockStatus.classList.remove('hidden');
      mainContent.classList.add('hidden');
      lockBtn.classList.add('hidden');
      lockTimer.classList.add('hidden');
      lockStatus.classList.add('locked');
      lockStatus.classList.remove('unlocked');
    } else {
      lockStatus.classList.add('hidden');
      mainContent.classList.remove('hidden');
      lockBtn.classList.remove('hidden');
      lockTimer.classList.remove('hidden');
      lockStatus.classList.remove('locked');
      lockStatus.classList.add('unlocked');
    }
  }

  showUnlockForm() {
    const unlockForm = document.getElementById('unlock-form');
    unlockForm.classList.remove('hidden');
    document.getElementById('pin-input').focus();
  }

  hideUnlockForm() {
    const unlockForm = document.getElementById('unlock-form');
    const pinInput = document.getElementById('pin-input');
    unlockForm.classList.add('hidden');
    pinInput.value = '';
  }

  async unlock(pin) {
    try {
      const response = await this.sendMessage({
        type: 'UNLOCK',
        pin: pin
      });

      if (response?.success) {
        this.isLocked = false;
        this.hideUnlockForm();
        this.updateLockStatus();
        this.loadNotes();
        this.startLockTimer();
      } else {
        alert('Invalid PIN. Please try again.');
      }
    } catch (error) {
      alert('Error unlocking notes: ' + error.message);
    }
  }

  async lock() {
    try {
      await this.sendMessage({ type: 'LOCK_NOW' });
      this.isLocked = true;
      this.updateLockStatus();
      this.stopLockTimer();
    } catch (error) {
      console.error('Error locking:', error);
    }
  }

  startLockTimer() {
    const timerElement = document.getElementById('timer-value');
    let remainingTime = 300; // 5 minutes default

    this.lockTimer = setInterval(() => {
      remainingTime--;
      if (timerElement) {
        timerElement.textContent = remainingTime;
      }

      if (remainingTime <= 0) {
        this.lock();
      }
    }, 1000);
  }

  stopLockTimer() {
    if (this.lockTimer) {
      clearInterval(this.lockTimer);
      this.lockTimer = null;
    }
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach((tab) => {
      tab.classList.toggle('active', tab.id === tabName + '-tab');
      tab.classList.toggle('hidden', tab.id !== tabName + '-tab');
    });

    // Load content for the tab
    if (tabName === 'vault') {
      this.loadVaultNotes();
    } else if (tabName === 'recent') {
      this.loadRecentNotes();
    } else if (tabName === 'pages') {
      this.loadPageNotes();
    }
  }

  async loadNotes() {
    try {
      const response = await this.sendMessage({
        type: 'GET_ALL_NOTES'
      });
      this.notes = response?.notes ?? [];
      this.updateNotesCount();
      this.loadVaultNotes();
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  async loadVaultNotes() {
    const container = document.getElementById('vault-notes');
    const vaultNotes = this.notes.filter((note) => note.type === 'personal');

    if (vaultNotes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>No personal notes yet</p>
          <p class="empty-hint">Create your first note to get started</p>
        </div>
      `;
      return;
    }

    container.innerHTML = vaultNotes
      .map((note) => this.createNoteElement(note))
      .join('');

    this.attachNoteListeners(container);
  }

  async loadRecentNotes() {
    const container = document.getElementById('recent-notes');
    const recentNotes = this.notes.sort(
      (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
    );

    if (recentNotes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📌</div>
          <p>No recent notes</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recentNotes
      .slice(0, 10)
      .map((note) => this.createNoteElement(note))
      .join('');

    this.attachNoteListeners(container);
  }

  async loadPageNotes() {
    const container = document.getElementById('pages-list');

    try {
      // Get current page URL
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      const pageNotes = this.notes.filter(
        (note) => note.type === 'page' && note.url === tab.url
      );

      if (pageNotes.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🌐</div>
            <p>No notes for this page</p>
            <p class="empty-hint">Create a note using the button on the page</p>
          </div>
        `;
        return;
      }

      container.innerHTML = pageNotes
        .map((note) => this.createNoteElement(note))
        .join('');

      this.attachNoteListeners(container);
    } catch (error) {
      console.error('Failed to load page notes:', error);
    }
  }

  createNoteElement(note) {
    const preview = note.content.substring(0, 100);
    const ellipsis = note.content.length > 100 ? '...' : '';
    return `
      <div class="note-item" data-id="${note.id}">
        <div class="note-preview">${this.escapeHtml(preview)}${ellipsis}</div>
        <div class="note-meta">
          <small>${new Date(note.updated_at).toLocaleDateString()}</small>
        </div>
        <div class="note-actions">
          <button class="note-edit-btn" data-id="${note.id}">✎</button>
          <button class="note-delete-btn" data-id="${note.id}">✕</button>
        </div>
      </div>
    `;
  }

  attachNoteListeners(container) {
    container.querySelectorAll('.note-edit-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteId = btn.dataset.id;
        const note = this.notes.find((n) => n.id === noteId);
        this.showNoteEditor(note);
      });
    });

    container.querySelectorAll('.note-delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const noteId = btn.dataset.id;
        if (confirm('Delete this note?')) {
          try {
            await this.sendMessage({
              type: 'DELETE_NOTE',
              id: noteId
            });
            this.loadNotes();
          } catch (error) {
            alert('Error deleting note: ' + error.message);
          }
        }
      });
    });
  }

  showNoteEditor(note) {
    const modal = document.getElementById('note-editor-modal');
    const title = document.getElementById('editor-title');
    const textarea = document.getElementById('note-textarea');

    this.currentEditingNoteId = note?.id ?? null;
    title.textContent = note ? 'Edit Note' : 'New Note';
    textarea.value = note?.content ?? '';

    modal.classList.remove('hidden');
    textarea.focus();
  }

  hideNoteEditor() {
    const modal = document.getElementById('note-editor-modal');
    const textarea = document.getElementById('note-textarea');
    modal.classList.add('hidden');
    textarea.value = '';
    this.currentEditingNoteId = null;
  }

  async saveNote() {
    const textarea = document.getElementById('note-textarea');
    const content = textarea.value.trim();

    if (!content) {
      alert('Note cannot be empty');
      return;
    }

    try {
      await this.sendMessage({
        type: 'SAVE_NOTE',
        id: this.currentEditingNoteId,
        content: content
      });

      this.hideNoteEditor();
      this.loadNotes();
    } catch (error) {
      alert('Error saving note: ' + error.message);
    }
  }

  updateNotesCount() {
    const count = this.notes.length;
    const element = document.getElementById('notes-count');
    if (element) {
      element.textContent = `${count} note${count !== 1 ? 's' : ''}`;
    }
  }

  showLoadingState(show = true) {
    const loading = document.getElementById('loading-state');
    if (show) {
      loading?.classList.remove('hidden');
    } else {
      loading?.classList.add('hidden');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
