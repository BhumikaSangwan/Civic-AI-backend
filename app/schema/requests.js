import z from "zod";


export const requestCreationSchema = z.object({
    title: z.string().min(1).max(120),
    description: z.string().min(1),
    pdf: z
        // .array(z.string().url({ message: "Each PDF must be a valid URL" })) 
        .array(z.string())
        .min(1, { message: "At least one PDF file is required" }),
    generatedDate: z.date().optional(),

});
