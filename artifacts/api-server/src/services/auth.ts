import { db, usersTable, favoriteSubstitutesTable, savedRecipesTable, substitutionHistoryTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "vitalsub-dev-jwt-secret-change-in-production";
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = "7d";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  profilePicture: string | null;
  dietaryPreferences: string[] | null;
  createdAt: Date;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

function sanitizeUser(user: typeof usersTable.$inferSelect): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profilePicture: user.profilePicture,
    dietaryPreferences: user.dietaryPreferences,
    createdAt: user.createdAt,
  };
}

function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function getDb(): NonNullable<typeof db> {
  if (!db) throw new Error("Database unavailable");
  return db;
}

// ─── REGISTRATION ────────────────────────────────────────────────────────────

export async function registerUser(name: string, email: string, password: string): Promise<AuthResult> {
  const database = getDb();

  const existing = await database
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = lower(${email})`)
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Account already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [inserted] = await database
    .insert(usersTable)
    .values({ name, email, passwordHash })
    .returning();

  const user = sanitizeUser(inserted);
  const token = generateToken(user.id);

  return { user, token };
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const database = getDb();

  const [user] = await database
    .select()
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = lower(${email})`)
    .limit(1);

  if (!user) {
    throw new Error("Wrong credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error("Wrong credentials");
  }

  const sanitized = sanitizeUser(user);
  const token = generateToken(user.id);

  return { user: sanitized, token };
}

// ─── USER ────────────────────────────────────────────────────────────────────

export async function getUserById(userId: number): Promise<AuthUser | null> {
  const database = getDb();

  const [user] = await database
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return null;
  return sanitizeUser(user);
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    return payload;
  } catch {
    return null;
  }
}

// ─── FAVORITES ───────────────────────────────────────────────────────────────

export async function saveFavoriteSubstitute(userId: number, ingredient: string, substitute: string): Promise<void> {
  const database = getDb();

  const [existing] = await database
    .select({ id: favoriteSubstitutesTable.id })
    .from(favoriteSubstitutesTable)
    .where(
      and(
        eq(favoriteSubstitutesTable.userId, userId),
        sql`lower(${favoriteSubstitutesTable.ingredient}) = lower(${ingredient})`,
        sql`lower(${favoriteSubstitutesTable.substitute}) = lower(${substitute})`
      )
    )
    .limit(1);

  if (existing) return;

  await database
    .insert(favoriteSubstitutesTable)
    .values({ userId, ingredient: ingredient.toLowerCase(), substitute: substitute.toLowerCase() });
}

export async function getFavoriteSubstitutes(userId: number) {
  const database = getDb();

  return database
    .select()
    .from(favoriteSubstitutesTable)
    .where(eq(favoriteSubstitutesTable.userId, userId))
    .orderBy(desc(favoriteSubstitutesTable.createdAt));
}

export async function removeFavoriteSubstitute(userId: number, ingredient: string, substitute: string): Promise<void> {
  const database = getDb();

  await database
    .delete(favoriteSubstitutesTable)
    .where(
      and(
        eq(favoriteSubstitutesTable.userId, userId),
        sql`lower(${favoriteSubstitutesTable.ingredient}) = lower(${ingredient})`,
        sql`lower(${favoriteSubstitutesTable.substitute}) = lower(${substitute})`
      )
    );
}

// ─── RECIPES ─────────────────────────────────────────────────────────────────

export async function saveRecipe(userId: number, recipeText: string, resultJson: unknown): Promise<number> {
  const database = getDb();

  const [inserted] = await database
    .insert(savedRecipesTable)
    .values({ userId, recipeText, resultJson: resultJson as any })
    .returning({ id: savedRecipesTable.id });

  return inserted.id;
}

export async function getSavedRecipes(userId: number) {
  const database = getDb();

  return database
    .select()
    .from(savedRecipesTable)
    .where(eq(savedRecipesTable.userId, userId))
    .orderBy(desc(savedRecipesTable.createdAt));
}

export async function deleteSavedRecipe(userId: number, recipeId: number): Promise<void> {
  const database = getDb();

  await database
    .delete(savedRecipesTable)
    .where(and(eq(savedRecipesTable.userId, userId), eq(savedRecipesTable.id, recipeId)));
}

// ─── HISTORY ─────────────────────────────────────────────────────────────────

export async function addSubstitutionHistory(
  userId: number,
  ingredient: string,
  substitute: string,
  action: string
): Promise<void> {
  const database = getDb();

  await database
    .insert(substitutionHistoryTable)
    .values({ userId, ingredient: ingredient.toLowerCase(), substitute: substitute.toLowerCase(), action });
}

export async function getSubstitutionHistory(userId: number) {
  const database = getDb();

  return database
    .select()
    .from(substitutionHistoryTable)
    .where(eq(substitutionHistoryTable.userId, userId))
    .orderBy(desc(substitutionHistoryTable.createdAt));
}
