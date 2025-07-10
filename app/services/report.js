import mongoose from "mongoose";
import { getCompletion } from "./genAIClient.js";
import model from "../models/report.js";


export async function createCommonProblems(documents = []) {
    if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error("Documents input must be a non-empty array.");
    }

    const allProblems = [];
    for (const doc of documents) {
        const docId = doc.id?.toString();
        for (const problem of doc.problems) {
            allProblems.push({
                id: problem.id?.toString() || new mongoose.Types.ObjectId().toString(),
                category: problem.category || [],
                description: problem.description?.english || "",
                sourceDocumentId: docId 
            });
        }
    }


    const prompt = `You are an expert AI assistant specializing in analyzing citizen complaint documents related to city infrastructure.

You are given an array of document objects. Each document object represents a citizen complaint and has the following structure:

- "id" (string, MongoDB ObjectId): Unique identifier of the document.
- "name" (string): Name of the complainant.
- "phoneNumber" (string): Phone number of the complainant.
- "ward" (string): The ward number or name.
- "issues" (array of strings): High-level issues/tags related to the complaint (e.g., "garbage", "water", "sewage").
- "problems" (array of objects): Each object has:
  - "category" (array of strings): Categories/issues related to this specific problem.
  - "description" (object with english and hindi keys): The textual complaint in both languages.

Your task is to analyze all documents and:
1. **Carefully read and interpret only the english description** field of each problem.
2. Group documents into **common problem groups** based on:
   - Overlap or similarity in category values.
   - Semantic similarity in the **English problem descriptions**.
3. For each group, generate:
   - "problemIds": An array of objects having docId (storing the sourceDocumentId) and problemId (storing the id of the problem).
   - "issues": A merged array of all "category" values from the documents in the group (deduplicated if needed).
   - "summary": A **one-line summarized sentence** that reflects the core issue described by the English descriptions of the group.

**Rules and Output Format**:
- Every document **must be included in exactly one group**.
- No document may be duplicated or skipped.
- Avoid generic summaries. Summaries must reflect actual problems in the descriptions.
- Output must be a **valid JSON array**. Each element should follow this structure:


[
  {
    "problemIds": [{ "docId": "<docId1>", "problemId": "<problemId1>" }, { "docId": "<docId2>", "problemId": "<problemId2>" }, ...],
    "issues": ["<issue1>", "<issue2>", ...],
    "summary": "A clear one-line summarization of the shared issue"
  },
]
Analyze the following documents:
${JSON.stringify(allProblems, null, 2)}
`;

    try {
        let responseText = await getCompletion({ prompt });

        responseText = responseText
            .trim()
            .replace(/^```json\s*/i, '') 
            .replace(/^```\s*/i, '')      
            .replace(/```$/, '');

        let commonProblems;
        try {
            commonProblems = JSON.parse(responseText);
        } catch (err) {
            console.error("GenAI response is not valid JSON:", responseText);
            throw new Error("GenAI response is not a valid JSON array.");
        }

        const finalOutput = commonProblems.map(problem => {
            if (
                !Array.isArray(problem.problemIds) ||
                !Array.isArray(problem.issues) ||
                typeof problem.summary !== "string"
            ) {
                throw new Error("Invalid problem group format from GenAI.");
            }

            return {
                id: new mongoose.Types.ObjectId(), 
                problemIds: problem.problemIds,
                issues: problem.issues,
                summary: problem.summary.trim()
            };
        });

        return finalOutput;
    } catch (error) {
        console.error("Failed to create common problems:", error.message);
        throw error;
    }
}

export const save = (saveObj) => {
    return new model(saveObj).save();
}

export const findOne = (criteria, projection, options = {}) => {
    options.lean = true;
    return model.findOne(criteria, projection, options);
}
