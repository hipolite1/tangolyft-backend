import { City, ServiceType } from "@prisma/client";
export declare class RequestTripDto {
    serviceType: ServiceType;
    city?: City;
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
