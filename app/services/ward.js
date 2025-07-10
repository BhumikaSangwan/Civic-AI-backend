import mongoose from "mongoose";
import { getCompletion } from "./genAIClient.js";
import model from "../models/ward.js";

/**
 * Generates ward-wise common problems using GenAI based on documents.
 * @param {Array} documents - Array of document objects with nested problems.
 * @returns {Promise<Array>} - Array of ward-wise common problems suitable for MongoDB insertion.
 */
export async function createWardProblems(documents) {
    if (!Array.isArray(documents)) throw new Error("documents must be an array");

    const allProblems = [];

    // Flatten all problems
    for (const doc of documents) {
        const ward = doc.ward || "Ward not provided";
        const docId = doc.id?.toString();

        for (const problem of doc.problems || []) {
            allProblems.push({
                ward,
                category: problem.category || [],
                description: problem.description?.english || "",
                docId,
                problemId: problem.id?.toString() || new mongoose.Types.ObjectId().toString()
            });
        }
    }

    // 🧠 Prompt with ward-level category + short summaries
    const prompt = `
You are analyzing rural ward complaint data. Each entry contains:
- ward name
- category/tags (array)
- English description
- docId and problemId

Your task is to group similar problems by **ward** and summarize them.

For each **ward**, return:
- "ward": string (the ward name)
- "category": a single summarized issue/topic that best represents the ward’s overall problems (e.g., "lack of infrastructure", "water shortage")
- "problems": an array of grouped problems within the ward. Each should contain:
  - "issues": unique tags combined from grouped problems
  - "summary": a **short** 0.5 to 1 line description summarizing the core issue
  - "problemIds": list of { docId, problemId }

⚠️ Do NOT return markdown or wrap in \`\`\`. Return only raw JSON.

Format:
[
  {
    "ward": "Ward 1",
    "category": "poor sanitation",
    "problems": [
      {
        "issues": ["garbage", "drainage"],
        "summary": "Garbage accumulates due to irregular cleaning.",
        "problemIds": [
          { "docId": "abc", "problemId": "p1" }
        ]
      }
    ]
  }
]

Here is the input data:
${JSON.stringify(allProblems, null, 2)}
`;

    // Call GenAI
    const completionText = await getCompletion({ prompt });

    const cleanedText = completionText
        .replace(/^```(json|javascript)?\s*/i, '')
        .replace(/```$/, '')
        .trim();

    // Parse and validate output
    try {
        const parsed = JSON.parse(cleanedText);

        const result = parsed.map((wardGroup, index) => {
            if (
                typeof wardGroup.ward !== "string" ||
                typeof wardGroup.category !== "string" ||
                !Array.isArray(wardGroup.problems)
            ) {
                throw new Error(`Invalid ward group at index ${index}`);
            }

            const filteredProblems = wardGroup.problems
                .filter(p =>
                    Array.isArray(p.issues) &&
                    typeof p.summary === "string" &&
                    p.summary.trim().length > 0 &&
                    Array.isArray(p.problemIds)
                )
                .map(p => ({
                    issues: p.issues,
                    summary: p.summary.trim(),
                    problemIds: p.problemIds
                }));

            if (filteredProblems.length === 0) {
                throw new Error(`Ward "${wardGroup.ward}" has no valid problems.`);
            }

            return {
                wardId: new mongoose.Types.ObjectId(),
                ward: wardGroup.ward.trim(),
                category: wardGroup.category.trim(),
                problems: filteredProblems
            };
        });

        return result;
    } catch (err) {
        console.error("Failed to parse Gemini response:", cleanedText);
        throw new Error("Invalid JSON response from GenAI.");
    }
}

export const save = (saveObj) => {
    return new model(saveObj).save();
}

export const findOne = (criteria, projection, options = {}) => {
    options.lean = true;
    return model.findOne(criteria, projection, options);
}