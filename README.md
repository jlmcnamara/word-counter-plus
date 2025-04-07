# Word Counter Plus Chrome Extension - Comprehensive Text Analysis

**Word Counter Plus** is a sophisticated and powerful Chrome extension designed for users who require deep statistical insights into web-based text. Moving far beyond basic word counting, this tool offers a multi-faceted analysis of selected text snippets or the intelligently extracted main content of entire webpages. It presents findings in a clean, modern, and intuitive tabbed interface, enabling users to quickly grasp text complexity, readability, structure, and lexical characteristics.

This extension is engineered for accuracy, performance, and ease of use, making it an invaluable asset for writers, editors, students, researchers, and anyone needing to evaluate textual content efficiently.

## Core Features & Capabilities

*   **Dual Analysis Modes:**
    *   **Selection Analysis:** Highlight any portion of text on a webpage, right-click, and choose "Word Counter Plus" to analyze only the selected content.
    *   **Full Page Analysis:** Click the extension icon in the Chrome toolbar to trigger an analysis of the *main content* of the current page. The extension employs intelligent algorithms to discard irrelevant elements like navigation, ads, and footers.

*   **Comprehensive Statistical Breakdown (Tabbed Interface):**
    *   **Basic Metrics:** Provides foundational statistics:
        *   *Word Count:* Total number of identified words.
        *   *Character Count (incl. spaces):* Total characters, including whitespace.
        *   *Character Count (excl. spaces):* Total non-whitespace characters.
        *   *Average Word Length:* Mean length of words in characters.
        *   *Average Sentence Length:* Mean length of sentences in words.
        *   *Estimated Reading Time:* Calculated based on a standard average reading speed (approx. 225 WPM).
    *   **Readability Assessment:** Offers multiple industry-standard readability scores:
        *   *Flesch Reading Ease:* Scores text from 0-100 (higher is easier). Interpreted as: 90-100 (Very Easy), 70-89 (Easy), 60-69 (Standard), 50-59 (Fairly Difficult), 30-49 (Difficult), 0-29 (Very Confusing).
        *   *Gunning Fog Index:* Estimates the years of formal education needed to understand the text on the first reading. A lower score indicates better readability.
        *   *SMOG Index:* (Simple Measure of Gobbledygook) Estimates the years of education needed based on polysyllabic words. Like Gunning Fog, lower is better.
        *   *Color-Coded Indicators:* Each score is visually represented with intuitive color cues (e.g., green for easy, red for difficult).
    *   **Structural Analysis:** Delves into the text's construction:
        *   *Sentence Count:* Total number of detected sentences.
        *   *Paragraph Count:* Total number of paragraphs (based on newline separation).
        *   *Average Syllables per Word:* A measure related to word complexity.
        *   *Complex Word Count:* Number of words containing 3 or more syllables (excluding common suffixes like -es, -ed, -ing).
        *   *Complex Word Percentage:* The proportion of complex words relative to the total word count, a strong indicator of text difficulty.
    *   **Advanced Insights:** Provides deeper lexical analysis:
        *   *Unique Word Count (Lexical Diversity):* Number of distinct words used.
        *   *Longest Word:* Identifies the longest word found in the text.
        *   *Nonsensical Word Count & Percentage:* Flags potential non-words based on heuristic rules (e.g., excessive length without vowels, unusual character patterns). *Note: This is heuristic and may flag technical terms or rare words.*
        *   *Top 10 Most Frequent Words:* Lists the most common words, automatically excluding common English stop words (like "the", "a", "is") for more meaningful results.
        *   *Word Length Distribution Histogram:* A dynamic, lightweight bar chart visualizing the frequency distribution of word lengths (e.g., how many 3-letter words, 4-letter words, etc.). Rendered using pure HTML and CSS for performance and reliability.

*   **Intelligent Content Extraction:** For full-page analysis, the extension attempts to heuristically identify the primary article or content block, minimizing noise from sidebars, headers, footers, and advertisements. *Accuracy may vary depending on website structure.*

