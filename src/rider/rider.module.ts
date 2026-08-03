import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RiderController } from "./rider.controller";
import { RiderService } from "./rider.service";

@Module({
  controllers: [RiderController],
  providers: [RiderService, PrismaService],
  exports: [RiderService],
})
export class RiderModule {}