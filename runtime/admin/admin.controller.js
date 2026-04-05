"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const require_role_1 = require("../auth/require-role");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const admin_service_1 = require("./admin.service");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    async pendingDrivers() {
        return this.adminService.pendingDrivers();
    }
    async waiveCommitment(tripId, user, body) {
        return this.adminService.waiveCommitment(tripId, user, body);
    }
    async approve(driverId, user) {
        return this.adminService.approveDriver(driverId, user);
    }
    async reject(driverId, body, user) {
        return this.adminService.rejectDriver(driverId, body, user);
    }
    async suspend(driverId, body, user) {
        return this.adminService.suspendDriver(driverId, body, user);
    }
    async unsuspend(driverId, user) {
        return this.adminService.unsuspendDriver(driverId, user);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Get)("drivers/pending"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "pendingDrivers", null);
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Post)("trips/:tripId/waive-commitment"),
    __param(0, (0, common_1.Param)("tripId")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "waiveCommitment", null);
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Post)("drivers/:driverId/approve"),
    __param(0, (0, common_1.Param)("driverId")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approve", null);
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Post)("drivers/:driverId/reject"),
    __param(0, (0, common_1.Param)("driverId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "reject", null);
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Post)("drivers/:driverId/suspend"),
    __param(0, (0, common_1.Param)("driverId")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspend", null);
__decorate([
    (0, require_role_1.RequireRole)("ADMIN"),
    (0, common_1.Post)("drivers/:driverId/unsuspend"),
    __param(0, (0, common_1.Param)("driverId")),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "unsuspend", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)("admin"),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map