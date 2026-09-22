/* =========================================================
   MEDZYRA HEALTH AI AGENT
   ---------------------------------------------------------
   Features:
   - Maximum 8 questions
   - Early completion
   - Red-flag / emergency detection
   - Medical-term explanations
   - Multilingual support
   - Choice questions
   - Duplicate-question prevention
   - Doctor-specialty recommendation
   - Urgency recommendation
   - Patient-friendly final summary
   ========================================================= */

const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


/* =========================================================
   CONFIGURATION
   ========================================================= */

const MAX_QUESTIONS = 8;


/* =========================================================
   SUPPORTED LANGUAGES
   ========================================================= */

const LANGUAGE_NAMES = {
    en: "English",
    hi: "Hindi",
    bn: "Bengali",
    ne: "Nepali"
};


/* =========================================================
   NORMALIZATION HELPERS
   ========================================================= */

function normalizeQuestionId(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}


function normalizeText(value) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}


function getMessageContent(message) {

    if (!message || typeof message !== "object") {
        return "";
    }

    if (typeof message.content === "string") {
        return message.content;
    }

    if (message.content && typeof message.content === "object") {
        return JSON.stringify(message.content);
    }

    return "";
}


function getAssistantAction(message) {

    const content = getMessageContent(message);

    if (message && message.action) {
        return String(message.action).toLowerCase();
    }

    try {
        const parsed = JSON.parse(content);
        return String(parsed.action || "").toLowerCase();
    } catch (error) {
        return "";
    }
}


/* =========================================================
   RED FLAG ENGINE
   ---------------------------------------------------------
   IMPORTANT:
   This is intentionally deterministic.
   Do NOT depend only on the LLM for emergency detection.
   ========================================================= */

const RED_FLAG_PATTERNS = [

    /* Breathing */
    /difficulty breathing/i,
    /can't breathe/i,
    /cannot breathe/i,
    /unable to breathe/i,
    /severe shortness of breath/i,
    /breathing difficulty/i,

    /* Chest / heart */
    /severe chest pain/i,
    /crushing chest pain/i,
    /pressure in.*chest/i,
    /tightness in.*chest/i,

    /* Consciousness */
    /unconscious/i,
    /passed out/i,
    /fainted/i,
    /loss of consciousness/i,

    /* Severe bleeding */
    /vomiting blood/i,
    /blood in vomit/i,
    /coughing blood/i,
    /severe bleeding/i,
    /bleeding heavily/i,

    /* Neurological emergency */
    /face drooping/i,
    /slurred speech/i,
    /sudden weakness/i,
    /sudden numbness/i,
    /cannot move.*arm/i,
    /cannot move.*leg/i,
    /seizure/i,

    /* Severe pain */
    /worst pain of my life/i,
    /unbearable pain/i,
    /excruciating pain/i,

    /* Severe allergic reaction */
    /throat swelling/i,
    /tongue swelling/i,
    /face swelling.*breathing/i,

    /* Mental health emergency */
    /kill myself/i,
    /want to die/i,
    /suicidal/i,
    /suicide/i,
    /hurt myself/i,
    /harm myself/i
];


function detectRedFlag(text) {

    const patientText = normalizeText(text);

    return RED_FLAG_PATTERNS.some(pattern =>
        pattern.test(patientText)
    );
}


/* =========================================================
   RED FLAG RESPONSE
   ========================================================= */

function getRedFlagResponse(language = "en") {

    const messages = {

        en: {
            message:
                "🚨 Your message contains a symptom that may require urgent medical attention.",
            instruction:
                "Please seek emergency medical care now or contact your local emergency service. If possible, ask someone you trust to stay with you.",
            disclaimer:
                "This chatbot cannot diagnose or manage medical emergencies."
        },

        hi: {
            message:
                "🚨 आपके बताए लक्षणों में ऐसा संकेत हो सकता है जिसके लिए तुरंत चिकित्सा सहायता की आवश्यकता हो सकती है।",
            instruction:
                "कृपया तुरंत आपातकालीन चिकित्सा सहायता लें या स्थानीय आपातकालीन सेवा से संपर्क करें। यदि संभव हो तो किसी भरोसेमंद व्यक्ति को अपने पास रखें।",
            disclaimer:
                "यह चैटबॉट बीमारी का निदान या आपातकालीन स्थिति का इलाज नहीं कर सकता।"
        },

        bn: {
            message:
                "🚨 আপনার বলা লক্ষণগুলোর মধ্যে এমন একটি লক্ষণ থাকতে পারে যার জন্য জরুরি চিকিৎসা সহায়তা প্রয়োজন হতে পারে।",
            instruction:
                "দয়া করে এখনই জরুরি চিকিৎসা সহায়তা নিন অথবা স্থানীয় জরুরি পরিষেবার সাথে যোগাযোগ করুন। সম্ভব হলে আপনার পরিচিত বা বিশ্বস্ত কাউকে পাশে রাখুন।",
            disclaimer:
                "এই চ্যাটবট রোগ নির্ণয় বা জরুরি চিকিৎসা পরিচালনা করতে পারে না।"
        },

        ne: {
            message:
                "🚨 तपाईंले बताउनुभएको लक्षणमा तत्काल चिकित्सा सहायता आवश्यक पर्न सक्ने संकेत हुन सक्छ।",
            instruction:
                "कृपया तुरुन्त आपतकालीन चिकित्सा सहायता लिनुहोस् वा स्थानीय आपतकालीन सेवामा सम्पर्क गर्नुहोस्। सम्भव भएमा विश्वासिलो व्यक्तिलाई आफूसँग राख्नुहोस्।",
            disclaimer:
                "यो च्याटबटले रोगको निदान वा आपतकालीन उपचार गर्न सक्दैन।"
        }

    };

    const selected =
        messages[language] || messages.en;

    return {
        action: "red_flag",
        severity: "emergency",
        message: selected.message,
        instruction: selected.instruction,
        disclaimer: selected.disclaimer
    };
}


