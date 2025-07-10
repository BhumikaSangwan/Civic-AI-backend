import z from "zod";

export const reportSchema = z.object({
    reqId: z.string().min(1),
    commonProblems: z.array(
        z.object({
            id: z.string().min(1),
            problemIds: z.array(
                z.object({
                    docId: z.string().min(1),
                    problemId: z.string().min(1),
                })
            ),
            issues: z.array(z.string().min(1)),
            summary: z.string().min(1),
        })
    ),
});