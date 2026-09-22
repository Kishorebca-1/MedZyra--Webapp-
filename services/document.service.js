const supabase = require("../config/supabase");
const { extractTextFromImage } = require("./ocr.service");
const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function processDocument(documentId, userId) {
    // 1. Get document information
    const { data: document, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .eq("user_id", userId)
        .single();

    if (error || !document) {
        throw new Error("Document not found");
    }

    // 2. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase
        .storage
        .from("medical-documents")
        .download(document.file_path);

    if (downloadError) {
        throw new Error(
            `Failed to download document: ${downloadError.message}`
        );
    }

    // 3. Convert file to Buffer
    const fileBuffer = Buffer.from(
        await fileData.arrayBuffer()
    );

    // 4. Check file type
    if (
        document.file_type !== "image/jpeg" &&
        document.file_type !== "image/jpg" &&
        document.file_type !== "image/png" &&
        document.file_type !== "image/webp"
    ) {
        throw new Error(
            "OCR currently supports image documents only"
        );
    }

    // 5. Extract text using OCR
    const extractedText =
        await extractTextFromImage(fileBuffer);

    const aiAnalysis =
        await analyzeDocumentText(extractedText);

    // 6. Save OCR text in document_analysis
    const { data: analysis, error: analysisError } =
    await supabase
        .from("document_analysis")
        .upsert(
            {
                document_id: document.id,
                extracted_text: extractedText,

                document_type: aiAnalysis.document_type,
                document_date: aiAnalysis.document_date,
                overview: aiAnalysis.overview,
                diagnosis: aiAnalysis.diagnosis,
                medicines: aiAnalysis.medicines,
                investigations: aiAnalysis.investigations,
                tests: aiAnalysis.tests,
                summary: aiAnalysis.summary
            },
            {
                onConflict: "document_id"
            }
        )
        .select()
        .single();

    if (analysisError) {
        throw new Error(
            `Failed to save OCR text: ${analysisError.message}`
        );
    }

    // Update document status
await supabase
    .from("documents")
    .update({
        status: "analyzed"
    })
    .eq("id", document.id)
    .eq("user_id", userId);

    // 7. Return result
    return {
        documentId: document.id,
        fileName: document.file_name,
        extractedText,
        analysisId: analysis.id
    };
}


async function analyzeDocumentText(extractedText) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",

        messages: [
            {
                role: "system",
                content: `
You are MedZyra AI document analysis assistant.

Analyze the medical document text provided by the user.

Return ONLY valid JSON with these fields:

{
    "document_type": "",
    "document_date": "",
    "overview": "",
    "diagnosis": "",
    "medicines": "",
    "investigations": "",
    "tests": "",
    "summary": ""
}

Rules:
- Extract information only from the provided text.
- Do not invent missing information.
- If a field is not available, use "Not mentioned".
- If this is a prescription, extract every visible medicine name and preserve its dosage, strength, frequency, route, and duration in the medicines field.
- For prescriptions, put the complete medicine instructions in medicines, one medicine per line when possible.
- Include prescription instructions in the summary and overview when they are visible.
- Do not provide a new diagnosis.
- Keep the language simple.
- This is an information summary, not a medical diagnosis.
`
            },
            {
                role: "user",
                content: extractedText
            }
        ],

        temperature: 0.1,

        response_format: {
            type: "json_object"
        }
    });

    const content =
        response?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("AI returned an empty response");
    }

    return JSON.parse(content.trim());
}




module.exports = {
    processDocument,
    analyzeDocumentText
};