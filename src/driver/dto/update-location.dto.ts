import { IsLatitude, IsLongitude, IsInt, IsOptional, IsNumber } from 'class-validator';

export class UpdateLocationDto {
  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsOptional()
  @IsInt()
  heading?: number;

  @IsOptional()
  @IsNumber()
  accuracyM?: number;
}