*   **Sophisticated Word Tokenization:**
    *   Accurately identifies word boundaries, correctly handling intra-word punctuation like apostrophes (e.g., "it's", "don't") and hyphens (if configured).
    *   Includes logic to split run-together CamelCase identifiers (e.g., "wordCounterPlus" becomes "word", "Counter", "Plus").
    *   Attempts context-aware handling of specific prefixes (e.g., "McQueen") to keep them as single units.

*   **Modern & User-Friendly UI:**
    *   Clean, flat design aesthetic for clarity.
    *   Intuitive tab navigation.
    *   Data presented in easy-to-read tables.
    *   Responsive layout adapts to varying statistic lengths.

*   **Performance & Reliability:**
    *   Calculations performed efficiently within the injected script.
    *   Robust error handling for invalid pages or scenarios where analysis fails.
    *   Minimal dependencies; histogram uses performant HTML/CSS rendering.

<!-- Placeholder for Screenshots: Add 1-2 key screenshots showcasing the popup and tabs -->
<!-- Example: -->
<!-- ![Word Counter Plus Popup Tabs](docs/images/screenshot_tabs.png "Word Counter Plus Popup Example") -->
<!-- ![Word Counter Plus Context Menu](docs/images/screenshot_context.png "Word Counter Plus Context Menu") -->

## Installation Guide

As this extension is currently under development or intended for local use, installation requires loading it as an unpacked extension:

1.  **Obtain the Extension Files:** Download or clone the project directory (`word-counter-plus/`) to your local machine. Ensure the directory contains `manifest.json`, `background.js`, and the `icons/` folder.
2.  **Open Chrome Extensions Page:** Launch Google Chrome, type `chrome://extensions` into the address bar, and press Enter.
3.  **Enable Developer Mode:** Locate the "Developer mode" toggle switch, usually in the top-right corner of the extensions page, and turn it **ON**.
4.  **Load Unpacked Extension:** Several buttons will appear after enabling Developer mode. Click the "**Load unpacked**" button.
5.  **Select Project Directory:** A file browser window will open. Navigate to the location where you saved the extension files and select the **entire `word-counter-plus` directory** (the one containing `manifest.json`). Click "Select" or "Open".
6.  **Installation Complete:** The Word Counter Plus extension should now appear in your list of installed extensions, and its icon should be visible in your Chrome toolbar (you may need to click the puzzle piece icon to pin it).

## Usage Instructions

1.  **Analyze Specific Text:**
    *   On any webpage, highlight the text you wish to analyze.
    *   Right-click on the highlighted selection.
    *   Choose "**Word Counter Plus**" from the context menu that appears.
    *   The analysis popup will appear with statistics for the selected text.

2.  **Analyze Main Page Content:**
    *   Navigate to the webpage you want to analyze.
    *   Click the Word Counter Plus icon (typically a document symbol with a magnifying glass) in your Chrome toolbar.
    *   The extension will attempt to extract the main content and display the analysis popup. *Note: Content extraction effectiveness varies by site.*

3.  **Navigate Statistics:**
    *   The popup window displays statistics organized into tabs: **Basic**, **Readability**, **Structure**, **Advanced**.
    *   Click on any tab name to view the corresponding set of metrics.
    *   Hover over histogram bars (in the Advanced tab) to see the exact count for that word length.

4.  **Close the Popup:**
    *   Click the '×' button in the top-right corner of the popup.
    *   Alternatively, the popup will automatically close after approximately 2 minutes of inactivity.

## Project Structure Overview

```plaintext
word-counter-plus/
├── icons/                 # Directory containing extension icons at various resolutions
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── background.js          # Core logic: Service worker managing events (context menu, icon clicks),
|                          # script injection, all text calculations, and dynamic UI/popup generation.
├── manifest.json          # Extension manifest: Defines metadata, permissions, scripts, icons, version, etc.
├── create_icons.py        # Utility script (Python): Optional helper to generate required icon sizes from a source image.
└── README.md              # This documentation file.
```

## Technical Implementation Details

