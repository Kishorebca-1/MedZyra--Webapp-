const express = require("express");

const router =
    express.Router();

const {
    register
} = require("../controllers/auth.controller");

const {
    sendOTP,
    verifyOTP
} = require("../controllers/otp.controller");


/* =========================================================
   START INTERVIEW
========================================================= */

router.post("/register", register);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);


module.exports = router;