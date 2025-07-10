import genAI from "./gemini.js";
import fs from "fs";
import path from "path";

const getImageBase64 = (filePath) => {
    const imageBuffer = fs.readFileSync(filePath);
    return {
        inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: "image/jpeg",
        },
    };
};

export const analyzeComplaintImages = async (imagePaths = []) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const imageParts = imagePaths.map(getImageBase64);

    const prompt = `
You are analyzing scanned pages of complaints. 
For each page, extract:
- name
- ward: Extract ward number from labels like "Ward", "Ward No.", "Ward Number", "W.No.", "W-12", or Hindi variants like "वार्ड संख्या", "वार्ड क्रमांक", "वार्ड नंबर", etc. Normalize all of them under a single key: "ward"
- phone number
- imageUrl: the image file being analyzed (to be inserted by the system, not you)
- issues: array of unique problem fields from each problem
- problems: array of objects , object for each marked problem, each having its category specified and has 
    problem written in both english and hindi languages, in the description field, such as : 
  - category: "water", "electricity", "garbage", "pollution", "roads", "education", "farming", "general"
  - description: { english: "...", hindi: "..." }


DO NOT:
- Rephrase, summarize, or infer anything.
- Put the same text in both "hindi" and "english" fields.
- Invent problems that aren’t clearly visible.

DO:
- Detect the original language of each problem.
- Copy the original problem into the correct field ("hindi" or "english").
- Translate the original problem exactly (no paraphrasing) into the other language to store in the other language's field.
- ward: extract from the page if written as "ward", "ward no.", "ward number", "W.No.", "W-12", or Hindi versions like "वार्ड संख्या", "वार्ड क्रमांक", or "वार्ड".
- If the name is written in Hindi, transliterate it to English and store it as: EnglishName (HindiName). For example, if name is राम, save it as: Ram (राम)
- If the name is already in English, leave it unchanged.
- Never put the Hindi name before the English name.
- Always return the name as EnglishName (HindiName), even if detected in Hindi script.

⚠️ Always use "ward" as the key, no matter how the ward was written.


Example:
If the complaint is written in Hindi like:  
"गांव में सड़कें खराब हैं और बारिश में कीचड़ हो जाता है।"  
Then output:
"description": {
  "hindi": "गांव में सड़कें खराब हैं और बारिश में कीचड़ हो जाता है।",
  "english": "The roads in the village are bad and it becomes muddy during rains."
}

Return as JSON array like:

[
  {
    "name": "...",
    "ward": "...",
    "phoneNumber": "...",
    "imageUrl": "..." ,
    "issues": [...],
     "problems": [{
        "category": "water",
        "description": {
          "english": "...",
          "hindi": "..."
        }
      }
    ]
  }
]
`;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, ...imageParts] }],
    });

    const response = await result.response;
    const rawText = response.text(); 

    // Remove ```json and ``` if present
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch (err) {
        console.error("Failed to parse Gemini response:", err.message);
        throw err;
    }

    // Attach imageUrl to each parsed result
    const resultWithUrls = parsed.map((item, index) => {
        const localPath = imagePaths[index]; // e.g. "uploads/generated/..."
        const relativeUrl = localPath.replace(process.cwd(), '').replace(/\\/g, '/');
        return {
            ...item,
            imageUrl: relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
        };
    });

    return resultWithUrls;
};
