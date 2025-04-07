// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "processSelection") {
    // Either use provided text or get current selection
    let textToProcess = message.text;
    
    if (!textToProcess) {
      // Get current selection from the page
      textToProcess = window.getSelection().toString();
    }
    
    if (!textToProcess || textToProcess.trim().length === 0) {
      console.log("No text selected or provided, attempting to extract main content");
      textToProcess = getMainContent();
      
      if (!textToProcess || textToProcess.trim().length === 0) {
        console.log("Could not extract main content");
        sendResponse({ success: false, error: "No text selected and couldn't extract content" });
        return;
      }
    }
    
    // Calculate statistics
    const stats = calculateEnhancedStats(textToProcess);
    console.log("Calculated enhanced stats:", stats);
    
    // Display the popup
    showEnhancedStatsPopup(stats);
    
    // Respond to the background script
    sendResponse({ success: true });
    return true;
  }
});

// --- Stop Words Set ---
const stopWords = new Set([
  // Articles
  'a', 'an', 'the', 
  // Conjunctions
  'and', 'but', 'or', 'so', 'for', 'nor', 'yet', 
  // Prepositions
  'in', 'on', 'at', 'to', 'from', 'with', 'by', 'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'inside', 'into', 'near', 'off', 'onto', 'out', 'outside', 'over', 'past', 'through', 'throughout', 'under', 'underneath', 'until', 'unto', 'up', 'upon', 'without',
  // Pronouns
  'i', 'me', 'my', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 
  // Auxiliary Verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 
  // Other common words
  'not', 'of', 'no', 'yes', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't' // Common contractions parts
]);

// Function to be injected into the page to extract main content
function getMainContent() {
    // Simple heuristic: find the element with the most direct text content
    // among common main content containers.
    const selectors = [
        'article',
        'main',
        'div[role="main"]',
        'div[class*="content"]',
        'div[class*="post"]',
        'div[id*="content"]',
        'div[id*="main"]',
        'body' // Fallback
    ];
    
    let bestElement = null;
    let maxTextLength = 0;

    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            // Basic visibility check
            if (el.offsetParent === null && selector !== 'body') return;
            
            // Clone node to avoid altering the original page during text calculation
            const clone = el.cloneNode(true);
            
            // Remove script/style tags from clone
            clone.querySelectorAll('script, style, noscript, iframe, header, footer, nav, aside, form, button, input, select, textarea').forEach(e => e.remove());
            
            const text = clone.innerText || clone.textContent || '';
            const textLength = text.trim().length;
            
            // Prefer elements with more direct text, penalize very short ones slightly
            if (textLength > maxTextLength && textLength > 50) { 
                // Basic check: avoid selecting the body if a good candidate was already found within it
                if (selector === 'body' && maxTextLength > 500) {
                    // Already found a likely candidate, don't override with the whole body unless significantly larger
                    if (textLength < maxTextLength * 1.5) return;
                }
                maxTextLength = textLength;
                bestElement = el; // Store the original element
            }
        });
    });

    if (bestElement) {
        console.log('Best element found for extraction:', bestElement.tagName, bestElement.id, bestElement.className);
        // Re-extract text from the original best element after cleaning
         const finalClone = bestElement.cloneNode(true);
         finalClone.querySelectorAll('script, style, noscript, iframe, header, footer, nav, aside, form, button, input, select, textarea').forEach(e => e.remove());
         return finalClone.innerText || finalClone.textContent || '';
    } else {
        console.log('No suitable main content element found.');
        return null;
    }
}

// Helper functions for calculating readability metrics
function countSyllables(word) {
  word = word.toLowerCase();
  // Remove punctuation
  word = word.replace(/[^a-z]/g, '');
  
  if (word.length <= 3) return 1;
  
  // Count vowel clusters as syllables
  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 0;
  
  // Adjust for silent e at the end
  if (word.endsWith('e') && word.length > 3) count--;
  
  // Ensure at least one syllable
  return Math.max(1, count);
}

function countComplexWords(words) {
  return words.filter(word => {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
    return normalized.length > 2 && countSyllables(normalized) >= 3;
  }).length;
}

