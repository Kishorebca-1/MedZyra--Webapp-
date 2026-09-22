const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const { getPatientTimeline } = require("../controllers/patient.controller");

const router = express.Router();

router.get("/timeline", authenticateToken, getPatientTimeline);
router.get("/summary", authenticateToken, getPatientTimeline);

module.exports = router;
