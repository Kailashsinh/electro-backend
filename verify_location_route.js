const axios = require('axios');

async function testLocationUpdate() {
    const API_URL = 'http://localhost:5000/api'; // Adjust if your backend port is different
    const token = 'YOUR_TECH_TOKEN_HERE'; // User needs to provide or I can try to get from logs if I had it

    try {
        // Note: Since I don't have a valid tech token for this session easily, 
        // I'll just check if the route is registered by hitting it without a token.
        // If it returns 401/403 (Auth error) instead of 404, the route exists.
        const res = await axios.patch(`${API_URL}/technician/location`, {}, {
            validateStatus: (status) => true
        });

        console.log('Status Code:', res.status);
        if (res.status === 401 || res.status === 403) {
            console.log('SUCCESS: Route exists (Unauthorized is expected without token).');
        } else if (res.status === 404) {
            console.log('FAILURE: Route still returning 404.');
        } else {
            console.log('Received status:', res.status);
        }
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testLocationUpdate();
