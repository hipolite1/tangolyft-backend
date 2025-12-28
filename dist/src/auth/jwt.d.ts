export type JwtPayload = {
    sub: string;
    role: "RIDER" | "DRIVER" | "ADMIN";
    iat?: number;
    exp?: number;
};
export declare function verifyJwtToken(token: string): JwtPayload;
