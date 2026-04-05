import { ServiceType } from "@prisma/client";
export declare class RequestTripDto {
    serviceType: ServiceType;
    city?: string;
    pickupAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    distanceKmEst?: number;
    durationMinEst?: number;
    itemDescription?: string;
    recipientName?: string;
    recipientPhone?: string;
    noteToCourier?: string;
}
export declare class RequestTripDto {
}
