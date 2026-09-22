/* =========================================================
   MEDZYRA - AI HEALTH INTERVIEW
========================================================= */


/* =========================================================
   API
========================================================= */

const API_URL =
    window.MEDZYRA_API_URL ||
    localStorage.getItem("medzyra_api_url") ||
    (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://localhost:5000/api"
        : "https://medzyra-backend.onrender.com/api");


/* =========================================================
   STATE
========================================================= */

let interviewId = null;

let currentQuestion = null;

let answeredQuestions = 0;

let checkInStarted = false;

let voiceActive = false;

let selectedLanguage = "en";
let interactionMode = "text";
let discussionMode = false;
let discussionConversation = [];
let pendingDiscussionMessage = "";
let discussionRequestInFlight = false;


/* =========================================================
   DOM
========================================================= */

const messages =
    document.getElementById("messages");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const voiceButton =
    document.getElementById("voiceButton");

const startChatBtn =
    document.getElementById("startChatBtn");

const startRow =
    document.getElementById("startRow");

const typingIndicator =
    document.getElementById("typingIndicator");

const answeredCount =
    document.getElementById("answeredCount");

const totalQuestions =
    document.getElementById("totalQuestions");

const progressFill =
    document.getElementById("progressFill");

const stepText =
    document.getElementById("stepText");

const patientName =
    document.getElementById("patientName");

const languageSelect =
    document.getElementById("languageSelect");
const interactionModeSelect =
    document.getElementById("interactionModeSelect");
const discussionPanel =
    document.getElementById("discussionPanel");
const discussionMessages =
    document.getElementById("discussionMessages");
const discussionFocus =
    document.getElementById("discussionFocus");


/* =========================================================
   RED FLAG
========================================================= */

const redFlagOverlay =
    document.getElementById("redFlagOverlay");

const redFlagMessage =
    document.getElementById("redFlagMessage");

function getToken() {
    return (
        localStorage.getItem("medikiosk_token") ||
        localStorage.getItem("medzyra_access_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken")
    );
}


function clearStoredTokens() {
    [
        "medikiosk_token",
        "medzyra_access_token",
        "token",
        "authToken",
        "accessToken"
    ].forEach(key => localStorage.removeItem(key));
}


async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication token not found. Please login again.");
    }

    let response;
    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error("We could not reach MedZyra. Check your connection and try again.");
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : { message: await response.text().catch(() => "") };

    if (!response.ok) {
        if (response.status === 401) {
            clearStoredTokens();
            window.location.href = "../Authentication/index.html";
        }

        if (response.status >= 500) {
            throw new Error("The health assistant is temporarily unavailable. Please try again in a moment.");
        }
        throw new Error(data.message || "We could not complete that request. Please try again.");
    }

    return data;
}


async function startCheckIn() {
    if (checkInStarted) {
        return;
    }

    const token = getToken();

    if (!token) {
        addBotMessage("Please sign in first so your health check-in can be saved securely.");
        setTimeout(() => {
            window.location.href = "../Authentication/index.html";
        }, 900);
        return;
    }

    checkInStarted = true;
    startChatBtn.disabled = true;
    showTyping();

    try {
        const result = await apiRequest("/health-interview/start", {
            method: "POST",
            body: JSON.stringify({ language: selectedLanguage })
        });

        hideTyping();
        interviewId = result.data.interviewId;
        currentQuestion = result.data.question;
        answeredQuestions = 0;

        if (startRow) {
            startRow.style.display = "none";
        }

        displayQuestion(currentQuestion);
        updateProgress();
    } catch (error) {
        hideTyping();
        checkInStarted = false;
        startChatBtn.disabled = false;

        addBotMessage(
            error.message ||
            "Sorry, I couldn't start the health interview. Please try again."
        );

        console.error(error);
    }
}


/* =========================================================
   DISPLAY QUESTION
========================================================= */

function displayQuestion(question) {

    currentQuestion =
        question;


    showTyping();


    setTimeout(() => {

        hideTyping();


        addBotMessage(
            question.text,
            question.options || []
        );


        updateInputState();

    }, 500);
}


/* =========================================================
   BOT MESSAGE
========================================================= */

