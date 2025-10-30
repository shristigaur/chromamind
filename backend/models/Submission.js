import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const SubmissionSchema = new Schema({
  sessionId: { type: String, required: true },
  name: { type: String },
  age: { type: Number },
  timestamp: { type: Date, default: Date.now },
  rawAnswers: { type: [String], required: true },
  scoreBreakdown: {
    red: { type: Number, default: 0 },
    blue: { type: Number, default: 0 },
    yellow: { type: Number, default: 0 },
    green: { type: Number, default: 0 },
    purple: { type: Number, default: 0 },
    orange: { type: Number, default: 0 },
    teal: { type: Number, default: 0 },
    pink: { type: Number, default: 0 },
  },
  assignedColor: { type: String, required: true },
});

export default model('Submission', SubmissionSchema);
