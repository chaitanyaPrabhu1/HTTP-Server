import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { users } from "../schema.js";
export async function createUser(user) {
    const [result] = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing()
        .returning();
    return result;
}
export async function deleteUsers() {
    await db.delete(users);
}
export async function getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
}
export async function updateUser(userId, email, hashedPassword) {
    const [row] = await db
        .update(users)
        .set({ email, hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
    return row;
}
export async function upgradeUserToChirpyRed(userId) {
    const [row] = await db
        .update(users)
        .set({ isChirpyRed: true, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
    return row; // undefined if no user matched that ID
}