function addBotMessage(
    text,
    options = []
) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "message bot-message";


    const content =
        document.createElement("div");


    content.className =
        "message-content";


    content.innerHTML =
        escapeHTML(text);


    wrapper.appendChild(content);


    /* -----------------------------------------------------
       OPTIONS
    ----------------------------------------------------- */

    if (
        Array.isArray(options) &&
        options.length > 0
    ) {

        const optionsContainer =
            document.createElement("div");


        optionsContainer.className =
            "chat-options";


        options.forEach(option => {

            const button =
                document.createElement("button");


            button.type =
                "button";


            button.className =
                "chat-option";


            if (
                typeof option === "string"
            ) {

                button.textContent =
                    option;

                button.dataset.value =
                    option;

            } else {

                button.textContent =
                    option.label ||
                    option.text ||
                    option.value;

                button.dataset.value =
                    option.value ||
                    option.label ||
                    option.text;
            }


            button.addEventListener(
                "click",
                () => {

                    processAnswer(
                        button.dataset.value
                    );

                }
            );


            optionsContainer.appendChild(
                button
            );

        });


        wrapper.appendChild(
            optionsContainer
        );
    }


    messages.appendChild(
        wrapper
    );


    scrollToBottom();
}


/* =========================================================
   USER MESSAGE
========================================================= */

function addUserMessage(text) {

    const wrapper =
        document.createElement("div");


    wrapper.className =
        "message user-message";


    const content =
        document.createElement("div");


    content.className =
        "message-content";


    content.textContent =
        text;


    wrapper.appendChild(
        content
    );


    messages.appendChild(
        wrapper
    );


    scrollToBottom();
}


/* =========================================================
   SEND TEXT
========================================================= */

async function sendMessage() {

    if (discussionMode) {
        await sendDiscussionMessage();
        return;
    }

    if (
        !currentQuestion ||
        currentQuestion.type !== "text"
    ) {
        return;
    }


    const answer =
        messageInput.value.trim();


    if (!answer) {
        return;
    }


    messageInput.value = "";

    await processAnswer(
        answer
    );
}


/* =========================================================
   PROCESS ANSWER
========================================================= */

async function processAnswer(answer) {

    if (!answer || !currentQuestion) {
        return;
    }


    /* -----------------------------------------------------
       SHOW USER MESSAGE
    ----------------------------------------------------- */

    addUserMessage(answer);


    /* -----------------------------------------------------
       DISABLE INPUT
    ----------------------------------------------------- */

    messageInput.disabled = true;

    sendButton.disabled = true;

    voiceButton.disabled = true;


    /* -----------------------------------------------------
       DISABLE OLD OPTIONS
    ----------------------------------------------------- */

    document
        .querySelectorAll(".chat-option")
        .forEach(button => {

            button.disabled = true;

        });


    answeredQuestions++;


    updateProgress();


    showTyping();


    try {

        const result =
            await apiRequest(
                "/health-interview/message",
                {
                    method: "POST",

                    body: JSON.stringify({

                        interviewId,

                        questionId:
                            currentQuestion.id,

                        questionText:
                            currentQuestion.text,

                        answer,

                        language:
                            selectedLanguage

                    })
                }
            );


        hideTyping();


        const data =
            result.data;


        /* =================================================
           RED FLAG
        ================================================= */

        if (
            data.type === "redFlag"
        ) {

            showRedFlag(
                data.message
            );

            return;
        }


        /* =================================================
           COMPLETED
        ================================================= */

        if (
            data.type === "completed"
        ) {

            showAssessment(
                data.assessment
            );

            return;
        }


        /* =================================================
           NEXT QUESTION
        ================================================= */

        if (
            data.type === "question"
        ) {

            displayQuestion(
                data.question
            );

            return;
        }


    } catch (error) {

        hideTyping();


        addBotMessage(
            "Sorry, something went wrong while processing your answer. Please try again."
        );


        console.error(
            "Chat Error:",
            error
        );


        updateInputState();
    }
}


/* =========================================================
   ASSESSMENT
========================================================= */

