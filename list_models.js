const fs = require('fs');
require('dotenv').config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        console.log(`Fetching models from: ${url}`);

        const response = await fetch(url);
        const data = await response.json();

        console.log('--- Available Models ---');
        if (data.models) {
            fs.writeFileSync('models_list.log', JSON.stringify(data.models, null, 2));
            data.models.forEach(m => {
                console.log(m.name);
            });
        } else {
            console.log('No models or error:', JSON.stringify(data, null, 2));
            fs.writeFileSync('models_list.log', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error listing models:', error);
        fs.writeFileSync('models_list.log', `Error: ${error.message}`);
    }
}

listModels();
