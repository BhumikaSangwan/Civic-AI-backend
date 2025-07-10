import { Router } from "express";
import { requestServices, pdfServices, analyzeServices, reportServices, wardServices, analysisServices } from "../../services/index.js";
import { roles, status, docStatus } from "../../constants/index.js";
import { checkLoginStatus } from "../../middleware/checkAuth.js";
import { requestCreationSchema } from "../../schema/requests.js";
import { PDFDocument } from "pdf-lib";
import { fileURLToPath } from 'url';
import { io } from "../../config/socket.js";
import path from 'path';
import fs from 'fs';
import mongoose from "mongoose";

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
        console.log("generate req");

        const request = await requestServices.findOne({ id: reqId });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        await requestServices.updateOne(
            { id: reqId },
            { $set: { reqStatus: docStatus.inProgress, status: status.active } }
        );

        handleAnalysis(reqId);

        return res.status(200).json({ message: 'Request generated successfully' });

    } catch (error) {
        console.error("Error in /generateReq:", error);
        return res.status(500).json({ message: 'Failed to generate request', error: error.message });
    }
});


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


router.get("/reqDetails/:reqId", checkLoginStatus, async (req, res, next) => {
    try {
        const { reqId } = req.params;
        const request = await requestServices.findOne({ id: reqId, status: { $ne: status.deleted } });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const details = {
            title: request.title,
            id: request.id,
            documents: request.documents,
            createdBy: request.createdBy,
            createdAt: request.createdAt,
            reqStatus: request.reqStatus
        }
        return res.json(details);
    } catch (error) {
        next(error);
    }
})

router.get("/docDetails/:id/:docId", checkLoginStatus, async (req, res, next) => {
    try {
        const { id, docId } = req.params;
        const request = await requestServices.findOne({ id: id, status: { $ne: status.deleted } });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const doc = request.documents.find(doc => doc.id.toString() === docId);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        return res.json(doc);
    } catch (error) {
        next(error);
    }
})

router.get("/downloadDocImage/:id/:docId", checkLoginStatus, async (req, res, next) => {
    try {
        const { id, docId } = req.params;
        const request = await requestServices.findOne({ id: id, status: { $ne: status.deleted } });

        const doc = request.documents.find(doc => doc.id.toString() === docId);
        if (!doc) {
            return res.status(404).json({ message: 'Document not found' });
        }
        const relativeImagePath = doc.imageUrl;
        const absoluteImagePath = path.join(process.cwd(), relativeImagePath);

        if (!fs.existsSync(absoluteImagePath)) {
            return res.status(404).json({ message: "Image file not found on disk" });
        }

        const fileName = `document-${docId}.jpeg`;
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const imageBuffer = fs.readFileSync(absoluteImagePath);
        res.send(imageBuffer);
    } catch (error) {
        console.log("error in downloadDocImage : ", error);
        next(error);
    }
})

router.get("/commonProblems/:id", checkLoginStatus, async (req, res, next) => {
    try {
        const { id } = req.params;
        const request = await requestServices.findOne({ id: id });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const report = await reportServices.findOne({ reqId: id });
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        return res.json({ commonProblems: report.commonProblems, title: request.title });
    } catch (error) {
        console.log("error in common problems : ", error);
        next(error);
    }
})

router.get("/wardWiseReport/:id", checkLoginStatus, async (req, res, next) => {
    try {
        const { id } = req.params;
        const request = await requestServices.findOne({ id: id });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const report = await wardServices.findOne({ reqId: id });
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        return res.json(report);
    } catch (error) {
        console.log("error in common problems : ", error);
        next(error);
    }
})

router.get("/analysis/:id", checkLoginStatus, async (req, res, next) => {
    try {
        const { id } = req.params;
        const request = await requestServices.findOne({ id: id });
        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }
        const report = await analysisServices.findOne({ reqId: id });
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        return res.json(report.wards);
    } catch (error) {
        console.log("error in common problems : ", error);
        next(error);
    }
})

router.get("/taggedDocs/:id/:issue", async (req, res, next) => {
    try {
        const { id, issue } = req.params;

        const request = await requestServices.findOne({
            id: id,
            status: { $ne: status.deleted }
        });

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Filter each document for matching problems only
        const filteredDocuments = request.documents
            .map(doc => {
                const matchingProblems = doc.problems?.filter(
                    problem => problem.category?.includes(issue)
                ) || [];

                if (matchingProblems.length > 0) {
                    return {
                        ...doc,
                        problems: matchingProblems
                    };
                }
                return null;
            })
            .filter(doc => doc !== null); // Remove docs with no matching problems

        if (filteredDocuments.length === 0) {
            return res.status(404).json({ message: 'No documents with the specified issue found' });
        }

        // console.log("filteredDocs : ", filteredDocuments);
        return res.json(filteredDocuments);
    } catch (error) {
        next(error);
    }
});


