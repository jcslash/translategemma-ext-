// Background service worker for TranslateGemma extension
// Handles API calls to Hugging Face TranslateGemma 4B model

const HUGGINGFACE_API_URL = 'https://router.huggingface.co/hf-inference/models/google/translategemma-4b-it';

// Model-specific configuration for TranslateGemma
const MODEL_CONFIG = {
  max_new_tokens: 512,
  temperature: 0.1,  // Lower temperature for more consistent translations
  do_sample: false,   // Disable sampling for deterministic output
  repetition_penalty: 1.2
};

// Batch configuration for speed optimization
const BATCH_SIZE = 10;  // Process multiple texts in parallel
const MAX_CONCURRENT_REQUESTS = 5;  // Limit concurrent API calls

// Listen for translation requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request, sendResponse);
    return true;  // Keep message channel open for async response
  }
});

async function handleTranslation(request, sendResponse) {
  const { texts, sourceLang, targetLang, apiKey } = request;

  try {
    // Translate texts in batches for speed
    const translations = await translateBatch(texts, sourceLang, targetLang, apiKey);
    sendResponse({ translations });
  } catch (error) {
    console.error('Translation error:', error);
    sendResponse({ error: error.message });
  }
}

async function translateBatch(texts, sourceLang, targetLang, apiKey) {
  const translations = new Array(texts.length);
  const batches = [];

  // Split into batches for parallel processing
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  // Process batches with concurrency limit
  let batchIndex = 0;
  const activeTasks = [];

  while (batchIndex < batches.length || activeTasks.length > 0) {
    // Start new tasks up to concurrency limit
    while (activeTasks.length < MAX_CONCURRENT_REQUESTS && batchIndex < batches.length) {
      const currentBatchIndex = batchIndex;
      const batch = batches[batchIndex];
      const baseIndex = currentBatchIndex * BATCH_SIZE;

      const task = (async () => {
        const batchTranslations = await Promise.all(
          batch.map((text, idx) =>
            translateText(text, sourceLang, targetLang, apiKey)
              .then(translation => ({ index: baseIndex + idx, translation }))
              .catch(error => {
                console.error(`Error translating text ${baseIndex + idx}:`, error);
                return { index: baseIndex + idx, translation: text };  // Fallback to original
              })
          )
        );

        // Store results
        batchTranslations.forEach(({ index, translation }) => {
          translations[index] = translation;
        });
      })();

      activeTasks.push(task);
      batchIndex++;
    }

    // Wait for at least one task to complete
    if (activeTasks.length > 0) {
      await Promise.race(activeTasks);
      // Remove completed tasks
      for (let i = activeTasks.length - 1; i >= 0; i--) {
        const task = activeTasks[i];
        const isResolved = await Promise.race([
          task.then(() => true),
          Promise.resolve(false)
        ]);
        if (isResolved) {
          activeTasks.splice(i, 1);
        }
      }
    }
  }

  return translations;
}

async function translateText(text, sourceLang, targetLang, apiKey) {
  // Skip empty or whitespace-only text
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Skip very short texts (likely not meaningful content)
  if (text.trim().length < 3) {
    return text;
  }

  // Build the messages for TranslateGemma chat format
  const messages = buildTranslateMessages(text, sourceLang, targetLang);

  try {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          text: messages
        },
        parameters: {
          max_new_tokens: 200
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    // Extract translation from model output
    const translation = extractTranslation(result, text);
    return translation;

  } catch (error) {
    console.error('Translation API error:', error);
    throw error;
  }
}

function buildTranslateMessages(text, sourceLang, targetLang) {
  // TranslateGemma uses chat format with ISO language codes
  const langMap = {
    'en': 'en',
    'zh-TW': 'zh-Hant'
  };

  const sourceCode = langMap[sourceLang] || 'en';
  const targetCode = langMap[targetLang] || 'zh-Hant';

  // Use the TranslateGemma chat template format
  return [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "source_lang_code": sourceCode,
          "target_lang_code": targetCode,
          "text": text
        }
      ]
    }
  ];
}

function extractTranslation(apiResult, originalText) {
  try {
    // Handle array response format
    if (Array.isArray(apiResult) && apiResult.length > 0) {
      const firstResult = apiResult[0];

      // Try different response formats
      if (firstResult.generated_text) {
        // Format 1: generated_text array (chat format)
        if (Array.isArray(firstResult.generated_text)) {
          // Find the assistant's response
          for (const message of firstResult.generated_text) {
            if (message.role === 'assistant' && message.content) {
              return message.content.trim();
            }
          }
          // If no assistant role, take the last message content
          const lastMessage = firstResult.generated_text[firstResult.generated_text.length - 1];
          if (lastMessage && lastMessage.content) {
            return lastMessage.content.trim();
          }
        } else if (typeof firstResult.generated_text === 'string') {
          // Format 2: generated_text string
          return firstResult.generated_text.trim();
        }
      }

      // Format 3: translation_text field
      if (firstResult.translation_text) {
        return firstResult.translation_text.trim();
      }

      // Format 4: direct content field
      if (firstResult.content) {
        return firstResult.content.trim();
      }
    }

    // Single object response
    if (apiResult && typeof apiResult === 'object') {
      if (apiResult.generated_text) {
        return apiResult.generated_text.trim();
      }
      if (apiResult.translation_text) {
        return apiResult.translation_text.trim();
      }
      if (apiResult.content) {
        return apiResult.content.trim();
      }
    }

    // Fallback to original text if extraction fails
    console.warn('Could not extract translation, using original text');
    return originalText;

  } catch (error) {
    console.error('Error extracting translation:', error);
    return originalText;
  }
}

// Model warm-up on installation (optional, for faster first request)
chrome.runtime.onInstalled.addListener(() => {
  console.log('TranslateGemma extension installed');
});
