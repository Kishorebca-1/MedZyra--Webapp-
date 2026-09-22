const express = require("express");

const router =
    express.Router();

const {
    testHealthAI,
    continueInterviewDiscussion
} = require("../controllers/healthAI.controller");
const { authenticateToken } = require("../middleware/auth.middleware");


router.post(
    "/chat",
    testHealthAI
);

router.post(
    "/interview-discussion",
    authenticateToken,
    continueInterviewDiscussion
);


module.exports = router;