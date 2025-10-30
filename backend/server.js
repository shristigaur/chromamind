import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import Submission from "./models/Submission.js";
import questions from "../src/data/questions.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------
// Resolve __dirname properly for ESM
// ---------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------
// Serve frontend build (if exists)
// ---------------------------
const distPath = path.resolve(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback: serve index.html for any non-API route
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ---------------------------
// MongoDB Connection
// ---------------------------
const PORT = process.env.PORT || 5000;
let useDb = false;

async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️ No Mongo URI found in .env");
    return;
  }
  try {
    await mongoose.connect(uri, { dbName: "chromamind" });
    console.log("✅ Connected to MongoDB");
    useDb = true;
  } catch (err) {
    console.warn("❌ MongoDB connection failed, using in-memory store instead:", err.message);
  }
}

// ---------------------------
// In-memory fallback store
// ---------------------------
const inMemory = [];

function scoreAnswers(rawAnswers) {
  const breakdown = {
    red: 0,
    blue: 0,
    yellow: 0,
    green: 0,
    purple: 0,
    orange: 0,
    teal: 0,
    pink: 0,
  };

  rawAnswers.forEach((ansText, i) => {
    const q = questions[i];
    if (!q) return;
    const opt = q.options.find((o) => o.optionText === ansText);
    if (!opt) return;
    const w = opt.weights || {};
    Object.keys(breakdown).forEach((k) => {
      breakdown[k] += w[k] || 0;
    });
  });

  const order = Object.keys(breakdown);
  let assigned = order[0];
  order.forEach((k) => {
    if (breakdown[k] > breakdown[assigned]) assigned = k;
  });
  return { breakdown, assigned };
}

// ---------------------------
// API Routes
// ---------------------------

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend running successfully" });
});

app.get("/api/submissions", async (req, res) => {
  if (useDb) {
    const docs = await Submission.find().sort({ timestamp: -1 }).limit(200).lean();
    return res.json(docs);
  }
  res.json(inMemory.slice().reverse());
});

app.delete("/api/submissions/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "id required" });
  if (useDb) {
    try {
      const removed = await Submission.findOneAndDelete({ sessionId: id });
      if (!removed) return res.status(404).json({ error: "not found" });
      return res.json({ success: true });
    } catch (err) {
      console.error("delete error", err);
      return res.status(500).json({ error: "db error" });
    }
  }
  const idx = inMemory.findIndex((d) => d.sessionId === id);
  if (idx === -1) return res.status(404).json({ error: "not found" });
  inMemory.splice(idx, 1);
  res.json({ success: true });
});

app.delete("/api/submissions", async (req, res) => {
  if (useDb) {
    try {
      await Submission.deleteMany({});
      return res.json({ success: true });
    } catch (err) {
      console.error("delete all error", err);
      return res.status(500).json({ error: "db error" });
    }
  }
  inMemory.length = 0;
  res.json({ success: true });
});

app.post("/api/quiz/submit", async (req, res) => {
  const { user, answers } = req.body;
  if (!Array.isArray(answers) || answers.length === 0)
    return res.status(400).json({ error: "answers required" });

  const raw = answers.map((a) => {
    const s = (typeof a === "string" ? a : a?.optionText || "").toString().trim();
    const first = s.split(/\s+/)[0] || "";
    return first;
  });

  const { breakdown, assigned } = scoreAnswers(raw);
  const sessionId = uuidv4();

  const doc = {
    sessionId,
    name: user?.name || "",
    age: user?.age || null,
    timestamp: new Date(),
    rawAnswers: raw,
    scoreBreakdown: breakdown,
    assignedColor: assigned,
  };

  if (useDb) {
    try {
      const saved = await Submission.create(doc);
      return res.json({ success: true, result: saved });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "db error" });
    }
  }

  inMemory.push(doc);
  res.json({ success: true, result: doc });
});

// ---------------------------
// Start server
// ---------------------------
connectDb().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});

export default app;
