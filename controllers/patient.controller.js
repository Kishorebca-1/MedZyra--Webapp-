const supabase = require("../config/supabase");

function getUserId(req) {
    return req.user.userId || req.user.id;
}

function timestamp(value) {
    return value || new Date(0).toISOString();
}

function preview(value, maxLength = 180) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

async function getPatientTimeline(req, res) {
    try {
        const userId = getUserId(req);
        const [{ data: interviews, error: interviewError }, { data: documents, error: documentError }] = await Promise.all([
            supabase.from("health_interviews")
                .select("id, language, status, current_question, red_flag_detected, created_at, completed_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false }),
            supabase.from("documents")
                .select("id, file_name, file_type, file_size, file_path, status, uploaded_at")
                .eq("user_id", userId)
                .order("uploaded_at", { ascending: false })
        ]);

        if (interviewError) throw new Error(interviewError.message);
        if (documentError) throw new Error(documentError.message);

        const interviewIds = (interviews || []).map(item => item.id);
        const documentIds = (documents || []).map(item => item.id);
        const [{ data: answers, error: answerError }, { data: assessments, error: assessmentError }, { data: analyses, error: analysisError }] = await Promise.all([
            interviewIds.length
                ? supabase.from("health_interview_answers").select("*").in("interview_id", interviewIds).order("created_at", { ascending: true })
                : { data: [], error: null },
            interviewIds.length
                ? supabase.from("health_assessments").select("*").in("interview_id", interviewIds)
                : { data: [], error: null },
            documentIds.length
                ? supabase.from("document_analysis").select("*").in("document_id", documentIds)
                : { data: [], error: null }
        ]);

        if (answerError) throw new Error(answerError.message);
        if (assessmentError) throw new Error(assessmentError.message);
        if (analysisError) throw new Error(analysisError.message);

        const answerByInterview = new Map();
        (answers || []).forEach(answer => {
            const list = answerByInterview.get(answer.interview_id) || [];
            list.push(answer);
            answerByInterview.set(answer.interview_id, list);
        });
        const assessmentByInterview = new Map((assessments || []).map(item => [item.interview_id, item]));
        const analysisByDocument = new Map((analyses || []).map(item => [item.document_id, item]));

        const interviewEvents = (interviews || []).flatMap(interview => {
            const interviewAnswers = answerByInterview.get(interview.id) || [];
            const assessment = assessmentByInterview.get(interview.id) || null;
            return [
                {
                    id: `interview-${interview.id}`,
                    type: "interview",
                    title: "Health interview",
                    status: interview.status,
                    occurredAt: timestamp(interview.created_at),
                    interview,
                    answerCount: interviewAnswers.length,
                    preview: preview(interviewAnswers[0]?.answer),
                    answers: interviewAnswers,
                    assessment
                },
                ...(assessment ? [{
                    id: `assessment-${assessment.id}`,
                    type: "interview_summary",
                    title: "AI health summary",
                    occurredAt: timestamp(assessment.created_at || interview.completed_at),
                    interviewId: interview.id,
                    assessment,
                    preview: preview(assessment.summary)
                }] : [])
            ];
        });

        const documentEvents = (documents || []).map(document => ({
            id: `document-${document.id}`,
            type: "document",
            title: "Health document",
            status: document.status,
            occurredAt: timestamp(document.uploaded_at),
            document: {
                ...document,
                analysis: analysisByDocument.get(document.id) || null
            },
            preview: preview(analysisByDocument.get(document.id)?.summary || document.file_name)
        }));

        const timeline = [...interviewEvents, ...documentEvents]
            .sort((left, right) => new Date(right.occurredAt) - new Date(left.occurredAt));
        const latestInterview = interviews?.[0] || null;
        const latestAssessment = latestInterview ? assessmentByInterview.get(latestInterview.id) || null : null;

        return res.json({
            success: true,
            summary: {
                latestInterview,
                latestAssessment,
                interviewCount: (interviews || []).length,
                documentCount: (documents || []).length,
                extractedDocumentCount: (analyses || []).length,
                latestActivityAt: timeline[0]?.occurredAt || null,
                nextSuggestion: latestAssessment?.next_step ||
                    "Continue monitoring your symptoms and discuss them with a healthcare professional."
            },
            timeline
        });
    } catch (error) {
        console.error("Patient Timeline Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Unable to load patient timeline" });
    }
}

module.exports = { getPatientTimeline };
