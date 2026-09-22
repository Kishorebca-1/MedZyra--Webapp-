# MedZyra

MedZyra is a single Node.js deployment containing the Express API and its vanilla
HTML/CSS/JavaScript frontend.

## Project layout

```text
config/       Environment-backed integrations
controllers/  HTTP request handlers
middleware/   Authentication and request middleware
routes/       API route definitions
services/     Business logic and external services
utils/        Shared helpers
public/       Static frontend files
uploads/      Local runtime storage (ignored by git)
server.js     Application entry point
```

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies with `npm ci`.
3. Copy `.env.example` to `.env` and fill in the required values.
4. Start the app with `npm start`.
5. Open `http://localhost:5000`.

The deployment health check is `GET /health`. API routes are under `/api`.

## Deploy

### Backend on Render

Create a Web Service from the project root. The included `render.yaml` defines:

- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`

Add the variables listed in `.env.example` in Render's environment settings.
Never commit `.env` or production credentials. The service must return HTTP 200
from `/health` before connecting the frontend.

### Frontend on Netlify

Deploy this project with the included `netlify.toml`. Its publish directory is
`public`, with no frontend build command required.

The frontend currently uses `https://medzyra-backend.onrender.com/api` when it
runs on a hosted domain. Keep that backend URL if the Render service is
redeployed with the same name, or set `window.MEDZYRA_API_URL` before the page
scripts load when using a different backend URL.

The frontend can also be served by the Express process at `/` for a single-host
deployment.