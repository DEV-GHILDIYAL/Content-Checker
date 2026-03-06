let savedLines = [];
let isBatchItem = false;

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Ignore messages if this content script is running inside an iframe
    if (window !== window.top) return;

    if (request.action === 'runAudit') {
        savedLines = request.lines || [];
        isBatchItem = request.isBatchItem || false;
        runDOMScan(savedLines);
        sendResponse({ status: 'ok' });
    } else if (request.action === 'clearHighlights') {
        clearHighlights();
        sendResponse({ status: 'ok' });
    }
});

function clearHighlights() {
    const spans = document.querySelectorAll('span.cms-audit-match');
    spans.forEach(span => {
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        // Optional: normalize to re-merge split text nodes
        parent.normalize();
    });
}

function runDOMScan(linesToMatch) {
    if (!linesToMatch || linesToMatch.length === 0) return;

    // Clear previous before starting new
    clearHighlights();

    let matchedLines = new Set();
    let nodesToWrap = [];

    // TreeWalker configuration
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function (node) {
                // Filter out empty text
                if (!node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;

                // Determine if visible
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                    return NodeFilter.FILTER_REJECT;
                }

                // Ignore certain tags
                const tag = parent.tagName.toLowerCase();
                // Removed 'nav', 'header', 'footer' to ensure full-page scanning
                if (['script', 'style', 'noscript', 'meta', 'title'].includes(tag)) {
                    return NodeFilter.FILTER_REJECT;
                }

                // Notice: no longer need to check for #cms-audit-sidebar as we use chrome.sidePanel now

                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
        const textContent = currentNode.nodeValue;

        // Check against every line from the document
        linesToMatch.forEach((targetLine, index) => {
            // Strict exact match logic within the text node
            // We search for the exact string targetLine in textContent
            const matchIndex = textContent.indexOf(targetLine);

            if (matchIndex !== -1) {
                matchedLines.add(index); // Mark this line as matched based on its index
                nodesToWrap.push({
                    node: currentNode,
                    start: matchIndex,
                    length: targetLine.length
                });
            }
        });
    }

    // Wrap matched text nodes
    wrapNodes(nodesToWrap);

    // Calculate statistics
    const totalCount = linesToMatch.length;
    const matchedCount = matchedLines.size;
    const missingCount = totalCount - matchedCount;

    const percentage = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

    const missingLinesArray = [];
    linesToMatch.forEach((line, index) => {
        if (!matchedLines.has(index)) {
            missingLinesArray.push(line);
        }
    });

    // Send results back to the side panel
    chrome.runtime.sendMessage({
        action: 'auditResults',
        stats: {
            total: totalCount,
            matched: matchedCount,
            missing: missingCount,
            percentage: percentage
        },
        missingLines: missingLinesArray,
        isBatchItem: isBatchItem,
        urlScanned: window.location.href,
        pageTitle: document.title || "Unknown Title"
    });
}

function wrapNodes(matches) {
    // Sort matches backwards by DOM order to avoid messing up indices 
    // if multiple matches occur in the same node (which shouldn't usually happen with split text, but just in case)
    // Actually, to safely split a node without ruining ranges, we process matches per-node carefully.

    // Group by node
    const matchesByNode = new Map();
    matches.forEach(m => {
        if (!matchesByNode.has(m.node)) {
            matchesByNode.set(m.node, []);
        }
        matchesByNode.get(m.node).push(m);
    });

    matchesByNode.forEach((nodeMatches, textNode) => {
        // Sort in reverse order by start index so we replace from end to beginning
        nodeMatches.sort((a, b) => b.start - a.start);

        let currentTextNode = textNode;
        nodeMatches.forEach(m => {
            const matchStart = m.start;
            const matchLen = m.length;

            if (matchStart + matchLen <= currentTextNode.length) {
                const matchedNode = currentTextNode.splitText(matchStart);
                matchedNode.splitText(matchLen); // the remainder

                const span = document.createElement('span');
                span.className = 'cms-audit-match';

                currentTextNode.parentNode.insertBefore(span, matchedNode);
                span.appendChild(matchedNode);
            }
        });
    });
}
