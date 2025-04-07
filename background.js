// Initialize context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Word Counter Plus extension installed");
  setupContextMenu();
});

// Set up the context menu item
function setupContextMenu() {
  try {
    chrome.contextMenus.create({
      id: "wordCounterPlus",
      title: "Word Counter Plus",
      contexts: ["selection", "page"]
    });
    console.log("Context menu created successfully");
  } catch (error) {
    console.error("Error creating context menu:", error);
  }
}

// Listen for clicks on the context menu item
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked", info, tab);
  if (info.menuItemId === "wordCounterPlus") {
    if (tab.url.startsWith("http")) {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: processTextOnPage,
          args: [info.selectionText || ""]
        });
      } catch (error) {
        console.error("Error executing script:", error);
        showErrorNotification();
      }
    } else {
      console.error("Cannot access non-HTTP URL:", tab.url);
      showErrorNotification();
    }
  }
});

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  console.log("Extension icon clicked", tab);
  if (tab.url.startsWith("http")) {
    try {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: processTextOnPage
      });
    } catch (error) {
      console.error("Error executing script:", error);
      showErrorNotification();
    }
  } else {
    console.error("Cannot access non-HTTP URL:", tab.url);
    showErrorNotification();
  }
});

// Show an error notification
function showErrorNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: "Word Counter Plus",
    message: "This extension can only analyze content on regular web pages, not on browser URLs like chrome://."
  });
}

