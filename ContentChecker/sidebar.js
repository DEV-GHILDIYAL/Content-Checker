document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-upload');
    const uploadBtn = document.getElementById('btn-upload');
    const dropZone = document.getElementById('drop-zone');
    const runAuditBtn = document.getElementById('btn-run-audit');
    const stopAuditBtn = document.getElementById('btn-stop-audit');
    const clearBtn = document.getElementById('btn-clear');
    const fileListContainer = document.getElementById('file-list');
    const statsContainer = document.getElementById('stats-container');
    const missingListContainer = document.getElementById('missing-list');
    const percentText = document.getElementById('percent-text');
    const statsDetail = document.getElementById('stats-detail');

    // Tab Elements
    const tabNormal = document.getElementById('tab-normal');
    const tabCrawl = document.getElementById('tab-crawl');
    const urlSection = document.getElementById('url-section');
    const crawlUrlInput = document.getElementById('crawl-url');
    const modeDesc = document.getElementById('mode-desc');

    // Queue Elements
    const btnAddQueue = document.getElementById('btn-add-queue');
    const queueSection = document.getElementById('queue-section');
    const queueList = document.getElementById('queue-list');
    const queueCount = document.getElementById('queue-count');
    const delaySlider = document.getElementById('crawl-delay');
    const delayValueText = document.getElementById('delay-value');

    let currentMode = 'normal'; // 'normal' or 'crawl'
    let uploadedFiles = [];
    let extractedLines = [];
    let crawlQueue = []; // Array of { url, lines, fileName }

    // Tab Switching Logic
    tabNormal.addEventListener('click', () => {
        currentMode = 'normal';
        tabNormal.classList.add('active');
        tabCrawl.classList.remove('active');
        urlSection.style.display = 'none';
        queueSection.style.display = 'none';
        modeDesc.textContent = 'Auditing the currently open active webpage.';
        clearBtn.style.display = 'block'; // Clear highlights only makes sense on the active page
        runAuditBtn.disabled = uploadedFiles.length === 0;
    });

    tabCrawl.addEventListener('click', () => {
        currentMode = 'crawl';
        tabCrawl.classList.add('active');
        tabNormal.classList.remove('active');
        urlSection.style.display = 'flex';
        modeDesc.textContent = 'Batch crawling specific URLs in the background.';
        clearBtn.style.display = 'none'; // Background crawl doesn't have highlights to clear
        renderQueueList(); // Shows/hides queue based on items
    });

    // Slider Logic
    delaySlider.addEventListener('input', (e) => {
        delayValueText.textContent = e.target.value;
    });

    // Add to Queue Logic
    btnAddQueue.addEventListener('click', () => {
        const targetUrl = crawlUrlInput.value.trim();
        if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://'))) {
            alert("Please enter a valid HTTP/HTTPS or file:// URL.");
            return;
        }
        if (extractedLines.length === 0 || uploadedFiles.length === 0) {
            alert("Please upload a document to pair with this URL.");
            return;
        }

        const uniqueLines = [...new Set(extractedLines)];
        crawlQueue.push({
            url: targetUrl,
            lines: uniqueLines,
            fileName: uploadedFiles[0].name
        });

        // Reset inputs for next task
        crawlUrlInput.value = '';
        fileInput.value = '';
        uploadedFiles = [];
        extractedLines = [];
        renderFileList(); // clears upload UI
        renderQueueList();
    });

    function renderQueueList() {
        if (currentMode !== 'crawl') return;

        queueList.innerHTML = '';
        queueCount.textContent = crawlQueue.length;

        if (crawlQueue.length > 0) {
            queueSection.style.display = 'block';
            runAuditBtn.disabled = false;
        } else {
            queueSection.style.display = 'none';
            runAuditBtn.disabled = true;
        }

        crawlQueue.forEach((task, idx) => {
            const li = document.createElement('li');
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';

            const topRow = document.createElement('div');
            topRow.style.display = 'flex';
            topRow.style.justifyContent = 'space-between';
            topRow.style.width = '100%';

            const urlSpan = document.createElement('span');
            urlSpan.textContent = task.url;
            urlSpan.style.wordBreak = 'break-all';
            urlSpan.style.color = '#3b82f6';
            urlSpan.style.fontWeight = '500';

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '❌';
            removeBtn.className = 'remove-file';
            removeBtn.onclick = () => {
                crawlQueue.splice(idx, 1);
                renderQueueList();
            };

            topRow.appendChild(urlSpan);
            topRow.appendChild(removeBtn);

            const fileSpan = document.createElement('span');
            fileSpan.textContent = `📄 ${task.fileName}`;
            fileSpan.style.fontSize = '12px';
            fileSpan.style.color = '#6b7280';
            fileSpan.style.marginTop = '4px';

            li.appendChild(topRow);
            li.appendChild(fileSpan);
            queueList.appendChild(li);
        });
    }

    // Handle Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });

    // Handle File Input
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFiles(fileInput.files);
            // Reset input so same file can be uploaded again if needed
            fileInput.value = '';
        }
    });

    function handleFiles(files) {
        if (files.length === 0) return;

        // Force exactly 1 document uploaded at a time
        const file = files[0];

        if (file.name.endsWith('.txt') || file.name.endsWith('.docx')) {
            uploadedFiles = [file]; // Replace existing
            extractedLines = []; // Reset lines
            renderFileList();
            parseFile(file);
        } else {
            alert("Unsupported file type: " + file.name + "\nOnly .txt and .docx are supported.");
        }
    }

    function renderFileList() {
        fileListContainer.innerHTML = '';
        uploadedFiles.forEach((f, idx) => {
            const li = document.createElement('li');
            li.textContent = f.name;

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '❌';
            removeBtn.className = 'remove-file';
            removeBtn.title = 'Remove file';
            removeBtn.onclick = () => {
                uploadedFiles.splice(idx, 1);
                // Clear extracted lines and re-parse everything
                extractedLines = [];
                uploadedFiles.forEach(parseFile);
                renderFileList();
            };

            li.appendChild(removeBtn);
            fileListContainer.appendChild(li);
        });

        if (uploadedFiles.length > 0) {
            runAuditBtn.disabled = false;
        } else {
            runAuditBtn.disabled = true;
            extractedLines = [];
        }
    }

    function parseFile(file) {
        if (file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                processExtractedText(text);
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.docx')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target.result;
                mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                    .then(function (result) {
                        processExtractedText(result.value);
                    })
                    .catch(function (err) {
                        console.error("Error parsing docx:", err);
                        alert("Error parsing " + file.name);
                    });
            };
            reader.readAsArrayBuffer(file);
        }
    }

    function processExtractedText(text) {
        const lines = text.split(/\r?\n/);
        lines.forEach(line => {
            // Strict matching: we don't trim or change case, but we shouldn't audit empty lines
            if (line.trim().length > 0) {
                extractedLines.push(line);
            }
        });
    }

    // Run Audit
    runAuditBtn.addEventListener('click', () => {
        statsContainer.style.display = 'none';
        missingListContainer.innerHTML = '<p>Running audit...</p>';

        // De-duplicate extracted lines for faster and cleaner processing
        const uniqueLines = [...new Set(extractedLines)];

        if (currentMode === 'normal') {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'runAudit',
                        lines: uniqueLines
                    }).catch((error) => {
                        missingListContainer.innerHTML = '<p class="error-msg" style="color: #d9534f; padding: 10px; border: 1px solid #f5c6cb; background: #f8d7da; border-radius: 4px;">Error connecting to the webpage. Please refresh the page and try again (ensure "Allow access to file URLs" is ON if testing local files).</p>';
                        console.error("Could not send runAudit message.", error);
                    });
                }
            });
        } else if (currentMode === 'crawl') {
            if (crawlQueue.length === 0) {
                missingListContainer.innerHTML = '<p class="error-msg" style="color: #d9534f;">Task queue is empty. Add tasks first.</p>';
                return;
            }

            // Send to background script to manage background tab batch crawling
            chrome.runtime.sendMessage({
                action: 'startBatchCrawl',
                queue: crawlQueue,
                delay: parseFloat(delaySlider.value) * 1000
            });

            runAuditBtn.style.display = 'none';
            stopAuditBtn.style.display = 'block';
        }
    });

    // Stop Audit
    stopAuditBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'stopBatchCrawl' });
        stopAuditBtn.style.display = 'none';
        runAuditBtn.style.display = 'block';
        runAuditBtn.disabled = crawlQueue.length === 0;
        missingListContainer.innerHTML += '<p class="error-msg" style="color: #d9534f; margin-top: 10px;">Batch Crawl Aborted.</p>';
    });

    // Clear Highlights
    clearBtn.addEventListener('click', () => {
        statsContainer.style.display = 'none';
        missingListContainer.innerHTML = '';
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'clearHighlights'
                }).catch((error) => {
                    console.error("Could not send clearHighlights message.", error);
                });
            }
        });
    });

    // Receive Results from Content Script OR Background Script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request && request.action === 'auditResults') {
            displayResults(request.stats, request.missingLines, request.urlScanned, request.isBatchItem, request.pageTitle);
            // Send response to keep message channel clean
            sendResponse({ status: 'ok' });
        }
        if (request && request.action === 'batchCrawlComplete') {
            stopAuditBtn.style.display = 'none';
            runAuditBtn.style.display = 'block';
            runAuditBtn.disabled = crawlQueue.length === 0;
        }
    });

    function displayResults(stats, missingLines, urlScanned = null, isBatchItem = false, pageTitle = null) {
        // Clear "Running audit..." if it's still there
        if (missingListContainer.innerHTML === '<p>Running audit...</p>') {
            missingListContainer.innerHTML = '';
        }

        if (!isBatchItem) {
            statsContainer.style.display = 'block';
            missingListContainer.innerHTML = '';

            percentText.textContent = `Content Match: ${stats.percentage}%`;
            percentText.style.color = stats.percentage === 100 ? '#28a745' : '#d9534f';
            statsDetail.innerHTML = `
               <p>Total Lines: <strong>${stats.total}</strong></p>
               <p>Matched: <strong style="color: #28a745">${stats.matched}</strong></p>
               <p>Missing: <strong style="color: #d9534f">${stats.missing}</strong></p>
             `;

            if (missingLines.length > 0) {
                let html = `<h3>Missing Content</h3><ul>`;
                missingLines.forEach(line => {
                    const safeLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    html += `<li>${safeLine}</li>`;
                });
                html += '</ul>';
                missingListContainer.innerHTML = html;
            } else {
                missingListContainer.innerHTML = '<p class="success-msg">All content found perfectly!</p>';
            }
        } else {
            // Append results dynamically instead of overwriting global stats
            statsContainer.style.display = 'none';

            const block = document.createElement('div');
            block.style.marginBottom = '20px';
            block.style.padding = '12px';
            block.style.border = '1px solid #e5e7eb';
            block.style.borderRadius = '6px';
            block.style.backgroundColor = 'white';

            const matchColor = stats.percentage === 100 ? '#28a745' : '#d9534f';

            const titleHtml = pageTitle ? `<span style="display:block; font-weight: 600; color: #1f2937; margin-bottom: 2px; font-size: 13px;">${pageTitle}</span>` : '';

            let html = `
                <div style="margin-bottom: 10px; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px;">
                    ${titleHtml}
                    <strong style="color: #6b7280; display: block; word-break: break-all; font-size: 11px; margin-bottom: 6px;">${urlScanned}</strong>
                    <h3 style="color: ${matchColor}; font-size: 15px; display: inline;">Match: ${stats.percentage}%</h3>
                    <span style="font-size: 12px; margin-left:10px; color:#6b7280;">(${stats.matched}/${stats.total} lines)</span>
                </div>
             `;

            if (missingLines.length > 0) {
                html += '<ul style="list-style: none; padding: 0;">';
                missingLines.forEach(line => {
                    const safeLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    html += `<li style="position:relative; margin-bottom:6px; padding:6px 8px 6px 20px; font-size:12px; background-color:#fef2f2; border-left:3px solid #ef4444; border-radius:0 4px 4px 0;">
                                <span style="position:absolute; left:6px; color:#ef4444; font-weight:bold;">•</span>${safeLine}
                              </li>`;
                });
                html += '</ul>';
            } else {
                html += '<p class="success-msg" style="padding: 8px; font-size: 12px; margin-top: 10px;">Perfect Match!</p>';
            }

            block.innerHTML = html;
            missingListContainer.appendChild(block);
        }
    }
});
