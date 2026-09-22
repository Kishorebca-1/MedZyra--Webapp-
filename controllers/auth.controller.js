const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");

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

const register = async (req, res) => {
    let authUserId = null;

    try {
        const {
            fullName,
            phone: rawPhone,
            email: rawEmail,
            dateOfBirth,
            gender,
            bloodGroup,
            city,
            emergencyContact,
            termsAccepted,
            height,
            weight,
            allergies,
            smoking,
            drinking,
            exercise,
            chronicConditions
        } = req.body;

        const email = rawEmail
            ? rawEmail.trim().toLowerCase()
            : null;
        const phone = rawPhone
            ? rawPhone.trim().replace(/[\s()-]/g, "")
            : null;

        // ==============================
        // VALIDATION
        // ==============================

        if (!fullName || fullName.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Full name is required"
            });
        }

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: "Email or phone is required"
            });
        }

        if (phone && !/^\+?[1-9]\d{7,14}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must use E.164 format (for example, +14155552671)"
            });
        }

        if (!termsAccepted) {
            return res.status(400).json({
                success: false,
                message: "You must accept the Terms & Conditions"
            });
        }

        // ==============================
        // CHECK EXISTING EMAIL
        // ==============================

        if (email) {
            const {
                data: existingEmail,
                error: emailError
            } = await supabase
                .from("users")
                .select("id")
                .eq("email", email)
                .limit(1);

            if (emailError) {
                throw emailError;
            }

            if (existingEmail && existingEmail.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Email already registered"
                });
            }

            const {
                data: authUsers,
                error: authUsersError
            } = await supabase.auth.admin.listUsers({
                page: 1,
                perPage: 1000
            });

            if (authUsersError) {
                throw authUsersError;
            }

            const orphanedAuthUser = authUsers.users.find(
                (authUser) => authUser.email?.toLowerCase() === email
            );

            if (orphanedAuthUser) {
                const {
                    data: linkedUser,
                    error: linkedUserError
                } = await supabase
                    .from("users")
                    .select("id")
                    .eq("auth_user_id", orphanedAuthUser.id)
                    .limit(1);

                if (linkedUserError) {
                    throw linkedUserError;
                }

                if (!linkedUser || linkedUser.length === 0) {
                    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
                        orphanedAuthUser.id
                    );

                    if (deleteAuthError) {
                        throw deleteAuthError;
                    }
                }
            }
        }

        // ==============================
        // CHECK EXISTING PHONE
        // ==============================

        if (phone) {
            const {
                data: existingPhone,
                error: phoneError
            } = await supabase
                .from("users")
                .select("id")
                .eq("phone", phone)
                .limit(1);

            if (phoneError) {
                throw phoneError;
            }

            if (existingPhone && existingPhone.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number already registered"
                });
            }

            const {
                data: authUsers,
                error: authUsersError
            } = await supabase.auth.admin.listUsers({
                page: 1,
                perPage: 1000
            });

            if (authUsersError) {
                throw authUsersError;
            }

            const orphanedAuthUser = authUsers.users.find(
                (authUser) => authUser.phone
                    ?.replace(/[\s()-]/g, "") === phone
            );

            if (orphanedAuthUser) {
                const {
                    data: linkedUser,
                    error: linkedUserError
                } = await supabase
                    .from("users")
                    .select("id")
                    .eq("auth_user_id", orphanedAuthUser.id)
                    .limit(1);

                if (linkedUserError) {
                    throw linkedUserError;
                }

                if (!linkedUser || linkedUser.length === 0) {
                    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
                        orphanedAuthUser.id
                    );

                    if (deleteAuthError) {
                        throw deleteAuthError;
                    }
                }
            }
        }

        // ==============================
        // CREATE SUPABASE AUTH USER
        // ==============================

        const authUserData = {
            user_metadata: {
                full_name: fullName.trim(),
                phone: phone || null
            }
        };

        if (email) {
            authUserData.email = email;
            authUserData.email_confirm = true;
        }

        if (phone) {
            authUserData.phone = phone;
        }

        const {
            data: authData,
            error: authError
        } = await supabase.auth.admin.createUser(authUserData);

        if (authError) {
            console.error("Supabase Auth Error:", authError);

            return res.status(400).json({
                success: false,
                message: "Failed to create authentication account",
                error: authError.message
            });
        }

        authUserId = authData.user.id;

        console.log("Supabase Auth User Created:", authUserId);

        // ==============================
        // CREATE MEDZYRA USER
        // ==============================

        const {
            data: user,
            error: userError
        } = await supabase
            .from("users")
            .insert({
                auth_user_id: authUserId,
                full_name: fullName.trim(),
                phone: phone || null,
                email: email || null,
                date_of_birth: dateOfBirth || null,
                gender: gender || null,
                blood_group: bloodGroup || null,
                city: city || null,
                emergency_contact: emergencyContact || null,
                terms_accepted: termsAccepted
            })
            .select()
            .single();

        if (userError) {
            console.error("MedZyra User Error:", userError);

            // Roll back Supabase Auth user
            await supabase.auth.admin.deleteUser(authUserId);

            return res.status(500).json({
                success: false,
                message: "Failed to create MedZyra user",
                error: userError.message
            });
        }

        // ==============================
        // CREATE HEALTH PROFILE
        // ==============================

        const {
            error: profileError
        } = await supabase
            .from("health_profiles")
            .insert({
                user_id: user.id,
                height_cm: height || null,
                weight_kg: weight || null,
                allergies: allergies || null,
                smoking: smoking || null,
                drinking: drinking || null,
                exercise: exercise || null,
                chronic_conditions: chronicConditions || null
            });

        if (profileError) {
            console.error("Health Profile Error:", profileError);

            // Roll back MedZyra user
            await supabase
                .from("users")
                .delete()
                .eq("id", user.id);

            // Roll back Supabase Auth user
            await supabase.auth.admin.deleteUser(authUserId);

            return res.status(500).json({
                success: false,
                message: "Failed to create health profile",
                error: profileError.message
            });
        }

        const healthProfile = await getHealthProfile(user.id);

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

        // ==============================
        // SUCCESS
        // ==============================

        return res.status(201).json({
            success: true,
            message: "Account created successfully 🎉",
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
        console.error("Registration Error:", error);

        // Extra safety rollback
        if (authUserId) {
            try {
                await supabase.auth.admin.deleteUser(authUserId);
            } catch (deleteError) {
                console.error(
                    "Auth Rollback Error:",
                    deleteError.message
                );
            }
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create account",
            error: error.message
        });
    }
};

module.exports = {
    register
};