function showAssessment(
    assessment
) {

    currentQuestion = null;


    messageInput.disabled = true;

    sendButton.disabled = true;

    voiceButton.disabled = true;


    const wrapper =
        document.createElement("div");


    wrapper.className =
        "assessment-card";


    const categories =
        Array.isArray(
            assessment.possibleCategories
        )
            ? assessment.possibleCategories
            : [];


    wrapper.innerHTML = `

        <h3>🩺 Health Check-in Complete</h3>

        <p>
            ${escapeHTML(
                assessment.summary || ""
            )}
        </p>

        <h4>Possible symptom categories</h4>

        <ul>
            ${
                categories
                    .map(
                        item =>
                            `<li>${escapeHTML(item)}</li>`
                    )
                    .join("")
            }
        </ul>

        <h4>Recommended healthcare professional</h4>

        <p>
            👨‍⚕️
            ${escapeHTML(
                assessment.recommendedDoctor ||
                "General Physician"
            )}
        </p>

        <h4>Next step</h4>

        <p>
            ${escapeHTML(
                assessment.nextStep || ""
            )}
        </p>

        <small>
            ⚠️ ${escapeHTML(
                assessment.disclaimer ||
                "This is not a diagnosis."
            )}
        </small>

        <div class="assessment-actions">
            <button type="button" class="discussion-start-button" onclick="startDiscussion()"><i class="fa-solid fa-comments"></i> Discuss with chatbot</button>
            <button type="button" class="upload-next-button" onclick="goToUpload()"><i class="fa-solid fa-file-arrow-up"></i> Upload documents</button>
        </div>

    `;


    messages.appendChild(
        wrapper
    );


    scrollToBottom();


    updateProgress(
        true
    );
}


/* =========================================================
   RED FLAG DISPLAY
========================================================= */

function showRedFlag(message) {

    if (
        redFlagMessage
    ) {

        redFlagMessage.textContent =
            message;
    }


    if (
        redFlagOverlay
    ) {

        redFlagOverlay.style.display =
            "flex";
    }
}


/* =========================================================
   ALERT CLINICAL STAFF
========================================================= */

async function submitRedFlagDecision(decision) {
    if (!interviewId) {
        throw new Error("Interview not found. Please start the check-in again.");
    }

    return apiRequest("/health-interview/message", {
        method: "POST",
        body: JSON.stringify({
            interviewId,
            redFlagDecision: decision,
            language: selectedLanguage
        })
    });
}


async function alertClinicalStaff() {
    try {
        await submitRedFlagDecision("alert_clinical_staff");

        addBotMessage(
            "🚨 Please inform a healthcare professional immediately and seek urgent medical attention."
        );

        if (redFlagOverlay) {
            redFlagOverlay.style.display = "none";
        }
        window.location.href = "../Document/documents.html";
    } catch (error) {
        addBotMessage(error.message || "Unable to alert clinical staff.");
        console.error("Red flag escalation error:", error);
    }
}


/* =========================================================
   CONTINUE AFTER FLAG
========================================================= */

async function continueAfterFlag() {
    if (redFlagOverlay) {
        redFlagOverlay.style.display = "none";
    }

    showTyping();

    try {
        const result = await submitRedFlagDecision("continue");
        const data = result.data || {};

        hideTyping();

        if (data.type === "question" && data.question) {
            currentQuestion = data.question;
            displayQuestion(data.question);
            updateInputState();
            return;
        }

        addBotMessage(
            data.message || "You can continue the health interview with assistance."
        );
    } catch (error) {
        hideTyping();
        addBotMessage(error.message || "Unable to continue with assistance.");
        console.error("Red flag continuation error:", error);
        updateInputState();
    }
}


/* =========================================================
   INPUT STATE
========================================================= */

