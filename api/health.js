export default async function handler(req, res) {
    res.status(200).json({
        ok: true,
        geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
}
