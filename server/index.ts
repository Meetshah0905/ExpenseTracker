import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { extractWithGemini } from "./geminiExtract";

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const port = 8787;

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

app.use(cors());
app.use(express.json());

// GET /api/health
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// POST /api/extract-transaction
app.post("/api/extract-transaction", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded." });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ ok: false, error: "Unsupported file type. Use PNG, JPEG, or WebP." });
    }

    const hint = String(req.body.hint || "auto");
    console.log(`Processing scan... Hint: ${hint}, File: ${req.file.originalname}`);

    const result = await extractWithGemini({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype
    }, hint);

    res.json({
      ok: true,
      data: result.data,
      rawText: result.rawText
    });
  } catch (error: any) {
    console.error("Extraction failed:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Internal server error during extraction.",
      details: error.stack
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Local API server running at http://localhost:${port}`);
  console.log(`🔑 Gemini Key Configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
});
