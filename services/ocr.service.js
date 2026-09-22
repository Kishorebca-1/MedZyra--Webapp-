const { createWorker } = require("tesseract.js");

async function extractTextFromImage(imageBuffer) {
    const worker = await createWorker("eng");

    try {
        const result = await worker.recognize(imageBuffer);

        return result.data.text;
    } finally {
        await worker.terminate();
    }
}

module.exports = {
    extractTextFromImage
};