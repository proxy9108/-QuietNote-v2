/**
 * QuietNote Settings Page Script
 * Handles settings management and security configuration
 */

class SettingsManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    try {
      // Load current settings
      await this.loadSettings();

      // Attach event listeners
      this.attachEventListeners();

      // Load initial UI state
      this.updateUI();
    } catch (error) {
      console.error('Failed to initialize settings:', error);
    }
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
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

  async loadSettings() {
    try {
      const response = await this.sendMessage({
        type: 'GET_SETTINGS'
      });
      this.settings = response?.settings || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  getDefaultSettings() {
    return {
      encryptionEnabled: true,
      securityLevel: 'full',
      autoLockTime: 300,
      theme: 'light',
      accentColor: '#667eea',
      fontSize: 14,
      enablePageNotes: true,
      enablePersonalNotes: true,
      enableAutoSave: true,
      compactMode: false
    };
  }

  attachEventListeners() {
    // Security Settings
    const encryptToggle = document.getElementById('encryption-toggle');
    if (encryptToggle) {
      encryptToggle.addEventListener('change', () => this.updateSetting('encryptionEnabled', encryptToggle.checked));
    }

    // Security Level
    const securityLevels = document.querySelectorAll('input[name="security-level"]');
    securityLevels.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) {
          this.updateSetting('securityLevel', input.value);
        }
      });
    });

    // Auto-lock Time
    const autoLockInput = document.getElementById('auto-lock-time');
    if (autoLockInput) {
      autoLockInput.addEventListener('change', () => {
        this.updateSetting('autoLockTime', parseInt(autoLockInput.value));
      });
    }

    // Theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        this.updateSetting('theme', themeSelect.value);
        this.applyTheme(themeSelect.value);
      });
    }

    // Accent Color
    const colorButtons = document.querySelectorAll('.color-option');
    colorButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        this.updateSetting('accentColor', color);
        this.updateColorSelection(color);
      });
    });

    // Font Size
    const fontSizeInput = document.getElementById('font-size');
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', () => {
        this.updateSetting('fontSize', parseInt(fontSizeInput.value));
        this.applyFontSize(parseInt(fontSizeInput.value));
      });
    }

    // Feature Toggles
    const enablePageNotes = document.getElementById('enable-page-notes');
    if (enablePageNotes) {
      enablePageNotes.addEventListener('change', () => {
        this.updateSetting('enablePageNotes', enablePageNotes.checked);
      });
    }

    const enablePersonalNotes = document.getElementById('enable-personal-notes');
    if (enablePersonalNotes) {
      enablePersonalNotes.addEventListener('change', () => {
        this.updateSetting('enablePersonalNotes', enablePersonalNotes.checked);
      });
    }

    const enableAutoSave = document.getElementById('enable-auto-save');
    if (enableAutoSave) {
      enableAutoSave.addEventListener('change', () => {
        this.updateSetting('enableAutoSave', enableAutoSave.checked);
      });
    }

    const compactMode = document.getElementById('compact-mode');
    if (compactMode) {
      compactMode.addEventListener('change', () => {
        this.updateSetting('compactMode', compactMode.checked);
      });
    }

    // PIN Management
    const setupPinBtn = document.getElementById('setup-pin-btn');
    if (setupPinBtn) {
      setupPinBtn.addEventListener('click', () => this.showPINSetup());
    }

    const changePinBtn = document.getElementById('change-pin-btn');
    if (changePinBtn) {
      changePinBtn.addEventListener('click', () => this.showPINChange());
    }

    // Export/Import
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportNotes());
    }

    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => this.importNotes(e));
        input.click();
      });
    }

    // About
    const versionElement = document.getElementById('version');
    if (versionElement) {
      const manifest = chrome.runtime.getManifest();
      versionElement.textContent = manifest.version;
    }

    const githubLink = document.getElementById('github-link');
    if (githubLink) {
      githubLink.addEventListener('click', () => {
        chrome.tabs.create({
          url: 'https://github.com/proxy9108/-QuietNote-v2'
        });
      });
    }

    // Save feedback
    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) {
      saveIndicator.style.display = 'none';
    }
  }

  async updateSetting(key, value) {
    try {
      this.settings[key] = value;
      await this.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: this.settings
      });

      this.showSaveIndicator();
    } catch (error) {
      console.error('Failed to save setting:', error);
      alert('Error saving setting: ' + error.message);
    }
  }

  updateUI() {
    // Encryption
    const encryptToggle = document.getElementById('encryption-toggle');
    if (encryptToggle) {
      encryptToggle.checked = this.settings.encryptionEnabled;
    }

    // Security Level
    const securityLevel = document.querySelector(`input[name="security-level"][value="${this.settings.securityLevel}"]`);
    if (securityLevel) {
      securityLevel.checked = true;
    }

    // Auto-lock Time
    const autoLockInput = document.getElementById('auto-lock-time');
    if (autoLockInput) {
      autoLockInput.value = this.settings.autoLockTime;
    }

    // Theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = this.settings.theme;
    }

    // Font Size
    const fontSizeInput = document.getElementById('font-size');
    if (fontSizeInput) {
      fontSizeInput.value = this.settings.fontSize;
    }

    // Feature toggles
    const enablePageNotes = document.getElementById('enable-page-notes');
    if (enablePageNotes) {
      enablePageNotes.checked = this.settings.enablePageNotes;
    }

    const enablePersonalNotes = document.getElementById('enable-personal-notes');
    if (enablePersonalNotes) {
      enablePersonalNotes.checked = this.settings.enablePersonalNotes;
    }

    const enableAutoSave = document.getElementById('enable-auto-save');
    if (enableAutoSave) {
      enableAutoSave.checked = this.settings.enableAutoSave;
    }

    const compactMode = document.getElementById('compact-mode');
    if (compactMode) {
      compactMode.checked = this.settings.compactMode;
    }

    // Color selection
    this.updateColorSelection(this.settings.accentColor);
  }

  updateColorSelection(color) {
    document.querySelectorAll('.color-option').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.color === color);
    });
  }

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
  }

  applyFontSize(size) {
    document.documentElement.style.fontSize = size + 'px';
  }

  showSaveIndicator() {
    const indicator = document.getElementById('save-indicator');
    if (indicator) {
      indicator.style.display = 'block';
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 2000);
    }
  }

  showPINSetup() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Set Up PIN</h2>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p>Enter a 4-8 digit PIN to protect your notes:</p>
          <input type="password" id="new-pin" class="pin-input" placeholder="Enter PIN" maxlength="8">
          <input type="password" id="confirm-pin" class="pin-input" placeholder="Confirm PIN" maxlength="8">
          <div class="password-strength" id="strength"></div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary setup-pin-confirm">Set PIN</button>
          <button class="btn-secondary modal-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const newPinInput = modal.querySelector('#new-pin');
    const confirmPinInput = modal.querySelector('#confirm-pin');
    const confirmBtn = modal.querySelector('.setup-pin-confirm');
    const cancelBtn = modal.querySelector('.modal-cancel');
    const modalClose = modal.querySelector('.modal-close');

    const closeModal = () => modal.remove();

    cancelBtn.addEventListener('click', closeModal);
    modalClose.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', async () => {
      const pin = newPinInput.value;
      const confirmPin = confirmPinInput.value;

      if (pin !== confirmPin) {
        alert('PINs do not match');
        return;
      }

      if (!/^\d{4,8}$/.test(pin)) {
        alert('PIN must be 4-8 digits');
        return;
      }

      try {
        await this.sendMessage({
          type: 'SET_PIN',
          pin: pin
        });
        alert('PIN set successfully');
        closeModal();
      } catch (error) {
        alert('Error setting PIN: ' + error.message);
      }
    });

    newPinInput.focus();
  }

  showPINChange() {
    this.showPINSetup();
  }

  async exportNotes() {
    try {
      const response = await this.sendMessage({
        type: 'EXPORT_NOTES'
      });

      const data = JSON.stringify(response.notes, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quietnote-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error exporting notes: ' + error.message);
    }
  }

  async importNotes(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const notes = JSON.parse(e.target.result);
        await this.sendMessage({
          type: 'IMPORT_NOTES',
          notes: notes
        });
        alert('Notes imported successfully');
      } catch (error) {
        alert('Error importing notes: ' + error.message);
      }
    };
    reader.readAsText(file);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});
