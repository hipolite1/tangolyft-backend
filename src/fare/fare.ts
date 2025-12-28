import { FarePolicy } from "@prisma/client";

export function computeFare(policy: FarePolicy, distanceKm: number, durationMin: number) {
  const base = policy.baseFare;
  const booking = policy.bookingFee;
  const dist = Math.max(0, distanceKm) * policy.perKmFare;
  const dur = Math.max(0, durationMin) * policy.perMinFare;

  const total = Math.round(base + booking + dist + dur);

  // 20/80 split (store for audit)
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
