const startButton = document.getElementById("start-session"); // Reference to the start session button
const stopButton = document.getElementById("stop-session"); // Reference to the stop session button
const { jsPDF } = require('jspdf'); // Importing jsPDF for PDF generation

__webpack_nonce__ = 'c29tZSBjb29sIHN0cmluZyB3aWxsIHBvcCB1cCAxMjM='; // Nonce for security purposes

// Check the current session status when the script loads
chrome.runtime.sendMessage({ type: "CHECK_SESSION" }, response => {
    try {
        // Update button visibility based on session status
        if (response.sessionActive) {
            startButton.style.display = "none"; // Hide start button if session is active
            stopButton.style.display = "block"; // Show stop button if session is active
        } else if (response.message) {
            alert(response.message); // Alert if an error message is received
        }
    } catch (error) {
        alert("An error occurred. Try again."); // Alert on any error during message handling
    }
});

// Event listener for the start session button
startButton.addEventListener("click", async () => {
    try {
        startButton.disabled = true; // Disable button to prevent multiple clicks
        chrome.runtime.sendMessage({ type: "START_SESSION" }, async (res) => {
            if (res.sessionActive) {
                // alert(JSON.stringify(res));
                // console.log(res);
                startButton.style.display = "none"; // Hide start button
                stopButton.style.display = "block"; // Show stop button

                // Fetch an image for the notification
                const response = await fetch('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZWGexhqe2H3z8KG-qiGGZpRAIMpmK-Xgifw&s');
                const blob = await response.blob(); // Convert response to a blob

                const url = URL.createObjectURL(blob); // Create an object URL for the blob

                // Create a notification for session start
                chrome.notifications.create(null, {
                    type: 'basic',
                    iconUrl: url, // Use the fetched image as an icon
                    title: "Session Started",
                    message: "Screenshot session has started.",
                });
                window.close(); // Close the popup window
            } else if (res.message) {
                alert("Something went wrong. Please try again."); // Alert if an error message is received
            }
            startButton.disabled = false; // Re-enable the button
        });
    } catch (error) {
        alert("An error occurred. Try again."); // Alert on any error during message handling
        startButton.disabled = false; // Re-enable the button
    }
});

// Event listener for the stop session button
stopButton.addEventListener("click", async () => {
    try {
        stopButton.disabled = true; // Disable button to prevent multiple clicks
        chrome.runtime.sendMessage({ type: "STOP_SESSION" }, async (response) => {
            if (!response.message) {
                createpdf(response).then(() => {
                    startButton.style.display = "block"; // Show start button again
                    stopButton.style.display = "none"; // Hide stop button
                }).catch((err) => {
                    startButton.style.display = "block"; // Show start button again
                    stopButton.style.display = "none"; // Hide stop button
                    alert(err);
                });
            } else {
                alert(response.message); // Alert if an error message is received
                // console.log(response);
            }
            stopButton.disabled = false; // Re-enable the button
        });
    } catch (error) {
        alert("An error occurred. Try again."); // Alert on any error during message handling
        stopButton.disabled = false; // Re-enable the button
    }
});

// Function to create a PDF from the captured screenshots
function createpdf(response) {
    return new Promise(async (resolve, reject) => {
        // Check if there are any screenshots to include in the PDF
        if (response.screenshots && response.screenshots.length > 0) {
            const pdf = new jsPDF(); // Create a new jsPDF instance
            const pdfWidth = pdf.internal.pageSize.getWidth(); // Get the width of the PDF
            const pdfHeight = pdf.internal.pageSize.getHeight(); // Get the height of the PDF
            const margin = 10; // Define a margin for the images

            // Process screenshots in pairs
            for (let i = 0; i < response.screenshots.length; i += 2) {
                // Add a new page for each pair of images
                if (i > 0) {
                    pdf.addPage(); // Add a new page for subsequent pairs
                }

                // Calculate vertical position for the images
                const availableHeight = pdfHeight - 2 * margin; // Total height available for images
                const imgCount = Math.min(2, response.screenshots.length - i); // Number of images to add on this page
                const totalHeight = (imgCount * availableHeight) / imgCount; // Height allocation for images
                const yPos1 = (pdfHeight - totalHeight) / 2; // Calculate top position for centering

                for (let j = 0; j < imgCount; j++) {
                    const imgData = response.screenshots[i + j].image; // Get the screenshot data
                    if (!imgData) continue; // Skip if no image data

                    const img = new Image(); // Create a new image instance
                    img.src = imgData; // Set the image source to the screenshot data

                    // Wait for the image to load
                    await new Promise((resolve, reject) => {
                        img.onload = () => resolve(); // Resolve the promise when the image loads
                        img.onerror = () => reject("Error loading image: " + imgData); // Handle image loading error
                    });

                    const imgWidth = img.width; // Get the width of the loaded image
                    const imgHeight = img.height; // Get the height of the loaded image
                    const aspectRatio = imgWidth / imgHeight; // Calculate aspect ratio
                    const newWidth = pdfWidth - 2 * margin; // Calculate new width considering margins
                    const newHeight = newWidth / aspectRatio; // Calculate new height to maintain aspect ratio

                    // Calculate Y position for each image on this page
                    const yPos = yPos1 + (j * (totalHeight / imgCount)); // Adjust Y position based on index

                    // Add the image to the PDF
                    pdf.addImage(imgData, 'PNG', margin, yPos, newWidth, newHeight); // Add the image to the PDF
                }
            }

            pdf.save('screenshots.pdf'); // Save the generated PDF
            resolve("PDF generated successfully");
        } else {
            reject("No screenshots available."); // Better error message
        }
    });
}