// Calculate Flesch Reading Ease score
function calculateFleschReadingEase(text, wordCount, sentenceCount) {
  const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  if (wordCount === 0 || sentenceCount === 0) return 0;
  
  // Flesch Reading Ease = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
  const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Calculate Gunning Fog Index
function calculateGunningFog(text, wordCount, sentenceCount) {
  const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
  const complexWordsCount = countComplexWords(words);
  
  if (wordCount === 0 || sentenceCount === 0) return 0;
  
  // Gunning Fox Index = 0.4 * ((words / sentences) + 100 * (complex words / words))
  const score = 0.4 * ((wordCount / sentenceCount) + 100 * (complexWordsCount / wordCount));
  
  return Math.round(score);
}

// Calculate SMOG Grade
function calculateSMOG(text, sentenceCount) {
  const words = text.split(/\s+/).filter(w => w.match(/[a-zA-Z]/));
  const complexWordsCount = countComplexWords(words);
  
  if (sentenceCount < 30) {
    // SMOG is designed for 30+ sentences, for fewer we'll use an approximation
    const adjustedSentenceCount = Math.max(1, sentenceCount);
    const scaleFactor = Math.sqrt(30 / adjustedSentenceCount);
    const adjustedComplexCount = complexWordsCount * scaleFactor;
    return Math.round(1.0430 * Math.sqrt(adjustedComplexCount * (30 / adjustedSentenceCount)) + 3.1291);
  }
  
  // SMOG Grade = 1.0430 * sqrt(30 * (complex words / sentences)) + 3.1291
  const score = 1.0430 * Math.sqrt(complexWordsCount * (30 / sentenceCount)) + 3.1291;
  
  return Math.round(score);
}

// Function to calculate enhanced statistics including readability metrics
function calculateEnhancedStats(text) {
  // Basic word counting
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const charCount = text.length;
  const charNoSpacesCount = text.replace(/\s+/g, '').length;
  const avgWordLength = charNoSpacesCount / wordCount || 0;
  
  // Find longest word
  let longestWord = '';
  let longestWordLength = 0;
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    if (cleanWord.length > longestWordLength) {
      longestWordLength = cleanWord.length;
      longestWord = cleanWord;
    }
  }
  
  // Unique words and word frequency
  const wordMap = {};
  let uniqueWordCount = 0;
  const nonsensicalWords = [];
  
  for (const word of words) {
    const normalized = word.toLowerCase().replace(/[^a-z']/g, '');
    if (normalized.length < 2) continue;
    
    if (!wordMap[normalized]) {
      wordMap[normalized] = 1;
      uniqueWordCount++;
      
      // Check if potentially nonsensical (not in stopwords and length > 2)
      if (!stopWords.has(normalized) && normalized.length > 3) {
        // Basic pattern check for random character sequences
        const hasRepeatedPattern = /([a-z])\1{2,}/.test(normalized); // 3+ repeated chars
        const hasNoVowels = !/[aeiouy]/i.test(normalized);
        const hasTooManyConsonants = normalized.replace(/[aeiouy]/gi, '').length > 6;
        
        if (hasRepeatedPattern || hasNoVowels || hasTooManyConsonants) {
          nonsensicalWords.push(normalized);
        }
      }
    } else {
      wordMap[normalized]++;
    }
  }
  
  // Get top 5 most frequent words
  const sortedWords = Object.entries(wordMap)
    .filter(([word]) => !stopWords.has(word) && word.length > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  // Format as word: count
  const topWords = sortedWords
    .map(([word, count]) => `${word}: ${count}`)
    .join(', ');
  
  // Sentences (basic split by terminal punctuation followed by space or end)
  const sentences = text.split(/[.!?](?=[\s]|$)/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = wordCount / sentenceCount || 0;
  
  // Paragraphs (split by double newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length;
  
  // Readability scores
  const fleschScore = calculateFleschReadingEase(text, wordCount, sentenceCount);
  const gunningFogScore = calculateGunningFog(text, wordCount, sentenceCount);
  const smogScore = calculateSMOG(text, sentenceCount);
  
  // Interpret readability scores
  let fleschInterpretation = "";
  if (fleschScore >= 90) fleschInterpretation = "Very Easy";
  else if (fleschScore >= 80) fleschInterpretation = "Easy";
  else if (fleschScore >= 70) fleschInterpretation = "Fairly Easy";
  else if (fleschScore >= 60) fleschInterpretation = "Standard";
  else if (fleschScore >= 50) fleschInterpretation = "Fairly Difficult";
  else if (fleschScore >= 30) fleschInterpretation = "Difficult";
  else fleschInterpretation = "Very Confusing";
  
  // Calculate nonsensical word percentage
  const nonsensicalWordsPercentage = Math.round((nonsensicalWords.length / uniqueWordCount) * 100) || 0;
  
  return {
    wordCount,
    charCount,
    charNoSpacesCount,
    avgWordLength: avgWordLength.toFixed(1),
    longestWord,
    longestWordLength,
    uniqueWordCount,
    topWords,
    sentenceCount,
    avgWordsPerSentence: avgWordsPerSentence.toFixed(1),
    paragraphCount,
    fleschScore,
    fleschInterpretation,
    gunningFogScore,
    smogScore,
    nonsensicalWordsCount: nonsensicalWords.length,
    nonsensicalWordsPercentage: `${nonsensicalWordsPercentage}%`,
    nonsensicalWords: nonsensicalWords.slice(0, 5).join(", ")
  };
}

// Function to display enhanced statistics in a popup with tabs
function showEnhancedStatsPopup(stats) {
  // Remove any existing popup
  const existingPopup = document.getElementById("word-counter-plus-popup");
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup element
  const popup = document.createElement("div");
  popup.id = "word-counter-plus-popup";
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    font-family: Arial, sans-serif;
    font-size: 14px;
    width: 320px;
    max-width: 90vw;
    max-height: 80vh;
    overflow: hidden;
    animation: fadeIn 0.3s;
  `;
  
  // Create header with title and close button
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 15px;
    background-color: #f5f5f5;
    border-bottom: 1px solid #ddd;
    border-radius: 8px 8px 0 0;
  `;
  
  const title = document.createElement("h3");
  title.textContent = "Word Counter Plus";
  title.style.cssText = `
    margin: 0;
    font-size: 16px;
    font-weight: bold;
    color: #333;
  `;
  
  const closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;";
  closeButton.style.cssText = `
    border: none;
    background: none;
    cursor: pointer;
    font-size: 20px;
    color: #666;
    line-height: 1;
    padding: 0;
  `;
  closeButton.onclick = () => popup.remove();
  
  header.appendChild(title);
  header.appendChild(closeButton);
  popup.appendChild(header);
  
  // Create tabs
  const tabContainer = document.createElement("div");
  tabContainer.style.cssText = `
    display: flex;
    border-bottom: 1px solid #ddd;
    background-color: #f5f5f5;
  `;
  
  const tabs = ["Basics", "Readability", "Advanced"];
  const tabButtons = [];
  
  tabs.forEach((tabName, index) => {
    const tab = document.createElement("button");
    tab.textContent = tabName;
    tab.className = "word-counter-tab";
    tab.dataset.index = index;
    tab.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: none;
      background: ${index === 0 ? '#fff' : '#f5f5f5'};
      cursor: pointer;
      border-bottom: ${index === 0 ? '2px solid #4285f4' : '2px solid transparent'};
      font-weight: ${index === 0 ? 'bold' : 'normal'};
      color: ${index === 0 ? '#4285f4' : '#666'};
      transition: all 0.2s;
    `;
    tab.onclick = function() {
      const activeTab = document.querySelector(".word-counter-tab-content.active");
      const targetTab = document.getElementById(`word-counter-tab-${this.dataset.index}`);
      
      if (activeTab) activeTab.className = "word-counter-tab-content";
      targetTab.className = "word-counter-tab-content active";
      
      // Update tab buttons
      tabButtons.forEach(button => {
        button.style.background = '#f5f5f5';
        button.style.fontWeight = 'normal';
        button.style.color = '#666';
        button.style.borderBottom = '2px solid transparent';
      });
      
      this.style.background = '#fff';
      this.style.fontWeight = 'bold';
      this.style.color = '#4285f4';
      this.style.borderBottom = '2px solid #4285f4';
    };
    tabContainer.appendChild(tab);
    tabButtons.push(tab);
  });
  
  popup.appendChild(tabContainer);
  
  // Create tab content container
  const tabContentContainer = document.createElement("div");
  tabContentContainer.style.cssText = `
    padding: 15px;
    overflow-y: auto;
    max-height: 350px;
  `;
  
  // Create basic tab content
  const basicTabContent = document.createElement("div");
  basicTabContent.id = "word-counter-tab-0";
  basicTabContent.className = "word-counter-tab-content active";
  basicTabContent.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 0;">Words:</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.wordCount.toLocaleString()}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Characters (with spaces):</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.charCount.toLocaleString()}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Characters (no spaces):</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.charNoSpacesCount.toLocaleString()}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Sentences:</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.sentenceCount.toLocaleString()}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Paragraphs:</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.paragraphCount.toLocaleString()}</strong></td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Average word length:</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.avgWordLength}</strong> characters</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Average sentence length:</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.avgWordsPerSentence}</strong> words</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Longest word:</td>
        <td style="text-align: right; padding: 4px 0;"><strong>${stats.longestWord}</strong> (${stats.longestWordLength} chars)</td>
      </tr>
    </table>
  `;
  
  // Create readability tab content
  const readabilityTabContent = document.createElement("div");
  readabilityTabContent.id = "word-counter-tab-1";
  readabilityTabContent.className = "word-counter-tab-content";
  readabilityTabContent.innerHTML = `
    <div style="margin-bottom: 15px;">
      <h4 style="margin: 0 0 8px 0; font-size: 15px;">Flesch Reading Ease: <strong>${stats.fleschScore}</strong> (${stats.fleschInterpretation})</h4>
      <div style="background: #eee; height: 10px; border-radius: 5px; overflow: hidden;">
        <div style="width: ${stats.fleschScore}%; height: 100%; background: linear-gradient(90deg, #ff4e50, #f9d423); border-radius: 5px;"></div>
      </div>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
        0-30: Very difficult (College graduate)<br>
        30-50: Difficult (College)<br>
        50-60: Fairly difficult (High School)<br>
        60-70: Standard (8th-9th grade)<br>
        70-80: Fairly easy (7th grade)<br>
        80-90: Easy (6th grade)<br>
        90-100: Very easy (5th grade)
      </p>
    </div>
    
    <div style="margin-bottom: 15px;">
      <h4 style="margin: 0 0 8px 0; font-size: 15px;">Gunning Fog Index: <strong>${stats.gunningFogScore}</strong></h4>
      <p style="margin: 0; font-size: 12px; color: #666;">
        Represents the school grade level needed to understand your text.<br>
        <strong>17+</strong>: College graduate, <strong>13-16</strong>: College, <strong>8-12</strong>: High school, <strong>6-7</strong>: Middle school
      </p>
    </div>
    
    <div>
      <h4 style="margin: 0 0 8px 0; font-size: 15px;">SMOG Grade: <strong>${stats.smogScore}</strong></h4>
      <p style="margin: 0; font-size: 12px; color: #666;">
        Years of education needed to understand the text completely.<br>
        Target for general audience: <strong>7-8</strong>. Higher values indicate more complex text.
      </p>
    </div>
  `;
  
  // Create advanced tab content
  const advancedTabContent = document.createElement("div");
  advancedTabContent.id = "word-counter-tab-2";
  advancedTabContent.className = "word-counter-tab-content";
  advancedTabContent.innerHTML = `
    <div style="margin-bottom: 15px;">
      <h4 style="margin: 0 0 8px 0; font-size: 15px;">Word Diversity</h4>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">Unique words:</td>
          <td style="text-align: right; padding: 4px 0;"><strong>${stats.uniqueWordCount.toLocaleString()}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Unique word percentage:</td>
          <td style="text-align: right; padding: 4px 0;"><strong>${Math.round((stats.uniqueWordCount / stats.wordCount) * 100)}%</strong></td>
        </tr>
      </table>
    </div>
    
    <div style="margin-bottom: 15px;">
      <h4 style="margin: 0 0 8px 0; font-size: 15px;">Top Words</h4>
      <p style="margin: 0; font-size: 13px;">${stats.topWords || "No meaningful top words found"}</p>
    </div>
    
    <div>
      <h4 style="margin: 0 0 8px 0; font-size: 15px;">Nonsensical Content</h4>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0;">Possible nonsensical words:</td>
          <td style="text-align: right; padding: 4px 0;"><strong>${stats.nonsensicalWordsCount}</strong></td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Percentage of unique words:</td>
          <td style="text-align: right; padding: 4px 0;"><strong>${stats.nonsensicalWordsPercentage}</strong></td>
        </tr>
      </table>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
        Examples: ${stats.nonsensicalWords || "None found"}
      </p>
    </div>
  `;
  
  // Add tab content to container
  tabContentContainer.appendChild(basicTabContent);
  tabContentContainer.appendChild(readabilityTabContent);
  tabContentContainer.appendChild(advancedTabContent);
  popup.appendChild(tabContentContainer);
  
  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .word-counter-tab-content {
      display: none;
    }
    
    .word-counter-tab-content.active {
      display: block;
    }
  `;
  document.head.appendChild(style);
  
  // Add popup to page
  document.body.appendChild(popup);
  
  // Auto-close after 15 seconds
  setTimeout(() => {
    const currentPopup = document.getElementById("word-counter-plus-popup");
    if (currentPopup) {
      currentPopup.remove();
    }
  }, 15000);
}