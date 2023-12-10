const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { AssemblyAI } = require('assemblyai');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const baseDir = '/nfs/stak/users/gonzayah/CS361/Milestone_1/my-audio-stream-server';
app.use(express.static(baseDir));

const ASSEMBLYAI_API_KEY = 'f289488598c94d9aa4a6447cacdc3a5c'; // Replace with your actual API key
const assemblyClient = new AssemblyAI({
    token: ASSEMBLYAI_API_KEY
});
const audioUrl = '/nfs/stak/users/gonzayah/CS361/Milestone_1/my-audio-stream-server/sample.mp3';
const audioDirectory = '/nfs/stak/users/gonzayah/CS361/Milestone_1/my-audio-stream-server';

// Serve static files from the specified directory
app.use(express.static(audioDirectory));


const client = new AssemblyAI({
  apiKey: 'f289488598c94d9aa4a6447cacdc3a5c',
});

const FILE_URL = 'https://imxze2im7tagxmrw.public.blob.vercel-storage.com/sample-tOsE3CnrnIzuo7BFyynOS8i6MHzBnz.mp3';

// You can also transcribe a local file by passing in a file path
// const FILE_URL = './path/to/file.mp3';

// Request parameters
const data = {
  audio_url: FILE_URL,
  language_detection: true,
}

const run = async () => {
  const transcript = await client.transcripts.create(data);
  console.log(transcript.text);
};

run();














// Function to save a transcript ID
function saveTranscriptId(id) {
    const transcriptIds = getTranscriptIdsFromDatabase();
    transcriptIds.push(id);
    fs.writeFileSync(path.join(__dirname, 'transcriptIds.json'), JSON.stringify(transcriptIds));
}

// Function to get all transcript IDs
function getTranscriptIdsFromDatabase() {
    if (fs.existsSync(path.join(__dirname, 'transcriptIds.json'))) {
        const data = fs.readFileSync(path.join(__dirname, 'transcriptIds.json'));
        return JSON.parse(data);
    } else {
        return [];
    }
}

// Function to submit the audio file for transcription
async function submitAudioForTranscription(audioUrl) {
    try {
        const response = await axios.post('https://api.assemblyai.com/v2/transcript', {
            audio_url: audioUrl
        }, {
            headers: { 'authorization': ASSEMBLYAI_API_KEY, 'content-type': 'application/json' }
        });

        if (response.data && response.data.id) {
            saveTranscriptId(response.data.id); // Save the transcript ID
            return response.data.id;
        } else {
            throw new Error('Transcription ID not received');
        }
    } catch (error) {
        console.error('Error in submitting audio for transcription:', error);
        throw error;
    }
}

// Function to check the status of the transcription
async function checkTranscriptionStatus(transcriptId) {
    try {
        const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { 'authorization': ASSEMBLYAI_API_KEY }
        });

        return response.data;
    } catch (error) {
        console.error('Error in checking transcription status:', error);
        throw error;
    }
}

// Route handler to start the transcription process
app.get('/start-transcription', async (req, res) => {
    const audioUrl = req.query.audioUrl; // Get the audio URL from the query parameters

    try {
        const transcriptId = await submitAudioForTranscription(audioUrl);

        // Polling for transcription result
        let transcriptionResult;
        do {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking the status
            transcriptionResult = await checkTranscriptionStatus(transcriptId);
        } while (transcriptionResult.status !== 'completed' && transcriptionResult.status !== 'error');

        if (transcriptionResult.status === 'completed' && transcriptionResult.text) {
            res.send(transcriptionResult.text);
        } else {
            throw new Error('Transcription failed or incomplete');
        }
    } catch (error) {
        console.error('Error in transcription process:', error);
        res.status(500).send({ message: 'Error in transcription process', error: error.message });
    }
});

app.get('/list-transcripts', async (req, res) => {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 10;

    try {
        const transcripts = await getTranscripts(page, pageSize);
        res.json(transcripts);
    } catch (error) {
        console.error('Error fetching transcripts:', error);
        res.status(500).send('Error fetching transcripts');
    }
});

async function getTranscripts(page, pageSize) {
    const transcriptIds = getTranscriptIdsFromDatabase(); // You need to implement this function
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageTranscriptIds = transcriptIds.slice(start, end);
    const transcripts = await Promise.all(pageTranscriptIds.map(id => getTranscriptFromAssemblyAI(id)));
    return transcripts;
}

async function getTranscriptFromAssemblyAI(id) {
    try {
        const response = await axios.get(`https://api.assemblyai.com/v2/transcript/${id}`, {
            headers: { 'authorization': ASSEMBLYAI_API_KEY }
        });

        return response.data;
    } catch (error) {
        console.error('Error in AssemblyAI request:', error);
        throw error;
    }
}


// New endpoint for transcribing audio
app.get('/transcribe-audio', async (req, res) => {
    const audioUrl = req.query.audioUrl; // Extract audio URL from the query

    if (!audioUrl) {
        return res.status(400).send({ message: 'Audio URL is required' });
    }

    try {
        const transcriptId = await submitAudioForTranscription(audioUrl);

        let transcriptionResult;
        do {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds
            transcriptionResult = await checkTranscriptionStatus(transcriptId);
        } while (transcriptionResult.status !== 'completed' && transcriptionResult.status !== 'error');

        if (transcriptionResult.status === 'completed' && transcriptionResult.text) {
            res.send({ transcriptionText: transcriptionResult.text });
        } else {
            throw new Error('Transcription failed or incomplete');
        }
    } catch (error) {
        console.error('Error in transcribing audio:', error);
        res.status(500).send({ message: 'Error in transcribing audio', error: error.message });
    }
});





const ws = new WebSocket('wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000', {
    headers: { 'authorization': ASSEMBLYAI_API_KEY }
});

ws.on('open', function open() {
    console.log('WebSocket connection established with AssemblyAI');
});

ws.on('message', function incoming(data) {
    const transcriptionChunk = JSON.parse(data);

    // Check if the message is a transcription result
    if (transcriptionChunk.message_type === 'TranscriptResult' && transcriptionChunk.status === 'completed' && transcriptionChunk.text) {
        io.emit('transcription update', transcriptionChunk.text);
    } else if (transcriptionChunk.message_type === 'SessionBegins') {
        console.log('Session has begun:', transcriptionChunk);
    } else {
        console.error('Received an unhandled message type:', transcriptionChunk);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});