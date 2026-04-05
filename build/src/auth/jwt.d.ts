import { SignOptions } from "jsonwebtoken";
export declare const DEFAULT_EXPIRES_IN: SignOptions["expiresIn"];
export declare function signJwt(payload: Record<string, any>, expiresIn?: SignOptions["expiresIn"]): string;
export declare function verifyJwt<T = any>(token: string): T;
