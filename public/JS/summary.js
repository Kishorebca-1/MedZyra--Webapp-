/* ==========================================
   MEDZYRA TOTAL AI SUMMARY
========================================== */


/* ==========================================
   GET SAVED DATA
========================================== */


/*
   User information
*/

const user =
    JSON.parse(
        localStorage.getItem("medzyraCurrentUser")
    ) ||
    JSON.parse(
        localStorage.getItem("medzyraUser")
    ) ||
    {};



/*
   Selected language
*/

const storedLanguage =
    localStorage.getItem(
        "medzyraLanguage"
    ) || "english";

const language = {
    english: "en",
    bengali: "bn",
    hindi: "hi"
}[storedLanguage] || storedLanguage;



/*
   Selected role
*/

const role =
    localStorage.getItem(
        "medzyraRole"
    ) || "patient";



/*
   Timeline
*/

const timelineEvents = [];
const realTimelineEvents = [];



/*
   Uploaded documents
*/

const documents = [];



/* ==========================================
   PATIENT INFORMATION
========================================== */

document.getElementById(
    "patientName"
).textContent =
    user.name ||
    user.fullName ||
    "Not provided";


document.getElementById(
    "patientAge"
).textContent =
    user.age ||
    "Not provided";


document.getElementById(
    "patientRole"
).textContent =
    role === "doctor"
        ? "Doctor"
        : "Patient";


/* Language */

const languageNames = {

    en: "English",

    bn: "বাংলা",

    hi: "हिंदी"

};


document.getElementById(
    "patientLanguage"
).textContent =
    languageNames[language] ||
    "English";



/* ==========================================
   COUNT EVENTS
========================================== */

const documentEvents =
    realTimelineEvents.filter(
        event =>
            event.type === "document"
    );


const aiEvents =
    realTimelineEvents.filter(
        event =>
            event.type === "ai"
    );


const actionEvents =
    realTimelineEvents.filter(
        event =>
            event.type === "action"
    );



/* ==========================================
   SUMMARY COUNTERS
========================================== */

document.getElementById(
    "summaryDocuments"
).textContent =
    documentEvents.length +
    (
        documentEvents.length === 1
            ? " document uploaded"
            : " documents uploaded"
    );


document.getElementById(
    "summaryAI"
).textContent =
    aiEvents.length +
    " completed";



/* ==========================================
   DETECT DOCUMENT TYPES
========================================== */

let laboratoryCount = 0;

let prescriptionCount = 0;


documentEvents.forEach(event => {

    const title =
        (
            event.title ||
            ""
        ).toLowerCase();


    const file =
        (
            event.file ||
            event.description ||
            ""
        ).toLowerCase();

    const combined =
        title + " " + file;


    if (

        combined.includes("lab") ||

        combined.includes("blood") ||

        combined.includes("test") ||

        combined.includes("laboratory") ||

        combined.includes("report")

    ) {

        laboratoryCount++;

    }


    if (

        combined.includes("prescription") ||

        combined.includes("medicine") ||

        combined.includes("medication")

    ) {

        prescriptionCount++;

    }

});



document.getElementById(
    "summaryLabs"
).textContent =
    laboratoryCount > 0
        ? laboratoryCount + " report(s) uploaded"
        : "Not documented";


document.getElementById(
    "summaryPrescriptions"
).textContent =
    prescriptionCount > 0
        ? prescriptionCount + " uploaded"
        : "Not documented";



/* ==========================================
   CREATE OVERALL AI SUMMARY
========================================== */

function createOverallSummary() {

    const name =
        user.name ||
        user.fullName ||
        "The patient";


    if (realTimelineEvents.length === 0 && documentEvents.length === 0) {
        return "No health summary is available yet. Complete an interview or upload a medical document to begin.";
    }

    let text =
        name +
        " has completed the MedZyra digital health intake process. ";


    if (realTimelineEvents.length > 0) {

        text +=
            "During this journey, " +
            name +
            " completed " +
            realTimelineEvents.length +
            " recorded action(s). ";

    }


    if (documentEvents.length > 0) {

        text +=
            documentEvents.length +
            " medical document(s) were submitted for review. ";

    } else {

        text +=
            "No medical documents have been documented yet. ";

    }


    if (laboratoryCount > 0) {

        text +=
            "Laboratory-related documents were identified among the submitted records. ";

    }


    if (prescriptionCount > 0) {

        text +=
            "Prescription-related documents were also submitted. ";

    }


    if (aiEvents.length > 0) {

        text +=
            "AI analysis was completed on the available uploaded information. ";

    }


    text +=
        "The information has been organized so that the doctor can review the patient's provided history and documents more efficiently.";


    return text;

}


