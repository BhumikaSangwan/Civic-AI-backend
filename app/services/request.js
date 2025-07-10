import fs from 'fs';
import model from '../models/request.js'
import multer from 'multer';
import path from "path";


const uploadDir = 'uploads/pdf'
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive: true});
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(file.fieldname === 'pdf'){
            cb(null, uploadDir);
        }
        else {
            cb(new Error('This fieldname is not supported'))
        }
    },

    filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, file.fieldname + "-" + uniqueSuffix + ext);
	},
})

const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['application/pdf'];

  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true); 
  } else {
    cb(new Error('Only PDF files are allowed'), false); 
  }
};

const uploadPdf = multer({ storage, fileFilter });

export const upload = uploadPdf.array('pdf');

export const find = (criteria, projection, options = {}) => {
    options.lean = true;
    return model.find(criteria, projection, options);
}

export const findOne = (criteria, projection, options = {}) => {
    options.lean = true;
    return model.findOne(criteria, projection, options);
}

export const updateOne = (criteria, updateObj, options = {}) => {   
    return model.findOneAndUpdate(criteria, updateObj, { ...options, lean: true, new: true});
}

export const save = (saveObj) => {
    return new model(saveObj).save();
}

export const saveAnalyzedDocumentsToDB = (reqId, analyzedDocs) => {
    console.log("analyzed docs length : ", analyzedDocs.length);
    // console.log("documents : ", analyzedDocs);
    if (!Array.isArray(analyzedDocs)) {
        throw new Error("Expected analyzedDocs to be an array");
    }
    return updateOne(
        { id: reqId },
        { $push: { documents: { $each: analyzedDocs } }, 
          $inc: { docCount: analyzedDocs.length }
        }
    );
}
