const storedDoctor = JSON.parse(localStorage.getItem("medzyraDoctor") || "null");

if (storedDoctor) {
    const fullName = storedDoctor.doctorName || "Dr. Ananya Sen";
    const firstName = fullName.replace(/^Dr\.\s*/i, "").split(" ")[0];
    const specialty = storedDoctor.specialization || "General Physician";
    document.getElementById("headerName").textContent = fullName;
    document.getElementById("headerSpecialty").textContent = specialty;
    document.getElementById("welcomeName").textContent = `Dr. ${firstName}`;
    document.getElementById("headerAvatar").textContent = fullName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    document.getElementById("profileName").textContent = fullName;
    document.getElementById("profileSpecialty").textContent = specialty;
    document.getElementById("profileAvatar").textContent = fullName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    document.getElementById("profileClinic").textContent = storedDoctor.hospital || "MedZyra Care Clinic";
}

const navItems = document.querySelectorAll(".nav-item");
const updateActiveNav = () => {
    const currentSection = window.location.hash || "#overview";
    navItems.forEach((item) => item.classList.toggle("active", item.getAttribute("href") === currentSection));
    document.querySelectorAll("[data-page]").forEach((page) => {
        page.hidden = page.dataset.page !== currentSection.slice(1);
    });
    document.querySelectorAll("[data-page-container]").forEach((container) => {
        container.hidden = !container.querySelector(`[data-page="${currentSection.slice(1)}"]`);
    });
};

navItems.forEach((item) => {
    item.addEventListener("click", (event) => {
        event.preventDefault();
        history.replaceState(null, "", item.getAttribute("href"));
        updateActiveNav();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});
window.addEventListener("hashchange", updateActiveNav);
updateActiveNav();

document.querySelectorAll(".toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => toggle.classList.toggle("active"));
});

document.getElementById("newAppointment").addEventListener("click", () => {
    const toast = document.getElementById("toast");
    toast.style.display = "block";
    window.setTimeout(() => { toast.style.display = "none"; }, 2600);
});