# 🏙️ AI Civic Command Center

**AI-powered civic complaint platform** that classifies citizen complaints in real time, routes them to the right department, tracks resolution end-to-end, and gives government teams city-level actionable insights.

> Citizen complaint → AI analysis → smart department routing → officer action → real-time tracking → citizen verification → government analytics

---

## 📌 Problem

Traditional civic complaint systems are slow and manual:

- Complaints are read and categorized by hand
- Misrouted complaints bounce between departments
- Duplicate tickets pile up for the same issue
- Urgent issues sit in the same queue as minor ones
- Citizens get no real-time visibility into resolution status
- Government teams see raw complaint counts, not actionable insight

**Example:**

> "Sector 62 mein main road ki 5 street lights pichhle 4 din se band hain. Raat mein accident ka risk hai."

The AI engine turns this into structured, prioritized data automatically:

```json
{
  "category": "Street Lighting",
  "severity": "HIGH",
  "department": "Electrical / PWD",
  "priority_score": 87
}
```

---

## ✨ Features (MVP)

- 📝 **Complaint submission** — text + photo + map location pin
- 🤖 **AI classification** — category, subcategory, severity, and a 0–100 priority score via Gemini
- 🧭 **Smart routing** — auto-assigned to the correct department and least-loaded officer
- 👨‍🔧 **Officer dashboard** — priority-sorted queue, one-tap status updates, before/after photo evidence
- 📡 **Real-time tracking** — citizens see status change live (Supabase Realtime, no refresh)
- ⭐ **Citizen verification** — resolution confirmation + star rating feedback loop
- 🗺️ **Live city map** — severity-colored markers for every open complaint
- 📊 **Admin analytics** — total/pending/resolved/critical counts, department performance table

See [`civic-command-center-spec.md`](./civic-command-center-spec.md) for the full technical build spec (schema, AI prompt contract, RLS policies, screens).

---

## 🧱 Tech Stack

| Layer      | Choice                                                         |
| ---------- | -------------------------------------------------------------- |
| Frontend   | Next.js 16 (App Router) + React 19 + TypeScript                |
| Styling    | Tailwind CSS v4 + shadcn/ui                                    |
| Backend    | Supabase — PostgreSQL, Auth, Storage, Realtime, RLS            |
| AI Layer   | Google Gemini 2.0 Flash (Server-side classification & analysis)|
| Mapping    | Leaflet + React-Leaflet + OpenStreetMap (No API key required)  |
| Analytics  | Recharts                                                       |

---

## 🔐 Environment Configuration

The application requires a `.env.local` file in the project root for local development.

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Optional Services
GEOCODING_API_KEY=
CRON_SECRET=
```

> [!IMPORTANT]
> - **Manual API Keys**: Real API keys must be added manually into `.env.local` before running the app.
> - **Security**: `.env.local` contains private server credentials and **must never be committed to Git** (enforced by `.gitignore`).
> - **No Mapbox Key Needed**: The interactive city map uses **Leaflet + OpenStreetMap**, which works out of the box without any Mapbox token or billing account.

---

## 🚀 Getting Started

### 1. Clone & install dependencies

```bash
cd ai-civic
npm install
```

### 2. Configure Environment

Copy the example configuration file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and provide your real Supabase URL/keys and Gemini API key.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 📁 Project Structure

```
├── app/
│   ├── citizen/           # complaint form, tracking, profile
│   ├── officer/           # assigned queue, complaint detail
│   ├── admin/             # dashboard, map, department stats
│   └── auth/              # login/signup
├── components/
├── lib/
│   └── supabase/          # client + types
├── supabase/
│   ├── migrations/        # schema + RLS SQL
│   └── functions/
│       └── classify-complaint/   # Gemini edge function
├── civic-command-center-spec.md  # full technical spec
└── README.md
```

---

## 👥 User Roles

| Role        | Access                                                     |
| ----------- | ---------------------------------------------------------- |
| **Citizen** | Submit complaints, track own complaints, verify resolution |
| **Officer** | View/update complaints assigned to them                    |
| **Admin**   | City-wide view — all complaints, departments, analytics    |

---

## 🗺️ Roadmap (Phase 2)

- Duplicate complaint detection via embeddings (pgvector)
- Voice complaint input (speech-to-text)
- Image-based issue detection (computer vision)
- Multilingual support (Hindi + regional languages)
- SLA auto-escalation chains
- Predictive hotspot forecasting
- AI Government Assistant (natural-language Q&A over analytics)

---

👨‍💻 Contributors
Krish Saini - Backend & Database & AI Pipeline
Sumit Pandey - Frontend & UI/UX & Officer Dashboard & Live City Incident Map

## 📄 License

MIT(or update to match your hackathon's submission requirements)
