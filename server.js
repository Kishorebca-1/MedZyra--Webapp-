const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ override: true });

const supabase = require("./config/supabase");
const authRoutes = require("./routes/auth.routes");
const healthInterviewRoutes =
    require("./routes/healthInterview.routes");
const app = express();

const healthAIRoutes =
    require("./routes/healthAI.routes");

const documentRoutes =
    require("./routes/document.routes");
const patientRoutes =
    require("./routes/patient.routes");

app.use(cors());
app.use(express.json());

const publicDirectory = path.join(__dirname, "public");
app.use(express.static(publicDirectory));

// ==========================================
// AUTH ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use(
    "/api/health-interview",
    healthInterviewRoutes
);
app.use(
    "/api/health-ai",
    healthAIRoutes
);
app.use(
    "/api/documents",
    documentRoutes
);
app.use(
    "/api/patient",
    patientRoutes
);

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
    res.sendFile(path.join(publicDirectory, "index.html"));
});

app.get("/health", (req, res) => {
    res.json({ success: true, status: "ok" });
});


// ==========================================
// TEST SUPABASE
// ==========================================

app.get("/test-supabase", async (req, res) => {
    try {

        const { error } = await supabase
            .from("users")
            .select("id")
            .limit(1);

        if (error) {

            console.error(
                "Supabase Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Supabase connection/query failed",
                error: error.message
            });
        }

        return res.json({
            success: true,
            message: "Supabase connected successfully ✅"
        });

    } catch (error) {

        console.error(
            "Server Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});


// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `MedZyra server running on port ${PORT}`
    );
});

