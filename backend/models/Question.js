import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const OptionSchema = new Schema({
  optionText: { type: String, required: true },
  // weights: e.g. { red: 2, blue: 0, yellow: 1, green: 0 }
  weights: {
    red: { type: Number, default: 0 },
    blue: { type: Number, default: 0 },
    yellow: { type: Number, default: 0 },
    green: { type: Number, default: 0 },
  },
});

const QuestionSchema = new Schema({
  questionText: { type: String, required: true },
  order: { type: Number, required: true, index: true },
  options: { type: [OptionSchema], required: true },
});

export default model('Question', QuestionSchema);
