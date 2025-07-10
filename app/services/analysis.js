import model from "../models/analysis.js";

export const analyzeDocuments = async (documents) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("Documents input must be a non-empty array.");
  }

  const wardMap = new Map();

  for (const doc of documents) {
    const ward = doc.ward || "Ward not provided";
    const problems = Array.isArray(doc.problems) ? doc.problems : [];

    if (!wardMap.has(ward)) {
      wardMap.set(ward, {
        totalProblems: 0,
        issueMap: new Map(),
      });
    }

    const wardEntry = wardMap.get(ward);
    wardEntry.totalProblems += problems.length;

    for (const problem of problems) {
      const categories = Array.isArray(problem.category) ? problem.category : [];

      for (const issue of categories) {
        if (typeof issue !== "string" || issue.trim() === "") continue;

        const currentCount = wardEntry.issueMap.get(issue) || 0;
        wardEntry.issueMap.set(issue, currentCount + 1);
      }
    }
  }

  const result = Array.from(wardMap.entries()).map(
    ([ward, { totalProblems, issueMap }]) => ({
      ward,
      totalProblems,
      category: Array.from(issueMap.entries()).map(([issue, count]) => ({
        issue,
        problemCount: count,
      })),
    })
  );


  return result;
};


export const save = (saveObj) => {
    return new model(saveObj).save();
}

export const findOne = (criteria, projection, options = {}) => {
    options.lean = true;
    return model.findOne(criteria, projection, options);
}
