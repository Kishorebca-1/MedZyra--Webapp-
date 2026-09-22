const path = require("path");
const multer = require("multer");
const supabase = require("../config/supabase");
const { extractTextFromImage } = require("../services/ocr.service");
const { processDocument } = require("../services/document.service");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.mimetype)) {
            return callback(new Error("Only JPG, PNG and WEBP images are supported"));
        }
        callback(null, true);
    }
});

function getUserId(req) {
    return req.user.userId || req.user.id;
}

async function analyzeDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "A document image is required" });
        }

        const extractedText = (await extractTextFromImage(req.file.buffer)).trim();
        return res.json({
            success: true,
            status: "completed",
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            extractedText,
            data: { fileName: req.file.originalname, mimeType: req.file.mimetype, extractedText }
        });
    } catch (error) {
        console.error("Document OCR Error:", error);
        return res.status(500).json({ success: false, status: "failed", message: error.message || "Unable to analyze the document" });
    }
}

async function uploadDocument(req, res) {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Please upload a document" });
        const userId = getUserId(req);
        const extension = path.extname(req.file.originalname);
        const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;

        const { error: storageError } = await supabase.storage.from("medical-documents").upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
        });
        if (storageError) throw new Error(storageError.message);

        const { data, error } = await supabase.from("documents").insert({
            user_id: userId,
            file_name: req.file.originalname,
            file_type: req.file.mimetype,
            file_size: req.file.size,
            file_path: filePath,
            status: "uploaded"
        }).select().single();

        if (error) {
            await supabase.storage.from("medical-documents").remove([filePath]);
            throw new Error(error.message);
        }
        return res.status(201).json({ success: true, message: "Document uploaded successfully", document: data });
    } catch (error) {
        console.error("Upload Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Document upload failed" });
    }
}

async function getRecentDocuments(req, res) {
    const { data, error } = await supabase.from("documents")
        .select("id, file_name, file_type, file_size, status, uploaded_at")
        .eq("user_id", getUserId(req)).order("uploaded_at", { ascending: false }).limit(10);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, documents: data || [] });
}

async function getDocument(req, res) {
    const { data: document, error } = await supabase.from("documents")
        .select("*").eq("id", req.params.id).eq("user_id", getUserId(req)).single();
    if (error || !document) return res.status(404).json({ success: false, message: "Document not found" });
    const { data: analysis } = await supabase.from("document_analysis")
        .select("*").eq("document_id", document.id).maybeSingle();
    return res.json({ success: true, document: { ...document, analysis: analysis || null } });
}

async function deleteDocument(req, res) {
    const userId = getUserId(req);
    const { data: document, error } = await supabase.from("documents")
        .select("file_path").eq("id", req.params.id).eq("user_id", userId).single();
    if (error || !document) return res.status(404).json({ success: false, message: "Document not found" });
    await supabase.storage.from("medical-documents").remove([document.file_path]);
    const { error: deleteError } = await supabase.from("documents").delete()
        .eq("id", req.params.id).eq("user_id", userId);
    if (deleteError) return res.status(500).json({ success: false, message: deleteError.message });
    return res.json({ success: true, message: "Document deleted successfully" });
}

async function testOCR(req, res) {
    return analyzeDocument(req, res);
}

async function processUploadedDocument(req, res) {
    try {
        const result = await processDocument(req.params.id, getUserId(req));
        return res.json({ success: true, result, document: result });
    } catch (error) {
        console.error("Process Document Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

function handleDocumentUploadError(error, req, res, next) {
    if (!error) return next();
    return res.status(400).json({ success: false, status: "failed", message: error.message });
}

module.exports = {
    upload,
    analyzeDocument,
    uploadDocument,
    getRecentDocuments,
    getDocument,
    deleteDocument,
    testOCR,
    processUploadedDocument,
    handleDocumentUploadError
};
