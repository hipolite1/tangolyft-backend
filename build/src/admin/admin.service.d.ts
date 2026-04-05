import { PrismaService } from "../prisma/prisma.service";
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    pendingDrivers(): Promise<{
        ok: boolean;
        drivers: ({
            user: {
                role: import(".prisma/client").$Enums.Role;
                id: string;
                phone: string;
                status: import(".prisma/client").$Enums.UserStatus;
                fullName: string | null;
                email: string | null;
                createdAt: Date;
                updatedAt: Date;
                isMerchant: boolean;
                merchantTrusted: boolean;
            };
            vehicle: {
                year: number | null;
                id: string;
                createdAt: Date;
                driverId: string;
                vehicleType: import(".prisma/client").$Enums.VehicleType;
                make: string | null;
                model: string | null;
                color: string | null;
                plateNumber: string | null;
            };
            documents: {
                id: string;
                status: import(".prisma/client").$Enums.DocStatus;
                createdAt: Date;
                updatedAt: Date;
                docType: import(".prisma/client").$Enums.DocType;
                fileUrl: string;
                reviewNote: string | null;
                driverId: string;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            city: import(".prisma/client").$Enums.City;
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
            status: import(".prisma/client").$Enums.TripStatus;
            createdAt: Date;
            updatedAt: Date;
            city: import(".prisma/client").$Enums.City;
            driverId: string | null;
            serviceType: import(".prisma/client").$Enums.ServiceType;
            riderId: string;
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
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            city: import(".prisma/client").$Enums.City;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
    rejectDriver(driverId: string, body: any, user: any): Promise<{
        ok: boolean;
        driver: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            city: import(".prisma/client").$Enums.City;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
    suspendDriver(driverId: string, body: any, user: any): Promise<{
        ok: boolean;
        driver: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            city: import(".prisma/client").$Enums.City;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
    unsuspendDriver(driverId: string, user: any): Promise<{
        ok: boolean;
        driver: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            driverType: import(".prisma/client").$Enums.DriverType;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
            availability: import(".prisma/client").$Enums.Availability;
            isBusy: boolean;
            city: import(".prisma/client").$Enums.City;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            kycNote: string | null;
        };
    }>;
}
