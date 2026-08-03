import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateRiderProfileDto } from "./dto/update-rider-profile.dto";

@Injectable()
export class RiderService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const rider = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: "RIDER",
      },
      select: {
        id: true,
        phone: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!rider) {
      throw new NotFoundException("Rider account not found.");
    }

    return {
      ok: true,
      profileComplete: Boolean(rider.fullName?.trim()),
      rider,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateRiderProfileDto,
  ) {
    const existingRider = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: "RIDER",
      },
      select: {
        id: true,
      },
    });

    if (!existingRider) {
      throw new NotFoundException("Rider account not found.");
    }

    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const fullName = `${firstName} ${lastName}`;

    const rider = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        fullName,
      },
      select: {
        id: true,
        phone: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ok: true,
      message: "Rider profile updated successfully.",
      profileComplete: true,
      rider,
    };
  }
}