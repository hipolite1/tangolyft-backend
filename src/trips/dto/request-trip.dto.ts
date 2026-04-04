import { ServiceType } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
} from "class-validator";

export class RequestTripDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsString()
  pickupAddress: string;

  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;

  @IsString()
  dropoffAddress: string;

  @IsNumber()
  dropoffLat: number;

  @IsNumber()
  dropoffLng: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKmEst?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinEst?: number;

  @IsOptional()
  @IsString()
  itemDescription?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsPhoneNumber("NG")
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  noteToCourier?: string;
}
