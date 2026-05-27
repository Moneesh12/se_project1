# VitalSub - Disease-Aware Ingredient Substitution Web App

A full-stack web application that helps users find healthy ingredient substitutes for recipes based on their dietary restrictions and health conditions.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 24 or higher
- **PostgreSQL**: 12 or higher  
- **pnpm**: 10.33.0 (package manager - required)

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/wrewre/se_project1.git
cd se_project1
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/vitalsub

# API Server Port
PORT=4000

# JWT Secret (for authentication)
JWT_SECRET=your_super_secret_jwt_key_here

# OpenAI API Key (optional - for AI fallback substitutes)
OPENAI_API_KEY=sk-your_openai_key_here

# Environment
NODE_ENV=development
```

**For PostgreSQL setup:**
```bash
# Create database
createdb vitalsub

# Update DATABASE_URL in .env with your credentials
```

#### 4. Initialize Database

```bash
cd lib/db
pnpm run push
pnpm run seed
cd ../..
```

#### 5. Start Development Servers

**Terminal 1 - Backend (API Server):**
```bash
cd artifacts/api-server
pnpm run dev
```
API runs on: `http://localhost:4000/api`

**Terminal 2 - Frontend (React App):**
```bash
cd artifacts/recipe-sub
pnpm run dev
```
Frontend runs on: `http://localhost:5173`

### ✅ You're Done!

Open your browser and navigate to `http://localhost:5173` to access the application.

---

## 📋 Project Structure

```
se_project1/
├── artifacts/
│   ├── api-server/          # Express.js REST API
│   │   ├── src/
│   │   │   ├── index.ts     # Server entry point
│   │   │   ├── app.ts       # Express app setup
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── services/    # Business logic
│   │   │   └── middleware/  # Auth & error handling
│   │   └── package.json
│   └── recipe-sub/          # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx      # Root component
│       │   ├── pages/       # Page components
│       │   ├── components/  # Reusable components
│       │   ├── hooks/       # Custom React hooks
│       │   └── styles/      # Tailwind configuration
│       └── package.json
├── lib/
│   ├── api-spec/            # OpenAPI specification
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validation schemas
│   └── db/                  # Database (Drizzle ORM)
│       ├── src/
│       │   ├── schema/      # Database tables
│       │   └── index.ts     # DB connection
│       ├── seed.ts          # Database seeding
│       └── drizzle.config.ts
├── scripts/                 # Utility scripts
├── .env                     # Environment variables (create this)
├── pnpm-workspace.yaml      # Monorepo configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Root workspace config
```

---

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| Package Manager | pnpm 10.33.0 |
| Language | TypeScript 5.9 |
| Runtime | Node.js 24 |
| Backend Framework | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Frontend Framework | React 18 + Vite |
| Styling | Tailwind CSS 3 |
| UI Components | Radix UI |
| State Management | TanStack React Query |
| Validation | Zod v4 |
| Authentication | JWT + bcryptjs |
| API Codegen | Orval 8.5.2 |
| Build Tool | esbuild 0.27.3 |
| Animation | Framer Motion |

---

## 🔧 Available Commands

### Root Level

```bash
# Build all packages
pnpm run build

# Type check entire project
pnpm run typecheck
```

### Backend (artifacts/api-server/)

```bash
pnpm run dev          # Start development server (watches for changes)
pnpm run build        # Build for production (creates dist/)
pnpm run typecheck    # TypeScript validation
```

### Frontend (artifacts/recipe-sub/)

```bash
pnpm run dev          # Start development server with hot reload
pnpm run build        # Build for production
pnpm run serve        # Preview production build locally
pnpm run typecheck    # TypeScript validation
```

### Database (lib/db/)

```bash
pnpm run push         # Push schema changes to database
pnpm run push-force   # Force push schema (use with caution)
pnpm run seed         # Seed database with initial data
pnpm run check-users  # List all users in database
```

---

## 🍎 Features & Supported Health Conditions

### Recipe Analysis
- Users paste a recipe and select a health condition
- App identifies all ingredients
- Unsafe ingredients are flagged
- Safe substitutes are recommended with confidence scores
- Before/after nutrition comparison is displayed

### Health Conditions Supported

#### 1. Diabetes
- **Restricted Ingredients**: sugar, white rice, white flour, bread, pasta, potato
- **Recommended Substitutes**: 
  - Sugar → coconut sugar, stevia, erythritol
  - White rice → brown rice, quinoa
  - White flour → whole wheat flour
  - Bread → whole grain bread
  - Potato → sweet potato
  - Pasta → vegetable-based pasta

#### 2. Hypertension (High Blood Pressure)
- **Restricted Ingredients**: salt, bacon, soy sauce, cheese, mayonnaise
- **Recommended Substitutes**:
  - Salt → herbs, spices, salt substitutes
  - Bacon → lean meats, turkey bacon
  - Soy sauce → low-sodium soy sauce
  - Cheese → Greek yogurt
  - Mayonnaise → oil-based dressings

