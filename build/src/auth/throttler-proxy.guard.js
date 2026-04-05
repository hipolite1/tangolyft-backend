"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottlerProxyGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
let ThrottlerProxyGuard = class ThrottlerProxyGuard extends throttler_1.ThrottlerGuard {
    async getTracker(req) {
        const cf = req.headers?.["cf-connecting-ip"];
        const xff = req.headers?.["x-forwarded-for"];
        const cfIp = Array.isArray(cf) ? cf[0] : cf;
        const xffIp = typeof xff === "string"
            ? xff.split(",")[0].trim()
            : Array.isArray(xff)
                ? xff[0]?.split(",")[0].trim()
                : undefined;
        return (cfIp || xffIp || req.ip || "unknown").toString();
    }
};
exports.ThrottlerProxyGuard = ThrottlerProxyGuard;
exports.ThrottlerProxyGuard = ThrottlerProxyGuard = __decorate([
    (0, common_1.Injectable)()
], ThrottlerProxyGuard);
//# sourceMappingURL=throttler-proxy.guard.js.map