function updateInputState() {

    if (discussionMode) {
        messageInput.disabled = false;
        sendButton.disabled = false;
        voiceButton.disabled = false;
        return;
    }

    if (!currentQuestion) {

        messageInput.disabled = true;

        sendButton.disabled = true;

        voiceButton.disabled = true;

        return;
    }


    const textMode =
        currentQuestion.type === "text";


    messageInput.disabled =
        !textMode;


    sendButton.disabled =
        !textMode;


    voiceButton.disabled =
        !textMode;
}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress(
    completed = false
) {

    if (completed) {

        progressFill.style.width =
            "100%";

        stepText.textContent =
            "Complete";

        return;
    }


    const percentage =
        Math.min(
            90,
            Math.max(
                5,
                answeredQuestions * 10
            )
        );


    progressFill.style.width =
        `${percentage}%`;


    if (stepText) {

        stepText.textContent =
            `Question ${answeredQuestions + 1}`;
    }


    if (answeredCount) {

        answeredCount.textContent =
            answeredQuestions;
    }


    if (totalQuestions) {

        totalQuestions.textContent =
            "8";
    }
}


/* =========================================================
   TYPING
========================================================= */

function showTyping() {

    if (typingIndicator) {

        typingIndicator.style.display =
            "flex";
    }


    scrollToBottom();
}


function hideTyping() {

    if (typingIndicator) {

        typingIndicator.style.display =
            "none";
    }
}


/* =========================================================
   SCROLL
========================================================= */

function scrollToBottom() {

    if (messages) {

        setTimeout(() => {

            messages.scrollTop =
                messages.scrollHeight;

        }, 50);
    }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   LANGUAGE
========================================================= */

if (languageSelect) {

    languageSelect.addEventListener(
        "change",
        function () {

            selectedLanguage =
                this.value;


            if (!checkInStarted) {
                return;
            }


            addBotMessage(
                "🌐 Language changed. The new language will be used for the next questions."
            );
        }
    );
}

if (interactionModeSelect) {
    interactionModeSelect.addEventListener("change", function () {
        interactionMode = this.value;
        discussionPanel?.classList.toggle("touch-mode", interactionMode === "touch");
        if (discussionMode && interactionMode === "voice") {
            addDiscussionMessage("Voice mode is ready. Tap the microphone to speak; I will read my reply aloud.", "assistant");
        }
    });
}

document.querySelectorAll("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => {
        if (!discussionMode) return;
        messageInput.value = button.dataset.prompt;
        sendMessage();
    });
});

function goToUpload() {
    window.location.href = "../Document/documents.html";
}

function addDiscussionMessage(text, role) {
    if (!discussionMessages) return;
    const item = document.createElement("div");
    item.className = `discussion-message ${role}`;
    item.textContent = text;
    discussionMessages.appendChild(item);
    discussionMessages.scrollTop = discussionMessages.scrollHeight;
}

function updateDiscussionFocus(focus) {
    if (!discussionFocus || !focus) return;
    const focusText = discussionFocus.querySelector("strong");
    if (focusText) focusText.textContent = focus;
}

function addDiscussionDetails(result) {
    if (!discussionMessages) return;
    const details = document.createElement("div");
    details.className = "discussion-details";
    const followUp = String(result.followUpQuestion || "").trim();
    const safetyNote = String(result.safetyNote || "").trim();
    if (followUp) {
        details.innerHTML += `<span class="detail-question"><i class="fa-solid fa-circle-question"></i>${escapeHTML(followUp)}</span>`;
    }
    if (safetyNote) {
        details.innerHTML += `<span class="detail-safety"><i class="fa-solid fa-shield-heart"></i>${escapeHTML(safetyNote)}</span>`;
    }
    if (details.innerHTML) discussionMessages.appendChild(details);
}

