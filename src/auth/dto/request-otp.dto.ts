import { IsPhoneNumber, IsString } from "class-validator";

export class RequestOtpDto {
  @IsString()
  @IsPhoneNumber("NG")
  phone!: string;
}
