import { db, usersTable } from "./src";

async function main() {
  if (!db) {
    console.error("DB not initialized!");
    return;
  }
  const users = await db.select().from(usersTable);
  console.log("USERS IN DATABASE:");
  console.log(users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt
  })));
}

main().catch(console.error);
