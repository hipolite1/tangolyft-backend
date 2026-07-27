import { Injectable } from "@nestjs/common";

@Injectable()
export class MapsService {
  private googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";

  async geocode(input: { address: string; city?: string }) {
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

    const addressForSearch =
      rawAddress.toLowerCase().includes("nigeria") ||
      rawAddress.toLowerCase().includes("abuja")
        ? rawAddress
        : `${rawAddress}, ${city}, Nigeria`;

    const url =
      "https://maps.googleapis.com/maps/api/geocode/json" +
      `?address=${encodeURIComponent(addressForSearch)}` +
      "&region=ng" +
      `&key=${encodeURIComponent(this.googleMapsApiKey)}`;

    const resp = await fetch(url);
    const data: any = await resp.json().catch(() => null);

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
}
