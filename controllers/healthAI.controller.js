const {
    healthAIAgent
} = require("../services/healthAI.service");
const { healthDiscussionAgent } = require("../services/healthAI.service");
const supabase = require("../config/supabase");

async function continueInterviewDiscussion(req, res) {
    try {
        const userId = req.user.userId || req.user.id;
        const { interviewId, message, language = "en", conversation = [] } = req.body || {};
        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }
        if (message.length > 5000) {
            return res.status(400).json({ success: false, message: "Message is too long" });
        }
        if (!Array.isArray(conversation) || conversation.length > 32) {
            return res.status(400).json({ success: false, message: "Conversation must contain at most 32 messages" });
        }
        if (!conversation.every(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")) {
            return res.status(400).json({ success: false, message: "Conversation contains an invalid message" });
        }

        let interviewQuery = supabase.from("health_interviews").select("id, language, status, created_at, completed_at").eq("user_id", userId);
        interviewQuery = interviewId ? interviewQuery.eq("id", interviewId).single() : interviewQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
        const { data: interview, error: interviewError } = await interviewQuery;
        if (interviewError || !interview) return res.status(404).json({ success: false, message: "Interview not found" });

        const [{ data: answers, error: answerError }, { data: documents, error: documentError }] = await Promise.all([
            supabase.from("health_interview_answers").select("question_id, question_text, answer, created_at").eq("interview_id", interview.id).order("created_at", { ascending: true }),
            supabase.from("documents").select("id, file_name, status, uploaded_at").eq("user_id", userId).order("uploaded_at", { ascending: false }).limit(10)
        ]);
        if (answerError) throw new Error(answerError.message);
        if (documentError) throw new Error(documentError.message);

        const documentIds = (documents || []).map(item => item.id);
        const { data: analyses, error: analysisError } = documentIds.length
            ? await supabase.from("document_analysis").select("document_id, overview, investigations, tests, summary").in("document_id", documentIds)
            : { data: [], error: null };
        if (analysisError) throw new Error(analysisError.message);

        const analysisByDocument = new Map((analyses || []).map(item => [item.document_id, item]));
        const result = await healthDiscussionAgent({
            language,
            conversation,
            message,
            context: {
                interview,
                interviewAnswers: answers || [],
                documents: (documents || []).map(document => ({
                    ...document,
                    analysis: analysisByDocument.has(document.id)
                        ? analysisByDocument.get(document.id)
                        : null
                }))
            }
        });
        return res.json({ success: true, data: { ...result, interviewId: interview.id } });
    } catch (error) {
        console.error("Interview Discussion Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to continue discussion" });
    }
}


async function testHealthAI(req, res) {

    try {

        const {
            message,
            language = "en",
            conversation = [],
            interactionMode = "text"
        } = req.body;

        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({
                success: false,
                message: "Request body must be a JSON object"
            });
        }

        const allowedLanguages = ["en", "hi", "bn", "ne"];

        if (!allowedLanguages.includes(language)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported language"
            });
        }

        const allowedInteractionModes = [
            "text",
            "touch",
            "voice"
        ];

        if (!allowedInteractionModes.includes(interactionMode)) {
            return res.status(400).json({
                success: false,
                message: "Unsupported interaction mode"
            });
        }


        if (typeof message !== "string" || !message.trim()) {

            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        if (message.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message is too long"
            });
        }

        if (!Array.isArray(conversation)) {
            return res.status(400).json({
                success: false,
                message: "Conversation must be an array"
            });
        }

        if (conversation.length > 32) {
            return res.status(400).json({
                success: false,
                message: "Conversation is too long"
            });
        }

        const validConversation = conversation.every(item =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            (typeof item.content === "string" ||
                (item.content && typeof item.content === "object"))
        );

        if (!validConversation) {
            return res.status(400).json({
                success: false,
                message: "Conversation contains an invalid message"
            });
        }


        const updatedConversation = [

            ...conversation,

            {
                role: "user",
                content: message.trim()
            }

        ];


        const result =
            await healthAIAgent({
                language,
                conversation:
                    updatedConversation
            });

        const suggestion = result.action === "ask_question"
            ? result.question
            : result.action === "red_flag"
                ? result.instruction
                : result.action === "complete"
                    ? result.nextStep
                    : result.explanation;


        return res.json({

            success: true,

            data: {
                ...result,
                suggestion: suggestion || "Please discuss your symptoms with a healthcare professional."
            },

            interaction: {
                mode: interactionMode,
                responseType: "text",
                voiceToVoiceAvailable: "browser-dependent"
            }

        });

    } catch (error) {

        console.error(
            "Health AI Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "AI agent failed"

        });
    }
}


module.exports = {
    testHealthAI,
    continueInterviewDiscussion
};