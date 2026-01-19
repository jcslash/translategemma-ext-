// Popup script for TranslateGemma extension
let statusTimeout;

// Load saved API key
chrome.storage.sync.get(['apiKey'], (result) => {
  if (result.apiKey) {
    document.getElementById('apiKey').value = result.apiKey;
  }
});

// Save API key
document.getElementById('saveKey').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiKey.startsWith('hf_')) {
    showStatus('API key should start with "hf_"', 'error');
    return;
  }

  chrome.storage.sync.set({ apiKey }, () => {
    showStatus('API key saved successfully!', 'success');
  });
});

// Translate to Traditional Chinese
document.getElementById('translateToZh').addEventListener('click', async () => {
  await translatePage('en', 'zh-TW');
});

// Translate to English
document.getElementById('translateToEn').addEventListener('click', async () => {
  await translatePage('zh-TW', 'en');
});

// Restore original content
document.getElementById('restoreOriginal').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, {
    action: 'restoreOriginal'
  }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
      return;
    }

    if (response && response.success) {
      showStatus('Original content restored', 'success');
    }
  });
});

async function translatePage(sourceLang, targetLang) {
  // Disable buttons during translation
  disableButtons(true);

  // Check for API key
  const result = await chrome.storage.sync.get(['apiKey']);
  if (!result.apiKey) {
    showStatus('Please set your Hugging Face API key first', 'error');
    disableButtons(false);
    return;
  }

  const direction = targetLang === 'zh-TW' ? 'English → 繁體中文' : '繁體中文 → English';
  showStatus(`Translating to ${direction === 'English → 繁體中文' ? 'Traditional Chinese' : 'English'}...`, 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const startTime = Date.now();

    // Send message to content script to extract text
    chrome.tabs.sendMessage(tab.id, {
      action: 'extractText'
    }, async (response) => {
      if (chrome.runtime.lastError) {
        showStatus('Error: Cannot access this page', 'error');
        disableButtons(false);
        return;
      }

      if (!response || !response.texts || response.texts.length === 0) {
        showStatus('No text found to translate', 'error');
        disableButtons(false);
        return;
      }

      const textCount = response.texts.length;
      showStatus(`Found ${textCount} text elements. Translating...`, 'info');

      // Send to background for translation
      chrome.runtime.sendMessage({
        action: 'translate',
        texts: response.texts,
        sourceLang,
        targetLang,
        apiKey: result.apiKey
      }, (translationResponse) => {
        if (chrome.runtime.lastError) {
          showStatus('Translation error: ' + chrome.runtime.lastError.message, 'error');
          disableButtons(false);
          return;
        }

        if (translationResponse.error) {
          showStatus('Translation failed: ' + translationResponse.error, 'error');
          disableButtons(false);
          return;
        }

        // Send translated texts back to content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'replaceText',
          translations: translationResponse.translations
        }, (replaceResponse) => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

          if (replaceResponse && replaceResponse.success) {
            showStatus(`✓ Translated ${textCount} elements in ${elapsed}s`, 'success');
            showStats(`Speed: ${(textCount / elapsed).toFixed(1)} elements/sec`);
          } else {
            showStatus('Error applying translations', 'error');
          }

          disableButtons(false);
        });
      });
    });
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
    disableButtons(false);
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;

  clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    statusEl.classList.remove('show');
  }, 5000);
}

function showStats(message) {
  const statsEl = document.getElementById('stats');
  statsEl.textContent = message;
  statsEl.className = 'stats show';
}

function disableButtons(disabled) {
  document.getElementById('translateToZh').disabled = disabled;
  document.getElementById('translateToEn').disabled = disabled;
  document.getElementById('restoreOriginal').disabled = disabled;
}
