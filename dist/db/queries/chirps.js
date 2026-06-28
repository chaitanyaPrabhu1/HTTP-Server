import { asc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { chirps } from "../schema.js";
export async function createChirp(chirp) {
    const [result] = await db.insert(chirps).values(chirp).returning();
    return result;
}
export async function getAllChirps() {
    return db.select().from(chirps).orderBy(asc(chirps.createdAt));
}
export async function getChirp(id) {
    const [result] = await db.select().from(chirps).where(eq(chirps.id, id));
    return result;
}
export async function deleteChirp(id) {
    await db.delete(chirps).where(eq(chirps.id, id));
}
export async function getChirpsByAuthor(authorId) {
    return db
        .select()
        .from(chirps)
        .where(eq(chirps.userId, authorId))
        .orderBy(chirps.createdAt);
}
