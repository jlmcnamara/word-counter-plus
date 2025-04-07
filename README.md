# Word Counter Plus Chrome Extension

**Word Counter Plus** is a powerful Chrome extension designed to provide comprehensive text statistics for selected text or the main content of a webpage. It offers a user-friendly interface with detailed insights into readability, structure, and word usage.

## Features

*   **Analyze Selection or Page:** Activate via context menu on selected text or by clicking the extension icon to analyze the main content of the current page.
*   **Tabbed Interface:** Statistics are organized into clear tabs:
    *   **Basic:** Word Count, Character Count (with/without spaces), Average Word Length, Average Sentence Length, Estimated Reading Time.
    *   **Readability:** Flesch Reading Ease, Gunning Fog Index, SMOG Index with scores, color-coded indicators, and explanations.
    *   **Structure:** Sentence Count, Paragraph Count, Average Syllables per Word, Complex Word Count & Percentage (words with 3+ syllables).
    *   **Advanced:** Unique Word Count, Longest Word, Nonsensical Word Count & Percentage, Top 10 Most Frequent Words (excluding common stop words).
*   **Intelligent Content Extraction:** If no text is selected when clicking the icon, the extension attempts to identify and extract the main article content from the page, ignoring headers, footers, ads, etc.
*   **Sophisticated Word Tokenization:**
    *   Accurately identifies words (sequences of letters and apostrophes).
    *   Splits run-together CamelCase words (e.g., "wordOne" becomes "word", "One").
    *   Correctly handles common name prefixes like "McQueen" or "MacDonald", keeping them as single words.
*   **Nonsensical Word Detection:** Identifies potential non-words based on length and lack of vowels.
*   **Modern UI:** Clean, flat design popup for easy reading.
*   **Error Handling:** Provides notifications if analysis cannot be performed (e.g., on `chrome://` pages).

## Installation

1.  **Download or Clone:** Get the extension files from the repository.
2.  **Open Chrome Extensions:** Navigate to `chrome://extensions` in your Chrome browser.
3.  **Enable Developer Mode:** Toggle the "Developer mode" switch in the top-right corner.
4.  **Load Unpacked:** Click the "Load unpacked" button.
5.  **Select Directory:** Browse to and select the `word-counter-plus` directory containing the `manifest.json` file.
6.  The extension icon should now appear in your Chrome toolbar.

## Usage

1.  **Analyze Selected Text:** Highlight text on any webpage, right-click, and select "Word Counter Plus" from the context menu.
2.  **Analyze Page Content:** Navigate to a webpage and click the Word Counter Plus icon in your Chrome toolbar. The extension will attempt to analyze the main content.
3.  **View Stats:** The popup window will appear, displaying the calculated statistics across the different tabs. Click on a tab name to switch views.
4.  **Close:** Click the '×' button in the popup header or wait 2 minutes for it to auto-close.

## Project Structure

```
word-counter-plus/
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── background.js       # Service worker: Handles context menu, icon clicks, script injection, all calculations, and UI generation.
├── manifest.json       # Extension configuration: Permissions, scripts, icons, version, etc.
├── create_icons.py     # Python script (optional) used to generate icon sizes from a source image.
└── README.md           # This file.
```

## Technical Details

*   **Manifest Version:** V3
*   **Permissions:** `contextMenus`, `scripting`, `activeTab`, `notifications`
*   **Host Permissions:** `<all_urls>` (required by `scripting` for page analysis)
*   **Core Logic:** Resides entirely within `background.js`. When activated, it injects the `processTextOnPage` function (which contains all analysis and UI logic) into the active tab.
*   **Text Processing:** Uses regular expressions for word tokenization, sentence splitting, and syllable counting.
*   **Readability Formulas:** Implements standard Flesch Reading Ease, Gunning Fog, and SMOG Index calculations.

## Future Considerations / Potential Improvements

*   Allow customization of reading speed (WPM) for time estimates.
*   Implement more sophisticated nonsensical word detection (e.g., using dictionaries or n-grams).
*   Add options to ignore certain types of text elements during content extraction.
*   Provide charts or visualizations for some statistics.
*   Internationalization (i18n) support for different languages.
*   Refactor `background.js` to potentially separate calculation logic from UI generation for better maintainability.
