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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
let PaymentsService = class PaymentsService {
    prisma;
    config;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    paystackKey() {
        return (this.config.get("PAYSTACK_SECRET_KEY") || "").trim();
    }
    generateReference(prefix = "TL") {
        return `${prefix}_${Date.now()}_${crypto_1.default.randomBytes(6).toString("hex")}`;
    }
    async initPaystackPayment(userId, tripId, amountOverride) {
        const trip = await this.prisma.trip.findUnique({
            where: { id: tripId },
            include: { fare: true, rider: true },
        });
        if (!trip)
            return { ok: false, message: "Trip not found" };
        if (trip.riderId !== userId) {
            return { ok: false, message: "You can only pay for your own trip" };
        }
        const amount = trip.fare?.totalAmount ?? amountOverride ?? null;
        if (!amount || amount <= 0) {
            return { ok: false, message: "Trip fare not set yet. Complete trip or pass amount." };
        }
        const key = this.paystackKey();
        if (!key)
            return { ok: false, message: "PAYSTACK_SECRET_KEY missing in .env" };
        const reference = this.generateReference("TL_PAY");
        const payment = await this.prisma.payment.upsert({
            where: { tripId },
            update: {
                amount,
                status: client_1.PaymentStatus.PENDING,
                provider: client_1.PaymentProvider.PAYSTACK,
                method: client_1.PaymentMethod.TRANSFER,
                reference,
                authorizationUrl: null,
            },
            create: {
                tripId,
                amount,
                status: client_1.PaymentStatus.PENDING,
                provider: client_1.PaymentProvider.PAYSTACK,
                method: client_1.PaymentMethod.TRANSFER,
                reference,
            },
        });
        const amountKobo = amount * 100;
        const callback_url = `${this.config.get("APP_BASE_URL") || "http://localhost:3000"}/payments/paystack/callback`;
        const payload = {
            email: trip.rider.email || "rider@tangolyft.com",
            amount: amountKobo,
            reference: payment.reference,
            callback_url,
            metadata: {
                tripId,
                riderId: trip.riderId,
                city: trip.city,
                serviceType: trip.serviceType,
            },
        };
        const res = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.status) {
            return { ok: false, message: "Paystack init failed", paystack: json };
        }
        const authUrl = json.data.authorization_url;
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: { authorizationUrl: authUrl },
        });
        return { ok: true, authorizationUrl: authUrl, reference: payment.reference, amount };
    }
    async verifyPaystack(reference) {
        const key = this.paystackKey();
        if (!key)
            return { ok: false, message: "PAYSTACK_SECRET_KEY missing in .env" };
        const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${key}` },
        });
        const json = await res.json();
        if (!res.ok || !json.status) {
            return { ok: false, message: "Paystack verify failed", paystack: json };
        }
        const status = json.data.status;
        const payment = await this.prisma.payment.findUnique({ where: { reference } });
        if (!payment)
            return { ok: false, message: "Payment not found in DB" };
        if (status === "success") {
            const updated = await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: client_1.PaymentStatus.PAID, verifiedAt: new Date() },
            });
            return { ok: true, paid: true, payment: updated };
        }
        return { ok: true, paid: false, status, paystack: json.data };
    }
    verifyWebhookSignature(rawBody, signature) {
        const secret = (this.config.get("PAYSTACK_WEBHOOK_SECRET") || this.paystackKey()).trim();
        if (!secret)
            return false;
        const hash = crypto_1.default.createHmac("sha512", secret).update(rawBody).digest("hex");
        return hash === signature;
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map