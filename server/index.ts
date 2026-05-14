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

// Always return JSON content type
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// GET /api/health
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// POST /api/extract-transaction
app.post("/api/extract-transaction", (req, res, next) => {
  // Wrap multer in a callback so we can catch its errors as JSON
  upload.single("file")(req, res, (multerErr) => {
    if (multerErr) {
      console.error("Multer error:", multerErr);
      const msg = multerErr instanceof multer.MulterError && multerErr.code === "LIMIT_FILE_SIZE"
        ? "The image file is too large (max 10MB)."
        : multerErr.message || "File upload failed.";
      return res.status(400).json({ ok: false, error: msg });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No file uploaded." });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        ok: false,
        error: "Unsupported file type. Use PNG, JPEG, or WebP."
      });
    }

    const hint = String(req.body.hint || "auto");
    console.log(`Processing scan... Hint: ${hint}, File: ${req.file.originalname}, Size: ${(req.file.size / 1024).toFixed(1)}KB`);

    const result = await extractWithGemini(
      { buffer: req.file.buffer, mimetype: req.file.mimetype },
      hint
    );

    return res.json({
      ok: true,
      data: result.data,
      rawText: result.rawText
    });
  } catch (error: any) {
    console.error("extract-transaction failed:", error);
    return res.status(500).json({
      ok: false,
      error: "Could not read this image. Try a clearer photo.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Global error handler — always return JSON, never HTML
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    ok: false,
    error: "Internal server error.",
    details: err instanceof Error ? err.message : String(err)
  });
});

app.listen(port, () => {
  console.log(`🚀 Local API server running at http://localhost:${port}`);
  console.log(`🔑 Gemini Key Configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
});
