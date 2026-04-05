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
exports.TripsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const require_role_1 = require("../auth/require-role");
const request_trip_dto_1 = require("./dto/request-trip.dto");
const trips_service_1 = require("./trips.service");
let TripsController = class TripsController {
    constructor(tripsService) {
        this.tripsService = tripsService;
    }
    requestTrip(user, dto) {
        return this.tripsService.requestTrip(user, dto);
    }
    inbox(user) {
        return this.tripsService.inbox(user);
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, require_role_1.RequireRole)("RIDER", "ADMIN"),
    (0, common_1.Post)("request"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, request_trip_dto_1.RequestTripDto]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "requestTrip", null);
__decorate([
    (0, require_role_1.RequireRole)("DRIVER", "ADMIN"),
    (0, common_1.Get)("inbox"),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "inbox", null);
exports.TripsController = TripsController = __decorate([
    (0, common_1.Controller)("trips"),
    __metadata("design:paramtypes", [trips_service_1.TripsService])
], TripsController);
//# sourceMappingURL=trips.controller.js.map