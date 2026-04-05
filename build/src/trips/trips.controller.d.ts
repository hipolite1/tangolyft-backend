import { PrismaService } from "../prisma/prisma.service";
export declare class DriverController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    apply(user: any, body: any): Promise<{
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
    addDoc(user: any, body: any): Promise<{
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
    goOnline(user: any): Promise<{
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
    goOffline(user: any): Promise<{
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
    updateLocation(user: any, body: any): Promise<{
        ok: boolean;
        message: string;
        location?: undefined;
    } | {
        ok: boolean;
        location: {
            lat: number;
            lng: number;
            heading: number | null;
            accuracyM: number | null;
            driverId: string;
            lastSeenAt: Date;
        };
        message?: undefined;
    }>;
}