#### 3. Heart Disease
- **Restricted Ingredients**: red meat, butter, cream, bacon, egg yolks
- **Recommended Substitutes**:
  - Red meat → fish, poultry, legumes
  - Butter → olive oil, vegetable oil
  - Cream → almond milk, coconut cream
  - Bacon → lean proteins
  - Egg yolks → egg whites

#### 4. Kidney Disease
- **Restricted Ingredients**: salt, potassium chloride, red meat, milk, cheese
- **Recommended Substitutes**:
  - Salt → herb-based seasonings
  - Red meat → lean proteins
  - Milk → unsweetened almond milk
  - Cheese → low-sodium varieties

---

## 📡 API Endpoints

### Health Check
```
GET /api/healthz
Response: { status: "ok" }
```

### Recipe Analysis (Core Feature)
```
POST /api/analyze-recipe
Content-Type: application/json
Body: {
  "recipe": "Mix 2 cups white flour, 1 cup white sugar, 3 eggs, 1/2 cup butter"
}

Response: {
  "parsedIngredients": [
    {
      "name": "white flour",
      "normalizedName": "flour",
      "hasSubstitutes": true,
      "substitutes": [
        {
          "name": "whole wheat flour",
          "score": 85,
          "reason": "Better for blood sugar control",
          "explanation": "Whole wheat has more fiber..."
        }
      ],
      "originalNutrition": { ... },
      "isInvalid": false
    }
  ],
  "originalNutritionTotal": {
    "calories": 1500,
    "protein": 25,
    "carbs": 150,
    "fat": 50,
    "sugar": 100,
    "sodium": 500
  },
  "substitutedNutritionTotal": {
    "calories": 1420,
    "protein": 28,
    "carbs": 140,
    "fat": 45,
    "sugar": 70,
    "sodium": 400
  },
  "substituteCount": 4
}
```

### Ingredients
```
GET /api/ingredients
Response: [ { id: 1, name: "flour", category: "grains", ... }, ... ]

GET /api/ingredients/:name/substitutes
Example: GET /api/ingredients/sugar/substitutes
Response: [
  {
    "name": "coconut sugar",
    "score": 90,
    "reason": "Lower glycemic index",
    ...
  }
]

GET /api/ingredients/:name/nutrition
Example: GET /api/ingredients/sugar/nutrition
Response: {
  "calories": 387,
  "protein": 0,
  "carbs": 100,
  "fat": 0,
  "sugar": 97,
  "sodium": 11
}
```

### Authentication
```
POST /api/signup
Content-Type: application/json
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
Response: { "token": "jwt_token_here", "user": { ... } }

POST /api/login
Body: {
  "email": "john@example.com",
  "password": "SecurePass123!"
}
Response: { "token": "jwt_token_here", "user": { ... } }

GET /api/users/:id
Headers: Authorization: Bearer <jwt_token>
Response: { "id": 1, "name": "John Doe", "email": "john@example.com", ... }
```

### User Favorites
```
POST /api/favorites
Headers: Authorization: Bearer <jwt_token>
Body: { "ingredient": "sugar", "substitute": "coconut sugar" }

GET /api/favorites
Headers: Authorization: Bearer <jwt_token>
Response: [ { "ingredient": "sugar", "substitute": "coconut sugar", ... }, ... ]

DELETE /api/favorites/:id
Headers: Authorization: Bearer <jwt_token>
```

### Saved Recipes
```
POST /api/recipes
Headers: Authorization: Bearer <jwt_token>
Body: { "recipeText": "Mix flour and sugar...", "resultJson": { ... } }

GET /api/recipes
Headers: Authorization: Bearer <jwt_token>
Response: [ { "id": 1, "recipeText": "...", "resultJson": { ... }, ... }, ... ]

DELETE /api/recipes/:id
Headers: Authorization: Bearer <jwt_token>
```

### Substitution History
```
POST /api/history
Headers: Authorization: Bearer <jwt_token>
Body: { "ingredient": "sugar", "substitute": "coconut sugar", "action": "saved" }

POST /api/history/batch
Headers: Authorization: Bearer <jwt_token>
Body: {
  "entries": [
    { "ingredient": "sugar", "substitute": "coconut sugar", "action": "saved" },
    { "ingredient": "flour", "substitute": "whole wheat flour", "action": "feedback" }
  ]
}

GET /api/history
Headers: Authorization: Bearer <jwt_token>
Response: [ { "ingredient": "sugar", "substitute": "coconut sugar", "action": "saved", ... }, ... ]
```

