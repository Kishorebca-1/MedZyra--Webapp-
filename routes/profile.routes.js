const express = require("express");

const router = express.Router();

const {
    getProfile,
    updateProfile
} = require("../controllers/profile.controller");

const {
    authenticateToken
} = require("../middleware/auth.middleware");

router.get("/", authenticateToken, getProfile);

router.put("/", authenticateToken, updateProfile);

module.exports = router;