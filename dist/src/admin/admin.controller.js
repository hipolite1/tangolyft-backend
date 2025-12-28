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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const require_role_1 = require("../auth/require-role");
let AdminController = class AdminController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async pendingDrivers() {
        const drivers = await this.prisma.driver.findMany({
            where: { kycStatus: "PENDING" },
            include: { user: true, documents: true, vehicle: true },
            orderBy: { createdAt: "desc" },
        });
        return { ok: true, drivers };
    }
    async approve(driverId) {
        const driver = await this.prisma.driver.update({
            where: { id: driverId },
            data: { kycStatus: "APPROVED", approvedAt: new Date(), rejectedAt: null, kycNote: null },
        });
        return { ok: true, driver };
    }
    async reject(driverId, body) {
        const note = body?.note ?? "Rejected";
        const driver = await this.prisma.driver.update({
            where: { id: driverId },
            data: { kycStatus: "REJECTED", rejectedAt: new Date(), kycNote: note },
        });
        return { ok: true, driver };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Get)("drivers/pending"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "pendingDrivers", null);
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Post)("drivers/:driverId/approve"),
    __param(0, (0, common_1.Param)("driverId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approve", null);
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Post)("drivers/:driverId/reject"),
    __param(0, (0, common_1.Param)("driverId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "reject", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)("admin"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map