### Brand Recommendations
```
GET /api/brands/:substituteName
Example: GET /api/brands/coconut-sugar
Response: {
  "brandable": true,
  "substituteName": "coconut sugar",
  "bestOverall": { "name": "Brand A", "rating": 4.8, ... },
  "cleanest": { "name": "Brand B", "rating": 4.5, ... },
  "budget": { "name": "Brand C", "rating": 4.2, ... }
}
```

### Feedback
```
POST /api/feedback
Body: {
  "ingredient": "sugar",
  "substitute": "coconut sugar",
  "rating": 5
}
```

---

## 🗄 Database Schema

### Core Tables

#### ingredients
```sql
- id (serial, PK)
- name (text, unique) - e.g., "sugar", "flour"
- canonicalName (text) - normalized name
- category (text) - e.g., "grains", "spices", "oils"
- functionalRole (text) - e.g., "sweetener", "binder", "thickener"
```

#### nutrition (per 100g)
```sql
- id (serial, PK)
- ingredientId (integer, FK)
- calories (real)
- protein (real)
- carbs (real)
- fat (real)
- sugar (real)
- sodium (real)
```

#### substitutions
```sql
- id (serial, PK)
- originalIngredient (text)
- substituteIngredient (text)
- confidence (real) - 0.0 to 1.0
- source (text) - "seed", "ai", "user_feedback"
```

#### feedback
```sql
- id (serial, PK)
- ingredient (text)
- substitute (text)
- rating (integer) - 1 to 5
```

#### ingredient_aliases
```sql
- id (serial, PK)
- alias (text, unique) - e.g., "brown sugar"
- canonicalName (text) - e.g., "sugar"
```

#### ingredient_roles
```sql
- id (serial, PK)
- ingredientName (text, unique)
- role (text) - functional role in cooking
```

### User Tables

#### users
```sql
- id (serial, PK)
- name (text)
- email (text, unique)
- passwordHash (text)
- profilePicture (text, optional)
- dietaryPreferences (text[])
- createdAt (timestamp)
- updatedAt (timestamp)
```

#### favorite_substitutes
```sql
- id (serial, PK)
- userId (integer, FK) - references users.id (CASCADE delete)
- ingredient (text)
- substitute (text)
- createdAt (timestamp)
```

#### saved_recipes
```sql
- id (serial, PK)
- userId (integer, FK) - references users.id (CASCADE delete)
- recipeText (text)
- resultJson (jsonb) - stored analysis result
- createdAt (timestamp)
```

#### substitution_history
```sql
- id (serial, PK)
- userId (integer, FK) - references users.id (CASCADE delete)
- ingredient (text)
- substitute (text)
- action (text) - "saved", "dismissed", "feedback"
- createdAt (timestamp)
```

#### brand_cache
```sql
- id (serial, PK)
- searchKey (text, unique)
- brandsData (jsonb) - brand information
- source (text) - data source
- resultCount (integer)
- fetchedAt (timestamp)
```

---

## 🔐 Authentication & Security

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*()_+-=[]{};':"\\|,.<>/?)

### JWT Token
- Issued on login/signup
- Include in API requests: `Authorization: Bearer <token>`
- Used to authenticate protected endpoints

### Password Hashing
- Uses bcryptjs for secure password storage
- Passwords are never returned in API responses

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change PORT in .env file
PORT=5000

# Or kill process on port 4000 (macOS/Linux)
lsof -ti:4000 | xargs kill -9

# Or kill process on port 4000 (Windows)
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
# Check connection string in .env

# Test connection with psql
psql postgresql://user:password@localhost:5432/vitalsub

# View all databases
psql -l | grep vitalsub
```

### pnpm Not Found
```bash
# Install pnpm globally
npm install -g pnpm@10.33.0

# Verify installation
pnpm --version
```

### Dependencies Won't Install
```bash
# Clear pnpm cache
pnpm store prune

# Remove node_modules
rm -rf node_modules

# Reinstall
pnpm install
```

### "Use pnpm instead" Error
```bash
# Make sure you're using pnpm, not npm or yarn
pnpm --version

# Update pnpm if needed
npm install -g pnpm@10.33.0
```

### Recipe Parsing Returns No Ingredients
- Ensure recipe text contains actual ingredient names
- Try with more specific ingredient names
- Example: "2 cups flour" instead of "some dry stuff"

### API Returns 503 Service Unavailable
```bash
# Database is not configured
# Check DATABASE_URL in .env
# Ensure PostgreSQL is running
# Run: cd lib/db && pnpm run push
```

### Password Validation Fails
- Password must be 8+ characters
- Include uppercase, lowercase, number, special character
- Example: `SecurePass123!`

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | - | PostgreSQL connection string |
| `PORT` | ❌ | 4000 | API server port |
| `JWT_SECRET` | ✅ | - | Secret key for JWT token signing |
| `OPENAI_API_KEY` | ❌ | - | OpenAI API key for AI fallback substitutes |
| `NODE_ENV` | ❌ | development | Environment mode (development/production) |

### Example `.env`
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/vitalsub
PORT=4000
JWT_SECRET=my_super_secret_key_12345_abcde
OPENAI_API_KEY=sk-proj-1234567890abcdefghijklmnop
NODE_ENV=development
```

