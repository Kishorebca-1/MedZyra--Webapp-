const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const supabase = require("../config/supabase");

const OTP_TTL_MINUTES = 5;
const RESEND_INTERVAL_SECONDS = 60;
const MAX_ATTEMPTS = 5;

async function createOtp(email) {
    const { data: recentOtp, error: recentOtpError } = await supabase
        .from("email_otps")
        .select("created_at")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (recentOtpError) {
        throw recentOtpError;
    }

    if (recentOtp) {
        const elapsedSeconds = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;

        if (elapsedSeconds < RESEND_INTERVAL_SECONDS) {
            const waitSeconds = Math.ceil(RESEND_INTERVAL_SECONDS - elapsedSeconds);
            const error = new Error(`Please wait ${waitSeconds} seconds before requesting another OTP`);
            error.code = "OTP_RATE_LIMITED";
            throw error;
        }
    }

    const { error: deleteError } = await supabase
        .from("email_otps")
        .delete()
        .eq("email", email);

    if (deleteError) {
        throw deleteError;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    const { error: insertError } = await supabase
        .from("email_otps")
        .insert({
            email,
            otp_hash: otpHash,
            expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString()
        });

    if (insertError) {
        throw insertError;
    }

    return otp;
}

async function verifyOtp(email, otp) {
    const { data: pendingOtp, error: lookupError } = await supabase
        .from("email_otps")
        .select("id, otp_hash, expires_at, attempts")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lookupError || !pendingOtp) {
        return false;
    }

    const attempts = Number(pendingOtp.attempts || 0);

    if (
        new Date(pendingOtp.expires_at).getTime() < Date.now()
        || attempts >= MAX_ATTEMPTS
    ) {
        await supabase.from("email_otps").delete().eq("id", pendingOtp.id);
        return false;
    }

    const valid = await bcrypt.compare(otp, pendingOtp.otp_hash);

    if (!valid) {
        await supabase
            .from("email_otps")
            .update({ attempts: attempts + 1 })
            .eq("id", pendingOtp.id);
        return false;
    }

    await supabase.from("email_otps").delete().eq("id", pendingOtp.id);
    return true;
}

module.exports = {
    createOtp,
    verifyOtp
};