import { PrismaService } from "../prisma/prisma.service";
import { UpdateLocationDto } from "./dto/update-location.dto";
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
            driverId: string;
            status: import(".prisma/client").$Enums.DocStatus;
            createdAt: Date;
            updatedAt: Date;
            docType: import(".prisma/client").$Enums.DocType;
            fileUrl: string;
            reviewNote: string | null;
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
        message?: undefined;
    }>;
    updateLocation(user: any, body: UpdateLocationDto): Promise<{
        ok: boolean;
        message: string;
        location?: undefined;
    } | {
        ok: boolean;
        location: {
            driverId: string;
            lat: number;
            lng: number;
            heading: number | null;
            accuracyM: number | null;
            lastSeenAt: Date;
        };
        message?: undefined;
    }>;
}
