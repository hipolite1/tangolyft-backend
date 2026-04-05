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
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = __importDefault(require("crypto"));
let PaymentsService = class PaymentsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.paystackBaseUrl = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";
        this.paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
    }
    assertConfig() {
        if (!this.paystackSecret)
            throw new Error("Missing PAYSTACK_SECRET_KEY");
    }
    toKobo(amountNgn) {
        return Math.round(amountNgn * 100);
    }
    makeReference() {
        return `TL_${Date.now()}_${crypto_1.default.randomBytes(6).toString("hex")}`;
    }
    fallbackEmailFromPhone(phone) {
        const clean = phone.replace(/[^0-9+]/g, "").replace("+", "");
        return `user_${clean}@tangolyft.app`;
    }
    async initializePaystack(input) {
        this.assertConfig();
        const trip = await this.prisma.trip.findUnique({
            where: { id: input.tripId },
            include: { rider: true, fare: true, payment: true },
        });
        if (!trip)
            return { ok: false, message: "Trip not found" };
        if (trip.riderId !== input.userId)
            return { ok: false, message: "Not your trip" };
        if (trip.status === client_1.TripStatus.CANCELLED || trip.status === client_1.TripStatus.COMPLETED) {
            return { ok: false, message: "Trip is not payable" };
        }
        if (trip.paymentMode === client_1.PaymentMode.PAY_ON_DROPOFF) {
            return { ok: false, message: "This trip is PAY_ON_DROPOFF. No online payment required." };
        }
        const fareNgn = trip.fare?.totalFareNgn ??
            trip.fare?.total ??
            trip.fare?.amount ??
            null;
        if (!fareNgn || Number(fareNgn) <= 0) {
            return { ok: false, message: "Fare not available for this trip" };
        }
        const amount = this.toKobo(Number(fareNgn));
        const email = trip.rider.email || this.fallbackEmailFromPhone(trip.rider.phone);
        if (trip.payment) {
            if (trip.payment.status === client_1.PaymentStatus.PAID) {
                return { ok: true, status: "PAID", reference: trip.payment.reference };
            }
            if (trip.payment.status === client_1.PaymentStatus.PENDING && trip.payment.authorizationUrl) {
                return {
                    ok: true,
                    status: "PENDING",
                    reference: trip.payment.reference,
                    authorizationUrl: trip.payment.authorizationUrl,
                    amount,
                    currency: trip.payment.currency,
                };
            }
        }
        const reference = trip.payment?.reference || this.makeReference();
        const resp = await fetch(`${this.paystackBaseUrl}/transaction/initialize`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.paystackSecret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                amount,
                reference,
                metadata: {
                    tripId: trip.id,
                    riderId: trip.riderId,
                    city: trip.city,
                    serviceType: trip.serviceType,
                },
            }),
        });
        const json = await resp.json().catch(() => null);
        if (!resp.ok || !json?.status) {
            return { ok: false, message: "Paystack initialize failed", details: json || { status: resp.status } };
        }
        const authorizationUrl = json.data?.authorization_url;
        if (!authorizationUrl) {
            return { ok: false, message: "Paystack did not return authorization_url", details: json };
        }
        const payment = await this.prisma.payment.upsert({
            where: { tripId: trip.id },
            create: {
                tripId: trip.id,
                provider: client_1.PaymentProvider.PAYSTACK,
                status: client_1.PaymentStatus.PENDING,
                amount,
                reference,
                authorizationUrl,
            },
            update: {
                status: client_1.PaymentStatus.PENDING,
                amount,
                reference,
                authorizationUrl,
                verifiedAt: null,
            },
        });
        return {
            ok: true,
            status: payment.status,
            reference: payment.reference,
            authorizationUrl: payment.authorizationUrl,
            amount: payment.amount,
            currency: payment.currency,
        };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map