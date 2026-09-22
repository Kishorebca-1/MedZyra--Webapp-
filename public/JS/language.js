/* =====================================================
   MEDZYRA LANGUAGE SELECTION
   ===================================================== */

const languageCards =
    document.querySelectorAll(".language-card");

const continueButton =
    document.getElementById("continueButton");


let selectedLanguage = "english";


/* =====================================================
   LANGUAGE SELECTION
   ===================================================== */

languageCards.forEach(card => {

    card.addEventListener("click", () => {

        // Remove selection from all cards
        languageCards.forEach(item => {
            item.classList.remove("selected");
        });


        // Select clicked card
        card.classList.add("selected");


        // Save selected language
        selectedLanguage =
            card.dataset.language;

        if (window.MedZyraI18n) {
            window.MedZyraI18n.applyLanguage(selectedLanguage);
        }


        // Small selection animation
        card.animate(
            [
                {
                    transform: "scale(0.97)"
                },
                {
                    transform: "scale(1.02)"
                },
                {
                    transform: "scale(1)"
                }
            ],
            {
                duration: 300,
                easing: "ease-out"
            }
        );

    });

});


/* =====================================================
   CONTINUE
   ===================================================== */

continueButton.addEventListener("click", () => {

    // Save language
    localStorage.setItem(
        "medzyraLanguage",
        selectedLanguage
    );

    window.dispatchEvent(
        new CustomEvent("medzyra-language-change", {
            detail: selectedLanguage
        })
    );


    // Button animation

    continueButton.animate(
        [
            {
                transform: "scale(1)"
            },
            {
                transform: "scale(0.95)"
            },
            {
                transform: "scale(1)"
            }
        ],
        {
            duration: 250,
            easing: "ease-out"
        }
    );


    /*
       NEXT PAGE

       Change this later to the actual
       AI history page.
    */

    setTimeout(() => {

        window.location.href =
            "../Role/role.html";

    }, 250);

});