// Background script
// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Listen for messages from the side panel
let isAborted = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'stopBatchCrawl') {
    isAborted = true;
    sendResponse({ status: 'aborted' });
    return true;
  }
  if (request.action === 'startBatchCrawl') {
    const queue = request.queue || [];
    const scanDelay = request.delay !== undefined ? request.delay : 1500;
    let currentIndex = 0;
    isAborted = false;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || tabs.length === 0) {
        chrome.runtime.sendMessage({ action: 'batchCrawlComplete' });
        return;
      }
      const activeTabId = tabs[0].id;

      function processNext() {
        if (isAborted) {
          chrome.runtime.sendMessage({ action: 'batchCrawlComplete' });
          return;
        }

        if (currentIndex >= queue.length) {
          // Queue finished, notify sidebar to enable run button
          chrome.runtime.sendMessage({ action: 'batchCrawlComplete' });
          return;
        }

        const task = queue[currentIndex];

        // Navigate the active tab
        chrome.tabs.update(activeTabId, { url: task.url }, () => {

          let listenerFired = false;

          chrome.tabs.onUpdated.addListener(function listener(tId, info) {
            if (tId === activeTabId && info.status === 'complete' && !listenerFired) {
              listenerFired = true;
              chrome.tabs.onUpdated.removeListener(listener);

              // Inject scan command after user-defined delay
              setTimeout(() => {
                if (isAborted) return; // double check before injection

                chrome.tabs.sendMessage(activeTabId, {
                  action: 'runAudit',
                  lines: task.lines,
                  isBatchItem: true
                }).catch(err => {
                  console.error("Failed to run audit on batch tab:", err);
                  // Prevent a dangling listener if the tab fails to scan
                  chrome.runtime.onMessage.removeListener(resultListener);
                  currentIndex++;
                  processNext();
                });
              }, scanDelay);
            }
          });

          // Listen for the audit result from THIS specific tab to trigger the next one
          let resultReceived = false;
          const resultListener = (req, sender) => {
            if (req.action === 'auditResults' && req.isBatchItem && !resultReceived) {
              if (sender && sender.tab && sender.tab.id === activeTabId) {
                resultReceived = true;
                chrome.runtime.onMessage.removeListener(resultListener);
                setTimeout(() => {
                  currentIndex++;
                  processNext();
                }, 500);
              }
            }
          };
          chrome.runtime.onMessage.addListener(resultListener);
        });
      }

      processNext();
    });

    sendResponse({ status: 'batch_started' });
    return true;
  }

});
