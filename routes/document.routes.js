const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth.middleware");
const {
    upload,
    analyzeDocument,
    uploadDocument,
    getRecentDocuments,
    getDocument,
    deleteDocument,
    testOCR,
    processUploadedDocument,
    handleDocumentUploadError
} = require("../controllers/document.controller");

const acceptDocumentField = upload.fields([
    { name: "document", maxCount: 1 },
    { name: "file", maxCount: 1 }
]);

function selectUploadedFile(req, res, next) {
    req.file = req.files?.document?.[0] || req.files?.file?.[0];
    next();
}

router.get("/test", authenticateToken, (req, res) => {
    res.json({ success: true, message: "Document route is working", userId: req.user.userId || req.user.id });
});
router.post("/ocr", authenticateToken, acceptDocumentField, selectUploadedFile, handleDocumentUploadError, analyzeDocument);
router.post("/test-ocr", authenticateToken, acceptDocumentField, selectUploadedFile, handleDocumentUploadError, testOCR);
router.post("/upload", authenticateToken, acceptDocumentField, selectUploadedFile, handleDocumentUploadError, uploadDocument);
router.get("/recent", authenticateToken, getRecentDocuments);
router.post("/:id/process", authenticateToken, processUploadedDocument);
router.get("/:id", authenticateToken, getDocument);
router.delete("/:id", authenticateToken, deleteDocument);

module.exports = router;
