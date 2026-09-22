// services/healthInterview.service.js

const supabase = require("../config/supabase");
const { checkRedFlags } = require("./redFlag.service");
const { healthAIAgent } = require("./healthAI.service");


/* =========================================================
   LANGUAGE NAMES
========================================================= */

const LANGUAGE_NAMES = {
    en: "English",
    hi: "Hindi",
    bn: "Bengali",
    ne: "Nepali"
};


async function getPatientName(userId) {

    const { data, error } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        console.error("Patient Name Fetch Error:", error);
        return "";
    }

    return String(data?.full_name || "").trim();
}


/* =========================================================
   INITIAL QUESTION
========================================================= */

function getInitialQuestion(language) {

    const questions = {

        en: {
            id: "chief_complaint",
            type: "text",
            text:
                "Hello 👋 I'm MedZyra. What health problem or symptom are you experiencing today?"
        },

        hi: {
            id: "chief_complaint",
            type: "text",
            text:
                "नमस्ते 👋 मैं MedZyra हूँ। आज आपको कौन सी स्वास्थ्य समस्या या लक्षण महसूस हो रहे हैं?"
        },

        bn: {
            id: "chief_complaint",
            type: "text",
            text:
                "নমস্কার 👋 আমি MedZyra। আজ আপনার কী স্বাস্থ্য সমস্যা বা উপসর্গ হচ্ছে?"
        },

        ne: {
            id: "chief_complaint",
            type: "text",
            text:
                "नमस्ते 👋 म MedZyra हुँ। आज तपाईंलाई के स्वास्थ्य समस्या वा लक्षण भइरहेको छ?"
        }

    };

    return questions[language] || questions.en;
}


/* =========================================================
   START INTERVIEW
========================================================= */

async function startInterview(userId, language = "en") {

    if (!LANGUAGE_NAMES[language]) {
        language = "en";
    }

    const { data, error } = await supabase
        .from("health_interviews")
        .insert({
            user_id: userId,
            language,
            status: "active",
            current_question: "chief_complaint"
        })
        .select()
        .single();


    if (error) {

        console.error(
            "Start Interview Error:",
            error
        );

        throw new Error(
            "Unable to start health interview"
        );
    }


    const patientName = await getPatientName(userId);

    return {

        interviewId: data.id,

        language,

        patientName,

        question:
            getInitialQuestion(language)

    };
}


/* =========================================================
   GET ANSWERS
========================================================= */

async function getAnswers(interviewId) {

    const { data, error } =
        await supabase
            .from("health_interview_answers")
            .select("*")
            .eq("interview_id", interviewId)
            .order("created_at", {
                ascending: true
            });


    if (error) {

        console.error(
            "Get Answers Error:",
            error
        );

        throw new Error(
            "Unable to fetch interview answers"
        );
    }


    return data || [];
}


/* =========================================================
   SAVE ANSWER
========================================================= */

async function saveAnswer(
    interviewId,
    questionId,
    questionText,
    answer
) {

    const { data, error } =
        await supabase
            .from("health_interview_answers")
            .insert({

                interview_id:
                    interviewId,

                question_id:
                    questionId,

                question_text:
                    questionText,

                answer

            })
            .select()
            .single();


    if (error) {

        console.error(
            "Save Answer Error:",
            error
        );

        throw new Error(
            "Unable to save answer"
        );
    }


    return data;
}


/* =========================================================
   BUILD AI CONVERSATION
========================================================= */

/*
IMPORTANT:

We put QUESTION_ID inside the message content.

Why?

Because custom properties like:

    questionId: "chief_complaint"

are removed when healthAI.service.js sends messages
to Groq.

Therefore Groq receives:

QUESTION_ID: chief_complaint
QUESTION: ...

This allows the AI to know which questions were already asked.
*/

