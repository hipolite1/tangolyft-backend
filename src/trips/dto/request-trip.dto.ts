import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { City, ServiceType } from "@prisma/client";

export class RequestTripDto {
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @IsOptional()
  @IsEnum(City)
  city?: City;

  @IsString()
  @IsNotEmpty()
  pickupAddress!: string;

  @IsNumber()
  pickupLat!: number;

  @IsNumber()
  pickupLng!: number;

  @IsString()
  @IsNotEmpty()
  dropoffAddress!: string;

  @IsNumber()
  dropoffLat!: number;

  @IsNumber()
  dropoffLng!: number;

  // optional estimates (can be added later)
  @IsOptional()
  @IsNumber()
  distanceKmEst?: number;

  @IsOptional()
  @IsNumber()
  durationMinEst?: number;

  // Delivery-only fields (optional; used when serviceType is DELIVERY)
  @IsOptional()
  @IsString()
  itemDescription?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  noteToCourier?: string;
}
