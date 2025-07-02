import { Router } from "express";
import { requestServices, pdfServices, analyzeServices } from "../../services/index.js";
import { roles, status, docStatus } from "../../constants/index.js";
import { checkLoginStatus } from "../../middleware/checkAuth.js";
import { requestCreationSchema } from "../../schema/requests.js";
import { PDFDocument } from "pdf-lib";
import { fileURLToPath } from 'url';
import { getIO } from "../../config/socket.js";
import path from 'path';
import fs from 'fs';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post('/newReq', checkLoginStatus, requestServices.upload, async (req, res, next) => {
    try {
        const filePaths = req.files.map(file => `/uploads/pdf/${file.filename}`);
        const validatedData = requestCreationSchema.safeParse({
            ...req.body,
            pdf: filePaths
        }); if (!validatedData.success) {
            return res.status(400).json({ message: 'Invalid request data', errors: validatedData.error.errors });
        }
        const request = await requestServices.save({
            ...validatedData.data,
            createdBy: req.session.userId,
        });
        const reqData = {
            title: request.title,
            description: request.description,
            id: request.id,
            pdf: request.pdf,
            createdBy: request.createdBy,
            createdAt: request.createdAt,
            docCount: request.docCount,
            reqStatus: request.reqStatus
        }
        return res.status(200).json(reqData);
    } catch (error) {
        console.log("error creating request : ", error);
        next(error);
    }
});

router.get('/listRequests', checkLoginStatus, async (req, res, next) => {
    try {
        const projection = {
            title: 1,
            description: 1,
            id: 1,
            pdf: 1,
            createdBy: 1,
            createdAt: 1,
            docCount: 1,
            reqStatus: 1
        }
        if (req.session.role === roles.admin) {
            const requests = await requestServices.find(
                {
                    status: { $ne: status.deleted }
                },
                projection,
                { sort: { createdAt: -1 } }
            );
            return res.json(requests);

        }
        else {
            const userId = req.session.userId;
            const requests = await requestServices.find(
                {
                    createdBy: userId,
                    status: { $ne: status.deleted }
                },
                projection,
                { sort: { createdAt: -1 } }
            );
            return res.json(requests);
        }
    } catch (error) {
        next(error);
    }
});

router.get("/viewReport/:reqId", async (req, res, next) => {
    try {
        const { reqId } = req.params;
        const request = await requestServices.findOne({ id: reqId });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        return res.json({ message: 'preparing report' });
    } catch (error) {
        console.log("viewReport error : ", error);
        next(error);
    }
})

router.get("/reqPreview/:reqId", checkLoginStatus, async (req, res, next) => {
    try {
        const { reqId } = req.params;
        const request = await requestServices.findOne({ id: reqId });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const files = request.pdf;

        const mergedPdf = await PDFDocument.create();
        const dirPath = path.join(__dirname, '..', '..', '..');

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const pdfBytes = fs.readFileSync(filePath);
            const pdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=merged_documents.pdf");
        res.send(Buffer.from(mergedPdfBytes));

    } catch (error) {
        console.log("error preview : ", error);
        next(error);
    }
});

router.post('/generateReq/:reqId', checkLoginStatus, async (req, res, next) => {
    try {
        const { reqId } = req.params;
        console.log("generating req");
        const request = await requestServices.findOne({ id: reqId });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const files = request.pdf;
        console.log("files path : ", files);
        const outputDir = path.join(__dirname, '..', '..', '..', 'uploads', 'generated', reqId);
        console.log("outputDir : ", outputDir);

        files.forEach(async (file) => {
            const pdfPath = path.join(process.cwd(), file);
            console.log("pdfPath : ", pdfPath);
            try {
                const imagePaths = await pdfServices.convertPdfToImages({ pdfPath, outputDir });
                console.log("resultedFiles : ", imagePaths);

                const analyzedDocs = await analyzeServices.analyzeComplaintImages(imagePaths);
                console.log("AI output:", analyzedDocs);

                const result = await requestServices.saveAnalyzedDocumentsToDB(reqId, analyzedDocs);
                console.log("result : ", result);
            } catch (err) {
                console.error("Error converting PDF to images:", err);
            }
        })

        const reqData = await requestServices.updateOne({ id: reqId }, { $set: { reqStatus: docStatus.completed, status: status.active } });

        const io = getIO();
        const createdBy = request.createdBy.toString();
        console.log("createdBy : ", createdBy);
        io.to(createdBy).emit('generatedReq', reqId);
        // io.emit('requestGenerated', reqData.id);
        // io.to(request.createdBy).emit('requestGenerated', reqData.id);
        console.log("generatedReq event emitted")
        return res.status(200).json({ message: 'Request generated successfully' });
    } catch (error) {
        console.log("error : ", error);
        next(error);
    }
})

router.delete('/deleteReq/:reqId', checkLoginStatus, async (req, res, next) => {
    try {
        const { reqId } = req.params;
        const request = await requestServices.findOne({ id: reqId });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        await requestServices.updateOne({ id: reqId }, { $set: { status: status.deleted } });
        return res.json({ message: 'Request deleted successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;