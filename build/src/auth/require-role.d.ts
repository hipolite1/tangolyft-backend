export declare const ROLES_KEY = "roles";
export type AppRole = "RIDER" | "DRIVER" | "ADMIN";
export declare function RequireRole(...roles: AppRole[]): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
