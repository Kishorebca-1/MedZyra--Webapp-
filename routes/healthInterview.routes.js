const express = require("express");

const router = express.Router();

const {
	startHealthInterview,
	sendHealthInterviewAnswer
} = require("../controllers/healthInterview.controller");

const {
	authenticateToken
} = require("../middleware/auth.middleware");

router.post("/start", authenticateToken, startHealthInterview);
router.post("/answer", authenticateToken, sendHealthInterviewAnswer);
router.post("/message", authenticateToken, sendHealthInterviewAnswer);

module.exports = router;
