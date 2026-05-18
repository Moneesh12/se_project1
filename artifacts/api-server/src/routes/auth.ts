import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  registerUser,
  loginUser,
  getUserById,
  saveFavoriteSubstitute,
  getFavoriteSubstitutes,
  removeFavoriteSubstitute,
  saveRecipe,
  getSavedRecipes,
  deleteSavedRecipe,
  addSubstitutionHistory,
  getSubstitutionHistory,
} from "../services/auth";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router: IRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  email: z.string().regex(EMAIL_REGEX, "Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(PASSWORD_REGEX, "Password must contain uppercase, lowercase, number, and special character"),
});

const loginSchema = z.object({
  email: z.string().regex(EMAIL_REGEX, "Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const favoriteSchema = z.object({
  ingredient: z.string().min(1),
  substitute: z.string().min(1),
});

const saveRecipeSchema = z.object({
  recipeText: z.string().min(1),
  resultJson: z.any().optional(),
});

const historySchema = z.object({
  ingredient: z.string().min(1),
  substitute: z.string().min(1),
  action: z.enum(["saved", "dismissed", "feedback"]),
});

const batchHistorySchema = z.object({
  entries: z.array(historySchema).min(1).max(100),
});

// POST /signup
router.post("/signup", async (req, res): Promise<void> => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      return;
    }

    const { name, email, password } = parsed.data;
    const result = await registerUser(name, email, password);

    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === "Account already exists") {
      res.status(409).json({ error: "Account already exists" });
      return;
    }
    console.error("SIGNUP ERROR:", err instanceof Error ? err.stack : err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /login
router.post("/login", async (req, res): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      return;
    }

    const { email, password } = parsed.data;
    const result = await loginUser(email, password);

    res.json(result);
  } catch (err: any) {
    if (err.message === "Wrong credentials") {
      res.status(401).json({ error: "Wrong credentials" });
      return;
    }
    console.error("LOGIN ERROR:", err instanceof Error ? err.stack : err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /logout
router.post("/logout", (_req, res): void => {
  res.json({ message: "Logged out successfully" });
});

// GET /me
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const user = await getUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error("GET /me ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /favorites
router.post("/favorites", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = favoriteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      return;
    }

    await saveFavoriteSubstitute(req.userId!, parsed.data.ingredient, parsed.data.substitute);
    res.status(201).json({ message: "Favorite saved" });
  } catch (err) {
    console.error("POST /favorites ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /favorites
router.get("/favorites", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const favorites = await getFavoriteSubstitutes(req.userId!);
    res.json({ favorites });
  } catch (err) {
    console.error("GET /favorites ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /favorites
router.delete("/favorites", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = favoriteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      return;
    }

    await removeFavoriteSubstitute(req.userId!, parsed.data.ingredient, parsed.data.substitute);
    res.json({ message: "Favorite removed" });
  } catch (err) {
    console.error("DELETE /favorites ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /recipes
router.post("/recipes", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = saveRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      return;
    }

    const id = await saveRecipe(req.userId!, parsed.data.recipeText, parsed.data.resultJson);
    res.status(201).json({ id, message: "Recipe saved" });
  } catch (err) {
    console.error("POST /recipes ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /recipes
router.get("/recipes", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const recipes = await getSavedRecipes(req.userId!);
    res.json({ recipes });
  } catch (err) {
    console.error("GET /recipes ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /recipes/:id
router.delete("/recipes/:id", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid recipe ID" });
      return;
    }

    await deleteSavedRecipe(req.userId!, id);
    res.json({ message: "Recipe deleted" });
  } catch (err) {
    console.error("DELETE /recipes/:id ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /history
router.post("/history", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = historySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      return;
    }

    await addSubstitutionHistory(req.userId!, parsed.data.ingredient, parsed.data.substitute, parsed.data.action);
    res.status(201).json({ message: "History recorded" });
  } catch (err) {
    console.error("POST /history ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /history/batch
router.post("/history/batch", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const parsed = batchHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      return;
    }

    const userId = req.userId!;
    await Promise.all(
      parsed.data.entries.map((entry: { ingredient: string; substitute: string; action: string }) =>
        addSubstitutionHistory(userId, entry.ingredient, entry.substitute, entry.action)
      )
    );
    res.status(201).json({ message: "History recorded", count: parsed.data.entries.length });
  } catch (err) {
    console.error("POST /history/batch ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /history
router.get("/history", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const history = await getSubstitutionHistory(req.userId!);
    res.json({ history });
  } catch (err) {
    console.error("GET /history ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
