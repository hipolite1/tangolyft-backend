"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionService = void 0;
const common_1 = require("@nestjs/common");
let VersionService = class VersionService {
    getVersion() {
        const commit = process.env.RENDER_GIT_COMMIT ||
            process.env.COMMIT_SHA ||
            process.env.GIT_COMMIT ||
            "unknown";
        return {
            ok: true,
            service: "tangolyft-backend",
            commit,
            ts: new Date().toISOString(),
        };
    }
};
exports.VersionService = VersionService;
exports.VersionService = VersionService = __decorate([
    (0, common_1.Injectable)()
], VersionService);
//# sourceMappingURL=version.service.js.map