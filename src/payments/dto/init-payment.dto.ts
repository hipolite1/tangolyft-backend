import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class InitPaymentDto {
  @IsString()
  tripId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;
}
