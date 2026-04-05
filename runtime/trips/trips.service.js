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
exports.TripsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const fare_1 = require("../fare/fare");
function serviceTypeMatchesDriver(driverType, serviceType) {
    if (serviceType === client_1.ServiceType.CAR_RIDE)
        return driverType === "CAR_DRIVER";
    if (serviceType === client_1.ServiceType.BIKE_DELIVERY)
        return driverType === "BIKE_COURIER";
    return true;
}
function prismaErrMessage(e) {
    if (e instanceof client_1.Prisma.PrismaClientKnownRequestError)
        return `DB error: ${e.code}`;
    if (e instanceof Error)
        return e.message || "Unexpected error";
    return "Unexpected error";
}
let TripsService = class TripsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    toRad(value) {
        return (value * Math.PI) / 180;
    }
    haversineKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) *
                Math.cos(this.toRad(lat2)) *
                Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    async findEligibleDriversForTrip(tripId) {
        try {
            const trip = await this.prisma.trip.findUnique({
                where: { id: tripId },
            });
            if (!trip)
                return { ok: false, message: "Trip not found" };
            const now = Date.now();
            const maxAgeMs = 2 * 60 * 1000;
            const drivers = await this.prisma.driver.findMany({
                include: {
                    user: true,
                    location: true,
                    vehicle: true,
                },
            });
            const queriedDrivers = drivers.map((driver) => {
                const hasLocation = !!driver.location;
                const seenAtMs = driver.location?.lastSeenAt
                    ? new Date(driver.location.lastSeenAt).getTime()
                    : null;
                const isFresh = seenAtMs !== null ? now - seenAtMs <= maxAgeMs : false;
                const matchesServiceType = serviceTypeMatchesDriver(driver.driverType, trip.serviceType);
                const distanceKm = hasLocation &&
                    trip.pickupLat != null &&
                    trip.pickupLng != null &&
                    driver.location?.lat != null &&
                    driver.location?.lng != null
                    ? this.haversineKm(trip.pickupLat, trip.pickupLng, driver.location.lat, driver.location.lng)
                    : null;
                const reasons = [];
                if (driver.city !== trip.city)
                    reasons.push("city");
                if (driver.kycStatus !== "APPROVED")
                    reasons.push("kycStatus");
                if (driver.availability !== "ONLINE")
                    reasons.push("availability");
                if (!hasLocation)
                    reasons.push("hasLocation");
                if (!isFresh)
                    reasons.push("isFresh");
                if (!matchesServiceType)
                    reasons.push("matchesServiceType");
                return {
                    driverId: driver.id,
                    userId: driver.userId,
                    fullName: driver.user?.fullName ?? null,
                    phone: driver.user?.phone ?? null,
                    driverType: driver.driverType,
                    city: driver.city,
                    kycStatus: driver.kycStatus,
                    availability: driver.availability,
                    hasLocation,
                    lat: driver.location?.lat ?? null,
                    lng: driver.location?.lng ?? null,
                    heading: driver.location?.heading ?? null,
                    accuracyM: driver.location?.accuracyM ?? null,
                    lastSeenAt: driver.location?.lastSeenAt ?? null,
                    seenAtMs,
                    nowMs: now,
                    ageMs: seenAtMs !== null ? now - seenAtMs : null,
                    isFresh,
                    matchesServiceType,
                    distanceKm,
                    passesFinalFilter: reasons.length === 0,
                    reasons,
                };
            });
            const eligible = queriedDrivers
                .filter((driver) => driver.passesFinalFilter)
                .sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) -
                (b.distanceKm ?? Number.MAX_VALUE));
            return {
                ok: true,
                trip: {
                    id: trip.id,
                    serviceType: trip.serviceType,
                    city: trip.city,
                    pickupLat: trip.pickupLat,
                    pickupLng: trip.pickupLng,
                },
                count: eligible.length,
                drivers: eligible,
                queriedDrivers,
            };
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
    async requestTrip(user, dto) {
        try {
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
                commitmentStatus: client_1.CommitmentStatus.WAIVED,
            };
            if (dto.serviceType === client_1.ServiceType.BIKE_DELIVERY) {
                if (!dto.itemDescription || !dto.recipientName || !dto.recipientPhone) {
                    return {
                        ok: false,
                        message: "For BIKE_DELIVERY, itemDescription, recipientName, recipientPhone are required",
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
                include: { rider: true, driver: true, delivery: true, fare: true },
            });
            return { ok: true, trip };
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
    async myTrips(user) {
        try {
            const trips = await this.prisma.trip.findMany({
                where: { riderId: user.sub },
                orderBy: { requestedAt: "desc" },
                include: { driver: true, delivery: true, fare: true },
            });
            return { ok: true, trips };
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
    async expireStaleRequestedTrips() {
        const cutoff = new Date(Date.now() - 10 * 60 * 1000);
        const result = await this.prisma.trip.updateMany({
            where: {
                status: client_1.TripStatus.REQUESTED,
                driverId: null,
                requestedAt: { lt: cutoff },
            },
            data: {
                status: client_1.TripStatus.CANCELLED,
                cancelledBy: "ADMIN",
                cancelReason: "System timeout: no driver accepted in time",
                cancelledAt: new Date(),
            },
        });
        return result.count;
    }
    async inbox(user) {
        try {
            console.log("INBOX_PHASE4_LOCAL_MARKER");
            const expiredCount = await this.expireStaleRequestedTrips();
            console.log("INBOX_PHASE4_EXPIRED_COUNT", expiredCount);
            const driver = await this.prisma.driver.findUnique({
                where: { userId: user.sub },
                include: { location: true },
            });
            if (!driver)
                return { ok: false, message: "Driver profile not found" };
            if (driver.kycStatus !== "APPROVED") {
                return { ok: false, message: "KYC not approved" };
            }
            if (driver.availability !== "ONLINE") {
                return { ok: false, message: "Driver is not ONLINE" };
            }
            if (!driver.location) {
                return { ok: false, message: "Driver location missing. Update location first." };
            }
            const now = Date.now();
            const maxAgeMs = 2 * 60 * 1000;
            const recentWindowMs = 60 * 60 * 1000;
            const seenAtMs = new Date(driver.location.lastSeenAt).getTime();
            const isFresh = now - seenAtMs <= maxAgeMs;
            if (!isFresh) {
                return { ok: false, message: "Driver location is stale. Update location first." };
            }
            const cutoff = new Date(now - recentWindowMs);
            const trips = await this.prisma.trip.findMany({
                where: {
                    status: client_1.TripStatus.REQUESTED,
                    driverId: null,
                    city: driver.city,
                    requestedAt: {
                        gte: cutoff,
                    },
                },
                include: { rider: true, delivery: true },
            });
            const ranked = trips
                .filter((trip) => serviceTypeMatchesDriver(driver.driverType, trip.serviceType))
                .filter((trip) => trip.pickupLat != null && trip.pickupLng != null)
                .map((trip) => {
                const distanceKm = this.haversineKm(driver.location.lat, driver.location.lng, trip.pickupLat, trip.pickupLng);
                return {
                    ...trip,
                    distanceKm,
                };
            })
                .sort((a, b) => {
                if (a.distanceKm !== b.distanceKm)
                    return a.distanceKm - b.distanceKm;
                return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
            })
                .slice(0, 20);
            return {
                ok: true,
                phase4Marker: "PHASE4-FRESH-COPY-1",
                expiredCount,
                count: ranked.length,
                windowMinutes: 60,
                driver: {
                    id: driver.id,
                    userId: driver.userId,
                    driverType: driver.driverType,
                    city: driver.city,
                    availability: driver.availability,
                    lat: driver.location.lat,
                    lng: driver.location.lng,
                    lastSeenAt: driver.location.lastSeenAt,
                },
                trips: ranked,
            };
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
    async cancel(user, tripId, body) {
        try {
            const trip = await this.prisma.trip.findUnique({
                where: { id: tripId },
            });
            if (!trip)
                return { ok: false, message: "Trip not found" };
            if (trip.status === client_1.TripStatus.COMPLETED) {
                return { ok: false, message: "Completed trip cannot be cancelled" };
            }
            if (trip.status === client_1.TripStatus.CANCELLED) {
                return { ok: false, message: "Trip is already cancelled" };
            }
            const reason = body?.reason?.trim() || null;
            const actorRole = user.role;
            const actorUserId = user.sub;
            const result = await this.prisma.$transaction(async (tx) => {
                const latest = await tx.trip.findUnique({
                    where: { id: tripId },
                });
                if (!latest)
                    return { ok: false, message: "Trip not found" };
                if (latest.status === client_1.TripStatus.COMPLETED) {
                    return { ok: false, message: "Completed trip cannot be cancelled" };
                }
                if (latest.status === client_1.TripStatus.CANCELLED) {
                    return { ok: false, message: "Trip is already cancelled" };
                }
                let cancelledBy;
                if (actorRole === "RIDER") {
                    if (latest.riderId !== actorUserId) {
                        return { ok: false, message: "Not your trip" };
                    }
                    if (latest.driverId) {
                        return { ok: false, message: "Rider can only cancel before driver accepts" };
                    }
                    if (latest.status !== client_1.TripStatus.REQUESTED) {
                        return { ok: false, message: "Rider can only cancel REQUESTED trips" };
                    }
                    cancelledBy = "RIDER";
                }
                else if (actorRole === "DRIVER") {
                    const driver = await tx.driver.findUnique({
                        where: { userId: actorUserId },
                    });
                    if (!driver) {
                        return { ok: false, message: "Driver profile not found" };
                    }
                    if (latest.driverId !== driver.id) {
                        return { ok: false, message: "Trip is not assigned to this driver" };
                    }
                    if (latest.status !== client_1.TripStatus.ACCEPTED && latest.status !== client_1.TripStatus.STARTED) {
                        return {
                            ok: false,
                            message: "Driver can only cancel ACCEPTED or STARTED trips",
                        };
                    }
                    cancelledBy = "DRIVER";
                    await tx.driver.update({
                        where: { id: driver.id },
                        data: {
                            availability: "ONLINE",
                        },
                    });
                }
                else if (actorRole === "ADMIN") {
                    cancelledBy = "ADMIN";
                    if (latest.driverId) {
                        await tx.driver.update({
                            where: { id: latest.driverId },
                            data: {
                                availability: "ONLINE",
                            },
                        }).catch(() => null);
                    }
                }
                else {
                    return { ok: false, message: "Role not allowed to cancel trip" };
                }
                const cancelledTrip = await tx.trip.update({
                    where: { id: tripId },
                    data: {
                        status: client_1.TripStatus.CANCELLED,
                        cancelledBy,
                        cancelReason: reason,
                        cancelledAt: new Date(),
                    },
                    include: { rider: true, driver: true, delivery: true, fare: true },
                });
                return { ok: true, trip: cancelledTrip };
            });
            return result;
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
    async accept(user, tripId) {
        try {
            const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
            if (!driver)
                return { ok: false, message: "Driver profile not found" };
            if (driver.kycStatus !== "APPROVED")
                return { ok: false, message: "KYC not approved" };
            if (driver.availability === "SUSPENDED")
                return { ok: false, message: "Driver is suspended" };
            if (driver.availability !== "ONLINE")
                return { ok: false, message: "Driver is not ONLINE" };
            const result = await this.prisma.$transaction(async (tx) => {
                const latestDriver = await tx.driver.findUnique({ where: { id: driver.id } });
                if (!latestDriver)
                    return { ok: false, message: "Driver profile not found" };
                if (latestDriver.kycStatus !== "APPROVED") {
                    return { ok: false, message: "KYC not approved" };
                }
                if (latestDriver.availability !== "ONLINE") {
                    return { ok: false, message: "Driver is not available to accept trips" };
                }
                const trip = await tx.trip.findUnique({ where: { id: tripId } });
                if (!trip)
                    return { ok: false, message: "Trip not found" };
                if (trip.status !== client_1.TripStatus.REQUESTED || trip.driverId) {
                    return { ok: false, message: "Trip is no longer available" };
                }
                if (trip.city !== latestDriver.city) {
                    return { ok: false, message: "Trip city mismatch" };
                }
                if (!serviceTypeMatchesDriver(latestDriver.driverType, trip.serviceType)) {
                    return { ok: false, message: "Service type does not match driver type" };
                }
                const claimed = await tx.trip.update({
                    where: { id: tripId },
                    data: {
                        driverId: latestDriver.id,
                        status: client_1.TripStatus.ACCEPTED,
                        matchedAt: new Date(),
                        acceptedAt: new Date(),
                    },
                    include: { rider: true, driver: true, delivery: true },
                });
                await tx.driver.update({
                    where: { id: latestDriver.id },
                    data: {
                        availability: "ON_TRIP",
                    },
                });
                return { ok: true, trip: claimed };
            });
            return result;
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
    async start(user, tripId) {
        try {
            const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
            if (!driver)
                return { ok: false, message: "Driver profile not found" };
            const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
            if (!trip)
                return { ok: false, message: "Trip not found" };
            if (trip.driverId !== driver.id)
                return { ok: false, message: "Not assigned to this driver" };
            if (trip.status !== client_1.TripStatus.ACCEPTED) {
                return { ok: false, message: "Trip must be ACCEPTED first" };
            }
            if (trip.paymentMode === client_1.PaymentMode.PREPAID) {
                const payment = await this.prisma.payment.findUnique({ where: { tripId: trip.id } });
                if (!payment || payment.status !== client_1.PaymentStatus.PAID) {
                    return { ok: false, message: "Payment required before starting this trip" };
                }
            }
            const updated = await this.prisma.trip.update({
                where: { id: tripId },
                data: { status: client_1.TripStatus.STARTED, startedAt: new Date() },
                include: { delivery: true },
            });
            return { ok: true, trip: updated };
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
    async complete(user, tripId, body) {
        try {
            const driver = await this.prisma.driver.findUnique({ where: { userId: user.sub } });
            if (!driver)
                return { ok: false, message: "Driver profile not found" };
            const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
            if (!trip)
                return { ok: false, message: "Trip not found" };
            if (trip.driverId !== driver.id)
                return { ok: false, message: "Not assigned to this driver" };
            if (trip.status === client_1.TripStatus.COMPLETED) {
                const existingFare = await this.prisma.tripFare.findUnique({ where: { tripId } });
                return { ok: true, trip, fare: existingFare, walletUpdated: false, alreadyCompleted: true };
            }
            if (trip.status !== client_1.TripStatus.STARTED)
                return { ok: false, message: "Trip must be STARTED first" };
            const rawDistance = body?.distanceKmEst ?? trip.distanceKmEst ?? null;
            const rawDuration = body?.durationMinEst ?? trip.durationMinEst ?? null;
            let distanceKmEst = Number(rawDistance);
            let durationMinEst = Number(rawDuration);
            if (!Number.isFinite(distanceKmEst) || distanceKmEst <= 0)
                distanceKmEst = 1;
            if (!Number.isFinite(durationMinEst) || durationMinEst <= 0)
                durationMinEst = 5;
            const result = await this.prisma.$transaction(async (tx) => {
                const latest = await tx.trip.findUnique({ where: { id: tripId } });
                if (!latest)
                    throw new Error("Trip not found");
                if (latest.status === client_1.TripStatus.COMPLETED) {
                    const existingFare = await tx.tripFare.findUnique({ where: { tripId } });
                    return { trip: latest, fare: existingFare, walletUpdated: false, alreadyCompleted: true };
                }
                if (latest.status !== client_1.TripStatus.STARTED) {
                    throw new Error("Trip must be STARTED first");
                }
                if (latest.driverId !== driver.id) {
                    throw new Error("Not assigned to this driver");
                }
                const completedTrip = await tx.trip.update({
                    where: { id: tripId },
                    data: {
                        status: client_1.TripStatus.COMPLETED,
                        completedAt: new Date(),
                        distanceKmEst,
                        durationMinEst,
                    },
                });
                const existingFare = await tx.tripFare.findUnique({ where: { tripId } });
                if (existingFare) {
                    await tx.driver.update({
                        where: { id: driver.id },
                        data: {
                            availability: "ONLINE",
                        },
                    });
                    return { trip: completedTrip, fare: existingFare, walletUpdated: false, alreadyCompleted: true };
                }
                const policy = await tx.farePolicy.findFirst({
                    where: { city: completedTrip.city, serviceType: completedTrip.serviceType, isActive: true },
                    orderBy: { createdAt: "desc" },
                });
                if (!policy)
                    throw new Error(`No active FarePolicy for ${completedTrip.city} / ${completedTrip.serviceType}`);
                const fareCalc = (0, fare_1.computeFare)(policy, distanceKmEst, durationMinEst);
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
                        distanceKm: distanceKmEst,
                        durationMin: durationMinEst,
                    },
                });
                const existingTx = await tx.walletTransaction.findFirst({
                    where: { tripId, driverId: driver.id, type: "CREDIT", reason: "TRIP_EARNING" },
                });
                let walletUpdated = false;
                if (!existingTx) {
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
                    walletUpdated = true;
                }
                await tx.driver.update({
                    where: { id: driver.id },
                    data: {
                        availability: "ONLINE",
                    },
                });
                await tx.auditLog
                    .create({
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
                            distanceKmEst,
                            durationMinEst,
                            walletUpdated,
                        },
                    },
                })
                    .catch(() => null);
                return { trip: completedTrip, fare, walletUpdated, alreadyCompleted: false };
            });
            return { ok: true, ...result };
        }
        catch (e) {
            return { ok: false, message: prismaErrMessage(e) };
        }
    }
};
exports.TripsService = TripsService;
exports.TripsService = TripsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TripsService);
//# sourceMappingURL=trips.service.js.map