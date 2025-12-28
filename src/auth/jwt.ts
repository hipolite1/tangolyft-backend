import * as jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  role: "RIDER" | "DRIVER" | "ADMIN";
  iat?: number;
  exp?: number;
};

export function verifyJwtToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing in .env");

  const payload = jwt.verify(token, secret);
  return payload as JwtPayload;
}
