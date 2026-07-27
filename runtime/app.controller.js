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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
let AppController = class AppController {
    home(res) {
        res.type("html").send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TangoLyft App</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f3f6fb;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: #ffffff;
      width: 100%;
      max-width: 640px;
      padding: 42px;
      border-radius: 24px;
      box-shadow: 0 20px 55px rgba(15, 23, 42, 0.12);
      text-align: center;
    }

    h1 {
      font-size: 48px;
      margin: 0 0 12px;
    }

    p {
      color: #64748b;
      font-size: 20px;
      line-height: 1.5;
      margin-bottom: 30px;
    }

    .buttons {
      display: grid;
      gap: 14px;
    }

    a {
      display: block;
      text-decoration: none;
      padding: 18px 20px;
      border-radius: 14px;
      font-size: 20px;
      font-weight: 800;
      background: #3264f5;
      color: #ffffff;
    }

    a.secondary {
      background: #0f172a;
    }

    a.admin {
      background: #16a34a;
    }

    .note {
      margin-top: 26px;
      font-size: 14px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>TangoLyft</h1>
    <p>Choose your portal to continue.</p>

    <div class="buttons">
      <a href="/rider/login.html">Book a Ride</a>
      <a href="/driver/login.html" class="secondary">Driver Login</a>
      <a href="/admin/login.html" class="admin">Admin Login</a>
    </div>

    <div class="note">
      TangoLyft pilot app portal
    </div>
  </main>
</body>
</html>
    `);
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "home", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map