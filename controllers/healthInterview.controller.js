const {
    startInterview,
    processAnswer
} = require("../services/healthInterview.service");


/* =========================================================
   START
========================================================= */

async function startHealthInterview(req, res) {

    try {

        const userId =
            req.user.userId || req.user.id;

        const language =
            req.body.language || "en";


        const allowedLanguages =
            ["en", "hi", "bn", "ne"];


        if (!allowedLanguages.includes(language)) {

            return res.status(400).json({

                success: false,

                message:
                    "Unsupported language"

            });
        }


        const result =
            await startInterview(
                userId,
                language
            );


        return res.status(201).json({

            success: true,

            data: result

        });

    } catch (error) {

        console.error(
            "Start Health Interview:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to start interview"

        });
    }
}


/* =========================================================
   MESSAGE
========================================================= */

async function sendHealthInterviewAnswer(req, res) {

    try {

        const userId =
            req.user.userId || req.user.id;


        const {
            interviewId,
            questionId,
            questionText,
            answer,
            language,
            redFlagDecision
        } = req.body;


        if (redFlagDecision &&
            !["continue", "other_staff", "alert_clinical_staff"].includes(redFlagDecision)) {

            return res.status(400).json({
                success: false,
                message: "Invalid red-flag decision"
            });
        }


        if (!interviewId) {

            return res.status(400).json({

                success: false,

                message:
                    "interviewId is required"

            });
        }


        if (!questionId && !redFlagDecision) {

            return res.status(400).json({

                success: false,

                message:
                    "questionId is required"

            });
        }


        if (!redFlagDecision &&
            (!answer || !String(answer).trim())) {

            return res.status(400).json({

                success: false,

                message:
                    "Answer is required"

            });
        }


        if (
            String(answer).length > 5000
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Answer is too long"

            });
        }


        const result =
            await processAnswer({

                userId,

                interviewId,

                questionId,

                questionText:
                    questionText || "",

                answer:
                    answer ? String(answer).trim() : "",

                language:
                    language || "en",

                redFlagDecision

            });


        return res.json({

            success: true,

            data: result

        });

    } catch (error) {

        console.error(
            "Health Interview Message:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to process answer"

        });
    }
}


module.exports = {

    startHealthInterview,

    sendHealthInterviewAnswer

};