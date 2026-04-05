import { PrismaService } from "../prisma/prisma.service";
export declare class DriverService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    apply(userId: string, body: any): Promise<{
        ok: boolean;
        message: string;
        driver?: undefined;
    } | {
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
        message?: undefined;
    }>;
    addDocument(userId: string, body: any): Promise<{
        ok: boolean;
        message: string;
        doc?: undefined;
    } | {
        ok: boolean;
        doc: {
            id: string;
            status: import(".prisma/client").$Enums.DocStatus;
            createdAt: Date;
            updatedAt: Date;
            docType: import(".prisma/client").$Enums.DocType;
            fileUrl: string;
            reviewNote: string | null;
            driverId: string;
        };
        message?: undefined;
    }>;
    goOnline(userId: string): Promise<{
        ok: boolean;
        message: string;
        driver?: undefined;
    } | {
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
        message?: undefined;
    }>;
    goOffline(userId: string): Promise<{
        ok: boolean;
        message: string;
        driver?: undefined;
    } | {
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
        message?: undefined;
    }>;
    getDriverByUserId(userId: string): Promise<{
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
    }>;
    setOnTrip(driverId: string): Promise<{
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
    }>;
    setOnline(driverId: string): Promise<{
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
    }>;
}
