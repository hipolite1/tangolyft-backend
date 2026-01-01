import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

@Post("request-otp")
async requestOtp(@Body() dto: RequestOtpDto) {
  return await this.auth.requestOtp(dto.phone);
}
  @Post("verify-otp")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.otp);
  }
}
