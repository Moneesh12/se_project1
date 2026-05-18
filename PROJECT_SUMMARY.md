# VitalSub — Ingredient Substitution Web App

## What is it?
VitalSub is a full-stack web application where users input a recipe ingredient and get intelligent substitution suggestions — including the **best brands**, **alternative ingredients**, and **recommended products** to use as replacements. Users can create accounts, save liked recipes, and track their substitution history.

## Why was it built?
College project to demonstrate full-stack development skills. Finding suitable ingredient substitutes (especially with brand recommendations) is tedious — you have to search multiple sites. VitalSub centralizes this into one app with user accounts, history, and favorites.

## How does it work?
1. User enters a recipe ingredient (via analyze-recipe endpoint)
2. Backend parses the input, finds matching ingredients from the database
3. For each ingredient, the system fetches **substitutes** from a large dataset (USDA, ConceptNet, Wikidata, Edamam, FlavorDB)
4. Substitutes are ranked and returned with **brand recommendations** (best overall, cleanest option, budget option)
5. Users with accounts can:
   - **Save liked recipes** for later
   - **View substitution history**
   - **Save favorite substitutes**
   - **Signup/login** with name, email & password
6. Results displayed as visual cards with ingredient info and brand suggestions

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind CSS |
| **UI Library** | Radix UI + shadcn/ui + Framer Motion + Lucide icons |
| **Backend** | Express 5 (Node.js) + TypeScript |
| **Database** | PostgreSQL (Neon cloud) via Drizzle ORM |
| **Auth** | bcryptjs + JWT tokens |
| **Email** | None (OTP removed; direct signup) |
| **AI/Data** | NVIDIA API + OpenAI for ingredient analysis |
| **Build** | pnpm workspaces (monorepo), esbuild bundler |
| **Deploy** | Render (backend), Vercel (frontend) |
| **API Client** | Orval → OpenAPI → React Query (TanStack Query) hooks |

## Architecture (pnpm Monorepo)

| Package | Purpose |
|---|---|
| `artifacts/api-server` | Express backend (auth, recipe analysis, brands, favorites, history) |
| `artifacts/recipe-sub` | React frontend (Home, Login, Signup, Dashboard, About) |
| `lib/db` | PostgreSQL schema & migrations (Drizzle ORM) |
| `lib/api-zod` | Zod validation schemas from OpenAPI |
| `lib/api-client-react` | Generated React Query hooks |

## Key Features
- **Ingredient analysis & substitution** from USDA + multiple datasets
- **Brand recommendations** (best overall, cleanest, budget)
- **User accounts** with direct name/email/password signup
- **Favorites & saved recipes** tied to user accounts
- **Substitution history** tracking
- **JWT-based authentication**

## API Endpoints
- `POST /api/signup` — Register with name, email & password
- `POST /api/login` — Authenticate & receive JWT
- `GET /api/me` — Get current user profile
- `POST /api/analyze-recipe` — Analyze recipe & get substitutes
- `GET /api/brands/:substituteName` — Get brand recommendations
- CRUD for favorites, saved recipes, history

## Auth Evolution
Originally used **Nodemailer + Gmail SMTP** for OTP delivery — timed out on Render (cloud blocks SMTP ports). Migrated through **Brevo SMTP → Brevo REST API → Resend API** for OTP, but eventually **removed OTP entirely** in favor of direct name/email/password signup to eliminate email-sending failure points.