function startDiscussion() {
    if (!interviewId) {
        discussionPanel?.classList.add("active");
        showDiscussionError("Your interview context is missing. Please complete the check-in before starting a discussion.");
        discussionPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }
    discussionMode = true;
    try {
        const savedDiscussion = JSON.parse(localStorage.getItem("medzyraDiscussion") || "[]");
        discussionConversation = Array.isArray(savedDiscussion) ? savedDiscussion : [];
    } catch (error) {
        discussionConversation = [];
        console.warn("Unable to restore saved discussion", error);
    }
    currentQuestion = null;
    messageInput.disabled = false;
    sendButton.disabled = false;
    voiceButton.disabled = false;
    discussionPanel?.classList.add("active");
    addDiscussionMessage("I have your interview context. We can go through what you noticed, explain a medical word in simple language, or prepare questions for your clinician.", "assistant");
    discussionPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showDiscussionError(message, retry = false) {
    if (!discussionMessages) return;
    const item = document.createElement("div");
    item.className = "discussion-error";
    const text = document.createElement("span");
    text.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i>${escapeHTML(message)}`;
    item.appendChild(text);
    if (retry) {
        const retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.className = "discussion-retry";
        retryButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Try again';
        retryButton.addEventListener("click", () => sendDiscussionMessage(pendingDiscussionMessage));
        item.appendChild(retryButton);
    }
    discussionMessages.appendChild(item);
    discussionMessages.scrollTop = discussionMessages.scrollHeight;
}

async function sendDiscussionMessage(messageOverride = "") {
    if (discussionRequestInFlight) return;
    const message = String(messageOverride || messageInput.value || "").trim();
    if (!message) return;
    if (!interviewId) {
        showDiscussionError("Your interview context is missing. Please complete the check-in before sending a message.");
        return;
    }
    const isRetry = Boolean(messageOverride);
    if (!isRetry) {
        messageInput.value = "";
        addDiscussionMessage(message, "user");
        discussionConversation.push({ role: "user", content: message });
    }
    pendingDiscussionMessage = message;
    discussionRequestInFlight = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    voiceButton.disabled = true;
    showTyping();
    try {
        const result = await apiRequest("/health-ai/interview-discussion", {
            method: "POST",
            body: JSON.stringify({
                interviewId,
                message,
                language: selectedLanguage,
                conversation: discussionConversation.slice(-32, -1)
            })
        });
        hideTyping();
        const reply = result.data?.reply || "I could not generate a response. Please try again.";
        pendingDiscussionMessage = "";
        discussionConversation.push({ role: "assistant", content: reply });
        localStorage.setItem("medzyraDiscussion", JSON.stringify(discussionConversation.slice(-32)));
        addDiscussionMessage(reply, "assistant");
        updateDiscussionFocus(result.data?.focus);
        addDiscussionDetails(result.data || {});
        if (interactionMode === "voice" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
        }
    } catch (error) {
        hideTyping();
        messageInput.value = message;
        showDiscussionError(error.message || "We could not continue the discussion.", true);
    } finally {
        discussionRequestInFlight = false;
        messageInput.disabled = false;
        sendButton.disabled = false;
        voiceButton.disabled = false;
        messageInput.focus();
    }
}

function stopDiscussion() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    window.location.href = "../Document/documents.html";
}


/* =========================================================
   ENTER KEY
========================================================= */

if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}


/* =========================================================
   VOICE
========================================================= */

let recognition = null;


if (
    "webkitSpeechRecognition" in window ||
    "SpeechRecognition" in window
) {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    recognition =
        new SpeechRecognition();


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.lang =
        "en-IN";


    recognition.onstart =
        function () {

            voiceActive = true;

            if (voiceButton) {

                voiceButton.classList.add(
                    "active"
                );
            }
        };


    recognition.onend =
        function () {

            voiceActive = false;

            if (voiceButton) {

                voiceButton.classList.remove(
                    "active"
                );
            }
        };


    recognition.onresult =
        function (event) {

            const transcript =
                event.results[0][0].transcript;


            if (messageInput) {

                messageInput.value =
                    transcript;
            }


            sendMessage();
        };


    recognition.onerror =
        function (event) {

            console.error(
                "Speech Recognition Error:",
                event.error
            );

        };
}


/* =========================================================
   TOGGLE VOICE
========================================================= */

function toggleVoice() {

    if (!recognition) {

        alert(
            "Voice input is not supported in this browser."
        );

        return;
    }


    if (!currentQuestion && !discussionMode) {
        return;
    }


    if (!discussionMode && currentQuestion.type !== "text") {

        return;
    }


    const languageMap = {

        en: "en-IN",

        hi: "hi-IN",

        bn: "bn-IN",

        ne: "ne-NP"

    };


    recognition.lang =
        languageMap[selectedLanguage] ||
        "en-IN";


    if (voiceActive) {

        recognition.stop();

    } else {

        recognition.start();
    }
}


/* =========================================================
   BACK
========================================================= */

function goBack() {

    window.history.back();
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateInputState();

        updateProgress();

    }
);