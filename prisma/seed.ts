import "dotenv/config";
import { PrismaClient, City, ServiceType, Currency } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // BIKE DELIVERY fare policy
  await prisma.farePolicy.upsert({
    where: {
      city_serviceType_isActive: {
        city: City.ABUJA,
        serviceType: ServiceType.BIKE_DELIVERY,
        isActive: true,
      },
    },
    update: {
      currency: Currency.NGN,
      baseFare: 300,
      perKmFare: 80,
      perMinFare: 20,
      bookingFee: 50,
    },
    create: {
      city: City.ABUJA,
      serviceType: ServiceType.BIKE_DELIVERY,
      currency: Currency.NGN,
      baseFare: 300,
      perKmFare: 80,
      perMinFare: 20,
      bookingFee: 50,
      isActive: true,
    },
  });

  // CAR RIDE fare policy
  await prisma.farePolicy.upsert({
    where: {
      city_serviceType_isActive: {
        city: City.ABUJA,
        serviceType: ServiceType.CAR_RIDE,
        isActive: true,
      },
    },
    update: {
      currency: Currency.NGN,
      baseFare: 500,
      perKmFare: 120,
      perMinFare: 30,
      bookingFee: 100,
    },
    create: {
      city: City.ABUJA,
      serviceType: ServiceType.CAR_RIDE,
      currency: Currency.NGN,
      baseFare: 500,
      perKmFare: 120,
      perMinFare: 30,
      bookingFee: 100,
      isActive: true,
    },
  });

  console.log("✅ FarePolicy seeded/updated successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
