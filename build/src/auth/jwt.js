"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EXPIRES_IN = void 0;
exports.signJwt = signJwt;
exports.verifyJwt = verifyJwt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret_change_me";
exports.DEFAULT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d");
function signJwt(payload, expiresIn = exports.DEFAULT_EXPIRES_IN) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn });
}
function verifyJwt(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
//# sourceMappingURL=jwt.js.map