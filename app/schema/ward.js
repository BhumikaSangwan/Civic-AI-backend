import z from "zod";

export const wardSchema = z.object({
    reqId: z.string().min(1),
    wards: z.array(
        z.object({
            ward: z.string().min(1),
            category: z.array(z.string().min(1)),
            problems: z.array(
                z.object({
                    problemIds: z.array(z.string().min(1)),
                    issues: z.array(z.string().min(1)),
                    summary: z.string().min(1),
                })
            ),
        })
    )
});