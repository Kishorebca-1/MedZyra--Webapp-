const doctorForm = document.getElementById("doctorForm");
const successBox = document.getElementById("successBox");

const localizedMessage = message => {
    const language = localStorage.getItem("medzyraLanguage") || "english";
    return window.MedZyraI18n?.translations[language]?.[message] || message;
};


// ================= PASSWORD TOGGLE =================

const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", () => {

    if (password.type === "password") {
        password.type = "text";
        togglePassword.textContent = "Hide";
    } else {
        password.type = "password";
        togglePassword.textContent = "Show";
    }

});


// ================= FORM SUBMISSION =================

doctorForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const doctorName =
        document.getElementById("doctorName").value.trim();

    const registrationNumber =
        document.getElementById("registrationNumber").value.trim();

    const phone =
        document.getElementById("phone").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const city =
        document.getElementById("city").value.trim();

    const qualification =
        document.getElementById("qualification").value.trim();

    const institution =
        document.getElementById("institution").value.trim();

    const graduationYear =
        document.getElementById("graduationYear").value;

    const experience =
        document.getElementById("experience").value;

    const specialization =
        document.getElementById("specialization").value;

    const patients =
        document.getElementById("patients").value;

    const expertise =
        document.getElementById("expertise").value.trim();

    const hospital =
        document.getElementById("hospital").value.trim();

    const languages =
        document.getElementById("languages").value.trim();

    const consultationType =
        document.getElementById("consultationType").value;

    const fee =
        document.getElementById("fee").value;

    const availability =
        document.getElementById("availability").value.trim();

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const terms =
        document.getElementById("terms").checked;


    // ================= VALIDATION =================

    if (!/^[0-9]{10}$/.test(phone)) {
        alert(localizedMessage("Please enter a valid 10-digit phone number."));
        return;
    }

    if (password.value.length < 6) {
        alert(localizedMessage("Password must contain at least 6 characters."));
        return;
    }

    if (password.value !== confirmPassword) {
        alert(localizedMessage("Passwords do not match."));
        return;
    }

    if (!terms) {
        alert(localizedMessage("Please accept the terms and declaration."));
        return;
    }


    // ================= DOCTOR DATA =================

    const doctorData = {

        doctorName,
        registrationNumber,
        phone,
        email,
        city,

        qualification,
        institution,
        graduationYear,
        experience,

        specialization,
        patients,
        expertise,

        hospital,
        languages,

        consultationType,
        fee,
        availability,

        verificationStatus: "Pending Verification",

        createdAt: new Date().toISOString()

    };


    // ================= LOCAL STORAGE =================

    localStorage.setItem(
        "medzyraDoctor",
        JSON.stringify(doctorData)
    );


    // ================= SHOW SUCCESS =================

    doctorForm.style.display = "none";
    successBox.style.display = "block";

});


// The doctor portal currently uses the dashboard as its available sign-in destination.