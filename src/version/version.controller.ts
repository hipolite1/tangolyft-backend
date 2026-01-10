import { Controller, Get } from "@nestjs/common";
import { VersionService } from "./version.service";

@Controller("version")
export class VersionController {
  constructor(private readonly version: VersionService) {}

  @Get()
  getVersion() {
    return this.version.getVersion();
  }
}

