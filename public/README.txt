MedZyra Frontend
================

This is the canonical MedZyra frontend. It is intentionally organized as a
vanilla HTML/CSS/JavaScript multi-page application, using the existing feature
folders rather than a separate framework build:

- `index.html` redirects to `Hero/Hero.html`
- `Hero/` contains the landing page
- `Authentication/` contains login, OTP verification and registration
- `dr dashbord/` and `dr-dashboard/` contain the doctor views
- `Health Chat/` contains the authenticated health interview and AI chat
- `Document/` contains document upload and OCR analysis
- `Summary/` contains the health summary
- `Timeline/` contains the patient timeline
- `Language/` and `Role/` contain onboarding selection screens
- `CSS/` contains the page styles
- `JS/` contains the page behavior and backend requests

How to run locally
------------------

1. Start the application from the project root:

	`npm start`

2. Open `http://localhost:5000`. The Node server serves this folder and the API
	from the same origin.

Opening the HTML files directly is still useful for basic navigation, but the
server is recommended for uploads and browser security behavior.

The frontend uses `http://localhost:5000/api` when running locally. To use a
different backend, set `window.MEDZYRA_API_URL` before the page scripts load or
store the value in localStorage under `medzyra_api_url`.

Connected backend modules
-------------------------

- OTP login and registration: `/api/auth`
- Health interview: `/api/health-interview`
- AI chat: `/api/health-ai`
- Document upload, OCR, processing and deletion: `/api/documents`
- Patient summary and timeline: `/api/patient`

The frontend stores the short-lived access token in browser storage so it can
send authenticated requests to the backend. Do not use real patient data until
production security, consent, audit logging, encrypted storage, HTTPS and CORS
configuration have been reviewed.