/* =========================================================
   EXTRACT QUESTION INFORMATION
   ========================================================= */

function extractUsedQuestionIds(conversation) {

    return conversation
        .filter(message => message.role === "assistant")
        .map(message => {

            const match =
                getMessageContent(message).match(
                    /QUESTION_ID:\s*([^\n]+)/i
                );

            if (match) {
                return normalizeQuestionId(match[1]);
            }

            const content = getMessageContent(message);

            try {
                const parsed = JSON.parse(content);
                return parsed.questionId
                    ? normalizeQuestionId(parsed.questionId)
                    : null;
            } catch (error) {
                return null;
            }
        })
        .filter(Boolean);
}


function extractAskedQuestions(conversation) {

    return conversation
        .filter(message => message.role === "assistant")
        .map(message => {

            const match =
                getMessageContent(message).match(
                    /QUESTION:\s*([\s\S]+)$/i
                );

            if (match) {
                return normalizeText(match[1]);
            }

            const content = getMessageContent(message);

            try {
                const parsed = JSON.parse(content);
                return parsed.question
                    ? normalizeText(parsed.question)
                    : null;
            } catch (error) {
                return null;
            }
        })
        .filter(Boolean);
}


function extractPatientAnswers(conversation) {

    return conversation
        .filter(message => message.role === "user")
        .map(message =>
            String(message.content || "")
                .replace(/^ANSWER:\s*/i, "")
                .trim()
        )
        .filter(Boolean);
}


/* =========================================================
   QUESTION COUNT
   ========================================================= */

function getQuestionCount(conversation) {

    return conversation.filter(
        message =>
            message.role === "assistant" &&
            (
                /QUESTION_ID:/i.test(getMessageContent(message)) ||
                getAssistantAction(message) === "ask_question"
            )
    ).length;
}


/* =========================================================
   PATIENT ASKS FOR A TERM EXPLANATION
   ========================================================= */

function looksLikeExplanationRequest(text) {

    const value = normalizeText(text);

    return (
        value.includes("what does") ||
        value.includes("what is") ||
        value.includes("meaning of") ||
        value.includes("means") ||
        value.includes("explain") ||
        value.includes("what do you mean") ||
        value.includes("i don't understand") ||
        value.includes("dont understand") ||
        value.includes("not understand") ||
        value.includes("define")
    );
}


function looksLikeCompletionRequest(text) {

    const value = normalizeText(text);

    return [
        "i want to finish",
        "want to finish",
        "finish the conversation",
        "finish conversation",
        "end the conversation",
        "end conversation",
        "i am done",
        "i'm done",
        "thats all",
        "that's all",
        "no more questions"
    ].some(phrase => value.includes(phrase));
}


/* =========================================================
   MEDICAL TERM EXPLANATION
   ========================================================= */

async function explainMedicalTerm({
    term,
    language = "en"
}) {

    const languageName =
        LANGUAGE_NAMES[language] || "English";

    const prompt = `

You are MedZyra's patient education assistant.

The patient does not understand a medical term.

Explain the term in ${languageName}.

RULES:

1. Use very simple language.
2. Do not diagnose.
3. Do not prescribe medicine.
4. Do not give treatment instructions.
5. Give a short everyday explanation.
6. If useful, give one simple example.
7. Do not use complicated medical terminology.
8. Return ONLY JSON.

JSON:

{
    "action": "explain_term",
    "term": "${term}",
    "explanation": "Simple explanation"
}

Medical term:
${term}

`;

    try {

        const response =
            await groq.chat.completions.create({

                model: "openai/gpt-oss-120b",

                messages: [
                    {
                        role: "system",
                        content: prompt
                    }
                ],

                temperature: 0.1,

                max_tokens: 250,

                response_format: {
                    type: "json_object"
                }
            });

        const content =
            response?.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error(
                "Empty explanation response"
            );
        }

        return JSON.parse(content.trim());

    } catch (error) {

        console.error(
            "❌ TERM EXPLANATION ERROR:",
            error
        );

        return {
            action: "explain_term",
            term,
            explanation:
                "This is a medical term. I can explain it in simple language, but please ask a healthcare professional if you need medical advice."
        };
    }
}


