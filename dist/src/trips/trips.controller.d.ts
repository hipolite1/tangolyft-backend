import { PrismaService } from "../prisma/prisma.service";
import { RequestTripDto } from "./dto/request-trip.dto";
export declare class TripsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    requestTrip(user: any, dto: RequestTripDto): Promise<{
        ok: boolean;
        message: string;
        trip?: undefined;
    } | {
        ok: boolean;
        trip: {
            driver: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                driverType: import("@prisma/client").$Enums.DriverType;
                kycStatus: import("@prisma/client").$Enums.KycStatus;
                availability: import("@prisma/client").$Enums.Availability;
                city: import("@prisma/client").$Enums.City;
                approvedAt: Date | null;
                rejectedAt: Date | null;
                kycNote: string | null;
            } | null;
            delivery: {
                itemDescription: string;
                recipientName: string;
                recipientPhone: string;
                noteToCourier: string | null;
                tripId: string;
            } | null;
            rider: {
                role: import("@prisma/client").$Enums.Role;
                id: string;
                phone: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.UserStatus;
                fullName: string | null;
                email: string | null;
                updatedAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TripStatus;
            updatedAt: Date;
            city: import("@prisma/client").$Enums.City;
            driverId: string | null;
            serviceType: import("@prisma/client").$Enums.ServiceType;
            pickupAddress: string;
            pickupLat: number;
            pickupLng: number;
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distanceKmEst: number | null;
            durationMinEst: number | null;
            cancelledBy: import("@prisma/client").$Enums.CancelledBy | null;
            cancelReason: string | null;
            requestedAt: Date;
            matchedAt: Date | null;
            acceptedAt: Date | null;
            arrivedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            riderId: string;
        };
        message?: undefined;
    }>;
    myTrips(user: any): Promise<{
        ok: boolean;
        trips: ({
            driver: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                driverType: import("@prisma/client").$Enums.DriverType;
                kycStatus: import("@prisma/client").$Enums.KycStatus;
                availability: import("@prisma/client").$Enums.Availability;
                city: import("@prisma/client").$Enums.City;
                approvedAt: Date | null;
                rejectedAt: Date | null;
                kycNote: string | null;
            } | null;
            delivery: {
                itemDescription: string;
                recipientName: string;
                recipientPhone: string;
                noteToCourier: string | null;
                tripId: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TripStatus;
            updatedAt: Date;
            city: import("@prisma/client").$Enums.City;
            driverId: string | null;
            serviceType: import("@prisma/client").$Enums.ServiceType;
            pickupAddress: string;
            pickupLat: number;
            pickupLng: number;
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distanceKmEst: number | null;
            durationMinEst: number | null;
            cancelledBy: import("@prisma/client").$Enums.CancelledBy | null;
            cancelReason: string | null;
            requestedAt: Date;
            matchedAt: Date | null;
            acceptedAt: Date | null;
            arrivedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            riderId: string;
        })[];
    }>;
    inbox(user: any): Promise<{
        ok: boolean;
        message: string;
        trips?: undefined;
    } | {
        ok: boolean;
        trips: ({
            delivery: {
                itemDescription: string;
                recipientName: string;
                recipientPhone: string;
                noteToCourier: string | null;
                tripId: string;
            } | null;
            rider: {
                role: import("@prisma/client").$Enums.Role;
                id: string;
                phone: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.UserStatus;
                fullName: string | null;
                email: string | null;
                updatedAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TripStatus;
            updatedAt: Date;
            city: import("@prisma/client").$Enums.City;
            driverId: string | null;
            serviceType: import("@prisma/client").$Enums.ServiceType;
            pickupAddress: string;
            pickupLat: number;
            pickupLng: number;
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distanceKmEst: number | null;
            durationMinEst: number | null;
            cancelledBy: import("@prisma/client").$Enums.CancelledBy | null;
            cancelReason: string | null;
            requestedAt: Date;
            matchedAt: Date | null;
            acceptedAt: Date | null;
            arrivedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            riderId: string;
        })[];
        message?: undefined;
    }>;
    accept(user: any, tripId: string): Promise<{
        ok: boolean;
        message: string;
        trip?: undefined;
    } | {
        ok: boolean;
        trip: {
            driver: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                driverType: import("@prisma/client").$Enums.DriverType;
                kycStatus: import("@prisma/client").$Enums.KycStatus;
                availability: import("@prisma/client").$Enums.Availability;
                city: import("@prisma/client").$Enums.City;
                approvedAt: Date | null;
                rejectedAt: Date | null;
                kycNote: string | null;
            } | null;
            delivery: {
                itemDescription: string;
                recipientName: string;
                recipientPhone: string;
                noteToCourier: string | null;
                tripId: string;
            } | null;
            rider: {
                role: import("@prisma/client").$Enums.Role;
                id: string;
                phone: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.UserStatus;
                fullName: string | null;
                email: string | null;
                updatedAt: Date;
            };
        } & {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TripStatus;
            updatedAt: Date;
            city: import("@prisma/client").$Enums.City;
            driverId: string | null;
            serviceType: import("@prisma/client").$Enums.ServiceType;
            pickupAddress: string;
            pickupLat: number;
            pickupLng: number;
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distanceKmEst: number | null;
            durationMinEst: number | null;
            cancelledBy: import("@prisma/client").$Enums.CancelledBy | null;
            cancelReason: string | null;
            requestedAt: Date;
            matchedAt: Date | null;
            acceptedAt: Date | null;
            arrivedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            riderId: string;
        };
        message?: undefined;
    }>;
    start(user: any, tripId: string): Promise<{
        ok: boolean;
        message: string;
        trip?: undefined;
    } | {
        ok: boolean;
        trip: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TripStatus;
            updatedAt: Date;
            city: import("@prisma/client").$Enums.City;
            driverId: string | null;
            serviceType: import("@prisma/client").$Enums.ServiceType;
            pickupAddress: string;
            pickupLat: number;
            pickupLng: number;
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distanceKmEst: number | null;
            durationMinEst: number | null;
            cancelledBy: import("@prisma/client").$Enums.CancelledBy | null;
            cancelReason: string | null;
            requestedAt: Date;
            matchedAt: Date | null;
            acceptedAt: Date | null;
            arrivedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            riderId: string;
        };
        message?: undefined;
    }>;
    complete(user: any, tripId: string): Promise<{
        ok: boolean;
        message: string;
    } | {
        trip: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.TripStatus;
            updatedAt: Date;
            city: import("@prisma/client").$Enums.City;
            driverId: string | null;
            serviceType: import("@prisma/client").$Enums.ServiceType;
            pickupAddress: string;
            pickupLat: number;
            pickupLng: number;
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distanceKmEst: number | null;
            durationMinEst: number | null;
            cancelledBy: import("@prisma/client").$Enums.CancelledBy | null;
            cancelReason: string | null;
            requestedAt: Date;
            matchedAt: Date | null;
            acceptedAt: Date | null;
            arrivedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            riderId: string;
        };
        fare: {
            createdAt: Date;
            currency: import("@prisma/client").$Enums.Currency;
            baseFare: number;
            perKmFare: number;
            perMinFare: number;
            bookingFee: number;
            tripId: string;
            discount: number;
            totalAmount: number;
            platformEarning: number;
            driverEarning: number;
            distanceKm: number | null;
            durationMin: number | null;
        };
        walletUpdated: boolean;
        ok: boolean;
        message?: undefined;
    }>;
}
