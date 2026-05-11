/**
 * Authentication Helper Module
 */

/**
 * Validates a password based on security criteria:
 * - Minimum 8 characters
 * - Must contain at least one number
 * - Must contain at least one special character
 */
export function validatePasswordStrength(password: string): boolean {
  if (password.length < 8) return false;
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasNumber && hasSpecial;
}

/**
 * Mock Login Function for testing purposes.
 * In a real application, this would interact with the database and use bcrypt.
 */
export async function attemptLogin(username: string, password: string): Promise<{ success: boolean; message: string }> {
  // Input Sanitization
  const cleanUsername = username.trim().toLowerCase();

  // Basic validation
  if (!cleanUsername || !password) {
    return { success: false, message: "Username and password are required." };
  }

  // Password Strength Check (White box logic branch)
  if (!validatePasswordStrength(password)) {
    return { success: false, message: "Password does not meet security requirements." };
  }

  // Mock Database check (In integration testing, this would be a DB call)
  if (cleanUsername === "admin@vitalsub.com" && password === "Admin@123") {
    return { success: true, message: "Login successful!" };
  }

  return { success: false, message: "Invalid username or password." };
}
