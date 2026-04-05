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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DriverService = class DriverService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async apply(userId, body) {
        const driverType = body?.driverType;
        if (!driverType) {
            return {
                ok: false,
                message: "driverType is required: CAR_DRIVER or BIKE_COURIER",
            };
        }
        const existing = await this.prisma.driver.findUnique({
            where: { userId },
        });
        if (existing) {
            return { ok: true, driver: existing };
        }
        const driver = await this.prisma.driver.create({
            data: {
                userId,
                driverType,
                kycStatus: "PENDING",
                availability: "OFFLINE",
                city: "ABUJA",
            },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { role: "DRIVER" },
        });
        return { ok: true, driver };
    }
    async addDocument(userId, body) {
        const { docType, fileUrl } = body || {};
        if (!docType || !fileUrl) {
            return {
                ok: false,
                message: "docType and fileUrl are required",
            };
        }
        const driver = await this.prisma.driver.findUnique({
            where: { userId },
        });
        if (!driver) {
            return {
                ok: false,
                message: "Driver profile not found. Apply first.",
            };
        }
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
    async goOnline(userId) {
        const driver = await this.prisma.driver.findUnique({
            where: { userId },
        });
        if (!driver) {
            throw new common_1.NotFoundException("Driver profile not found");
        }
        if (driver.availability === "SUSPENDED") {
            throw new common_1.ForbiddenException("Driver is suspended");
        }
        if (driver.kycStatus !== "APPROVED") {
            return { ok: false, message: "KYC not approved yet" };
        }
        const updated = await this.prisma.driver.update({
            where: { id: driver.id },
            data: { availability: "ONLINE" },
        });
        return { ok: true, driver: updated };
    }
    async goOffline(userId) {
        const driver = await this.prisma.driver.findUnique({
            where: { userId },
        });
        if (!driver) {
            throw new common_1.NotFoundException("Driver profile not found");
        }
        if (driver.availability === "ON_TRIP") {
            return {
                ok: false,
                message: "Driver cannot go offline while on an active trip",
            };
        }
        const updated = await this.prisma.driver.update({
            where: { id: driver.id },
            data: { availability: "OFFLINE" },
        });
        return { ok: true, driver: updated };
    }
    async getDriverByUserId(userId) {
        const driver = await this.prisma.driver.findUnique({
            where: { userId },
        });
        if (!driver) {
            throw new common_1.NotFoundException("Driver profile not found");
        }
        return driver;
    }
    async setOnTrip(driverId) {
        return this.prisma.driver.update({
            where: { id: driverId },
            data: { availability: "ON_TRIP" },
        });
    }
    async setOnline(driverId) {
        return this.prisma.driver.update({
            where: { id: driverId },
            data: { availability: "ONLINE" },
        });
    }
};
exports.DriverService = DriverService;
exports.DriverService = DriverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DriverService);
//# sourceMappingURL=driver.service.js.map