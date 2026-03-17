# Workspace

## Overview

Disease-Aware Ingredient Substitution Web App (VitalSub). Users paste a recipe, select a health condition, and get flagged unsafe ingredients with safe substitutes and before/after nutrition comparison.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + framer-motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── recipe-sub/         # React+Vite frontend (Disease-Aware Ingredient Substitution)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Tables

- `ingredients` — name, category
- `nutrition` — per-ingredient nutritional data (calories, protein, carbs, fat, sugar, sodium)
- `substitutions` — original → substitute ingredient pairs
- `disease_rules` — disease name → restricted ingredient mappings
- `feedback` — user feedback on substitution quality

## API Endpoints

- `POST /api/analyze-recipe` — parse recipe, check disease restrictions, return substitutes + nutrition comparison
- `GET /api/ingredients` — list all ingredients
- `GET /api/ingredients/:name/substitutes` — substitutes for a specific ingredient
- `GET /api/ingredients/:name/nutrition` — nutrition for a specific ingredient
- `GET /api/diseases` — list supported diseases (Diabetes, Hypertension, Heart Disease, Kidney Disease)
- `POST /api/feedback` — store substitution feedback

## Supported Diseases & Restrictions

- **Diabetes** — restricts: sugar, white rice, white flour, bread, pasta, potato
- **Hypertension** — restricts: salt, bacon, soy sauce, cheese, mayonnaise
- **Heart Disease** — restricts: red meat, butter, cream, bacon, egg
- **Kidney Disease** — restricts: salt, potassium chloride, red meat, milk, cheese
