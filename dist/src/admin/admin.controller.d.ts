import { PrismaService } from "../prisma/prisma.service";
export declare class AdminController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    pendingDrivers(): Promise<{
        ok: boolean;
        drivers: ({
            user: {
                role: import("@prisma/client").$Enums.Role;
                id: string;
                phone: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.UserStatus;
                fullName: string | null;
                email: string | null;
                updatedAt: Date;
            };
            vehicle: {
                year: number | null;
                id: string;
                createdAt: Date;
                driverId: string;
                vehicleType: import("@prisma/client").$Enums.VehicleType;
                make: string | null;
                model: string | null;
                color: string | null;
                plateNumber: string | null;
            } | null;
            documents: {
                id: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.DocStatus;
                updatedAt: Date;
                docType: import("@prisma/client").$Enums.DocType;
                fileUrl: string;
                reviewNote: string | null;
                driverId: string;
            }[];
        } & {
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
        })[];
    }>;
    approve(driverId: string): Promise<{
        ok: boolean;
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
        };
    }>;
    reject(driverId: string, body: any): Promise<{
        ok: boolean;
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
        };
    }>;
}
