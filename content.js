// Content script for TranslateGemma extension
// Handles text extraction and replacement in web pages

// Prevent duplicate initialization
if (window.hasOwnProperty('translateGemmaInitialized')) {
  console.log('TranslateGemma content script already initialized');
} else {
  window.translateGemmaInitialized = true;
  console.log('TranslateGemma content script initialized');

  // Store original content for restoration
  const originalContent = new Map();
  let translationIndex = 0;

  // Text nodes that should be translated
  const TEXT_NODE = 3;
  const ELEMENT_NODE = 1;

  // Elements to skip during translation
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT',
    'EMBED', 'CODE', 'PRE', 'SVG', 'CANVAS'
  ]);

  // Attributes to translate
  const TRANSLATE_ATTRIBUTES = [
    'title',
    'alt',
    'placeholder',
    'aria-label'
  ];

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractText') {
      const texts = extractTexts();
      sendResponse({ texts });
    } else if (request.action === 'replaceText') {
      const success = replaceTexts(request.translations);
      sendResponse({ success });
    } else if (request.action === 'restoreOriginal') {
      const success = restoreOriginal();
      sendResponse({ success });
    }
    return true;
  });

  function extractTexts() {
    const texts = [];
    translationIndex = 0;
    originalContent.clear();

    // Extract text from text nodes
    extractTextNodes(document.body, texts);

    // Extract text from attributes
    extractAttributes(document.body, texts);

    return texts;
  }

  function extractTextNodes(node, texts) {
    if (!node) return;

    // Skip certain elements
    if (node.nodeType === ELEMENT_NODE && SKIP_TAGS.has(node.tagName)) {
      return;
    }

    // Skip invisible elements
    if (node.nodeType === ELEMENT_NODE) {
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return;
      }
    }

    if (node.nodeType === TEXT_NODE) {
      const text = node.textContent.trim();

      // Only process meaningful text (more than whitespace)
      if (text.length > 0 && /\S/.test(text)) {
        const index = translationIndex++;

        // Store original content
        originalContent.set(index, {
          type: 'textNode',
          node: node,
          text: node.textContent
        });

        texts.push(text);
      }
    } else if (node.nodeType === ELEMENT_NODE) {
      // Recursively process child nodes
      for (const child of node.childNodes) {
        extractTextNodes(child, texts);
      }
    }
  }

  function extractAttributes(node, texts) {
    if (!node || node.nodeType !== ELEMENT_NODE) return;

    // Skip certain elements
    if (SKIP_TAGS.has(node.tagName)) {
      return;
    }

    // Check translatable attributes
    for (const attr of TRANSLATE_ATTRIBUTES) {
      if (node.hasAttribute(attr)) {
        const value = node.getAttribute(attr).trim();

        if (value.length > 0 && /\S/.test(value)) {
          const index = translationIndex++;

          // Store original content
          originalContent.set(index, {
            type: 'attribute',
            node: node,
            attribute: attr,
            text: value
          });

          texts.push(value);
        }
      }
    }

    // Recursively process child elements
    for (const child of node.children) {
      extractAttributes(child, texts);
    }
  }

  function replaceTexts(translations) {
    try {
      if (!translations || translations.length === 0) {
        return false;
      }

      // Apply translations
      originalContent.forEach((original, index) => {
        if (index >= translations.length) return;

        const translation = translations[index];

        if (!translation || translation === original.text) {
          return;  // Skip if no translation or unchanged
        }

        try {
          if (original.type === 'textNode') {
            // Replace text node content
            if (original.node && original.node.parentNode) {
              original.node.textContent = translation;
            }
          } else if (original.type === 'attribute') {
            // Replace attribute value
            if (original.node) {
              original.node.setAttribute(original.attribute, translation);
            }
          }
        } catch (error) {
          console.error('Error applying translation at index', index, error);
        }
      });

      return true;
    } catch (error) {
      console.error('Error replacing texts:', error);
      return false;
    }
  }

  function restoreOriginal() {
    try {
      originalContent.forEach((original) => {
        try {
          if (original.type === 'textNode') {
            if (original.node && original.node.parentNode) {
              original.node.textContent = original.text;
            }
          } else if (original.type === 'attribute') {
            if (original.node) {
              original.node.setAttribute(original.attribute, original.text);
            }
          }
        } catch (error) {
          console.error('Error restoring original content:', error);
        }
      });

      originalContent.clear();
      translationIndex = 0;

      return true;
    } catch (error) {
      console.error('Error restoring original:', error);
      return false;
    }
  }

  // Optional: Add visual indicator when translation is active
  function addTranslationIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'translategemma-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(102, 126, 234, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    indicator.textContent = '🌐 TranslateGemma Active';
    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }
}
