import mongoose from "mongoose";
import { status, docStatus } from "../constants/index.js"

const schema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    pdf: {
        type: [String],
        required: true,
    },
    docCount: {
        type: Number,
        default: 0,
    },
    documents: {
        type: [
            {
                id: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: () => new mongoose.Types.ObjectId(),
                },
                name: {
                    type: String,
                    required: true,
                },
                phoneNumber: {
                    type: String,
                    // required: true,
                },
                countryCode: {
                    type: String,
                    required: true,
                    default: '+91',
                },
                ward: {
                    type: String,
                    required: true,
                },
                imageUrl: {
                    type: String,
                    required: true
                },
                problems: {
                    type: [
                        {   
                            id: {
                              type: mongoose.Schema.Types.ObjectId,
                              required: true  ,
                              default: () => new mongoose.Types.ObjectId(),
                            },
                            category: {
                                type: [String],
                                required: true,
                            },
                            description: {
                                type: {
                                    english: {
                                        type: String,
                                        required: true,
                                    }, 
                                    hindi: {
                                        type: String,
                                        required: true,
                                    }
                                },
                                required: true,
                            },
                        }
                    ],
                    default: [],
                },
                issues: {
                    type: [String],
                    default: [],
                },
                docUrl: {
                    type: String,
                    required: true,
                },
            },
        ],
        default: [],
    },
    status: {
        type: Number,
        default: status.pending,
    },
    reqStatus: {
        type: Number,
        default: docStatus.draft
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
    },
    generatedDate: {
        type: Date,
    }

}, { timestamps: true });

schema.index({ id: 1 }, { background: true, unique: true });
const model = mongoose.model("request", schema);
export default model;