*   **Manifest Version:** Uses Manifest V3, adhering to the latest Chrome extension standards for security and performance.
*   **Permissions:**
    *   `contextMenus`: To add the right-click menu option for selected text.
    *   `scripting`: To inject the analysis script (`processTextOnPage` function from `background.js`) into the active tab.
    *   `activeTab`: To gain temporary access to the current tab for script injection when the icon is clicked (no broad host permissions needed for icon click functionality).
    *   `notifications`: (Potentially used for error messages or future features).
*   **Host Permissions:** `<all_urls>`: Required by the `scripting` permission when used with the *context menu* to allow injection on any page where text is selected. Icon click analysis relies on the narrower `activeTab` permission.
*   **Execution Model:**
    1.  The `background.js` service worker listens for context menu clicks or extension icon clicks.
    2.  Upon activation, it retrieves the selected text (if applicable) or signals the content script to extract page content.
    3.  It executes the `calculateEnhancedStats` function to perform all text processing and statistical calculations.
    4.  It dynamically constructs the HTML, CSS, and JavaScript for the popup UI within the `showEnhancedStatsPopup` function.
    5.  This entire UI and its logic (including tab switching and the histogram rendering) are injected and executed within the context of the active webpage using `chrome.scripting.executeScript`.
*   **Text Processing:** Primarily leverages JavaScript regular expressions for:
    *   Word tokenization (splitting text into words).
    *   Sentence boundary detection.
    *   Syllable counting (heuristic-based).
    *   Paragraph detection (newline-based).
*   **Readability Formulas:** Implements the standard algorithms for Flesch Reading Ease, Gunning Fog Index, and SMOG Index directly in JavaScript.
*   **Visualization:** The word length histogram is rendered directly using dynamically created HTML `<div>` elements styled with CSS. Bar heights are calculated based on frequency counts (relative to the maximum count) and capped to maintain a minimal visual footprint. This avoids external library dependencies and potential loading issues.

## Limitations & Known Issues

*   **Content Extraction Accuracy:** The heuristic used to identify main page content may not work perfectly on all website layouts, potentially including or excluding unintended text.
*   **Nonsensical Word Detection:** The current heuristic is basic and may incorrectly flag technical jargon, code snippets, or uncommon proper nouns as "nonsensical". It's intended as a rough indicator only.
*   **Language Support:** Primarily designed and tested for English text. Readability scores and stop word lists are English-specific. Syllable counting rules are based on English patterns.
*   **Dynamic Content:** May not correctly analyze content loaded dynamically *after* the initial page load if the analysis is triggered too early.
*   **Complex Scripts:** Performance might degrade slightly on extremely large text selections or pages with exceptionally long content.

## Future Considerations & Potential Improvements

While the current version provides robust core functionality, several areas could be cautiously explored for future refinement, balancing new features with performance and maintainability:

*   **Content Extraction Refinement:** The current heuristics work well on many sites, but further investigation into more adaptive or potentially configurable methods could improve accuracy on complex or unusual page layouts.
*   **Nonsensical Word Detection Accuracy:** The heuristic approach is lightweight but has known limitations. Exploring more advanced techniques (like dictionary lookups or probabilistic methods) would require careful consideration of performance impact and potential increases in extension size or complexity.
*   **User Customization:** Offering options like adjustable reading speed (WPM) or custom stop words could enhance usability, but needs to be implemented thoughtfully to avoid cluttering the interface.
*   **Internationalization (i18n):** Adapting the extension for non-English languages presents significant challenges, particularly regarding accurate syllable counting, readability formulas, and language-specific tokenization rules. This would be a major undertaking.
*   **Code Modularity:** As the extension evolves, ongoing refactoring of `background.js` to better separate concerns (e.g., calculation vs. UI generation) will be important for long-term maintenance and ease of adding future enhancements.
*   **Visualization Balance:** While the current CSS histogram is reliable, adding more complex visualizations would require careful evaluation of the trade-offs between richer data presentation and maintaining the extension's lightweight nature and performance.

## License

MIT License

Copyright (c) [Year] [Your Name or Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
