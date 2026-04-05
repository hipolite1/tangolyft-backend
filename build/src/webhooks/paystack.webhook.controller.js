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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackWebhookController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = __importDefault(require("crypto"));
let PaystackWebhookController = class PaystackWebhookController {
    constructor(prisma) {
        this.prisma = prisma;
        this.secret = process.env.PAYSTACK_SECRET_KEY || "";
    }
    verifySignature(rawBody, signature) {
        const hash = crypto_1.default.createHmac("sha512", this.secret).update(rawBody).digest("hex");
        return hash === signature;
    }
    async handle(req, sig) {
        if (!this.secret)
            return { ok: false, message: "Missing PAYSTACK_SECRET_KEY" };
        const rawBody = req.rawBody;
        if (!rawBody)
            return { ok: false, message: "Missing rawBody (check main.ts middleware)" };
        if (!sig || !this.verifySignature(rawBody, sig)) {
            return { ok: false, message: "Invalid signature" };
        }
        const event = req.body;
        const eventName = event?.event || "";
        const data = event?.data || {};
        const reference = data?.reference;
        const paidAt = data?.paid_at;
        const paystackEventId = event?.id || data?.id;
        const dedupeKey = paystackEventId ||
            crypto_1.default
                .createHash("sha256")
                .update(`${eventName}|${reference || ""}|${paidAt || ""}|${rawBody.toString("utf8")}`)
                .digest("hex");
        const webhook = await this.prisma.paystackWebhookEvent
            .create({
            data: {
                eventId: dedupeKey,
                reference: reference || null,
                eventType: this.mapEventType(eventName),
                payload: event,
            },
        })
            .catch(() => null);
        if (!webhook)
            return { ok: true, replay: true };
        if (!reference)
            return { ok: true, message: "No reference in event" };
        const payment = await this.prisma.payment.findUnique({ where: { reference } });
        if (!payment)
            return { ok: true, message: "Payment not found for reference" };
        await this.prisma.paystackWebhookEvent.update({
            where: { id: webhook.id },
            data: { paymentId: payment.id },
        });
        if (eventName === "charge.success") {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: client_1.PaymentStatus.PAID, verifiedAt: new Date() },
            });
            await this.prisma.trip
                .update({
                where: { id: payment.tripId },
                data: { commitmentStatus: "CONFIRMED" },
            })
                .catch(() => null);
            return { ok: true };
        }
        if (eventName === "charge.failed") {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: client_1.PaymentStatus.FAILED },
            });
            return { ok: true };
        }
        return { ok: true, ignored: true };
    }
    mapEventType(eventName) {
        switch (eventName) {
            case "charge.success":
                return client_1.PaystackEventType.CHARGE_SUCCESS;
            case "transfer.success":
                return client_1.PaystackEventType.TRANSFER_SUCCESS;
            case "transfer.failed":
                return client_1.PaystackEventType.TRANSFER_FAILED;
            default:
                return client_1.PaystackEventType.UNKNOWN;
        }
    }
};
exports.PaystackWebhookController = PaystackWebhookController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)("x-paystack-signature")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaystackWebhookController.prototype, "handle", null);
exports.PaystackWebhookController = PaystackWebhookController = __decorate([
    (0, common_1.Controller)("webhooks/paystack"),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaystackWebhookController);
//# sourceMappingURL=paystack.webhook.controller.js.map