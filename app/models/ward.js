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
    wards: {
        type: [
            {
                wardId: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    default: () => new mongoose.Types.ObjectId()
                },
                ward: {
                    type: String,
                    required: true,
                },
                category: {
                    type: String,
                    required: true
                },
                problems: [{
                    problemIds: {
                        type: [
                            {
                                docId: { type: String, required: true },
                                problemId: { type: String, required: true }
                            }
                        ],
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
                }]
            }
        ]
    }
}, { timestamps: true });

schema.index({ reqId: 1 }, { background: true, unique: true });
const model = mongoose.model('Ward', schema);
export default model;