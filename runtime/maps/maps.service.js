"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapsService = void 0;
const common_1 = require("@nestjs/common");
let MapsService = class MapsService {
    constructor() {
        this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";
    }
    async geocode(input) {
        const rawAddress = String(input.address || "").trim();
        const city = String(input.city || "Abuja").trim();
        if (!rawAddress) {
            return { ok: false, message: "Address or landmark is required" };
        }
        if (!this.googleMapsApiKey) {
            return {
                ok: false,
                message: "Missing GOOGLE_MAPS_API_KEY",
            };
        }
        const addressForSearch = rawAddress.toLowerCase().includes("nigeria") ||
            rawAddress.toLowerCase().includes("abuja")
            ? rawAddress
            : `${rawAddress}, ${city}, Nigeria`;
        const url = "https://maps.googleapis.com/maps/api/geocode/json" +
            `?address=${encodeURIComponent(addressForSearch)}` +
            "&region=ng" +
            `&key=${encodeURIComponent(this.googleMapsApiKey)}`;
        const resp = await fetch(url);
        const data = await resp.json().catch(() => null);
        if (!resp.ok || !data) {
            return {
                ok: false,
                message: "Geocoding request failed",
                details: { status: resp.status },
            };
        }
        if (data.status !== "OK" || !data.results?.length) {
            return {
                ok: false,
                message: "Could not find this location. Try adding a clearer Abuja landmark.",
                googleStatus: data.status,
                googleError: data.error_message,
            };
        }
        const result = data.results[0];
        const location = result.geometry?.location;
        if (!location?.lat || !location?.lng) {
            return {
                ok: false,
                message: "Location coordinates were not returned.",
            };
        }
        return {
            ok: true,
            address: result.formatted_address,
            lat: location.lat,
            lng: location.lng,
            placeId: result.place_id,
        };
    }
};
exports.MapsService = MapsService;
exports.MapsService = MapsService = __decorate([
    (0, common_1.Injectable)()
], MapsService);
//# sourceMappingURL=maps.service.js.map