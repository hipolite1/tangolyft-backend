import { FarePolicy } from "@prisma/client";
export declare function computeFare(policy: FarePolicy, distanceKm: number, durationMin: number): {
    currency: "NGN";
    baseFare: number;
    perKmFare: number;
    perMinFare: number;
    bookingFee: number;
    discount: number;
    totalAmount: number;
    driverEarning: number;
    platformEarning: number;
};
