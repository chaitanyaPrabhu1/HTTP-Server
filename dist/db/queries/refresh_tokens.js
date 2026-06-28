// src/db/queries/refresh_tokens.ts
import { db } from "../index.js"; // wherever your db connection is exported
import { refreshTokens } from "../schema.js";
import { users } from "../schema.js";
import { eq, and, gt, isNull } from "drizzle-orm";
export async function saveRefreshToken(data) {
    const [row] = await db.insert(refreshTokens).values(data).returning();
    return row;
}
export async function getUserFromRefreshToken(token) {
    const [result] = await db
        .select({ user: users })
        .from(refreshTokens)
        .innerJoin(users, eq(refreshTokens.userId, users.id))
        .where(and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, new Date()), // not expired
    isNull(refreshTokens.revokedAt)));
    return result?.user;
}
export async function revokeRefreshToken(token) {
    await db
        .update(refreshTokens)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(refreshTokens.token, token));
}
