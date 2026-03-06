# 🕵️‍♂️ CMS Content Audit Extension

A powerful Chrome Extension built to audit website content against predefined reference documents (`.txt` or `.docx`). Ensures your published posts, articles, and pages exactly match your locally drafted content!

## ✨ Features

### 📄 1. Active Page Auditing (Single-Page Mode)
- **Visual Highlighting**: Instantly highlights matched content directly on the webpage (bright yellow with a bold orange outline), so you can physically see what matched and what was left out.
- **Missing Content Report**: The Side Panel clearly lists which exact lines from your document are completely missing on the webpage.
- **Match Percentage**: Displays a quick overall health score (e.g., 100% Match!) along with detailed line counts.
- **Easy Clear**: A single click to clear highlights and return the page to normal without needing to refresh.

### 🕸️ 2. Batch URL Crawling (Multi-Page Mode)
- **Task Queue System**: Build a queue by pairing a target URL with an uploaded content document.
- **Streamlined Background Checking**: The extension navigates through the queue sequentially using your active tab, avoiding annoying tab-clutter or memory bloating.
- **Adjustable Delay**: Control how long the extension waits before scanning each page to accommodate for slow-loading or dynamic websites.
- **Real-Time Reporting**: Results (Match %, Matched Lines vs Missing Lines) stack dynamically in the Side Panel for each queried URL.

## 🛠️ Installation

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button and select the `ContentChecker` directory from this repository.
5. Pin the extension to your Chrome toolbar for easy access!

## 🚀 How to Use

### Normal Mode (Active Webpage)
1. Open the extension side panel.
2. Ensure you are on the **Active Page** tab.
3. Drag & drop or upload your reference document (`.txt` or `.docx`).
4. Click **Run Audit**. Watch the magic happen as matched text highlights on the screen and detailed results appear in the side panel!
5. Use **Clear Highlights** when you are done.

### Crawl Mode (Batch Processing)
1. Open the extension side panel and switch to the **Batch Crawl** tab.
2. Upload your reference document.
3. Enter the target URL in the input field and click **+ Add to Queue**. Repeat this for as many URLs as needed (you can use different documents for different URLs).
4. Adjust the **Scan Delay** slider if the target website is slow to load.
5. Click **Run Batch Audit**. Sit back and watch the results stream in as the extension safely navigates and checks each page.

## 💻 Technical Details
- Built with **Vanilla JavaScript, HTML, CSS** as a native Chrome Extension (**Manifest V3**).
- Implements the **Side Panel API** for a persistent, non-intrusive UI experience.
- Uses `mammoth.js` for safe, local `.docx` parsing support.
- Fully offline capabilities.

---
*Built to streamline the Content QA process and make auditing a breeze!*