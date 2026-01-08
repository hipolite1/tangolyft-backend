import jwt, { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET ?? "dev_secret_change_me";
const DEFAULT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export function signJwt(
  payload: Record<string, any>,
  expiresIn: SignOptions["expiresIn"] = DEFAULT_EXPIRES_IN,
) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJwt<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