// This function will be injected into the page
function processTextOnPage(selectedText) {
  // Create a set of stop words for text analysis
  const stopWords = new Set([
    // Articles
    'a', 'an', 'the', 
    // Conjunctions
    'and', 'but', 'or', 'so', 'for', 'nor', 'yet', 
    // Prepositions
    'in', 'on', 'at', 'to', 'from', 'with', 'by', 'about', 'above', 'across', 'after', 'against', 'along',
    'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during',
    'inside', 'into', 'near', 'off', 'onto', 'out', 'outside', 'over', 'past', 'through', 'throughout',
    'under', 'underneath', 'until', 'unto', 'up', 'upon', 'without',
    // Pronouns
    'i', 'me', 'my', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her',
    'hers', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their',
    'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 
    // Auxiliary Verbs
    'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'having', 'do', 'does',
    'did', 'doing', 'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 
    // Other common words
    'not', 'of', 'no', 'yes', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't' // Common contractions parts
  ]);

  // Get the selected text or try to extract content if no selection
  let textToProcess = selectedText || window.getSelection().toString();
  
  if (!textToProcess || textToProcess.trim().length === 0) {
    console.log("No text selected, extracting main content");
    textToProcess = getMainContent();
    
    if (!textToProcess || textToProcess.trim().length === 0) {
      console.log("Could not extract main content");
      alert("Word Counter Plus: No text selected and couldn't extract content.");
      return;
    }
  }
  
  // Calculate enhanced statistics and display in fancy popup
  const stats = calculateEnhancedStats(textToProcess);
  showEnhancedStatsPopup(stats);
  
  // Helper function to extract syllables from a word
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
  
  // Helper function to count complex words (3+ syllables)
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
  
  // Extract main content from the page using improved algorithm
  function getMainContent() {
    // Multi-tier approach for content extraction
    const selectors = [
      // Highest priority: specific article containers
      'article', 'main', '.article-content', '.post-content', '.entry-content', '.content-article',
      
      // Medium priority: common content containers
      '#content', '.content', '.main-content', '.page-content', '.post',
      
      // CNBC specific selectors (from your memory)
      '.ArticleBody-articleBody', '.RenderKeyPoints-list', '.ArticleHeader-wrapper',
      
      // Lower priority: sections and divs that might contain content
      'section', 'div[role="main"]', '.body', '.story',
      
      // Last resort
      'body'
    ];
    
    // Try to find the best content container
    let bestElement = null;
    let maxContentScore = 0;
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(el => {
        // Skip invisible elements except body
        if (el.offsetParent === null && selector !== 'body') return;
        
        // Get text content
        const text = el.innerText || el.textContent || '';
        if (!text || text.trim().length < 50) return; // Skip very small content
        
        // Score calculation: length is important but also quality
        let score = text.trim().length;
        
        // Bonus for elements with significant text length
        if (text.length > 1000) score *= 1.5;
        
        // Bonus for higher priority selectors
        if (selector.includes('article') || selector.includes('content')) score *= 1.2;
        
        // Penalty for likely non-content elements
        if (el.querySelectorAll('nav, header, footer, aside').length > 0) score *= 0.7;
        if (el.querySelectorAll('iframe, .ad, .advertisement, .banner').length > 0) score *= 0.6;
        
        // Check if content is likely to be meaningful
        const paragraphs = el.querySelectorAll('p');
        if (paragraphs.length >= 3) score *= 1.3; // Bonus for multiple paragraphs
        
        if (score > maxContentScore) {
          maxContentScore = score;
          bestElement = el;
        }
      });
    });
    
    if (bestElement) {
      // Clone to avoid modifying original page
      const clone = bestElement.cloneNode(true);
      
      // Remove non-content elements
      ['script', 'style', 'nav', 'header', 'footer', 'aside', '.ad', '.advertisement', '.banner', '.share'].forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      return clone.innerText || clone.textContent || '';
    }
    return '';
  }
  
  // Calculate enhanced statistics for the given text
  function calculateEnhancedStats(text) {
    // Basic word and character counts
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const charCount = text.length;
    const charNoSpacesCount = text.replace(/\s+/g, '').length;
    
    // Calculate average word length
    const avgWordLength = wordCount > 0 ? (charNoSpacesCount / wordCount).toFixed(1) : 0;
    
    // Find longest word
    let longestWord = '';
    let longestWordLength = 0;
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      if (cleanWord.length > longestWordLength) {
        longestWordLength = cleanWord.length;
        longestWord = word;
      }
    }
    
    // Sentences and paragraphs
    const sentences = text.split(/[.!?](?=[\s]|$)/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : 0;
    
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;
    
    // Unique words and frequency
    const wordFrequency = {};
    words.forEach(word => {
      const normalized = word.toLowerCase().replace(/[^a-z']/g, '');
      if (normalized.length > 0) {
        wordFrequency[normalized] = (wordFrequency[normalized] || 0) + 1;
      }
    });
    
    const uniqueWordCount = Object.keys(wordFrequency).length;
    
    // Find most frequent words (excluding stop words)
    const topWords = Object.entries(wordFrequency)
      .filter(([word]) => !stopWords.has(word) && word.length > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, freq]) => ({ word, frequency: freq }));
    
    // Check for nonsensical words (no vowels, very long, etc.)
    const nonsensicalWords = words.filter(word => {
      const normalized = word.toLowerCase().replace(/[^a-z']/g, '');
      if (normalized.length <= 2) return false;
      if (normalized.length > 20) return true; // Very long word
      if (!/[aeiouy]/i.test(normalized)) return true; // No vowels
      return false;
    });
    
    const nonsensicalCount = nonsensicalWords.length;
    const nonsensicalPercentage = (nonsensicalCount / wordCount * 100).toFixed(1);
    
    // Reading time (average 200-250 words per minute)
    const readingTimeMinutes = (wordCount / 225).toFixed(1);
    
    // Calculate readability scores
    const fleschReadingEase = calculateFleschReadingEase(text, wordCount, sentenceCount);
    const gunningFogIndex = calculateGunningFog(text, wordCount, sentenceCount);
    const smogIndex = calculateSMOG(text, sentenceCount);
    
    return {
      wordCount,
      charCount,
      charNoSpacesCount,
      sentenceCount,
      paragraphCount,
      avgWordLength,
      avgWordsPerSentence,
      longestWord,
      longestWordLength,
      uniqueWordCount,
      topWords,
      nonsensicalCount,
      nonsensicalPercentage,
      readingTimeMinutes,
      fleschReadingEase,
      gunningFogIndex,
      smogIndex
    };
  }
  
  // Display the enhanced statistics in a tabbed popup
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
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      font-family: Arial, sans-serif;
      font-size: 14px;
      width: 350px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: auto;
      animation: wcpFadeIn 0.3s;
    `;
    
    // Create CSS styles for the popup
    const popupStyle = `
      @keyframes wcpFadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      #word-counter-plus-popup * {
        box-sizing: border-box;
      }
      
      #word-counter-plus-popup .tab-content {
        padding: 15px;
        display: none;
      }
      
      #word-counter-plus-popup .tab-content.active {
        display: block;
      }
      
      #word-counter-plus-popup .tabs {
        display: flex;
        border-bottom: 1px solid #ddd;
      }
      
      #word-counter-plus-popup .tab {
        padding: 10px 15px;
        cursor: pointer;
        background-color: #f5f5f5;
        border-radius: 8px 8px 0 0;
        margin-right: 2px;
        transition: background-color 0.2s;
      }
      
      #word-counter-plus-popup .tab:hover {
        background-color: #e5e5e5;
      }
      
      #word-counter-plus-popup .tab.active {
        background-color: #fff;
        border-bottom: 2px solid #3498db;
        font-weight: bold;
      }
      
      #word-counter-plus-popup table {
        width: 100%;
        border-collapse: collapse;
      }
      
      #word-counter-plus-popup td {
        padding: 4px 0;
      }
      
      #word-counter-plus-popup td:last-child {
        text-align: right;
      }
      
      #word-counter-plus-popup .readability-score {
        display: inline-block;
        width: 20px;
        height: 20px;
        line-height: 20px;
        text-align: center;
        color: #fff;
        border-radius: 50%;
        font-size: 12px;
        margin-right: 5px;
      }
      
      #word-counter-plus-popup .word-frequency {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #eee;
      }
      
      #word-counter-plus-popup .word {
        font-weight: bold;
      }
      
      #word-counter-plus-popup .frequency {
        color: #666;
      }
    `;
    
    // Convert readability score to color
    function getReadabilityColor(score, type) {
      if (type === 'flesch') {
        if (score >= 90) return '#27ae60'; // Very easy - green
        if (score >= 80) return '#2ecc71';
        if (score >= 70) return '#f39c12'; // Fairly easy - yellow
        if (score >= 60) return '#e67e22';
        if (score >= 50) return '#d35400'; // Difficult - orange
        return '#c0392b'; // Very difficult - red
      } else {
        // Lower grade level is easier (Gunning and SMOG)
        if (score <= 6) return '#27ae60'; // Easy - green
        if (score <= 9) return '#f39c12'; // Average - yellow
        if (score <= 12) return '#e67e22'; // Difficult - orange
        return '#c0392b'; // Very difficult - red
      }
    }
    
    // Create popup content with tabs
    popup.innerHTML = `
      <style>${popupStyle}</style>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #eee;">
        <h3 style="margin: 0; font-size: 16px; color: #333;">Word Counter Plus</h3>
        <button id="word-counter-close" style="border: none; background: none; cursor: pointer; font-size: 20px; line-height: 1;">&times;</button>
      </div>
      
      <div class="tabs">
        <div class="tab active" data-tab="basic">Basic</div>
        <div class="tab" data-tab="readability">Readability</div>
        <div class="tab" data-tab="advanced">Advanced</div>
      </div>
      
      <!-- Basic Stats Tab -->
      <div id="basic-tab" class="tab-content active">
        <table>
          <tr>
            <td>Words:</td>
            <td><strong>${stats.wordCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Characters (with spaces):</td>
            <td><strong>${stats.charCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Characters (no spaces):</td>
            <td><strong>${stats.charNoSpacesCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Sentences:</td>
            <td><strong>${stats.sentenceCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Paragraphs:</td>
            <td><strong>${stats.paragraphCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Reading time:</td>
            <td><strong>${stats.readingTimeMinutes}</strong> minutes</td>
          </tr>
          <tr>
            <td>Avg. word length:</td>
            <td><strong>${stats.avgWordLength}</strong> characters</td>
          </tr>
          <tr>
            <td>Avg. sentence length:</td>
            <td><strong>${stats.avgWordsPerSentence}</strong> words</td>
          </tr>
        </table>
      </div>
      
      <!-- Readability Tab -->
      <div id="readability-tab" class="tab-content">
        <table>
          <tr>
            <td>
              <span class="readability-score" style="background-color: ${getReadabilityColor(stats.fleschReadingEase, 'flesch')}">${Math.min(99, stats.fleschReadingEase)}</span>
              Flesch Reading Ease:
            </td>
            <td>
              <strong>${stats.fleschReadingEase}</strong>
              <div style="font-size: 12px; color: #666;">
                ${stats.fleschReadingEase >= 90 ? 'Very easy to read' :
                 stats.fleschReadingEase >= 80 ? 'Easy to read' :
                 stats.fleschReadingEase >= 70 ? 'Fairly easy to read' :
                 stats.fleschReadingEase >= 60 ? 'Standard' :
                 stats.fleschReadingEase >= 50 ? 'Fairly difficult' :
                 stats.fleschReadingEase >= 30 ? 'Difficult' : 'Very difficult'}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span class="readability-score" style="background-color: ${getReadabilityColor(stats.gunningFogIndex, 'grade')}">${Math.min(stats.gunningFogIndex, 19)}</span>
              Gunning Fog Index:
            </td>
            <td>
              <strong>${stats.gunningFogIndex}</strong>
              <div style="font-size: 12px; color: #666;">
                ${stats.gunningFogIndex <= 6 ? 'Readable by 6th graders' :
                 stats.gunningFogIndex <= 8 ? 'Readable by 8th graders' :
                 stats.gunningFogIndex <= 10 ? 'Readable by high schoolers' :
                 stats.gunningFogIndex <= 14 ? 'Readable by college students' :
                 stats.gunningFogIndex <= 18 ? 'Readable by college graduates' : 'Advanced material'}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span class="readability-score" style="background-color: ${getReadabilityColor(stats.smogIndex, 'grade')}">${Math.min(stats.smogIndex, 19)}</span>
              SMOG Index:
            </td>
            <td>
              <strong>${stats.smogIndex}</strong>
              <div style="font-size: 12px; color: #666;">
                Years of education needed
              </div>
            </td>
          </tr>
          <tr><td colspan="2" style="padding-top: 10px; font-size: 12px; color: #666;">
            <strong>Flesch Reading Ease</strong>: Higher scores (0-100) indicate easier-to-read text.<br>
            <strong>Gunning Fog & SMOG</strong>: Estimated grade level needed to comprehend the text.
          </td></tr>
        </table>
      </div>
      
      <!-- Advanced Tab -->
      <div id="advanced-tab" class="tab-content">
        <table>
          <tr>
            <td>Unique words:</td>
            <td><strong>${stats.uniqueWordCount.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Longest word:</td>
            <td><strong>${stats.longestWord}</strong> (${stats.longestWordLength} chars)</td>
          </tr>
          <tr>
            <td>Nonsensical words:</td>
            <td><strong>${stats.nonsensicalPercentage}%</strong> (${stats.nonsensicalCount})</td>
          </tr>
        </table>
        
        <div style="margin-top: 10px;">
          <strong>Top words:</strong>
          <div style="max-height: 150px; overflow-y: auto; margin-top: 5px;">
            ${stats.topWords.map(item => `
              <div class="word-frequency">
                <span class="word">${item.word}</span>
                <span class="frequency">${item.frequency}x</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    // Add popup to page
    document.body.appendChild(popup);
    
    // Add tab switching functionality
    const tabs = popup.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content
        const tabContents = popup.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));
        popup.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');
      });
    });
    
    // Add close functionality
    document.getElementById("word-counter-close").addEventListener("click", () => {
      popup.remove();
    });
    
    // Auto-close after 2 minutes (user can always close it sooner)
    setTimeout(() => {
      const currentPopup = document.getElementById("word-counter-plus-popup");
      if (currentPopup) {
        currentPopup.remove();
      }
    }, 120000);
  }
}