router.post("/groupedIssues/:id", async (req, res, next) => {
    try {
        const { id } = req.params;
        const problemIds = req.body; // Expecting array of { docId, problemId }
        console.log("problemIds in groupedIssues : ", problemIds);

        if (!Array.isArray(problemIds)) {
            return res.status(400).json({ message: "Invalid input: Expected an array of problemIds" });
        }

        const request = await requestServices.findOne({ id, status: { $ne: status.deleted } });
        console.log("req : ", request);

        if (!request) {
            console.log("request not found");
            return res.status(404).json({ message: "Request not found" });
        }

        // Build map: docId => Set of problemIds
        const problemIdMap = {};
        for (const { docId, problemId } of problemIds) {
            if (!problemIdMap[docId]) {
                problemIdMap[docId] = new Set();
            }
            problemIdMap[docId].add(problemId);
        }

        const filteredDocuments = request.documents
            .map(doc => {
                const docIdStr = doc.id?.toString(); // Convert ObjectId to string
                if (!problemIdMap[docIdStr]) return null;

                const matchingProblems = (doc.problems || []).filter(problem =>
                    problemIdMap[docIdStr].has(problem.id?.toString()) // Also convert problem.id
                );

                if (matchingProblems.length === 0) return null;

                return {
                    ...doc,
                    problems: matchingProblems
                };
            })
            .filter(doc => doc !== null);

        console.log("filteredDocs : ", filteredDocuments);
        return res.json(filteredDocuments);
    } catch (error) {
        console.error("Error in groupedIssues:", error);
        next(error);
    }
});

router.get("/wardIssueProblems/:id/:ward/:issue", async (req, res, next) => {
    try {
        const { id, ward, issue } = req.params;
        const wardDoc = await wardServices.findOne({ reqId: id });
        if (!wardDoc) {
            return res.status(404).json({ message: 'Ward not found' });
        }
        const wardData = wardDoc.wards.find(w => w.ward === ward);
        if (!wardData) {
            return res.status(404).json({ message: 'Ward not found' });
        }
        const problem = wardData.problems.find(problem => problem.issues[0] == issue);
        const problemIds = problem?.problemIds || [];

        const request = await requestServices.findOne({ id, status: { $ne: status.deleted } });
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        const reqDocs = request.documents || [];
        const matchedResults = [];

        for (const pid of problemIds) {
            const doc = reqDocs.find(d => d.id.toString() === pid.docId.toString());
            if (doc) {
                const matchedProblem = doc.problems.find(p => p.id.toString() === pid.problemId.toString());
                if (matchedProblem) {
                    matchedResults.push({
                        ...doc, problems: matchedProblem
                    });

                }
            }
        }
        const filteredDocuments = matchedResults.map(doc => ({
                id: doc.id.toString(),
                _id: doc._id.toString(),
                name: doc.name,
                ward: doc.ward,
                phoneNumber: doc.phoneNumber,
                problems: {
                    ...doc.problems,
                    id: doc.problems?.id?.toString?.() || "",
                }
            }))
            console.log("filteredDocuments : ", filteredDocuments);
            return res.json(filteredDocuments);
    } catch (error) {
        console.error("Error in groupedIssues:", error);
        next(error)
    }
})


async function handleAnalysis(reqId) {
    try {
        const request = await requestServices.findOne({ id: reqId });
        if (!request) {
            console.log("request not found");
            return;
        }
        const files = request.pdf;
        const outputDir = path.join(__dirname, '..', '..', '..', 'uploads', 'generated', reqId);

        // Process each file one by one to ensure consistency
        for (const file of files) {
            const pdfPath = path.join(process.cwd(), file);
            try {
                const imagePaths = await pdfServices.convertPdfToImages({ pdfPath, outputDir });
                const analyzedDocs = await analyzeServices.analyzeComplaintImages(imagePaths);
                await requestServices.saveAnalyzedDocumentsToDB(reqId, analyzedDocs);
                io.to(request.createdBy.toString()).emit('generatingReq', {
                    reqId: reqId,
                    docs: analyzedDocs.length
                });
            } catch (err) {
                console.error("Error processing file:", file, err);
                throw err;
            }
        }

        const updatedRequest = await requestServices.findOne({ id: reqId });

        const commonProblemsResult = await reportServices.createCommonProblems(updatedRequest.documents);
        if (mongoose.Types.ObjectId.isValid(reqId)) {
            await reportServices.save({
                reqId: new mongoose.Types.ObjectId(String(reqId)),
                commonProblems: commonProblemsResult
            });
        } else {
            console.warn("Invalid ObjectId, storing as raw value:", reqId);
            await reportServices.save({
                reqId: reqId,
                commonProblems: commonProblemsResult
            });
        }

        const wardProblemsResult = await wardServices.createWardProblems(updatedRequest.documents);
        if (mongoose.Types.ObjectId.isValid(reqId)) {
            await wardServices.save({
                reqId: new mongoose.Types.ObjectId(String(reqId)),
                wards: wardProblemsResult
            });
        } else {
            console.warn("Invalid ObjectId, storing as raw value:", reqId);
            await wardServices.save({
                reqId: reqId,
                wards: wardProblemsResult
            });
        }

        const analyzedDocs = await analysisServices.analyzeDocuments(updatedRequest.documents);
        if (mongoose.Types.ObjectId.isValid(reqId)) {
            await analysisServices.save({
                reqId: new mongoose.Types.ObjectId(String(reqId)),
                wards: analyzedDocs
            });
        } else {
            console.warn("Invalid ObjectId, storing as raw value:", reqId);
            await analysisServices.save({
                reqId: reqId,
                wards: analyzedDocs
            });
        }

        await requestServices.updateOne(
            { id: reqId },
            { $set: { reqStatus: docStatus.completed, status: status.active } }
        );

        // Only emit once ALL services succeed
        io.to(request.createdBy.toString()).emit('generatedReq', reqId);
    } catch (error) {
        console.error("Error in handleAnalysis:", error);
    }
}

export default router;