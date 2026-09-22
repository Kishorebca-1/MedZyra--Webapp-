// services/redFlag.service.js


/* =========================================================
   RED FLAG SERVICE
========================================================= */

function checkRedFlags(questionId, answer) {

    if (!answer) {
        return {
            detected: false
        };
    }


    const text =
        String(answer)
            .toLowerCase()
            .trim();


    /* =====================================================
       EMERGENCY PHRASES
    ===================================================== */

    const emergencyPatterns = [

        // English
        "can't breathe",
        "cannot breathe",
        "difficulty breathing",
        "severe breathing",
        "not breathing",
        "unconscious",
        "passed out",
        "fainted",
        "severe chest pain",
        "crushing chest pain",
        "chest pressure",
        "heavy bleeding",
        "bleeding heavily",
        "coughing blood",
        "vomiting blood",
        "blood in vomit",
        "black stool",
        "stroke",
        "face drooping",
        "slurred speech",
        "sudden weakness",
        "seizure",

        // Hindi
        "सांस नहीं आ रही",
        "सांस लेने में परेशानी",
        "बहुत तेज सीने में दर्द",
        "बेहोश",
        "बहुत ज्यादा खून",
        "खून की उल्टी",

        // Bengali
        "শ্বাস নিতে পারছি না",
        "শ্বাসকষ্ট",
        "তীব্র বুকে ব্যথা",
        "অজ্ঞান",
        "অনেক রক্তপাত",
        "রক্ত বমি",

        // Nepali
        "सास फेर्न गाह्रो",
        "सास फेर्न सक्दिन",
        "छातीमा धेरै दुखाइ",
        "बेहोस",
        "धेरै रक्तस्राव"
    ];


    const matched =
        emergencyPatterns.some(
            pattern => text.includes(pattern)
        );


    if (matched) {

        return {

            detected: true,

            reason:
                "Potential warning sign detected",

            message:
                "Your answer may indicate a potentially urgent health situation. Please seek immediate medical attention or contact your local emergency service. If possible, stay with a trusted person and inform a healthcare professional."
        };
    }


    /* =====================================================
       STRUCTURED QUESTION CHECKS
    ===================================================== */

    if (questionId === "breathing") {

        if (
            text.includes("severe") ||
            text.includes("yes")
        ) {

            return {

                detected: true,

                reason:
                    "Severe breathing difficulty may require urgent assessment",

                message:
                    "Severe breathing difficulty can require urgent medical attention. Please seek immediate medical help."
            };
        }
    }


    if (questionId === "chest_pain") {

        if (
            text.includes("severe") ||
            text.includes("crushing") ||
            text.includes("pressure")
        ) {

            return {

                detected: true,

                reason:
                    "Potentially serious chest symptom",

                message:
                    "Your description of chest symptoms may require urgent medical assessment. Please seek immediate medical help."
            };
        }
    }


    /* =====================================================
       NO RED FLAG
    ===================================================== */

    return {
        detected: false
    };
}


module.exports = {
    checkRedFlags
};