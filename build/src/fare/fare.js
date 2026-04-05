"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFare = computeFare;
function computeFare(policy, distanceKm, durationMin) {
    const base = policy.baseFare;
    const booking = policy.bookingFee;
    const dist = Math.max(0, distanceKm) * policy.perKmFare;
    const dur = Math.max(0, durationMin) * policy.perMinFare;
    const total = Math.round(base + booking + dist + dur);
    const driverEarning = Math.floor(total * 0.8);
    const platformEarning = total - driverEarning;
    return {
        currency: policy.currency,
        baseFare: policy.baseFare,
        perKmFare: policy.perKmFare,
        perMinFare: policy.perMinFare,
        bookingFee: policy.bookingFee,
        discount: 0,
        totalAmount: total,
        driverEarning,
        platformEarning,
    };
}
//# sourceMappingURL=fare.js.map