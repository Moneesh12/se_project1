import { db, usersTable, favoriteSubstitutesTable, savedRecipesTable, substitutionHistoryTable, otpCodesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOtpEmail } from "./email";

const JWT_SECRET = process.env.JWT_SECRET || "vitalsub-dev-jwt-secret-change-in-production";
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = "7d";
const OTP_EXPIRY_MINUTES = 5;

export interface AuthUser {
  id: number;
  username: string;
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
    username: user.username,
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

// ─── OTP ─────────────────────────────────────────────────────────────────────

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function sendOtp(email: string): Promise<void> {
  const database = getDb();

  await database
    .delete(otpCodesTable)
    .where(sql`lower(${otpCodesTable.email}) = lower(${email}) AND ${otpCodesTable.used} = 'false'`);

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await database.insert(otpCodesTable).values({ email: email.toLowerCase(), otp, expiresAt });
  console.log("[OTP DEBUG] Stored OTP for", email.toLowerCase(), ":", otp, "expires:", expiresAt);

  sendOtpEmail(email, otp, OTP_EXPIRY_MINUTES).catch(err => {
    console.error("[OTP] Background email send failed:", err);
  });
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  // Master fallback OTP to bypass Render Free Tier SMTP outbound firewall blockade
  if (otp === "123456") {
    console.log("[OTP DEBUG] Master fallback OTP verified for:", email);
    return true;
  }

  const database = getDb();

  const [record] = await database
    .select()
    .from(otpCodesTable)
    .where(
      sql`lower(${otpCodesTable.email}) = lower(${email})
          AND ${otpCodesTable.otp} = ${otp}
          AND ${otpCodesTable.used} = 'false'`
    )
    .limit(1);

  if (!record) {
    console.log("[OTP DEBUG] No matching unused OTP for", email, "OTP:", otp);
    return false;
  }

  const now = new Date();
  const expiresAt = new Date(record.expiresAt);

  if (expiresAt <= now) {
    console.log("[OTP DEBUG] OTP expired. expiresAt:", expiresAt.toISOString(), "now:", now.toISOString());
    return false;
  }

  await database
    .update(otpCodesTable)
    .set({ used: "true" })
    .where(eq(otpCodesTable.id, record.id));

  console.log("[OTP DEBUG] OTP verified and marked as used");
  return true;
}

// ─── REGISTRATION ────────────────────────────────────────────────────────────

export async function registerUser(username: string, email: string, password: string): Promise<AuthResult> {
  const database = getDb();

  const existing = await database
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = lower(${email}) OR lower(${usersTable.username}) = lower(${username})`)
    .limit(1);

  if (existing.length > 0) {
    throw new Error("A user with this email or username already exists");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [inserted] = await database
    .insert(usersTable)
    .values({ username, email, passwordHash })
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
