const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const {
    createOtp,
    verifyOtp
} = require("../services/emailOtp.service");

async function getHealthProfile(userId) {
    const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data || null;
}

const isEmail = (identifier) => identifier.includes("@");

const normalizeIdentifier = (identifier) => {
    const value = identifier.trim();

    if (isEmail(value)) {
        return {
            type: "email",
            value: value.toLowerCase()
        };
    }

    const phone = value.replace(/[\s()-]/g, "");

    if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
        return null;
    }

    return {
        type: "phone",
        value: phone
    };
};

const sendOTP = async (req, res) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is required"
            });
        }

        const contact = normalizeIdentifier(identifier);

        if (!contact) {
            return res.status(400).json({
                success: false,
                message: "Use a valid email address or phone number in E.164 format (for example, +14155552671)"
            });
        }

        const {
            data: user,
            error: userError
        } = await supabase
            .from("users")
            .select("id, auth_user_id, full_name, email")
            .eq(contact.type, contact.value)
            .maybeSingle();

        if (userError) {
            console.error("Find User Error:", userError);

            return res.status(500).json({
                success: false,
                message: "Failed to find user",
                error: userError.message
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found. Please register first."
            });
        }

        // ==========================================
        // CHECK AUTH LINK
        // ==========================================

        if (!user.auth_user_id) {
            return res.status(400).json({
                success: false,
                message: "This account is not connected to authentication. Please register again."
            });
        }

        if (contact.type === "email") {
            const otp = await createOtp(contact.value);

            try {
                await sendEmail(contact.value, otp);
            } catch (emailError) {
                await supabase
                    .from("email_otps")
                    .delete()
                    .eq("email", contact.value);

                throw emailError;
            }

            return res.json({
                success: true,
                message: "OTP sent to your email"
            });
        }

        const otpRequest = {
            options: {
                shouldCreateUser: false
            }
        };
        otpRequest[contact.type] = contact.value;

        const { error } = await supabase.auth.signInWithOtp(otpRequest);

        if (error) {
            console.error("Supabase OTP Error:", error);

            return res.status(400).json({
                success: false,
                message: "Failed to send OTP",
                error: error.message,
                code: error.code
            });
        }

        console.log(`OTP requested for ${contact.type}:`, contact.value);

        return res.json({
            success: true,
            message: contact.type === "email"
                ? "OTP sent to your email"
                : "OTP sent to your phone"
        });

    } catch (error) {
        if (error.code === "OTP_RATE_LIMITED") {
            const retryAfterSeconds = Number(error.retryAfterSeconds) || 60;
            console.warn(`OTP request rate-limited; retry after ${retryAfterSeconds} seconds.`);
            res.set("Retry-After", String(retryAfterSeconds));
            return res.status(429).json({
                success: false,
                message: error.message,
                retryAfterSeconds
            });
        }

        console.error("Send OTP Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send OTP",
            error: error.message
        });
    }
};


const verifyOTP = async (req, res) => {
    try {
        const {
            identifier,
            otp
        } = req.body;

        if (!identifier || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email or phone and OTP are required"
            });
        }

        if (!/^\d{6}$/.test(otp.toString().trim())) {
            return res.status(400).json({
                success: false,
                message: "OTP must be exactly 6 digits"
            });
        }

        const contact = normalizeIdentifier(identifier);

        if (!contact) {
            return res.status(400).json({
                success: false,
                message: "Use a valid email address or phone number in E.164 format"
            });
        }

        if (contact.type === "email") {
            const valid = await verifyOtp(contact.value, otp.toString().trim());

            if (!valid) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid or expired OTP"
                });
            }

            const {
                data: user,
                error: userError
            } = await supabase
                .from("users")
                .select("*")
                .eq("email", contact.value)
                .maybeSingle();

            if (userError || !user) {
                return res.status(userError ? 500 : 404).json({
                    success: false,
                    message: userError
                        ? "Failed to fetch MedZyra user"
                        : "MedZyra user profile not found",
                    error: userError?.message
                });
            }

            if (!process.env.JWT_SECRET) {
                return res.status(500).json({
                    success: false,
                    message: "JWT_SECRET is not configured"
                });
            }

            const accessToken = jwt.sign(
                {
                    userId: user.id,
                    authUserId: user.auth_user_id,
                    email: user.email
                },
                process.env.JWT_SECRET,
                { expiresIn: "1h" }
            );

            const healthProfile = await getHealthProfile(user.id);

            return res.json({
                success: true,
                message: "Login successful",
                data: {
                    userId: user.id,
                    authUserId: user.auth_user_id,
                    fullName: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    healthProfile,
                    accessToken,
                    refreshToken: null
                }
            });
        }

        const verificationRequest = {
            token: otp.toString().trim(),
            type: contact.type === "email" ? "email" : "sms"
        };
        verificationRequest[contact.type] = contact.value;

        const { data, error } = await supabase.auth.verifyOtp(verificationRequest);

        if (error) {
            console.error("OTP Verification Error:", error);

            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
                error: error.message
            });
        }

        // ==========================================
        // GET MEDZYRA USER
        // ==========================================

        const authUserId = data.user.id;

        const {
            data: user,
            error: userError
        } = await supabase
            .from("users")
            .select("*")
            .eq("auth_user_id", authUserId)
            .maybeSingle();

        if (userError) {
            console.error("Get MedZyra User Error:", userError);

            return res.status(500).json({
                success: false,
                message: "Failed to fetch MedZyra user",
                error: userError.message
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "MedZyra user profile not found"
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "JWT_SECRET is not configured"
            });
        }

        const accessToken = jwt.sign(
            {
                userId: user.id,
                authUserId,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        const healthProfile = await getHealthProfile(user.id);

        // ==========================================
        // LOGIN SUCCESS
        // ==========================================

        return res.json({
            success: true,
            message: "Login successful 🎉",
            data: {
                userId: user.id,
                authUserId: authUserId,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone,
                healthProfile,
                accessToken,
                refreshToken: null
            }
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to verify OTP",
            error: error.message
        });
    }
};


module.exports = {
    sendOTP,
    verifyOTP
};