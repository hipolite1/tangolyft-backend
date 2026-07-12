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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminService = class AdminService {
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
    async approvedDrivers() {
        const drivers = await this.prisma.driver.findMany({
            where: { kycStatus: "APPROVED" },
            include: { user: true, documents: true, vehicle: true },
            orderBy: { approvedAt: "desc" },
        });
        return { ok: true, drivers };
    }
    async listTrips() {
        const trips = await this.prisma.trip.findMany({
            include: {
                rider: true,
                driver: {
                    include: {
                        user: true,
                    },
                },
                delivery: true,
                fare: true,
            },
            orderBy: { requestedAt: "desc" },
            take: 100,
        });
        return { ok: true, trips };
    }
    async getTripDetail(tripId) {
        if (!tripId || tripId.length < 10) {
            throw new common_1.BadRequestException("Invalid tripId");
        }
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
            include: {
                rider: true,
                driver: {
                    include: {
                        user: true,
                    },
                },
                delivery: true,
                fare: true,
            },
        });
        if (!trip) {
            throw new common_1.NotFoundException(`Trip not found: ${tripId}`);
        }
        return { ok: true, trip };
    }
    async waiveCommitment(tripId, user, body) {
        if (!tripId || tripId.length < 10) {
            throw new common_1.BadRequestException("Invalid tripId");
        }
        const exists = await this.prisma.trip.findUnique({
            where: { id: tripId },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException(`Trip not found: ${tripId}`);
        }
        try {
            const updated = await this.prisma.trip.update({
                where: { id: tripId },
                data: {
                    commitmentStatus: client_1.CommitmentStatus.WAIVED,
                    commitmentWaivedAt: new Date(),
                    commitmentWaivedBy: user.sub,
                    commitmentReason: (body?.reason?.trim() || "Waived by admin").slice(0, 300),
                },
            });
            await this.prisma.auditLog
                .create({
                data: {
                    adminUserId: user.sub,
                    action: "TRIP_COMMITMENT_WAIVED",
                    entityType: "Trip",
                    entityId: tripId,
                    metadata: {
                        reason: (body?.reason?.trim() || "Waived by admin").slice(0, 300),
                    },
                },
            })
                .catch(() => null);
            return { ok: true, trip: updated };
        }
        catch (e) {
            if (e instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                e.code === "P2025") {
                throw new common_1.NotFoundException(`Trip not found: ${tripId}`);
            }
            throw e;
        }
    }
    async cancelTrip(tripId, reason, adminId) {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
        });
        if (!trip) {
            throw new common_1.NotFoundException("Trip not found");
        }
        if (trip.status === "COMPLETED") {
            throw new common_1.BadRequestException("Cannot cancel a completed trip");
        }
        if (trip.status === "CANCELLED") {
            return { ok: true, message: "Trip already cancelled" };
        }
        const updated = await this.prisma.trip.update({
            where: { id: tripId },
            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelReason: reason,
                cancelledBy: "ADMIN",
            },
        });
        return { ok: true, trip: updated };
    }
    async assignDriver(tripId, driverPhone) {
        if (!tripId || tripId.length < 10) {
            throw new common_1.BadRequestException("Invalid tripId");
        }
        if (!driverPhone || driverPhone.trim().length < 5) {
            throw new common_1.BadRequestException("Driver phone is required");
        }
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
        });
        if (!trip) {
            throw new common_1.NotFoundException("Trip not found");
        }
        const user = await this.prisma.user.findUnique({
            where: { phone: driverPhone.trim() },
        });
        if (!user) {
            throw new common_1.NotFoundException("Driver user not found for this phone");
        }
        const driver = await this.prisma.driver.findUnique({
            where: { userId: user.id },
        });
        if (!driver) {
            throw new common_1.NotFoundException("Driver profile not found for this phone");
        }
        if (driver.kycStatus !== "APPROVED") {
            throw new common_1.BadRequestException("Driver is not approved");
        }
        const updated = await this.prisma.trip.update({
            where: { id: tripId },
            data: {
                driverId: driver.id,
                status: "ACCEPTED",
                acceptedAt: new Date(),
            },
        });
        return {
            ok: true,
            message: "Driver assigned successfully",
            trip: updated,
        };
    }
    async startTrip(tripId) {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
        });
        if (!trip) {
            throw new common_1.NotFoundException("Trip not found");
        }
        const updated = await this.prisma.trip.update({
            where: { id: tripId },
            data: {
                status: "STARTED",
                startedAt: new Date(),
            },
        });
        return {
            ok: true,
            message: "Trip started successfully",
            trip: updated,
        };
    }
    async completeTrip(tripId) {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
        });
        if (!trip) {
            throw new common_1.NotFoundException("Trip not found");
        }
        const updated = await this.prisma.trip.update({
            where: { id: tripId },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
        });
        return {
            ok: true,
            message: "Trip completed successfully",
            trip: updated,
        };
    }
    async approveDriver(driverId, user) {
        if (!driverId || driverId.length < 10) {
            throw new common_1.BadRequestException("Invalid driverId");
        }
        const exists = await this.prisma.driver.findUnique({
            where: { id: driverId },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException(`Driver not found: ${driverId}`);
        }
        const driver = await this.prisma.driver.update({
            where: { id: driverId },
            data: {
                kycStatus: "APPROVED",
                approvedAt: new Date(),
                rejectedAt: null,
                kycNote: null,
                availability: "OFFLINE",
            },
        });
        await this.prisma.auditLog
            .create({
            data: {
                adminUserId: user.sub,
                action: "DRIVER_APPROVED",
                entityType: "Driver",
                entityId: driverId,
                metadata: {
                    kycStatus: "APPROVED",
                },
            },
        })
            .catch(() => null);
        return { ok: true, driver };
    }
    async rejectDriver(driverId, body, user) {
        if (!driverId || driverId.length < 10) {
            throw new common_1.BadRequestException("Invalid driverId");
        }
        const exists = await this.prisma.driver.findUnique({
            where: { id: driverId },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException(`Driver not found: ${driverId}`);
        }
        const note = (body?.note?.trim() || "Rejected").slice(0, 300);
        const driver = await this.prisma.driver.update({
            where: { id: driverId },
            data: {
                kycStatus: "REJECTED",
                rejectedAt: new Date(),
                kycNote: note,
                availability: "OFFLINE",
            },
        });
        await this.prisma.auditLog
            .create({
            data: {
                adminUserId: user.sub,
                action: "DRIVER_REJECTED",
                entityType: "Driver",
                entityId: driverId,
                metadata: {
                    note,
                    kycStatus: "REJECTED",
                },
            },
        })
            .catch(() => null);
        return { ok: true, driver };
    }
    async suspendDriver(driverId, body, user) {
        if (!driverId || driverId.length < 10) {
            throw new common_1.BadRequestException("Invalid driverId");
        }
        const exists = await this.prisma.driver.findUnique({
            where: { id: driverId },
            select: { id: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException(`Driver not found: ${driverId}`);
        }
        const note = (body?.note?.trim() || "Suspended by admin").slice(0, 300);
        const driver = await this.prisma.driver.update({
            where: { id: driverId },
            data: {
                availability: "SUSPENDED",
                kycNote: note,
            },
        });
        await this.prisma.auditLog
            .create({
            data: {
                adminUserId: user.sub,
                action: "DRIVER_SUSPENDED",
                entityType: "Driver",
                entityId: driverId,
                metadata: {
                    note,
                    availability: "SUSPENDED",
                },
            },
        })
            .catch(() => null);
        return { ok: true, driver };
    }
    async unsuspendDriver(driverId, user) {
        if (!driverId || driverId.length < 10) {
            throw new common_1.BadRequestException("Invalid driverId");
        }
        const exists = await this.prisma.driver.findUnique({
            where: { id: driverId },
            select: { id: true, kycStatus: true },
        });
        if (!exists) {
            throw new common_1.NotFoundException(`Driver not found: ${driverId}`);
        }
        if (exists.kycStatus !== "APPROVED") {
            throw new common_1.BadRequestException("Only APPROVED drivers can be unsuspended");
        }
        const driver = await this.prisma.driver.update({
            where: { id: driverId },
            data: {
                availability: "OFFLINE",
            },
        });
        await this.prisma.auditLog
            .create({
            data: {
                adminUserId: user.sub,
                action: "DRIVER_UNSUSPENDED",
                entityType: "Driver",
                entityId: driverId,
                metadata: {
                    availability: "OFFLINE",
                },
            },
        })
            .catch(() => null);
        return { ok: true, driver };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map