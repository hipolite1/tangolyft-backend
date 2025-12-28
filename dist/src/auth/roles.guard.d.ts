import { CanActivate, ExecutionContext } from "@nestjs/common";
export declare class RolesGuard implements CanActivate {
    private readonly allowed;
    constructor(allowed: Array<"RIDER" | "DRIVER" | "ADMIN">);
    canActivate(context: ExecutionContext): boolean;
}
