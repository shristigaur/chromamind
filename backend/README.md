# Backend models for ChromaMind

This folder contains the Mongoose models used by the ChromaMind quiz application.

Files:
- `models/ColorProfile.js` - color profile documents
- `models/Question.js` - quiz questions and option weights
- `models/Submission.js` - logs of quiz submissions

Usage:
1. Install dependencies: `npm install mongoose dotenv`
2. Provide a MongoDB connection string in `../.env` as `MONGO_URI`.
3. Import models: `const { ColorProfile, Question, Submission } = require('./models');`
