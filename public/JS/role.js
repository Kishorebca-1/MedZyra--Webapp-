/* =====================================================
   MEDZYRA ROLE SELECTION
   ===================================================== */


const roleCards =
    document.querySelectorAll(".role-card");


/* =====================================================
   ROLE SELECTION
   ===================================================== */

roleCards.forEach(card => {

    card.addEventListener("click", () => {


        const selectedRole =
            card.dataset.role;


        /* Save role */

        localStorage.setItem(
            "medzyraRole",
            selectedRole
        );


        /* Selection animation */

        card.animate(
            [
                {
                    transform: "scale(1)"
                },

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
                duration: 350,

                easing: "ease-out"
            }
        );


        /* Small delay */

        setTimeout(() => {


            if (selectedRole === "patient") {

                /*
                    PATIENT FLOW

                    Next page will be:
                    patient-login.html
                    or
                    history.html
                */

                window.location.href =
                    "../Authentication/index.html?from=role";


            } else {


                /*
                    DOCTOR FLOW

                    Doctors should have
                    their own login.
                */

                window.location.href =
                    "../dr dashbord/dr.html";

            }


        }, 350);

    });

});