/* =========================================================
   DOCTOR RECOMMENDATION
   ========================================================= */

const DOCTOR_MAPPING = {

    digestive:
        "Gastroenterologist",

    stomach:
        "Gastroenterologist",

    abdominal:
        "General Physician",

    skin:
        "Dermatologist",

    rash:
        "Dermatologist",

    allergy:
        "Allergist / Immunologist",

    ear:
        "ENT Specialist",

    nose:
        "ENT Specialist",

    throat:
        "ENT Specialist",

    headache:
        "General Physician",

    migraine:
        "Neurologist",

    neurological:
        "Neurologist",

    nerve:
        "Neurologist",

    heart:
        "Cardiologist",

    cardiovascular:
        "Cardiologist",

    chest:
        "General Physician",

    joint:
        "Orthopedic Specialist",

    bone:
        "Orthopedic Specialist",

    muscle:
        "Orthopedic Specialist",

    eye:
        "Ophthalmologist",

    vision:
        "Ophthalmologist",

    dental:
        "Dentist",

    tooth:
        "Dentist",

    urinary:
        "Urologist",

    kidney:
        "Nephrologist",

    pregnancy:
        "Obstetrician / Gynecologist",

    menstrual:
        "Gynecologist",

    reproductive:
        "Gynecologist",

    mental:
        "Mental Health Professional",

    psychological:
        "Mental Health Professional"
};


function getDoctorRecommendation(category) {

    const normalized =
        normalizeText(category);

    for (const key of Object.keys(DOCTOR_MAPPING)) {

        if (normalized.includes(key)) {
            return DOCTOR_MAPPING[key];
        }
    }

    return "General Physician";
}


/* =========================================================
   FALLBACK QUESTION BANK
   ========================================================= */

const QUESTION_BANK = {

    stomach: [

        {
            id: "pain_location",
            question:
                "Where exactly is the stomach pain located?",
            type: "text"
        },

        {
            id: "pain_duration",
            question:
                "How long have you had this pain?",
            type: "choice",

            options: [
                "Less than 1 day",
                "1–3 days",
                "4–7 days",
                "More than a week"
            ]
        },

        {
            id: "pain_severity",
            question:
                "How severe is the pain?",
            type: "choice",

            options: [
                "Mild",
                "Moderate",
                "Severe"
            ]
        },

        {
            id: "pain_pattern",
            question:
                "Does the pain stay constant or come and go?",
            type: "choice",

            options: [
                "Constant",
                "Comes and goes",
                "Not sure"
            ]
        },

        {
            id: "pain_after_food",
            question:
                "Does eating make the pain stronger?",
            type: "choice",

            options: [
                "Yes",
                "No",
                "Not sure"
            ]
        },

        {
            id: "nausea",
            question:
                "Do you feel like you might vomit?",
            type: "choice",

            options: [
                "Yes",
                "No",
                "Not sure"
            ],

            explanation: {
                term: "Nausea",
                meaning:
                    "Nausea means feeling like you may vomit or throw up."
            }
        },

        {
            id: "vomiting",
            question:
                "Have you been vomiting?",
            type: "choice",

            options: [
                "Yes",
                "No"
            ]
        },

        {
            id: "fever",
            question:
                "Do you have a fever?",
            type: "choice",

            options: [
                "Yes",
                "No",
                "Not sure"
            ]
        }
    ],


    general: [

        {
            id: "symptom_location",
            question:
                "Where exactly are you experiencing this symptom?",
            type: "text"
        },

        {
            id: "symptom_duration",
            question:
                "How long have you had this symptom?",
            type: "choice",

            options: [
                "Less than 1 day",
                "1–3 days",
                "4–7 days",
                "More than a week"
            ]
        },

        {
            id: "symptom_severity",
            question:
                "How severe is the symptom?",
            type: "choice",

            options: [
                "Mild",
                "Moderate",
                "Severe"
            ]
        },

        {
            id: "symptom_onset",
            question:
                "Did the symptom start suddenly or gradually?",
            type: "choice",

            options: [
                "Suddenly",
                "Gradually",
                "Not sure"
            ]
        },

        {
            id: "symptom_pattern",
            question:
                "Is the symptom constant or does it come and go?",
            type: "choice",

            options: [
                "Constant",
                "Comes and goes",
                "Not sure"
            ]
        },

        {
            id: "symptom_trigger",
            question:
                "Have you noticed anything that makes the symptom better or worse?",
            type: "text"
        },

        {
            id: "fever",
            question:
                "Do you have a fever?",
            type: "choice",

            options: [
                "Yes",
                "No",
                "Not sure"
            ]
        }
    ]
};


