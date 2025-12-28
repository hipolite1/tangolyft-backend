"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const require_role_1 = require("../auth/require-role");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let WalletController = class WalletController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async myWallet(user) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        const wallet = await this.prisma.driverWallet.findUnique({
            where: { driverId: driver.id },
        });
        return {
            ok: true,
            driver: { id: driver.id, city: driver.city, driverType: driver.driverType },
            wallet: wallet ?? { driverId: driver.id, balance: 0 },
        };
    }
    async transactions(user, limitRaw) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        const limit = Math.min(Math.max(parseInt(limitRaw ?? "50", 10) || 50, 1), 200);
        const txs = await this.prisma.walletTransaction.findMany({
            where: { driverId: driver.id },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        return { ok: true, count: txs.length, txs };
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Get)("me"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "myWallet", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Get)("transactions"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "transactions", null);
exports.WalletController = WalletController = __decorate([
    (0, common_1.Controller)("wallet"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map