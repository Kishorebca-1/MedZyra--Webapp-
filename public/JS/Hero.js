// ==========================================
// MEDZYRA MAIN WEBSITE JAVASCRIPT
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    // ------------------------------------------
    // NAVIGATION ELEMENTS
    // ------------------------------------------

    const loginBtn = document.querySelector(".login-btn");
    const getStartedBtn = document.querySelector(".get-started");

    const startJourneyBtn = document.querySelector(".primary-btn");
    const watchBtn = document.querySelector(".secondary-btn");

    const navLinks = document.querySelectorAll(".nav-links a");
    const menuToggle = document.querySelector(".menu-toggle");
    const navbar = document.querySelector(".navbar");


    // ------------------------------------------
    // LOGIN BUTTON
    // ------------------------------------------

    if (loginBtn) {

        loginBtn.addEventListener("click", function () {

            window.location.href = "../Authentication/index.html";

        });

    }


    // ------------------------------------------
    // GET STARTED BUTTON
    // ------------------------------------------

    if (getStartedBtn) {

        getStartedBtn.addEventListener("click", function () {

            window.location.href = "../Language/language.html";

        });

    }

    if (menuToggle && navbar) {
        menuToggle.addEventListener("click", function () {
            const open = navbar.classList.toggle("menu-open");
            menuToggle.setAttribute("aria-expanded", String(open));
        });

        navLinks.forEach(link => link.addEventListener("click", () => {
            navbar.classList.remove("menu-open");
            menuToggle.setAttribute("aria-expanded", "false");
        }));
    }


    // ------------------------------------------
    // START HEALTH JOURNEY
    // ------------------------------------------

    if (startJourneyBtn) {

        startJourneyBtn.addEventListener("click", function () {

            window.location.href = "../Language/language.html";

        });

    }


    // ------------------------------------------
    // WATCH HOW IT WORKS
    // ------------------------------------------

    if (watchBtn) {

        watchBtn.addEventListener("click", function () {

            const workflowSection =
                document.querySelector("#workflow");

            if (workflowSection) {

                workflowSection.scrollIntoView({
                    behavior: "smooth"
                });

            } else {

                // If workflow section doesn't exist yet
                alert(
                    "MedZyra workflow: Register → Health History → Documents → AI Summary → Doctor Consultation"
                );

            }

        });

    }


    // ------------------------------------------
    // NAVIGATION LINKS
    // ------------------------------------------

    navLinks.forEach(function (link) {

        link.addEventListener("click", function (event) {

            const target =
                link.getAttribute("href");

            // Normal external/page link
            if (
                !target ||
                target === "#" ||
                !target.startsWith("#")
            ) {
                return;
            }

            event.preventDefault();

            const section =
                document.querySelector(target);

            if (section) {

                section.scrollIntoView({
                    behavior: "smooth"
                });

            }

        });

    });


    // ------------------------------------------
    // CHECK LOGIN STATUS
    // ------------------------------------------

    const loggedInUser =
        localStorage.getItem("medzyraCurrentUser");

    if (loggedInUser) {

        console.log(
            "Logged in user:",
            loggedInUser
        );

    }

});
document.querySelectorAll(
    ".primary-btn, .secondary-btn"
).forEach(button => {

    button.addEventListener("click", function (e) {

        const ripple =
            document.createElement("span");

        ripple.classList.add("ripple");

        const rect =
            button.getBoundingClientRect();

        ripple.style.left =
            `${e.clientX - rect.left}px`;

        ripple.style.top =
            `${e.clientY - rect.top}px`;

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);

    });

});
// ==========================================
// MEDZYRA — SUBTLE RIPPLE EFFECT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // Elements in the hero section that should react
    const rippleElements = document.querySelectorAll(`
        .hero,
        .status-pill,
        .primary-btn,
        .secondary-btn,
        .benefit,
        .health-card,
        .floating-card,
        .logo,
        .logo-icon,
        .nav-links a,
        .login-btn,
        .get-started
    `);


    rippleElements.forEach(element => {

        // Make sure ripple stays inside the element
        element.classList.add("ripple-container");


        element.addEventListener("click", function(event) {

            // Create ripple
            const ripple =
                document.createElement("span");

            ripple.classList.add("subtle-ripple");


            // Find element position
            const rect =
                element.getBoundingClientRect();


            // Calculate click position
            const x =
                event.clientX - rect.left;

            const y =
                event.clientY - rect.top;


            // Position ripple
            ripple.style.left =
                `${x}px`;

            ripple.style.top =
                `${y}px`;


            // Add ripple
            element.appendChild(ripple);


            // Remove after animation
            setTimeout(() => {

                ripple.remove();

            }, 700);

        });

    });

});