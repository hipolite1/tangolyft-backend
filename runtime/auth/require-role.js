"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES_KEY = void 0;
exports.RequireRole = RequireRole;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("./auth.guard");
const roles_guard_1 = require("./roles.guard");
exports.ROLES_KEY = "roles";
function RequireRole(...roles) {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(exports.ROLES_KEY, roles), (0, common_1.UseGuards)(auth_guard_1.AuthGuard, roles_guard_1.RolesGuard));
}
//# sourceMappingURL=require-role.js.map