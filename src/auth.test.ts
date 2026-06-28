import { describe, it, expect, beforeAll } from "vitest";
import { makeJWT, validateJWT } from "./auth.js";

describe("JWT", () => {
  const secret = "secret";
  const wrongSecret = "wrong_secret";
  const userID = "some-unique-user-id";

  let validToken: string;

  beforeAll(() => {
    validToken = makeJWT(userID, 3600, secret);
  });

  it("validates a valid token and returns the user ID", () => {
    expect(validateJWT(validToken, secret)).toBe(userID);
  });

  it("rejects a token signed with the wrong secret", () => {
    expect(() => validateJWT(validToken, wrongSecret)).toThrow();
  });

  it("rejects a malformed token string", () => {
    expect(() => validateJWT("not.a.realtoken", secret)).toThrow();
  });

  it("rejects an expired token", () => {
    const expiredToken = makeJWT(userID, -3600, secret);
    expect(() => validateJWT(expiredToken, secret)).toThrow();
  });
});
