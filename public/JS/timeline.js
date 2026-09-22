/* =====================================
   MEDZYRA TIMELINE
===================================== */


/*
   Get timeline events from browser storage.
*/

const API_BASE_URL = window.MEDZYRA_API_URL || localStorage.getItem("medzyra_api_url") ||
    (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://medzyra-backend.onrender.com/api");

function getToken() {
    return localStorage.getItem("medikiosk_token") || localStorage.getItem("medzyra_access_token") || localStorage.getItem("token");
}

let timelineEvents = [];



const timeline =
    document.getElementById("timeline");

const timelineEmpty =
    document.getElementById("timelineEmpty");

const documentCount =
    document.getElementById("documentCount");

const actionCount =
    document.getElementById("actionCount");

const aiCount =
    document.getElementById("aiCount");

function formatEvent(event) {
    const source = event.type;
    const item = event.document || event.assessment || event.interview || {};
    const type = source === "document" ? "document" : source === "interview_summary" ? "ai" : "action";
    const date = new Date(event.occurredAt);
    return {
        source: "api",
        type,
        sourceType: source,
        title: event.title || (source === "document" ? "Document uploaded" : source === "interview_summary" ? "AI summary completed" : "Health interview started"),
        description: event.preview || (source === "document"
            ? `${item.status === "analyzed" ? "Analyzed" : "Uploaded"} medical document`
            : source === "interview_summary" ? item.summary || "Your interview assessment is ready." : `${event.answerCount || event.answers?.length || 0} interview answer(s) recorded.`),
        detail: source === "document" ? item.analysis?.summary : source === "interview_summary" ? item.summary : `${event.answerCount || event.answers?.length || 0} answer(s) recorded`,
        icon: source === "document" ? "▣" : source === "interview_summary" ? "✦" : "✓",
        status: event.status || item.status || "Recorded",
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: date.toLocaleDateString(),
        occurredAt: event.occurredAt
    };
}

async function loadTimelineFromApi() {
    if (!getToken()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/patient/timeline`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) return;
        timelineEvents = (payload.timeline || []).map(formatEvent);
        localStorage.setItem("medzyraTimeline", JSON.stringify(timelineEvents));
        displayTimeline();
    } catch (error) {
        console.warn("Unable to load patient timeline", error);
    }
}



/* =====================================
   DISPLAY TIMELINE
===================================== */

function displayTimeline(filter = "all") {

    timeline.innerHTML = "";


    let filteredEvents =
        timelineEvents.filter(event => {

            if (filter === "all") {

                return true;

            }

            return event.type === filter;

        });


    if (filteredEvents.length === 0) {

        timeline.style.display = "none";

        timelineEmpty.style.display = "block";

        updateCounters();

        return;

    }


    timeline.style.display = "block";

    timelineEmpty.style.display = "none";


    /*
       Group events by date
    */

    let currentDate = "";


    filteredEvents.forEach(event => {


        if (event.date !== currentDate) {

            currentDate = event.date;


            const dateElement =
                document.createElement("div");


            dateElement.className =
                "timeline-date";


            dateElement.textContent =
                event.date;


            timeline.appendChild(dateElement);

        }



        /* Event */

        const eventElement =
            document.createElement("div");


        eventElement.className =
            "timeline-event";


        eventElement.dataset.type =
            event.type;



        /* Dot */

        const dot =
            document.createElement("div");


        dot.className =
            "event-dot";



        /* Card */

        const card =
            document.createElement("div");


        card.className =
            "event-card";

        card.tabIndex = 0;
        card.setAttribute("role", "button");



        /* Left */

        const left =
            document.createElement("div");


        left.className =
            "event-left";



        /* Icon */

        const icon =
            document.createElement("div");


        icon.className =
            "event-icon";


        icon.textContent =
            event.icon;



        /* Details */

        const details =
            document.createElement("div");


        details.className =
            "event-details";



        const title =
            document.createElement("div");


        title.className =
            "event-title";


        title.textContent =
            event.title;



        const description =
            document.createElement("div");


        description.className =
            "event-description";


        description.textContent =
            event.description;



        /* Tag */

        const tag =
            document.createElement("span");


        tag.className =
            "event-tag";


        tag.textContent =
            event.type;



        details.appendChild(title);

        details.appendChild(description);

        details.appendChild(tag);



        left.appendChild(icon);

        left.appendChild(details);



        /* Time */

        const time =
            document.createElement("div");


        time.className =
            "event-time";


        time.textContent =
            event.time;

        const expand = document.createElement("span");
        expand.className = "event-expand";
        expand.textContent = "+";

        const extra = document.createElement("div");
        extra.className = "event-extra";
        extra.textContent = event.detail || "";

        card.addEventListener("click", () => card.classList.toggle("expanded"));
        card.addEventListener("keydown", eventKey => {
            if (eventKey.key === "Enter" || eventKey.key === " ") card.classList.toggle("expanded");
        });



        card.appendChild(left);

        card.appendChild(time);

        card.appendChild(expand);

        card.appendChild(extra);


        eventElement.appendChild(dot);

        eventElement.appendChild(card);


        timeline.appendChild(eventElement);

    });


    updateCounters();

}



/* =====================================
   COUNTERS
===================================== */

function updateCounters() {

    const documents =
        timelineEvents.filter(
            event => event.type === "document"
        ).length;


    const actions =
        timelineEvents.filter(
            event => event.type === "action"
        ).length;


    const ai =
        timelineEvents.filter(
            event => event.type === "ai"
        ).length;


    documentCount.textContent =
        documents;


    actionCount.textContent =
        actions;


    aiCount.textContent =
        ai;

}



/* =====================================
   SAVE TIMELINE
===================================== */

function saveTimeline() {

    localStorage.setItem(
        "medzyraTimeline",
        JSON.stringify(timelineEvents)
    );

}



/* =====================================
   FILTERS
===================================== */

document
    .querySelectorAll(".filter")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {


                document
                    .querySelectorAll(".filter")
                    .forEach(btn => {

                        btn.classList.remove("active");

                    });


                this.classList.add("active");


                const filter =
                    this.dataset.filter;


                displayTimeline(filter);

            }
        );

    });



/* =====================================
   CLEAR TIMELINE
===================================== */

document
    .getElementById("clearTimeline")
    .addEventListener(
        "click",
        function () {


            const confirmClear =
                confirm(
                    "Are you sure you want to clear the timeline?"
                );


            if (!confirmClear) {

                return;

            }


            timelineEvents = [];

            localStorage.removeItem(
                "medzyraTimeline"
            );


            displayTimeline();

        }
    );



/* =====================================
   NAVIGATION
===================================== */

function goToDocuments() {

    window.location.href =
        "../Document/documents.html";

}


function goBack() {

    window.history.back();

}


function continuePage() {

    window.location.href =
        "../Summary/summary.html";

}



/* =====================================
   START
===================================== */

displayTimeline();
loadTimelineFromApi();