/* =========================================================
   DETERMINE SYMPTOM TYPE
   ========================================================= */

function determineQuestionBank(patientAnswers) {

    const text =
        normalizeText(
            patientAnswers.join(" ")
        );

    if (
        text.includes("stomach") ||
        text.includes("abdominal") ||
        text.includes("belly") ||
        text.includes("abdomen")
    ) {
        return "stomach";
    }

    return "general";
}


/* =========================================================
   FALLBACK QUESTION
   ========================================================= */

function getFallbackQuestion(
    patientAnswers,
    usedQuestionIds,
    askedQuestions
) {

    const bankName =
        determineQuestionBank(patientAnswers);

    const bank =
        QUESTION_BANK[bankName] ||
        QUESTION_BANK.general;

    const unused =
        bank.find(question => {

            const id =
                normalizeQuestionId(
                    question.id
                );

            const text =
                normalizeText(
                    question.question
                );

            return (
                !usedQuestionIds.includes(id) &&
                !askedQuestions.includes(text)
            );
        });

    if (!unused) {
        return null;
    }

    return unused;
}


function formatFallbackQuestion(question) {

    if (!question) {
        return null;
    }

    return {
        action: "ask_question",
        questionId: normalizeQuestionId(question.id),
        question: question.question,
        type: question.type,
        options: question.options
    };
}


/* =========================================================
   POST-INTERVIEW DISCUSSION AGENT
   ========================================================= */

async function healthDiscussionAgent({
    language = "en",
    context = [],
    conversation = [],
    message
}) {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key") {
        throw new Error("GROQ_API_KEY is not configured");
    }

    const languageName = LANGUAGE_NAMES[language] || "English";
    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
            {
                role: "system",
                content: `You are MedZyra's patient health-information discussion assistant after a preliminary interview. Reply in ${languageName}.

Your purpose is to help the patient describe and understand their reported condition more effectively. Use only facts the patient reported or facts explicitly present in the supplied context.

Safety rules:
- Never diagnose, name a disease as the patient's condition, or claim certainty.
- Never recommend, name, or compare medicines, supplements, doses, or treatments.
- Never tell the patient to start, stop, or change a medicine.
- Do not invent symptoms, test results, causes, or history.
- If the patient asks for a diagnosis or medicine, briefly explain that you cannot provide it and redirect to clarifying their symptoms or speaking with a qualified clinician.
- If the patient reports an emergency warning sign, tell them to seek urgent medical care immediately.

Conversation rules:
- Acknowledge the patient's concern in one short sentence.
- Reflect the key reported facts and identify uncertainty when useful.
- Ask at most one focused follow-up question when more information would clarify the situation.
- If the patient asks about an unfamiliar medical word, explain that word in very simple everyday language, optionally with one short example. Do not turn the explanation into a diagnosis or treatment recommendation.
- If the patient says they do not understand your reply, restate it with shorter sentences and simpler words.
- Keep the reply to 2-4 short sentences and use simple language.
- Return only JSON with this shape: {"reply":"Patient-friendly response","focus":"What this discussion is clarifying","followUpQuestion":"One optional focused question or empty string","safetyNote":"A brief safety reminder or empty string"}.`
            },
            {
                role: "system",
                content: `PATIENT CONTEXT:\n${JSON.stringify(context)}`
            },
            ...conversation.map(item => ({
                role: item.role,
                content: String(item.content || "")
            })),
            { role: "user", content: message.trim() }
        ],
        temperature: 0.2,
        max_tokens: 350,
        response_format: {
            type: "json_object"
        }
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned an empty response");

    let result;
    try {
        result = JSON.parse(content.trim());
    } catch (error) {
        result = { reply: content.trim() };
    }

    const followUpQuestion = String(result.followUpQuestion || "").trim();
    const safetyNote = String(result.safetyNote || "").trim();
    const focus = String(result.focus || "Reported symptoms and health history").trim();
    const suggestion = followUpQuestion || safetyNote || "Discuss these reported symptoms with a qualified healthcare professional.";

    return {
        reply: String(result.reply || content).trim(),
        focus,
        followUpQuestion,
        safetyNote,
        suggestion: String(suggestion || "Please discuss this with a healthcare professional.").trim(),
        suggestions: [String(suggestion || "Please discuss this with a healthcare professional.").trim()]
    };
}


/* =========================================================
   MAIN HEALTH AI AGENT
   ========================================================= */