document.getElementById(
    "overallSummary"
).textContent =
    createOverallSummary();



/* ==========================================
   DISPLAY JOURNEY
========================================== */

function displayJourney() {

    const container =
        document.getElementById(
            "journeyList"
        );


    container.innerHTML = "";


    if (
        realTimelineEvents.length === 0
    ) {

        container.innerHTML = `

            <div class="no-documents">

                No activity has been recorded yet.

            </div>

        `;

        return;

    }


    realTimelineEvents.forEach(
        event => {


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "journey-item";


            const dot =
                document.createElement(
                    "div"
                );


            dot.className =
                "journey-dot";


            const left =
                document.createElement(
                    "div"
                );


            left.className =
                "journey-left";


            const icon =
                document.createElement(
                    "div"
                );


            icon.className =
                "journey-icon";


            icon.textContent =
                event.icon ||
                "✓";


            const details =
                document.createElement(
                    "div"
                );


            const title =
                document.createElement(
                    "div"
                );


            title.className =
                "journey-title";


            title.textContent =
                event.title;


            const description =
                document.createElement(
                    "div"
                );


            description.className =
                "journey-description";


            description.textContent =
                event.description;


            details.appendChild(
                title
            );

            details.appendChild(
                description
            );


            left.appendChild(
                icon
            );

            left.appendChild(
                details
            );


            const time =
                document.createElement(
                    "div"
                );


            time.className =
                "journey-time";


            time.textContent =
                event.time ||
                "";


            item.appendChild(
                dot
            );

            item.appendChild(
                left
            );

            item.appendChild(
                time
            );


            container.appendChild(
                item
            );

        }
    );

}


displayJourney();



/* ==========================================
   DISPLAY DOCUMENTS
========================================== */

function displayDocuments() {

    const container =
        document.getElementById(
            "documentSummaryList"
        );


    container.innerHTML = "";


    if (
        documentEvents.length === 0
    ) {

        container.innerHTML = `

            <div class="no-documents">

                No medical documents have been uploaded.

            </div>

        `;

        return;

    }


    documentEvents.forEach(
        event => {


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "document-row";


            const left =
                document.createElement(
                    "div"
                );


            left.className =
                "document-left";


            const icon =
                document.createElement(
                    "div"
                );


            icon.className =
                "document-file-icon";


            icon.textContent =
                event.icon ||
                "📄";


            const details =
                document.createElement(
                    "div"
                );


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "document-name";


            name.textContent =
                event.file ||
                event.title;


            const type =
                document.createElement(
                    "div"
                );


            type.className =
                "document-type";


            type.textContent =
                event.title;


            details.appendChild(
                name
            );

            details.appendChild(
                type
            );


            left.appendChild(
                icon
            );

            left.appendChild(
                details
            );


            const status =
                document.createElement(
                    "div"
                );


            status.className =
                "document-status";


            status.textContent =
                "✓ Submitted";


            row.appendChild(
                left
            );

            row.appendChild(
                status
            );


            container.appendChild(
                row
            );

        }
    );

}


displayDocuments();



/* ==========================================
   NAVIGATION
========================================== */

function goBack() {

    window.history.back();

}


function continueToDoctor() {

    /*
       Later this will open the
       actual doctor consultation page.
    */

    window.location.href =
        "../Authentication/index.html";

}

/* ==========================================
   LOAD AUTHORITATIVE BACKEND SUMMARY
========================================== */

