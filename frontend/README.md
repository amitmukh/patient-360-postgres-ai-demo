# Patient 360 Frontend

Next.js frontend for the Patient 360 PHI-safe Copilot demo.

## Features

- Patient 360 dashboard view
- Clinical timeline with encounters, labs, and notes
- Copilot chat with source citations
- Raw vs PHI-redacted note toggle (when enabled)
- Note ingestion interface

## Prerequisites

- Node.js 20+
- Backend API running (see ../backend/README.md)

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your backend URL
```

### Run

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Open http://localhost:3000 to view the application.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API URL (e.g., http://localhost:8000) |

## Docker

```bash
# Build
docker build -t patient360-frontend:latest .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL="http://localhost:8000" \
  patient360-frontend:latest
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main Patient 360 dashboard
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── PatientHeader.tsx # Patient demographics and key info
│   ├── Timeline.tsx      # Clinical event timeline
│   ├── CopilotChat.tsx   # AI copilot interface
│   ├── SourceDrawer.tsx  # Source citation viewer
│   └── RawRedactedToggle.tsx # View mode toggle
└── lib/
    ├── api.ts            # API client functions
    └── types.ts          # TypeScript type definitions
```
