"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireRole = RequireRole;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("./auth.guard");
const roles_guard_1 = require("./roles.guard");
function RequireRole(...roles) {
    return (0, common_1.applyDecorators)((0, common_1.UseGuards)(auth_guard_1.AuthGuard, new roles_guard_1.RolesGuard(roles)));
}
//# sourceMappingURL=require-role.js.map