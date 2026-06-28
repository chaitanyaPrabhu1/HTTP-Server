import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UnauthorizedError } from "./errors.js";
export async function hashPassword(password) {
    return argon2.hash(password);
}
export async function checkPasswordHash(password, hash) {
    return argon2.verify(hash, password);
}
export function makeJWT(userID, expiredIn, secret) {
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiredAt = issuedAt + expiredIn;
    const token = {
        iss: "chirpy",
        sub: userID,
        iat: issuedAt,
        exp: expiredAt,
    };
    return jwt.sign(token, secret);
}
export function validateJWT(tokenString, secret) {
    let decoded;
    try {
        decoded = jwt.verify(tokenString, secret);
    }
    catch (err) {
        throw new UnauthorizedError("Invalid token");
    }
    if (!decoded.sub) {
        throw new UnauthorizedError("Token missing subject (user ID)");
    }
    return decoded.sub;
}
export function getBearerToken(req) {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
        throw new UnauthorizedError("Missing Authorization header");
    }
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
        throw new UnauthorizedError("Malformed Authorization header");
    }
    return token;
}
export function makeRefreshToken() {
    return crypto.randomBytes(32).toString("hex");
}
export function getAPIKey(req) {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
        throw new UnauthorizedError("Missing Authorization header");
    }
    const key = authHeader.replace(/^ApiKey\s+/i, "").trim();
    if (!key) {
        throw new UnauthorizedError("Malformed Authorization header");
    }
    return key;
}
