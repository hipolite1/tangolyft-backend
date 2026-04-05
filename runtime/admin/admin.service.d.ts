import { PrismaService } from "../prisma/prisma.service";
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    pendingDrivers(): Promise<{
        ok: boolean;
        drivers: ({
            user: {
                id: string;
                status: import(".prisma/client").$Enums.UserStatus;
                createdAt: Date;
                updatedAt: Date;
                phone: string;
                role: import(".prisma/client").$Enums.Role;
                fullName: string | null;
                email: string | null;
                isMerchant: boolean;
                merchantTrusted: boolean;
            };
            documents: {
                id: string;
                driverId: string;
                status: import(".prisma/client").$Enums.DocStatus;
                createdAt: Date;
                updatedAt: Date;
                docType: import(".prisma/client").$Enums.DocType;
                fileUrl: string;
                reviewNote: string | null;
            }[];
            vehicle: {
                id: string;
                driverId: string;
                createdAt: Date;
                vehicleType: import(".prisma/client").$Enums.VehicleType;
                make: string | null;
                model: string | null;
                color: string | null;
                year: number | null;
                plateNumber: string | null;
            };
        } & {
            id: string;
            city: import(".prisma/client").$Enums.City;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        })[];
    }>;
    waiveCommitment(tripId: string, user: any, body: {
        reason?: string;
    }): Promise<{
        ok: boolean;
        trip: {
            id: string;
            serviceType: import(".prisma/client").$Enums.ServiceType;
            city: import(".prisma/client").$Enums.City;
            riderId: string;
            driverId: string | null;
            status: import(".prisma/client").$Enums.TripStatus;
            cancelledBy: import(".prisma/client").$Enums.CancelledBy | null;
            cancelReason: string | null;
            pickupAddress: string;
            pickupLat: number;
            pickupLng: number;
            dropoffAddress: string;
            dropoffLat: number;
            dropoffLng: number;
            distanceKmEst: number | null;
            durationMinEst: number | null;
            requestedAt: Date;
            matchedAt: Date | null;
            acceptedAt: Date | null;
            arrivedAt: Date | null;
            startedAt: Date | null;
            completedAt: Date | null;
            cancelledAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            paymentMode: import(".prisma/client").$Enums.PaymentMode;
            commitmentStatus: import(".prisma/client").$Enums.CommitmentStatus;
            commitmentAmount: number | null;
            commitmentWaivedAt: Date | null;
            commitmentWaivedBy: string | null;
            commitmentReason: string | null;
        };
    }>;
    approveDriver(driverId: string, user: any): Promise<{
        ok: boolean;
        driver: {
            id: string;
            city: import(".prisma/client").$Enums.City;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
    rejectDriver(driverId: string, body: any, user: any): Promise<{
        ok: boolean;
        driver: {
            id: string;
            city: import(".prisma/client").$Enums.City;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
    suspendDriver(driverId: string, body: any, user: any): Promise<{
        ok: boolean;
        driver: {
            id: string;
            city: import(".prisma/client").$Enums.City;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
    unsuspendDriver(driverId: string, user: any): Promise<{
        ok: boolean;
        driver: {
            id: string;
            city: import(".prisma/client").$Enums.City;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
}
