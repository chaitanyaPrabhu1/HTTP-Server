import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { NewUser, users } from "../schema.js";

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}



export async function deleteUsers(){
  await db.delete(users);
}



export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}



export async function updateUser(
  userId: string,
  email: string,
  hashedPassword: string,
) {
  const [row] = await db
    .update(users)
    .set({ email, hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row;
}

export async function upgradeUserToChirpyRed(userId: string) {
  const [row] = await db
    .update(users)
    .set({ isChirpyRed: true, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row; // undefined if no user matched that ID
}
