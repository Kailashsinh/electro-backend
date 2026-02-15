const fs = require('fs');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/ai/diagnose';

async function testAI() {
    try {
        console.log('Testing AI Diagnosis...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                applianceType: 'Air Conditioner',
                description: 'It is making a loud banging noise and not cooling at all.'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        console.log('--- Diagnosis Result ---');
        console.log(JSON.stringify(data, null, 2));

        fs.writeFileSync('ai_test_success.log', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('Test Failed:', error.message);
        fs.writeFileSync('ai_test_error.log', `Error: ${error.message}\n${JSON.stringify(error, null, 2)}`);
    }
}

testAI();
