const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const API_BASE = rawApiBase;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "An error occurred";
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  profilePicture: string | null;
  dietaryPreferences: string[] | null;
  createdAt: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export async function signup(name: string, email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse<AuthResult>(res);
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResult>(res);
}

export async function getMe(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/me`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ user: AuthUser }>(res);
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/logout`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
}

export async function saveFavoriteSubstitute(ingredient: string, substitute: string): Promise<void> {
  await fetch(`${API_BASE}/api/favorites`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ingredient, substitute }),
  });
}

export async function getFavoriteSubstitutes(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/favorites`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ favorites: any[] }>(res);
  return data.favorites;
}

export async function removeFavoriteSubstitute(ingredient: string, substitute: string): Promise<void> {
  await fetch(`${API_BASE}/api/favorites`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ingredient, substitute }),
  });
}

export async function saveRecipe(recipeText: string, resultJson?: any): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE}/api/recipes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipeText, resultJson }),
  });
  return handleResponse<{ id: number; message: string }>(res);
}

export async function getSavedRecipes(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/recipes`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ recipes: any[] }>(res);
  return data.recipes;
}

export async function deleteSavedRecipe(id: number): Promise<void> {
  await fetch(`${API_BASE}/api/recipes/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

export async function getSubstitutionHistory(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/history`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<{ history: any[] }>(res);
  return data.history;
}

export async function addSubstitutionHistory(ingredient: string, substitute: string, action: string): Promise<void> {
  await fetch(`${API_BASE}/api/history`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ ingredient, substitute, action }),
  });
}

export async function addBatchHistory(entries: Array<{ ingredient: string; substitute: string; action: string }>): Promise<void> {
  await fetch(`${API_BASE}/api/history/batch`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ entries }),
  });
}
