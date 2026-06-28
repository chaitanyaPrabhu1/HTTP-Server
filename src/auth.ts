import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import crypto from "crypto";
import { UnauthorizedError } from "./errors.js";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export async function checkPasswordHash(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function makeJWT(userID: string, expiredIn: number, secret: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiredAt = issuedAt + expiredIn;
  const token: payload = {
    iss: "chirpy",
    sub: userID,
    iat: issuedAt,
    exp: expiredAt,
  };
  return jwt.sign(token, secret);
}

export function validateJWT(tokenString: string, secret: string): string {
  let decoded: payload;
  try {
    decoded = jwt.verify(tokenString, secret) as payload;
  } catch (err) {
    throw new UnauthorizedError("Invalid token");
  }
  if (!decoded.sub) {
    throw new UnauthorizedError("Token missing subject (user ID)");
  }
  return decoded.sub;
}

export function getBearerToken(req: Request): string {
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

export function makeRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}



export function getAPIKey(req: Request): string {
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