async function healthAIAgent({
    language = "en",
    conversation = [],
    acknowledgeRedFlag = false
}) {

    /* =====================================================
       API KEY CHECK
       ===================================================== */

    if (
        !process.env.GROQ_API_KEY ||
        process.env.GROQ_API_KEY ===
        "your_groq_api_key"
    ) {
        throw new Error(
            "GROQ_API_KEY is not configured"
        );
    }


    const languageName =
        LANGUAGE_NAMES[language] ||
        "English";


    /* =====================================================
       EXTRACT STATE
       ===================================================== */

    const usedQuestionIds =
        extractUsedQuestionIds(
            conversation
        );

    const askedQuestions =
        extractAskedQuestions(
            conversation
        );

    const patientAnswers =
        extractPatientAnswers(
            conversation
        );

    const questionCount =
        getQuestionCount(
            conversation
        );


    /* =====================================================
       GET LATEST PATIENT MESSAGE
       ===================================================== */

    const latestPatientMessage =
        patientAnswers.length
            ? patientAnswers[
                patientAnswers.length - 1
            ]
            : "";


    /* =====================================================
       RED FLAG CHECK
       -----------------------------------------------------
       This happens BEFORE Groq.
       ===================================================== */

    if (
        !acknowledgeRedFlag &&
        latestPatientMessage &&
        detectRedFlag(
            latestPatientMessage
        )
    ) {

        console.log(
            "🚨 RED FLAG DETECTED:",
            latestPatientMessage
        );

        return getRedFlagResponse(
            language
        );
    }


    if (
        latestPatientMessage &&
        looksLikeCompletionRequest(
            latestPatientMessage
        )
    ) {

        return generateCompletion({
            language,
            conversation,
            patientAnswers
        });
    }


    /* =====================================================
       QUESTION LIMIT
       ===================================================== */

    if (
        questionCount >= MAX_QUESTIONS
    ) {

        console.log(
            "✅ MAXIMUM QUESTIONS REACHED"
        );

        return generateCompletion({
            language,
            conversation,
            patientAnswers
        });
    }


    /* =====================================================
       MEDICAL TERM EXPLANATION
       ===================================================== */

    if (
        latestPatientMessage &&
        looksLikeExplanationRequest(
            latestPatientMessage
        )
    ) {

        return explainMedicalTerm({
            term: latestPatientMessage,
            language
        });
    }


    /* =====================================================
       FALLBACK QUESTION
       ===================================================== */

    const fallbackQuestion =
        getFallbackQuestion(
            patientAnswers,
            usedQuestionIds,
            askedQuestions
        );


    /* =====================================================
       SYSTEM PROMPT
       ===================================================== */

    const systemPrompt = `

You are MedZyra AI Health Interview Agent.

You conduct a PRELIMINARY health information interview.

You are NOT a doctor.

You MUST NOT diagnose.

You MUST NOT prescribe medication.

You MUST NOT give medication dosage.

You MUST NOT claim certainty.

Your job is to collect useful information and help the patient understand what type of healthcare professional may be appropriate.

The interview is for understanding the patient's reported condition, not for diagnosing it. Prioritize the patient's main concern, timing, severity, changes over time, related symptoms, relevant history, and effect on daily activities. Do not ask for or suggest medicines.

Respond in ${languageName}.

Use simple patient-friendly language.

Friendly emojis are allowed.

=========================================================
QUESTION LIMIT
=========================================================

Maximum number of interview questions:
${MAX_QUESTIONS}

Questions already asked:
${questionCount}

If enough useful information has already been collected,
RETURN "complete".

If the maximum number of questions has been reached,
RETURN "complete".

NEVER continue asking questions indefinitely.

=========================================================
PREVIOUS QUESTION IDS
=========================================================

${usedQuestionIds.length
        ? usedQuestionIds.join(", ")
        : "NONE"
    }

Do not reuse any previous question ID.

=========================================================
PREVIOUS QUESTIONS
=========================================================

${askedQuestions.length
        ? askedQuestions.join("\n")
        : "NONE"
    }

Do not repeat previous questions.

=========================================================
PATIENT ANSWERS
=========================================================

${patientAnswers.length
        ? patientAnswers.join("\n")
        : "No answers yet."
    }

=========================================================
RED FLAGS
=========================================================

If the patient's message indicates a possible emergency,
DO NOT ask another question.

Return:

{
    "action": "red_flag",
    "severity": "emergency",
    "message": "Urgent medical attention may be needed.",
    "instruction": "Seek emergency medical care now.",
    "disclaimer": "This chatbot cannot manage medical emergencies."
}

Possible emergency examples include:

- severe chest pain
- severe difficulty breathing
- unconsciousness
- fainting
- severe bleeding
- vomiting blood
- coughing blood
- seizure
- sudden weakness
- face drooping
- slurred speech
- severe allergic reaction
- suicidal thoughts
- immediate risk of self-harm
- extremely severe or unbearable pain

Do NOT diagnose the condition.

=========================================================
MEDICAL TERMS
=========================================================

If the patient asks what a medical term means:

Return:

{
    "action": "explain_term",
    "term": "term",
    "explanation": "Simple patient-friendly explanation."
}

Do not turn an explanation request into an unrelated new question.

=========================================================
QUESTION RULES
=========================================================

Ask ONE question at a time.

Never combine multiple questions.

Prefer choice questions when appropriate.

Examples:

Pain severity:

{
    "action": "ask_question",
    "questionId": "pain_severity",
    "question": "How severe is the pain?",
    "type": "choice",
    "options": [
        "Mild",
        "Moderate",
        "Severe"
    ]
}

Duration:

{
    "action": "ask_question",
    "questionId": "pain_duration",
    "question": "How long have you had the pain?",
    "type": "choice",
    "options": [
        "Less than 1 day",
        "1–3 days",
        "4–7 days",
        "More than a week"
    ]
}

=========================================================
WHEN TO COMPLETE
=========================================================

Complete the interview when:

1. Enough useful information has been collected.

OR

2. The question limit has been reached.

OR

3. The patient's answers provide enough information for a useful healthcare referral.

Return:

{
    "action": "complete",
    "summary": "Short factual summary of what the patient reported.",
    "possibleCategories": [
        "Symptom category"
    ],
    "recommendedDoctor": "Healthcare professional category",
    "urgency": "routine",
    "nextStep": "Appropriate next step.",
    "warningSigns": [
        "Important warning signs that should prompt urgent care."
    ],
    "disclaimer": "This is not a diagnosis."
}

=========================================================
URGENCY
=========================================================

Use only:

"routine"

or

"soon"

or

"urgent"

Do NOT use "emergency" here.

Emergency cases must use action "red_flag".

=========================================================
DOCTOR RECOMMENDATION
=========================================================

Recommend a healthcare professional based on the symptom category.

Examples:

Digestive symptoms → Gastroenterologist

Skin symptoms → Dermatologist

Ear/nose/throat symptoms → ENT Specialist

Neurological symptoms → Neurologist

Heart-related symptoms → Cardiologist

Bone/joint symptoms → Orthopedic Specialist

Eye symptoms → Ophthalmologist

Dental symptoms → Dentist

Urinary symptoms → Urologist

Menstrual/reproductive symptoms → Gynecologist

If uncertain → General Physician

Do not claim that the patient has a disease.

=========================================================
IMPORTANT
=========================================================

NEVER use:

"additional_symptoms"

"other_symptoms"

"more_symptoms"

"any_other_symptoms"

NEVER ask:

"Are you experiencing any other symptoms?"

NEVER ask:

"Any other symptoms?"

NEVER generate a generic "tell me more" question.

Every question must collect a specific useful piece of information.

=========================================================
OUTPUT
=========================================================

Return ONLY valid JSON.

No markdown.

No explanation outside JSON.

`;


    /* =====================================================
       GROQ REQUEST
       ===================================================== */

    let response;

    try {

        response =
            await groq.chat.completions.create({

                model:
                    "openai/gpt-oss-120b",

                messages: [

                    {
                        role: "system",
                        content: systemPrompt
                    },

                    ...conversation.map(
                        message => ({
                            role:
                                message.role,
                            content:
                                getMessageContent(message)
                        })
                    )
                ],

                temperature: 0.1,

                max_tokens: 1000,

                response_format: {
                    type: "json_object"
                }
            });

    } catch (error) {

        console.error(
            "❌ GROQ ERROR:",
            error
        );

        return formatFallbackQuestion(fallbackQuestion) ||
            generateCompletion({
                language,
                conversation,
                patientAnswers
            });
    }


    /* =====================================================
       READ RESPONSE
       ===================================================== */

    const content =
        response?.choices?.[0]?.message?.content;


    if (!content) {
        return formatFallbackQuestion(fallbackQuestion) ||
            generateCompletion({
                language,
                conversation,
                patientAnswers
            });
    }


    console.log(
        "\n🤖 RAW HEALTH AI RESPONSE:"
    );

    console.log(content);


    /* =====================================================
       PARSE JSON
       ===================================================== */

    let result;

    try {

        result =
            JSON.parse(
                content.trim()
            );

    } catch (error) {

        console.error(
            "❌ JSON PARSE ERROR:",
            content
        );

        return formatFallbackQuestion(fallbackQuestion) ||
            generateCompletion({
                language,
                conversation,
                patientAnswers
            });
    }


    /* =====================================================
       VALID ACTIONS
       ===================================================== */

    const validActions = [
        "ask_question",
        "complete",
        "red_flag",
        "explain_term"
    ];

    if (
        !validActions.includes(
            result.action
        )
    ) {
        return formatFallbackQuestion(fallbackQuestion) ||
            generateCompletion({
                language,
                conversation,
                patientAnswers
            });
    }


    /* =====================================================
       RED FLAG VALIDATION
       ===================================================== */

    if (
        result.action === "red_flag"
    ) {

        result.severity =
            "emergency";

        result.message =
            result.message ||
            "🚨 Your symptoms may require urgent medical attention.";

        result.instruction =
            result.instruction ||
            "Please seek emergency medical care now.";

        result.disclaimer =
            result.disclaimer ||
            "This chatbot cannot manage medical emergencies.";

        return result;
    }


    /* =====================================================
       EXPLANATION VALIDATION
       ===================================================== */

    if (
        result.action === "explain_term"
    ) {

        result.term =
            result.term ||
            latestPatientMessage;

        result.explanation =
            result.explanation ||
            "This term means something related to your health. Please ask a healthcare professional if you need medical advice.";

        return result;
    }


    /* =====================================================
       QUESTION VALIDATION
       ===================================================== */

    if (
        result.action === "ask_question"
    ) {

        /* -----------------------------------------------
           HARD QUESTION LIMIT
           ----------------------------------------------- */

        if (
            questionCount >= MAX_QUESTIONS
        ) {

            return generateCompletion({
                language,
                conversation,
                patientAnswers
            });
        }


        if (!result.questionId) {

            if (fallbackQuestion) {

                result.questionId =
                    fallbackQuestion.id;

                result.question =
                    fallbackQuestion.question;

                result.type =
                    fallbackQuestion.type;

                result.options =
                    fallbackQuestion.options;

            } else {

                return generateCompletion({
                    language,
                    conversation,
                    patientAnswers
                });
            }
        }


        if (!result.question) {

            if (fallbackQuestion) {

                result.question =
                    fallbackQuestion.question;

            } else {

                return generateCompletion({
                    language,
                    conversation,
                    patientAnswers
                });
            }
        }


        const questionId =
            normalizeQuestionId(
                result.questionId
            );

        const questionText =
            String(
                result.question
            ).trim();


        /* -----------------------------------------------
           DUPLICATE ID
           ----------------------------------------------- */

        if (
            usedQuestionIds.includes(
                questionId
            )
        ) {

            if (fallbackQuestion) {

                result.questionId =
                    fallbackQuestion.id;

                result.question =
                    fallbackQuestion.question;

                result.type =
                    fallbackQuestion.type;

                result.options =
                    fallbackQuestion.options;

            } else {

                return generateCompletion({
                    language,
                    conversation,
                    patientAnswers
                });
            }
        }


        /* -----------------------------------------------
           DUPLICATE TEXT
           ----------------------------------------------- */

        const normalizedNewQuestion =
            normalizeText(
                result.question
            );

        if (
            askedQuestions.includes(
                normalizedNewQuestion
            )
        ) {

            if (fallbackQuestion) {

                result.questionId =
                    fallbackQuestion.id;

                result.question =
                    fallbackQuestion.question;

                result.type =
                    fallbackQuestion.type;

                result.options =
                    fallbackQuestion.options;

            } else {

                return generateCompletion({
                    language,
                    conversation,
                    patientAnswers
                });
            }
        }


        /* -----------------------------------------------
           FORBIDDEN GENERIC QUESTIONS
           ----------------------------------------------- */

        const forbiddenPhrases = [

            "are you experiencing any other symptoms",

            "are there any other symptoms",

            "any other symptoms",

            "any additional symptoms",

            "other symptoms",

            "tell me more about your symptoms"
        ];


        const lowerQuestion =
            normalizeText(
                result.question
            );


        const forbidden =
            forbiddenPhrases.some(
                phrase =>
                    lowerQuestion.includes(
                        phrase
                    )
            );


        if (forbidden) {

            if (fallbackQuestion) {

                result.questionId =
                    fallbackQuestion.id;

                result.question =
                    fallbackQuestion.question;

                result.type =
                    fallbackQuestion.type;

                result.options =
                    fallbackQuestion.options;

            } else {

                return generateCompletion({
                    language,
                    conversation,
                    patientAnswers
                });
            }
        }


        /* -----------------------------------------------
           QUESTION TYPE
           ----------------------------------------------- */

        if (
            result.type !== "choice" &&
            result.type !== "text"
        ) {

            result.type =
                "text";
        }


        /* -----------------------------------------------
           CHOICE VALIDATION
           ----------------------------------------------- */

        if (
            result.type === "choice"
        ) {

            if (
                !Array.isArray(
                    result.options
                ) ||
                result.options.length === 0
            ) {

                result.type =
                    "text";

                delete result.options;
            }
        }


        /* -----------------------------------------------
           INTERNAL QUESTION METADATA
           ----------------------------------------------- */

        result.questionId =
            normalizeQuestionId(
                result.questionId
            );

        result.question =
            String(
                result.question
            ).trim();


        return result;
    }


    /* =====================================================
       COMPLETION VALIDATION
       ===================================================== */

    if (
        result.action === "complete"
    ) {

        result.summary =
            result.summary ||
            "Your reported symptoms have been recorded for healthcare review.";

        result.possibleCategories =
            Array.isArray(
                result.possibleCategories
            )
                ? result.possibleCategories
                : [];


        const category =
            result.possibleCategories[0] ||
            "General health concern";


        result.recommendedDoctor =
            result.recommendedDoctor ||
            getDoctorRecommendation(
                category
            );


        result.urgency =
            ["routine", "soon", "urgent"]
                .includes(result.urgency)
                ? result.urgency
                : "routine";


        result.nextStep =
            result.nextStep ||
            "Consider discussing these symptoms with a healthcare professional.";


        result.warningSigns =
            Array.isArray(
                result.warningSigns
            )
                ? result.warningSigns
                : [];


        result.disclaimer =
            result.disclaimer ||
            "This is not a diagnosis. A healthcare professional should evaluate your symptoms.";


        return result;
    }


    return result;
}