---

## 🚀 Development Workflow

### 1. Make Changes
- Edit files in `artifacts/api-server/src/` or `artifacts/recipe-sub/src/`
- Changes auto-reload in dev servers

### 2. Type Check
```bash
pnpm run typecheck
```

### 3. Test in Browser
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000/api`

### 4. Commit Changes
```bash
git add .
git commit -m "feat: add new feature"
git push
```

---

## 📦 Production Build & Deployment

### Build for Production
```bash
# Build all packages
pnpm run build

# Verify builds
ls artifacts/api-server/dist/
ls artifacts/recipe-sub/dist/
```

### Run Production Build Locally
```bash
# Start backend
node artifacts/api-server/dist/index.cjs

# Serve frontend (in separate terminal)
cd artifacts/recipe-sub
pnpm run serve
```

### Deployment Checklist
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Update `JWT_SECRET` to strong value
- [ ] Configure production `DATABASE_URL`
- [ ] Set `OPENAI_API_KEY` if using AI substitutes
- [ ] Run `pnpm run build`
- [ ] Deploy `artifacts/api-server/dist/index.cjs` to backend
- [ ] Deploy `artifacts/recipe-sub/dist/` to frontend hosting
- [ ] Test all API endpoints
- [ ] Verify database connectivity

---

## 🎯 Key Features

### ✅ Recipe Analysis
- Intelligent ingredient parsing
- Real-time health restriction checking
- Multiple substitute suggestions with confidence scores
- Nutritional comparison (before/after)

### ✅ User Management
- User registration with strong password requirements
- JWT-based authentication
- User profiles with dietary preferences
- Account security with bcryptjs hashing

### ✅ Personalization
- Save favorite substitutes
- Store recipe analyses
- Track substitution history
- User feedback system

### ✅ Smart Recommendations
- ML-powered ingredient scoring
- Flavor profile matching
- Nutrition-based filtering
- AI fallback for unknown ingredients

### ✅ Brand Recommendations
- Suggest specific product brands
- Compare brand options (best overall, cleanest, budget)
- Caching for performance

---

## 🧑‍💻 Development Tips

### Adding New Ingredient
1. Insert into `ingredients` table
2. Add nutrition data to `nutrition` table
3. Add substitution pairs to `substitutions` table

### Adding New Health Condition
1. Update seed data in `lib/db/seed.ts`
2. Add disease rules to database
3. Update UI to show new condition
4. Test recipe analysis with new restrictions

### Running API Tests
```bash
# Test endpoint with curl
curl -X POST http://localhost:4000/api/analyze-recipe \
  -H "Content-Type: application/json" \
  -d '{"recipe":"2 cups white flour, 1 cup sugar, 3 eggs"}'

# Test with authentication
curl -X GET http://localhost:4000/api/favorites \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Debugging Database Issues
```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Check users
cd lib/db
pnpm run check-users

# View table structure
psql $DATABASE_URL -c "\d ingredients"
```

---

## 📞 Support & Issues

- **Report Bugs**: Open a GitHub issue with error messages and steps to reproduce
- **Feature Requests**: Create a GitHub discussion
- **Database Issues**: Ensure PostgreSQL is running and DATABASE_URL is correct
- **API Issues**: Check backend logs in terminal for error messages
- **Frontend Issues**: Check browser console for JavaScript errors

---

## 📄 License

MIT License - This project is open source and available for educational and commercial use.

---

## 🎓 Learning Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run type check: `pnpm run typecheck`
5. Commit with clear messages: `git commit -m "feat: add my feature"`
6. Push to branch: `git push origin feature/my-feature`
7. Open a Pull Request

---

## 👨‍💻 Project Team

- **Original Author**: Moneesh12
- **Maintained By**: wrewre
- **Contributors**: Open to contributions!

---

## 🎉 Getting Started Checklist

- [ ] Clone the repository
- [ ] Install Node.js 24+
- [ ] Install PostgreSQL 12+
- [ ] Install pnpm 10.33.0+
- [ ] Run `pnpm install`
- [ ] Create `.env` file with DATABASE_URL and JWT_SECRET
- [ ] Run `cd lib/db && pnpm run push && pnpm run seed`
- [ ] Start backend: `cd artifacts/api-server && pnpm run dev`
- [ ] Start frontend: `cd artifacts/recipe-sub && pnpm run dev`
- [ ] Open `http://localhost:5173` in browser
- [ ] Create a user account
- [ ] Try analyzing a recipe!

---

**Happy coding! 🚀**
