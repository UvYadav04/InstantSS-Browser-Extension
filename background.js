let sessionActive = false; // Variable to track if the session is active
let screenshots = []; // Array to store captured screenshots
let fullscreen = false; // Variable to track fullscreen status
__webpack_nonce__ = 'c29tZSBjb29sIHN0cmluZyB3aWxsIHBvcCB1cCAxMjM='; // Nonce for security purposes

let db; // Global database object

// Function to open or create IndexedDB
function opendatabase() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open('ScreenshotDB', 1);

        request.onerror = function (event) {
            console.error("Database error: ", event.target.errorCode);
            reject("Database error: " + event.target.errorCode);
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            resolve("Database opened successfully");
        };

        request.onupgradeneeded = function (event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains('screenshots')) {
                db.createObjectStore('screenshots', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Function to save screenshot in IndexedDB using a promise
function saveScreenshot(image) {
    return new Promise((resolve, reject) => {
        if (!db) {
            opendatabase().then(() => {
                saveScreenshot(image).then(resolve).catch(reject); // Retry saving after reopening the database
            }).catch((error) => {
                reject("Failed to open database for saving screenshot.");
            });
            return;
        }

        let transaction = db.transaction(['screenshots'], 'readwrite');
        let objectStore = transaction.objectStore('screenshots');
        let request = objectStore.add({ image: image, timestamp: new Date().getTime() });

        request.onsuccess = function () {
            resolve("Screenshot saved successfully");
        };

        request.onerror = function (event) {
            console.error("Error saving screenshot: ", event.target.errorCode);
            reject("Error saving screenshot: " + event.target.errorCode);
        };
    });
}

// Function to retrieve screenshots from IndexedDB using a promise
function getScreenshots() {
    return new Promise((resolve, reject) => {
        if (!db) {
            opendatabase().then(() => {
                getScreenshots().then(resolve).catch(reject); // Retry retrieving after reopening the database
            }).catch((error) => {
                reject("Failed to open database for retrieving screenshots.");
            });
            return;
        }

        // Use a readwrite transaction to get and clear screenshots in one go
        let transaction = db.transaction(["screenshots"], "readwrite");
        let objectStore = transaction.objectStore("screenshots");

        let request = objectStore.getAll(); // Retrieve all records at once

        request.onsuccess = function (event) {
            let screenshots = event.target.result;

            // Clear the screenshots after retrieval within the same transaction
            let clearRequest = objectStore.clear();

            clearRequest.onsuccess = function () {
                // Optional: You can log success message for clearing
            };

            clearRequest.onerror = function (event) {
                console.error("Error clearing screenshots: ", event.target.errorCode);
            };

            resolve(screenshots); // Return the array of screenshots
        };

        request.onerror = function (event) {
            console.error("Error retrieving screenshots: ", event.target.errorCode);
            reject("Error retrieving screenshots: " + event.target.errorCode);
        };
    });
}

// Function to handle screenshot capture
function captureScreenshot(sendResponse) {
    try {
        chrome.storage.local.get(['sessionActive'], (response) => {
            if (response.sessionActive) {
                chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: chrome.runtime.getURL('logo2.png'), // Change this to your icon path
                        title: "Screenshot captured",
                        message: "Screenshot captured successfully.",
                    });

                    saveScreenshot(image).then((message) => {
                        screenshots.push(image); // Store the captured image in the array
                        sendResponse({ success: true, screenshots: screenshots }); // Send success response
                    }).catch((error) => {
                        console.error(error); // Log any errors
                        sendResponse({ success: false, message: error });
                    });
                });
            } else {
                sendResponse({ success: false }); // Send failure response
            }
        });
    } catch (error) {
        console.error("Error capturing screenshot: ", error);
        sendResponse({ success: false, message: "Unable to access local storage for screenshot capture." });
    }
}

// Listen for messages from content scripts or other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.type === "START_SESSION") {
            // Open the database when starting the session
            opendatabase().then((message) => {
                sessionActive = true; // Set sessionActive to true
                chrome.storage.local.set({ sessionActive: true }, () => {
                    sendResponse({ sessionActive: true, message: message });
                });
            }).catch((error) => {
                console.error("Error opening database: ", error);
                sendResponse({ success: false, message: "Failed to open database. Session not started." });
            });
            return true; // Keep the message channel open for asynchronous response
        } else if (request.type === "STOP_SESSION") {
            sessionActive = false; // Set sessionActive to false
            chrome.storage.local.remove('sessionActive', () => {
                getScreenshots().then((savedScreenshots) => {
                    sendResponse({ sessionActive: sessionActive, screenshots: savedScreenshots });
                }).catch((error) => {
                    sendResponse({ success: false, message: error });
                });
            });
            return true; // Keep the message channel open for asynchronous response
        } else if (request.type === "CHECK_SESSION") {
            chrome.storage.local.get(['sessionActive'], (result) => {
                sessionActive = result.sessionActive || false; // Default to false if not found
                sendResponse({ sessionActive: sessionActive });
            });
            return true; // Keep the message channel open for asynchronous response
        } else if (request.type === "Toggle_FullScreen") {
            fullscreen = request.value; // Update fullscreen status
            if (request.value) {
                chrome.storage.local.set({ fullscreen: true }, () => {
                    sendResponse({ success: true });
                });
            } else {
                chrome.storage.local.remove("fullscreen", () => {
                    sendResponse({ success: true });
                });
            }
            return true; // Keep the message channel open for asynchronous response
        } else if (request.type === "CHECK_FULLSCREEN") {
            chrome.storage.local.get(['fullscreen', 'sessionActive'], (result) => {
                sendResponse({ fullscreen: result.fullscreen || false, sessionActive: result.sessionActive || false });
            });
            return true; // Keep the message channel open for asynchronous response
        } else if (request.type === "captureScreen") {
            captureScreenshot(sendResponse); // Call the function to capture the screenshot
            return true; // Keep the message channel open for asynchronous response
        }
    } catch (error) {
        console.error("Error handling message: ", error); // Log any errors that occur
        sendResponse({ success: false, message: "An error occurred while processing the request." });
    }
});

// Listen for command events triggered by user shortcuts
chrome.commands.onCommand.addListener((command) => {
    try {
        console.log("in command")
        if (command === "take_screenshot") {
            console.log("screenshot")
            captureScreenshot((response) => {
                console.log(response)
                // Handle the response for the command if necessary
            }); // Call the function to capture the screenshot
        }
    } catch (error) {
        console.log(error)
    }
});