function buildConversation(answers) {

    const conversation = [];


    answers.forEach((item) => {

        /* -----------------------------------------------
           PREVIOUS AI QUESTION
        ------------------------------------------------ */

        conversation.push({

            role: "assistant",

            content:
                `QUESTION_ID: ${String(item.question_id || "").trim()}
QUESTION: ${String(item.question_text || "").trim()}`

        });


        /* -----------------------------------------------
           PATIENT ANSWER
        ------------------------------------------------ */

        conversation.push({

            role: "user",

            content:
                `ANSWER: ${String(item.answer || "").trim()}`

        });

    });


    return conversation;
}


/* =========================================================
   PROCESS ANSWER
========================================================= */

async function processAnswer({

    userId,

    interviewId,

    questionId,

    questionText,

    answer,

    language = "en",

    redFlagDecision

}) {

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!interviewId) {

        throw new Error(
            "Interview ID is required"
        );
    }


    if (!questionId && !redFlagDecision) {

        throw new Error(
            "Question ID is required"
        );
    }


    if (!redFlagDecision &&
        (!answer || !String(answer).trim())) {

        throw new Error(
            "Answer is required"
        );
    }


    if (!LANGUAGE_NAMES[language]) {

        language = "en";
    }


    if (redFlagDecision &&
        !["continue", "other_staff", "alert_clinical_staff"].includes(redFlagDecision)) {

        throw new Error("Invalid red-flag decision");
    }


    /* =====================================================
       GET INTERVIEW
    ===================================================== */

    const {
        data: interview,
        error: interviewError
    } = await supabase

        .from("health_interviews")

        .select("*")

        .eq("id", interviewId)

        .eq("user_id", userId)

        .single();


    if (interviewError || !interview) {

        console.error(
            "Interview Fetch Error:",
            interviewError
        );

        throw new Error(
            "Interview not found"
        );
    }


    /* =====================================================
       RED FLAG DECISION
    ===================================================== */

    if (["other_staff", "alert_clinical_staff"].includes(redFlagDecision)) {

        await supabase
            .from("health_interviews")
            .update({ status: "staff_assistance" })
            .eq("id", interviewId);

        return {
            type: "redirect",
            redFlag: true,
            conversationOpen: false,
            destination: "upload",
            redirectTo: "/upload",
            message: "Please upload your health documents for staff assistance."
        };
    }


    if (redFlagDecision === "continue") {

        await supabase
            .from("health_interviews")
            .update({ status: "active" })
            .eq("id", interviewId);

        const answers = await getAnswers(interviewId);
        const next = await healthAIAgent({
            language,
            conversation: buildConversation(answers),
            acknowledgeRedFlag: true
        });

        if (next.action === "ask_question") {
            return {
                type: "question",
                redFlag: true,
                assisted: true,
                conversationOpen: true,
                question: {
                    id: next.questionId,
                    type: next.type || "text",
                    text: next.question,
                    options: next.options || undefined
                },
                answeredCount: answers.length
            };
        }

        return {
            type: "continued",
            redFlag: true,
            assisted: true,
            conversationOpen: true,
            message: "You can continue the health interview with assistance.",
            currentQuestion: interview.current_question,
            next
        };
    }


    /* =====================================================
       CHECK STATUS
    ===================================================== */

    if (interview.status !== "active") {

        return {

            type: "completed",

            message:
                "This health interview has already been completed."

        };
    }


    /* =====================================================
       SAFETY CHECK FIRST
    ===================================================== */

    const redFlagResult =
        checkRedFlags(
            questionId,
            answer
        );


    /* =====================================================
       IGNORE DUPLICATE VOICE SUBMISSIONS
    ===================================================== */

    const existingAnswers = await getAnswers(interviewId);
    const duplicateAnswer = existingAnswers.find(
        item => item.question_id === questionId
    );

    if (duplicateAnswer) {
        return {
            type: "duplicate",
            ignored: true,
            message: "This answer was already received.",
            questionId
        };
    }


    /* =====================================================
       SAVE PATIENT ANSWER
    ===================================================== */

    await saveAnswer(

        interviewId,

        questionId,

        questionText,

        answer

    );


    /* =====================================================
       RED FLAG DETECTED
    ===================================================== */

    if (redFlagResult.detected) {

        await supabase

            .from("health_interviews")

            .update({

                red_flag_detected:
                    true,

                status:
                    "urgent"

            })

            .eq(
                "id",
                interviewId
            );


        return {

            type: "redFlag",

            redFlag: true,
            conversationOpen: false,
            requiresDecision: true,

            actions: [
                {
                    id: "continue",
                    label: "Continue with assistance"
                },
                {
                    id: "alert_clinical_staff",
                    label: "Alert clinical staff",
                    destination: "upload",
                    redirectTo: "/upload"
                }
            ],

            message:
                redFlagResult.message,

            reason:
                redFlagResult.reason

        };
    }


    /* =====================================================
       GET COMPLETE HISTORY
    ===================================================== */

    const answers =
        await getAnswers(
            interviewId
        );


    /* =====================================================
       BUILD AI CONVERSATION
    ===================================================== */

    const conversation =
        buildConversation(
            answers
        );


    console.log(
        "\n🧠 AI CONVERSATION:"
    );

    console.log(
        JSON.stringify(
            conversation,
            null,
            2
        )
    );


    /* =====================================================
       CALL MEDZYRA AI
    ===================================================== */

    const next =
        await healthAIAgent({

            language,

            conversation

        });


    console.log(
        "\n🤖 AI RESPONSE:"
    );

    console.log(
        JSON.stringify(
            next,
            null,
            2
        )
    );


    /* =====================================================
       AI RED FLAG RESPONSE
    ===================================================== */

    if (
        next.action ===
        "red_flag"
    ) {

        await supabase

            .from("health_interviews")

            .update({

                red_flag_detected:
                    true,

                status:
                    "urgent"

            })

            .eq(
                "id",
                interviewId
            );

        return {

            type: "redFlag",

            redFlag: true,
            conversationOpen: false,
            requiresDecision: true,

            actions: [
                {
                    id: "continue",
                    label: "Continue with assistance"
                },
                {
                    id: "alert_clinical_staff",
                    label: "Alert clinical staff",
                    destination: "upload",
                    redirectTo: "/upload"
                }
            ],

            message:
                next.message ||
                "Your symptoms may require urgent medical attention.",

            instruction:
                next.instruction ||
                "Please seek emergency medical care now.",

            reason:
                next.disclaimer ||
                "This chatbot cannot manage medical emergencies."

        };

    }


    /* =====================================================
       AI MEDICAL TERM EXPLANATION
    ===================================================== */

    if (
        next.action ===
        "explain_term"
    ) {

        return {

            type: "message",

            message:
                next.explanation ||
                "Please ask a healthcare professional if you need medical advice.",

            term:
                next.term ||
                answer,

            answeredCount:
                answers.length

        };

    }


    /* =====================================================
       AI WANTS TO ASK QUESTION
    ===================================================== */

    if (
        next.action ===
        "ask_question"
    ) {

        /* -----------------------------------------------
           VALIDATE QUESTION ID
        ------------------------------------------------ */

        if (!next.questionId) {

            throw new Error(
                "AI did not provide a question ID"
            );
        }


        /* -----------------------------------------------
           VALIDATE QUESTION TEXT
        ------------------------------------------------ */

        if (
            !next.question ||
            !String(next.question).trim()
        ) {

            throw new Error(
                "AI did not provide question text"
            );
        }


        /* -----------------------------------------------
           PREVENT DUPLICATE QUESTION ID
        ------------------------------------------------ */

        const alreadyUsed =
            answers.some(
                item =>
                    item.question_id ===
                    next.questionId
            );


        if (alreadyUsed) {

            console.error(
                "❌ AI GENERATED DUPLICATE QUESTION ID:",
                next.questionId
            );

            throw new Error(
                "AI generated a duplicate question"
            );
        }


        /* -----------------------------------------------
           PREVENT DUPLICATE QUESTION TEXT
        ------------------------------------------------ */

        const normalizedNextQuestion =
            String(next.question)
                .trim()
                .toLowerCase();


        const duplicateText =
            answers.some(item => {

                const previousQuestion =
                    String(
                        item.question_text || ""
                    )
                        .trim()
                        .toLowerCase();

                return (
                    previousQuestion ===
                    normalizedNextQuestion
                );

            });


        if (duplicateText) {

            console.error(
                "❌ AI GENERATED DUPLICATE QUESTION TEXT"
            );

            throw new Error(
                "AI generated a duplicate question"
            );
        }


        /* -----------------------------------------------
           UPDATE CURRENT QUESTION
        ------------------------------------------------ */

        const {
            error: updateError
        } = await supabase

            .from("health_interviews")

            .update({

                current_question:
                    next.questionId

            })

            .eq(
                "id",
                interviewId
            );


        if (updateError) {

            console.error(
                "Update Current Question Error:",
                updateError
            );

            throw new Error(
                "Unable to update current question"
            );
        }


        /* -----------------------------------------------
           RETURN NEXT QUESTION
        ------------------------------------------------ */

        return {

            type: "question",

            question: {

                id:
                    next.questionId,

                type:
                    next.type ||
                    "text",

                text:
                    next.question,

                options:
                    next.options || undefined

            },

            answeredCount:
                answers.length

        };

    }


    /* =====================================================
       AI WANTS TO COMPLETE
    ===================================================== */

    if (
        next.action ===
        "complete"
    ) {

        /* -----------------------------------------------
           BUILD FINAL ASSESSMENT
        ------------------------------------------------ */

        const assessment = {

            summary:
                next.summary ||
                "Your symptoms have been recorded for review.",

            possibleCategories:
                Array.isArray(
                    next.possibleCategories
                )
                    ? next.possibleCategories
                    : [],

            recommendedDoctor:
                next.recommendedDoctor ||
                "General Physician",

            nextStep:
                next.nextStep ||
                "Please discuss your symptoms with a healthcare professional.",

            disclaimer:
                next.disclaimer ||
                "This is not a diagnosis."

        };


        /* -----------------------------------------------
           SAVE ASSESSMENT
        ------------------------------------------------ */

        const {
            error: assessmentError
        } = await supabase

            .from("health_assessments")

            .insert({

                interview_id:
                    interviewId,

                summary:
                    assessment.summary,

                possible_conditions:
                    assessment.possibleCategories,

                recommended_doctor:
                    assessment.recommendedDoctor,

                red_flags:
                    []

            });


        if (assessmentError) {

            console.error(
                "Assessment Save Error (health_assessments):",
                assessmentError
            );

            throw new Error(
                "Unable to save health assessment"
            );
        }


        /* -----------------------------------------------
           COMPLETE INTERVIEW
        ------------------------------------------------ */

        const {
            error: completeError
        } = await supabase

            .from("health_interviews")

            .update({

                status:
                    "completed",

                current_question:
                    null,

                completed_at:
                    new Date().toISOString()

            })

            .eq(
                "id",
                interviewId
            );


        if (completeError) {

            console.error(
                "Complete Interview Error (health_interviews):",
                completeError
            );

            throw new Error(
                "Unable to complete health interview"
            );
        }


        /* -----------------------------------------------
           RETURN FINAL RESULT
        ------------------------------------------------ */

        return {

            type:
                "completed",

            assessment,

            patientName:
                await getPatientName(userId),

            discussion: {
                available: true,
                prompt:
                    "Would you like to discuss this health topic further with MedZyra?",
                endpoint: "/api/health-ai/chat",
                interactionModes: ["text", "touch", "voice"],
                defaultInteractionMode: "text",
                voiceToVoiceAvailable: "browser-dependent"
            }

        };

    }


    /* =====================================================
       INVALID AI RESPONSE
    ===================================================== */

    console.error(
        "❌ INVALID AI ACTION:",
        next
    );


    throw new Error(
        "Invalid response from health AI"
    );
}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

    startInterview,

    processAnswer,

    getAnswers

};