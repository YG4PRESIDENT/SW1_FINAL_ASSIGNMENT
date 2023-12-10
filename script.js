// Include Socket.IO library
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    // Define all necessary DOM elements
    const playButton = document.getElementById('playButton');
    const transcribeButton = document.getElementById('transcribeButton');
    const audioPlayer = document.getElementById('audioPlayer');
    const messages = document.getElementById('messages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const toggleDarkModeButton = document.getElementById('toggleDarkMode');
    const toggleHighContrastButton = document.getElementById('toggleHighContrast');
    const increaseTextSizeButton = document.getElementById('increaseTextSize');
    const transcriptionBox = document.getElementById('transcriptionBox');

    // Play Button Event Listener
    if (playButton) {
        playButton.addEventListener('click', function () {
            audioPlayer.src = '/start-audio-stream'; // Ensure this endpoint exists on your server
            audioPlayer.load();
            audioPlayer.play();
            playButton.style.display = 'none';
            audioPlayer.style.display = 'block';
        });
    }

    // Transcribe Button Event Listener
    if (transcribeButton) {
        transcribeButton.addEventListener('click', function () {
            fetch('/transcribe-audio?audioUrl=' + encodeURIComponent(audioPlayer.src)) // Ensure this endpoint exists on your server
                .then(response => response.text())
                .then(transcription => {
                    transcriptionBox.value = transcription;
                })
                .catch(error => console.error('Error in transcription:', error));
        });
    }

    // Send Button Event Listener
    if (sendButton) {
        sendButton.addEventListener('click', function () {
            const message = messageInput.value.trim();
            if (message) {
                appendMessage(message, 'Me');
                socket.emit('chat message', message); // Emit the message to the server
                messageInput.value = '';
            }
        });
    }

    // Toggle Dark Mode
    if (toggleDarkModeButton) {
        toggleDarkModeButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
        });
    }

    // Toggle High Contrast
    if (toggleHighContrastButton) {
        toggleHighContrastButton.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
        });
    }

    // Increase Text Size
    if (increaseTextSizeButton) {
        increaseTextSizeButton.addEventListener('click', () => {
            document.body.classList.toggle('large-text');
        });
    }

    // Socket Event for Receiving Messages
    socket.on('chat message', (msg) => {
        appendMessage(msg, 'Someone'); // Display received message
    });

    // Function to Append Message to Chat
    function appendMessage(msg, sender) {
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message');
        messageDiv.innerHTML = `<span class="message-text">${sender}: ${msg}</span>
                                <span class="message-timestamp">${timestamp}</span>`;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight; // Scroll to the latest message
    }

    // Pagination and Transcript Display (if used)
    const prevPageButton = document.getElementById('prevPageButton');
    let currentPageUrl = '/list-transcripts'; // Ensure this endpoint exists on your server

    if (prevPageButton) {
        prevPageButton.addEventListener('click', () => {
            fetchAndDisplayTranscripts(currentPageUrl);
        });
    }

    function fetchAndDisplayTranscripts(url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                const transcripts = data.transcripts.map(transcript => `
                    <li>
                        Transcript ID: ${transcript.id}, Status: ${transcript.status}, Created On: ${transcript.created}
                        <a href="${transcript.resource_url}">View Transcript</a>
                    </li>
                `).join('');
    
                document.getElementById('transcriptsContainer').innerHTML = `<ul>${transcripts}</ul>`;
    
                // Update pagination buttons
                prevPageButton.style.display = data.page_details.prev_url ? 'block' : 'none';
                currentPageUrl = data.page_details.prev_url ? `${currentPageUrl}?prev_url=${data.page_details.prev_url}` : currentPageUrl;
            })
            .catch(error => console.error('Error fetching transcripts:', error));
    }

    // Listen for News Alerts from the Server
    socket.on('news alert', (alert) => {
        const alertItem = document.createElement('div');
        alertItem.textContent = alert;
        alertItem.classList.add('alert-item');
        document.getElementById('alerts').appendChild(alertItem);
    });
});
