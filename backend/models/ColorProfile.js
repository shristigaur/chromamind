import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ColorProfileSchema = new Schema({
  colorName: { type: String, required: true, unique: true },
  hexCode: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  fullDescription: { type: String, required: true },
});

export default model('ColorProfile', ColorProfileSchema);
