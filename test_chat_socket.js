const io = require('socket.io-client');
const axios = require('axios');

async function testChat() {
    const backendUrl = 'http://localhost:5000';
    const requestId = '67b848039d67fb80686948ad'; // Need a valid requestId from DB if possible

    // I don't have tokens, but I can check if I can connect
    const socket = io(backendUrl, {
        auth: { token: 'invalid' }
    });

    socket.on('connect_error', (err) => {
        console.log('Connect error (Expected if token invalid):', err.message);
    });

    socket.on('connect', () => {
        console.log('Connected to socket!');
        socket.emit('join_chat', requestId);
    });

    socket.on('new_message', (msg) => {
        console.log('Received message:', msg);
    });

    setTimeout(() => {
        console.log('Test timed out');
        process.exit(0);
    }, 5000);
}

testChat();
