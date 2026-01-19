// Background service worker for TranslateGemma extension
// Handles API calls to Hugging Face TranslateGemma 4B model

const HUGGINGFACE_API_URL = 'https://router.huggingface.co/models/google/translategemma-4b-it';

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

  // Build the prompt for TranslateGemma
  const prompt = buildTranslatePrompt(text, sourceLang, targetLang);

  try {
    const response = await fetch(HUGGINGFACE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: MODEL_CONFIG,
        options: {
          use_cache: false,  // Disable cache for faster initial response
          wait_for_model: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
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

function buildTranslatePrompt(text, sourceLang, targetLang) {
  // TranslateGemma uses specific prompt format
  // Format: <source_lang> sentence\n<target_lang>

  const langMap = {
    'en': 'English',
    'zh-TW': 'Traditional Chinese'
  };

  const source = langMap[sourceLang];
  const target = langMap[targetLang];

  // Simple and direct prompt for TranslateGemma
  return `Translate from ${source} to ${target}:\n\n${text}`;
}

function extractTranslation(apiResult, originalText) {
  try {
    if (Array.isArray(apiResult) && apiResult.length > 0) {
      const generatedText = apiResult[0].generated_text || apiResult[0].translation_text;

      if (generatedText) {
        // Clean up the output
        let translation = generatedText;

        // Remove the original prompt if it's repeated
        const promptMarkers = [
          'Translate from',
          'English to Traditional Chinese:',
          'Traditional Chinese to English:',
          originalText
        ];

        for (const marker of promptMarkers) {
          const markerIndex = translation.indexOf(marker);
          if (markerIndex !== -1) {
            translation = translation.substring(markerIndex + marker.length);
          }
        }

        // Clean up whitespace and newlines
        translation = translation.trim();

        // If translation is empty after cleanup, return original
        if (translation.length === 0) {
          return originalText;
        }

        return translation;
      }
    }

    // Fallback to original text if extraction fails
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
