window.onload = () => {
    // Listen for changes to fullscreen status
    document.addEventListener("fullscreenchange", () => {
        try {
            // Check if the document is in fullscreen mode
            if (document.fullscreenElement) {
                // Notify the background script that fullscreen is active
                console.log("Entering full screen")
                chrome.runtime.sendMessage({ type: "Toggle_FullScreen", value: true }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending Toggle_FullScreen message:", chrome.runtime.lastError.message);
                    }
                });
            } else {
                console.log("Exiting full screen")
                // Notify the background script that fullscreen is no longer active
                chrome.runtime.sendMessage({ type: "Toggle_FullScreen", value: false }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending Toggle_FullScreen message:", chrome.runtime.lastError.message);
                    }
                });
            }
        } catch (error) {
            console.error("Error in fullscreen change event: ", error);
        }
    });

    // Listen for keydown events to check for specific key presses
    document.addEventListener("keydown", (event) => {
        if (event.key === 'Y') {
            chrome.runtime.sendMessage({ type: "CHECK_FULLSCREEN" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending CHECK_FULLSCREEN message:", chrome.runtime.lastError.message);
                } else {
                    try {
                        if (response.fullscreen && response.sessionActive) {
                            captureScreen(); // Call function to capture the screen
                        }
                    } catch (error) {
                        console.error("Error processing response from background script: ", error);
                    }
                }
            });
        }
    });

    // Function to send a message to the background script for screen capture
    function captureScreen() {
        try {
            chrome.runtime.sendMessage({ type: "captureScreen" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending captureScreen message:", chrome.runtime.lastError.message);
                }
            });
        } catch (error) {
            console.error("Error sending message to capture screen: ", error);
        }
    }
};
