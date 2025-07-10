import mongoose from "mongoose";

const schema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true,
        default: () => new mongoose.Types.ObjectId(),
    },
    reqId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    wards: {
        type: [
            {
                ward: {
                    type: String,
                    required: true,
                },
                totalProblems: {
                    type: Number,
                    default: 0,
                    required: true
                },
                category: [
                    {
                        issue: {
                            type: String,
                            required: true,
                        },
                        problemCount: {
                            type: Number,
                            default: 0,
                            required: true
                        }
                    }
                ]
            }
        ],
        required: true
    },
    
}, { timestamps: true });

schema.index({ reqId: 1 }, { background: true, unique: true });
const model = mongoose.model('analysis', schema);
export default model;