const SUMMARY_API_BASE_URL = window.MEDZYRA_API_URL || localStorage.getItem("medzyra_api_url") ||
    (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://medzyra-backend.onrender.com/api");

function summaryToken() {
    return localStorage.getItem("medikiosk_token") || localStorage.getItem("medzyra_access_token") || localStorage.getItem("token");
}

function renderApiJourney(events) {
    const container = document.getElementById("journeyList");
    container.innerHTML = "";
    if (!events.length) {
        container.textContent = "No activity has been recorded yet.";
        return;
    }
    events.forEach(event => {
        const item = document.createElement("div");
        item.className = "journey-item";
        const date = new Date(event.occurredAt);
        const detail = event.type === "document"
            ? event.document?.analysis?.summary || event.preview || "Document saved to the medical record."
            : event.type === "interview_summary"
                ? event.assessment?.summary || event.preview || "Your interview assessment is ready."
                : event.preview || `${event.answerCount || event.answers?.length || 0} answer(s) recorded.`;
        item.innerHTML = `<div class="journey-dot"></div><div class="journey-left"><div class="journey-icon"></div><div><div class="journey-title"></div><div class="journey-description"></div></div></div><div class="journey-time"></div>`;
        item.querySelector(".journey-icon").textContent = event.type === "document" ? "▣" : event.type === "interview_summary" ? "✦" : "✓";
        item.querySelector(".journey-title").textContent = event.title || (event.type === "document" ? "Document uploaded" : event.type === "interview_summary" ? "AI summary completed" : "Health interview recorded");
        item.querySelector(".journey-description").textContent = detail;
        item.querySelector(".journey-time").textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        container.appendChild(item);
    });
}

function renderApiDocuments(events) {
    const container = document.getElementById("documentSummaryList");
    const documents = events.filter(event => event.type === "document");
    container.innerHTML = "";
    if (!documents.length) {
        container.textContent = "No medical documents have been uploaded.";
        return;
    }
    documents.forEach(event => {
        const row = document.createElement("div");
        row.className = "document-row";
        row.innerHTML = `<div class="document-left"><div class="document-file-icon">📄</div><div><div class="document-name"></div><div class="document-type"></div></div></div><div class="document-status">✓ ${event.document?.status || "Uploaded"}</div>`;
        row.querySelector(".document-name").textContent = event.document?.file_name || "Medical document";
        row.querySelector(".document-type").textContent = event.document?.analysis?.document_type || event.document?.file_type || "Medical document";
        row.querySelector(".document-status").className = `document-status status-${String(event.document?.status || "uploaded").toLowerCase()}`;
        container.appendChild(row);
    });
}

async function loadSummaryFromApi() {
    if (!summaryToken()) return;
    try {
        const response = await fetch(`${SUMMARY_API_BASE_URL}/patient/summary`, {
            headers: { Authorization: `Bearer ${summaryToken()}` }
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) return;
        const events = payload.timeline || [];
        const documents = events.filter(event => event.type === "document");
        const analyses = documents.filter(event => event.document?.analysis);
        const labs = documents.filter(event => /lab|blood|test|report/i.test(JSON.stringify(event.document?.analysis || {})));
        const prescriptions = documents.filter(event => /prescription|medicine|medication/i.test(JSON.stringify(event.document?.analysis || {})));
        const assessment = payload.summary?.latestAssessment;
        const discussion = JSON.parse(localStorage.getItem("medzyraDiscussion") || "[]");
        document.getElementById("summaryDocuments").textContent = `${documents.length} uploaded`;
        document.getElementById("summaryAI").textContent = `${analyses.length} completed`;
        document.getElementById("summaryLabs").textContent = labs.length ? `${labs.length} report(s) uploaded` : "Not documented";
        document.getElementById("summaryPrescriptions").textContent = prescriptions.length ? `${prescriptions.length} uploaded` : "Not documented";
        const documentNames = documents
            .map(event => event.document?.file_name)
            .filter(Boolean);
        const summaryText = assessment?.summary || (
            documents.length
                ? `Your medical record currently contains ${documents.length} uploaded document${documents.length === 1 ? "" : "s"}${documentNames.length ? `, including ${documentNames.join(", ")}` : ""}. ${analyses.length ? `${analyses.length} document${analyses.length === 1 ? " has" : "s have"} been analyzed and are ready for review.` : "Document analysis is still pending."}`
                : "No completed interview summary or uploaded medical document is available yet."
        );
        const discussionNote = discussion.length
            ? ` A follow-up discussion with MedZyra contains ${Math.floor(discussion.length / 2)} exchange${Math.floor(discussion.length / 2) === 1 ? "" : "s"} for your reference.`
            : "";
        document.getElementById("overallSummary").textContent = summaryText + discussionNote;
        document.getElementById("summaryStatusTitle").textContent = assessment ? "AI Summary Ready" : "Record In Progress";
        document.getElementById("summaryStatusText").textContent = assessment
            ? "Based only on information saved in your MedZyra record."
            : "Add an interview or document to build your health record.";
        document.getElementById("nextStepText").textContent = payload.summary?.nextSuggestion || assessment?.next_step || "Continue adding information to your health record.";
        renderApiJourney(events);
        renderApiDocuments(events);
    } catch (error) {
        console.warn("Unable to load patient summary", error);
    }
}

loadSummaryFromApi();