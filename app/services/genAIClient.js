import genAI from "./gemini.js"; 

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Generates text output from GenAI based on the provided prompt.
 * @param {Object} param0
 * @param {string} param0.prompt - The prompt to send to Gemini
 * @returns {Promise<string>} - The plain text response from GenAI
 */
export async function getCompletion({ prompt }) {
    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text(); // Raw string from Gemini
    } catch (error) {
        console.error("GenAI (Gemini) Error:", error.message);
        throw new Error("Error generating content from GenAI.");
    }
}
