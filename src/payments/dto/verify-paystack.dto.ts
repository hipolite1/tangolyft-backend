import { IsString, MinLength } from "class-validator";

export class VerifyPaystackDto {
  @IsString()
  @MinLength(5)
  reference!: string;
}
