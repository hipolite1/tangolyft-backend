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
exports.DriverController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const require_role_1 = require("../auth/require-role");
const current_user_decorator_1 = require("../auth/current-user.decorator");
let DriverController = class DriverController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async apply(user, body) {
        const driverType = body?.driverType;
        if (!driverType)
            return { ok: false, message: "driverType is required: CAR_DRIVER or BIKE_COURIER" };
        const existing = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (existing)
            return { ok: true, driver: existing };
        const driver = await this.prisma.driver.create({
            data: {
                userId: user.sub,
                driverType,
                kycStatus: "PENDING",
                availability: "OFFLINE",
                city: "ABUJA",
            },
        });
        await this.prisma.user.update({
            where: { id: user.sub },
            data: { role: "DRIVER" },
        });
        return { ok: true, driver };
    }
    async addDoc(user, body) {
        const { docType, fileUrl } = body || {};
        if (!docType || !fileUrl)
            return { ok: false, message: "docType and fileUrl are required" };
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found. Apply first." };
        const doc = await this.prisma.driverDocument.create({
            data: {
                driverId: driver.id,
                docType,
                fileUrl,
                status: "UPLOADED",
            },
        });
        return { ok: true, doc };
    }
    async goOnline(user) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        if (driver.kycStatus !== "APPROVED") {
            return { ok: false, message: "KYC not approved yet" };
        }
        const updated = await this.prisma.driver.update({
            where: { id: driver.id },
            data: { availability: "ONLINE" },
        });
        return { ok: true, driver: updated };
    }
    async goOffline(user) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        const updated = await this.prisma.driver.update({
            where: { id: driver.id },
            data: { availability: "OFFLINE" },
        });
        return { ok: true, driver: updated };
    }
};
exports.DriverController = DriverController;
__decorate([
    (0, require_role_1.RequireRole)("RIDER", "DRIVER", "ADMIN"),
    (0, common_1.Post)("apply"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DriverController.prototype, "apply", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Post)("documents"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DriverController.prototype, "addDoc", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Post)("go-online"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriverController.prototype, "goOnline", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Post)("go-offline"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DriverController.prototype, "goOffline", null);
exports.DriverController = DriverController = __decorate([
    (0, common_1.Controller)("driver"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DriverController);
//# sourceMappingURL=driver.controller.js.map