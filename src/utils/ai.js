const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const diagnoseIssue = async (applianceType, problemDescription) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `
      You are an expert appliance repair technician.
      
      Appliance: ${applianceType}
      Problem: ${problemDescription}
      
      Diagnose the issue and provide the following details in strict JSON format:
      {
        "likely_cause": "Brief explanation of what might be wrong",
        "estimated_cost_range": "Estimated repair cost in INR (e.g., ₹500 - ₹1500)",
        "severity": "low | medium | high",
        "advice": "Actionable advice for the user (e.g., Check power supply, Do not use, etc.)",
        "is_safe_to_use": true or false
      }
      
      Output ONLY the JSON. Do not include markdown formatting.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.error('AI Diagnosis Error:', error);
    throw new Error(`AI Error: ${error.message}`);
  }
};

module.exports = { diagnoseIssue };
