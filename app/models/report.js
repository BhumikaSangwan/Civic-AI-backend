import mongoose from "mongoose";

const schema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        unique: true,
        default: () => new mongoose.Types.ObjectId()
    },
    reqId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    commonProblems: {
        type: [
            {
               id: {
                   type: mongoose.Schema.Types.ObjectId,
                   required: true,
                   default: () => new mongoose.Types.ObjectId()
               }, 
               problemIds: {
                    type: [{
                        docId: {
                            type: mongoose.Schema.Types.ObjectId,
                            required: true
                        }, 
                        problemId: {
                            type: mongoose.Schema.Types.ObjectId,
                            required: true
                        }
                    }],
                    required: true
               },
               issues: {
                    type: [String],
                    required: true
               },
               summary: {
                    type: String,
                    required: true
               }
            }
        ]
    }
}, { timestamps: true });

schema.index({ reqId: 1 }, { background: true, unique: true });
const model = mongoose.model("report", schema);
export default model;