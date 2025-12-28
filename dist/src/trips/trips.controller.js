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
exports.TripsController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const require_role_1 = require("../auth/require-role");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const request_trip_dto_1 = require("./dto/request-trip.dto");
const client_1 = require("@prisma/client");
const fare_1 = require("../fare/fare");
function serviceTypeMatchesDriver(driverType, serviceType) {
    if (serviceType === client_1.ServiceType.CAR_RIDE)
        return driverType === "CAR_DRIVER";
    if (serviceType === client_1.ServiceType.BIKE_DELIVERY)
        return driverType === "BIKE_COURIER";
    return true;
}
let TripsController = class TripsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async requestTrip(user, dto) {
        if (!dto?.serviceType)
            return { ok: false, message: "serviceType is required" };
        if (!dto?.pickupAddress || dto.pickupLat === undefined || dto.pickupLng === undefined) {
            return { ok: false, message: "pickupAddress, pickupLat, pickupLng are required" };
        }
        if (!dto?.dropoffAddress || dto.dropoffLat === undefined || dto.dropoffLng === undefined) {
            return { ok: false, message: "dropoffAddress, dropoffLat, dropoffLng are required" };
        }
        const data = {
            serviceType: dto.serviceType,
            city: dto.city ?? "ABUJA",
            riderId: user.sub,
            pickupAddress: dto.pickupAddress,
            pickupLat: dto.pickupLat,
            pickupLng: dto.pickupLng,
            dropoffAddress: dto.dropoffAddress,
            dropoffLat: dto.dropoffLat,
            dropoffLng: dto.dropoffLng,
            distanceKmEst: dto.distanceKmEst ?? null,
            durationMinEst: dto.durationMinEst ?? null,
            status: client_1.TripStatus.REQUESTED,
        };
        if (dto.serviceType === client_1.ServiceType.BIKE_DELIVERY) {
            if (!dto.itemDescription || !dto.recipientName || !dto.recipientPhone) {
                return {
                    ok: false,
                    message: "For DELIVERY, itemDescription, recipientName, recipientPhone are required",
                };
            }
            data.delivery = {
                create: {
                    itemDescription: dto.itemDescription,
                    recipientName: dto.recipientName,
                    recipientPhone: dto.recipientPhone,
                    noteToCourier: dto.noteToCourier ?? null,
                },
            };
        }
        const trip = await this.prisma.trip.create({
            data,
            include: { delivery: true, rider: true, driver: true },
        });
        return { ok: true, trip };
    }
    async myTrips(user) {
        const trips = await this.prisma.trip.findMany({
            where: { riderId: user.sub },
            orderBy: { requestedAt: "desc" },
            include: { delivery: true, driver: true },
        });
        return { ok: true, trips };
    }
    async inbox(user) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        if (driver.kycStatus !== "APPROVED")
            return { ok: false, message: "KYC not approved" };
        if (driver.availability !== "ONLINE")
            return { ok: false, message: "Driver is not ONLINE" };
        const trips = await this.prisma.trip.findMany({
            where: {
                status: client_1.TripStatus.REQUESTED,
                driverId: null,
                city: driver.city,
            },
            orderBy: { requestedAt: "asc" },
            include: { delivery: true, rider: true },
        });
        const filtered = trips.filter((t) => serviceTypeMatchesDriver(driver.driverType, t.serviceType));
        return { ok: true, trips: filtered };
    }
    async accept(user, tripId) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        if (driver.kycStatus !== "APPROVED")
            return { ok: false, message: "KYC not approved" };
        if (driver.availability !== "ONLINE")
            return { ok: false, message: "Driver is not ONLINE" };
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            return { ok: false, message: "Trip not found" };
        if (trip.status !== client_1.TripStatus.REQUESTED || trip.driverId) {
            return { ok: false, message: "Trip is no longer available" };
        }
        if (trip.city !== driver.city)
            return { ok: false, message: "Trip city mismatch" };
        if (!serviceTypeMatchesDriver(driver.driverType, trip.serviceType)) {
            return { ok: false, message: "Service type does not match driver type" };
        }
        const updated = await this.prisma.trip.update({
            where: { id: tripId },
            data: {
                driverId: driver.id,
                status: client_1.TripStatus.ACCEPTED,
                matchedAt: new Date(),
                acceptedAt: new Date(),
            },
            include: { delivery: true, rider: true, driver: true },
        });
        return { ok: true, trip: updated };
    }
    async start(user, tripId) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            return { ok: false, message: "Trip not found" };
        if (trip.driverId !== driver.id)
            return { ok: false, message: "Not assigned to this driver" };
        if (trip.status !== client_1.TripStatus.ACCEPTED)
            return { ok: false, message: "Trip must be ACCEPTED first" };
        const updated = await this.prisma.trip.update({
            where: { id: tripId },
            data: { status: client_1.TripStatus.STARTED, startedAt: new Date() },
        });
        return { ok: true, trip: updated };
    }
    async complete(user, tripId) {
        const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
        if (!driver)
            return { ok: false, message: "Driver profile not found" };
        const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip)
            return { ok: false, message: "Trip not found" };
        if (trip.driverId !== driver.id)
            return { ok: false, message: "Not assigned to this driver" };
        if (trip.status !== client_1.TripStatus.STARTED)
            return { ok: false, message: "Trip must be STARTED first" };
        if (trip.distanceKmEst == null || trip.durationMinEst == null) {
            return {
                ok: false,
                message: "distanceKmEst and durationMinEst are required to compute fare (Phase D1).",
            };
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const completedTrip = await tx.trip.update({
                where: { id: tripId },
                data: { status: client_1.TripStatus.COMPLETED, completedAt: new Date() },
            });
            const existingFare = await tx.tripFare.findUnique({ where: { tripId } });
            if (existingFare) {
                return { trip: completedTrip, fare: existingFare, walletUpdated: false };
            }
            const policy = await tx.farePolicy.findFirst({
                where: { city: trip.city, serviceType: trip.serviceType, isActive: true },
                orderBy: { createdAt: "desc" },
            });
            if (!policy) {
                throw new Error(`No active FarePolicy for ${trip.city} / ${trip.serviceType}`);
            }
            const fareCalc = (0, fare_1.computeFare)(policy, trip.distanceKmEst, trip.durationMinEst);
            const fare = await tx.tripFare.create({
                data: {
                    tripId,
                    currency: fareCalc.currency,
                    baseFare: fareCalc.baseFare,
                    perKmFare: fareCalc.perKmFare,
                    perMinFare: fareCalc.perMinFare,
                    bookingFee: fareCalc.bookingFee,
                    discount: fareCalc.discount,
                    totalAmount: fareCalc.totalAmount,
                    platformEarning: fareCalc.platformEarning,
                    driverEarning: fareCalc.driverEarning,
                    distanceKm: trip.distanceKmEst,
                    durationMin: trip.durationMinEst,
                },
            });
            await tx.driverWallet.upsert({
                where: { driverId: driver.id },
                create: { driverId: driver.id, balance: 0 },
                update: {},
            });
            await tx.driverWallet.update({
                where: { driverId: driver.id },
                data: { balance: { increment: fareCalc.driverEarning } },
            });
            await tx.walletTransaction.create({
                data: {
                    driverId: driver.id,
                    tripId,
                    type: "CREDIT",
                    reason: "TRIP_EARNING",
                    amount: fareCalc.driverEarning,
                    note: `Trip earning for ${tripId} (platform=${fareCalc.platformEarning})`,
                },
            });
            await tx.auditLog.create({
                data: {
                    adminUserId: user.sub,
                    action: "TRIP_COMMISSION_RECORDED",
                    entityType: "Trip",
                    entityId: tripId,
                    metadata: {
                        totalAmount: fareCalc.totalAmount,
                        driverEarning: fareCalc.driverEarning,
                        platformEarning: fareCalc.platformEarning,
                        currency: fareCalc.currency,
                    },
                },
            });
            return { trip: completedTrip, fare, walletUpdated: true };
        });
        return { ok: true, ...result };
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, require_role_1.RequireRole)("RIDER", "ADMIN", "DRIVER"),
    (0, common_1.Post)("request"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, request_trip_dto_1.RequestTripDto]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "requestTrip", null);
__decorate([
    (0, require_role_1.RequireRole)("RIDER", "ADMIN", "DRIVER"),
    (0, common_1.Get)("my"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "myTrips", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Get)("inbox"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "inbox", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Post)(":tripId/accept"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("tripId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "accept", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Post)(":tripId/start"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("tripId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "start", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Post)(":tripId/complete"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)("tripId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "complete", null);
exports.TripsController = TripsController = __decorate([
    (0, common_1.Controller)("trips"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TripsController);
//# sourceMappingURL=trips.controller.js.map