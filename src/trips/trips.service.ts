async complete(user: any, tripId: string) {
  const driverUserId = user.sub;

  // 1. Find driver
  const driver = await this.prisma.driver.findUnique({
    where: { userId: driverUserId },
  });
  if (!driver) throw new Error("Driver not found");

  // 2. Load trip
  const trip = await this.prisma.trip.findUnique({
    where: { id: tripId },
    include: { fare: true },
  });
  if (!trip) throw new Error("Trip not found");

  // 3. Validate ownership
  if (trip.driverId !== driver.id) {
    throw new Error("This trip is not assigned to this driver");
  }

  // 4. Must be STARTED
  if (trip.status !== "STARTED") {
    throw new Error("Trip must be STARTED before completing");
  }

  // 5. Prevent double-complete / double-credit
  if (trip.status === "COMPLETED") {
    return { ok: true, trip };
  }

  // 6. Get fare policy
  const policy = await this.prisma.farePolicy.findFirst({
    where: {
      city: trip.city,
      serviceType: trip.serviceType,
      isActive: true,
    },
  });
  if (!policy) throw new Error("Fare policy not found");

  // 7. Compute fallback distance/duration (MVP safe defaults)
  const distanceKm = trip.distanceKmEst ?? 2;
  const durationMin = trip.durationMinEst ?? 10;

  // 8. Compute fare
  const fareData = computeFare(policy, distanceKm, durationMin);

  // 9. Create fare ONLY if not already created
  let fare = trip.fare;
  if (!fare) {
    fare = await this.prisma.tripFare.create({
      data: {
        tripId: trip.id,
        currency: fareData.currency,
        baseFare: fareData.baseFare,
        perKmFare: fareData.perKmFare,
        perMinFare: fareData.perMinFare,
        bookingFee: fareData.bookingFee,
        discount: 0,
        totalAmount: fareData.totalAmount,
        platformEarning: fareData.platformEarning,
        driverEarning: fareData.driverEarning,
        distanceKm,
        durationMin,
      },
    });
  }

  // 10. Upsert driver wallet
  const wallet = await this.prisma.driverWallet.upsert({
    where: { driverId: driver.id },
    update: {},
    create: {
      driverId: driver.id,
      balance: 0,
    },
  });

  // 11. Prevent duplicate transaction
  const existingTx = await this.prisma.walletTransaction.findFirst({
    where: {
      driverId: driver.id,
      tripId: trip.id,
      reason: "TRIP_EARNING",
    },
  });

  if (!existingTx) {
    // credit wallet
    await this.prisma.driverWallet.update({
      where: { driverId: driver.id },
      data: {
        balance: { increment: fare.driverEarning },
      },
    });

    // insert transaction
    await this.prisma.walletTransaction.create({
      data: {
        driverId: driver.id,
        tripId: trip.id,
        type: "CREDIT",
        reason: "TRIP_EARNING",
        amount: fare.driverEarning,
        note: `Trip earning for ${trip.id} (platform=${fare.platformEarning})`,
      },
    });
  }

  // 12. Mark trip completed
  const updatedTrip = await this.prisma.trip.update({
    where: { id: trip.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
    include: {
      fare: true,
      driver: true,
      rider: true,
      delivery: true,
    },
  });

  return { ok: true, trip: updatedTrip };
}