/* =========================================================
   COMPLETION GENERATOR
   ========================================================= */

async function generateCompletion({
    language = "en",
    conversation = [],
    patientAnswers = []
}) {

    const languageName =
        LANGUAGE_NAMES[language] ||
        "English";


    const completionPrompt = `

You are MedZyra AI Health Summary Assistant.

Create a patient-friendly preliminary health summary.

Respond in ${languageName}.

The information below was provided by the patient.

PATIENT INFORMATION:

${patientAnswers.join("\n")}

RULES:

1. Do NOT diagnose.
2. Do NOT claim certainty.
3. Do NOT prescribe medication.
4. Do NOT give dosage.
5. possibleCategories must be symptom categories, NOT diseases.
6. Recommend the most appropriate healthcare professional.
7. If uncertain, recommend General Physician.
8. Provide a reasonable urgency:
   - routine
   - soon
   - urgent
9. Provide warning signs that should require urgent medical attention.
10. Keep the summary short and easy to understand.

Return ONLY JSON:

{
    "action": "complete",
    "summary": "Short factual summary",
    "possibleCategories": [
        "Symptom category"
    ],
    "recommendedDoctor": "Healthcare professional",
    "urgency": "routine",
    "nextStep": "Next appropriate step",
    "warningSigns": [
        "Warning sign"
    ],
    "disclaimer": "This is not a diagnosis."
}

`;


    try {

        const response =
            await groq.chat.completions.create({

                model:
                    "openai/gpt-oss-120b",

                messages: [
                    {
                        role: "system",
                        content:
                            completionPrompt
                    }
                ],

                temperature: 0.1,

                max_tokens: 800,

                response_format: {
                    type: "json_object"
                }
            });


        const content =
            response?.choices?.[0]?.message?.content;


        if (!content) {
            throw new Error(
                "Empty completion response"
            );
        }


        const result =
            JSON.parse(
                content.trim()
            );


        /* -----------------------------------------------
           FINAL SAFETY DEFAULTS
           ----------------------------------------------- */

        result.action =
            "complete";


        result.summary =
            result.summary ||
            "Your reported symptoms have been recorded for healthcare review.";


        result.possibleCategories =
            Array.isArray(
                result.possibleCategories
            )
                ? result.possibleCategories
                : [];


        const category =
            result.possibleCategories[0] ||
            "General health concern";


        result.recommendedDoctor =
            result.recommendedDoctor ||
            getDoctorRecommendation(
                category
            );


        result.urgency =
            ["routine", "soon", "urgent"]
                .includes(result.urgency)
                ? result.urgency
                : "routine";


        result.nextStep =
            result.nextStep ||
            "Please discuss your symptoms with a healthcare professional.";


        result.warningSigns =
            Array.isArray(
                result.warningSigns
            )
                ? result.warningSigns
                : [];


        result.disclaimer =
            result.disclaimer ||
            "This is not a diagnosis.";


        return result;

    } catch (error) {

        console.error(
            "❌ COMPLETION ERROR:",
            error
        );


        return {
            action: "complete",

            summary:
                patientAnswers.length
                    ? "Your reported symptoms have been recorded for healthcare review."
                    : "No sufficient symptom information was provided.",

            possibleCategories: [
                "General health concern"
            ],

            recommendedDoctor:
                "General Physician",

            urgency:
                "routine",

            nextStep:
                "Please discuss your symptoms with a healthcare professional.",

            warningSigns: [
                "Severe or rapidly worsening symptoms",
                "Difficulty breathing",
                "Severe chest pain",
                "Loss of consciousness",
                "Severe bleeding"
            ],

            disclaimer:
                "This is not a diagnosis. A healthcare professional should evaluate your symptoms."
        };
    }
}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {
    healthAIAgent,
    healthDiscussionAgent,
    detectRedFlag,
    explainMedicalTerm
};
