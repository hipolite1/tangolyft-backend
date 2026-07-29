export function normalizePhone(input: string): string {
  const raw = String(input || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/[()]/g, "");

  if (!raw) return "";

  const cleaned = raw.replace(/^\+/, "");

  if (cleaned.startsWith("234")) {
    return cleaned;
  }

  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `234${cleaned.slice(1)}`;
  }

  if (cleaned.length === 10 && /^[789]/.test(cleaned)) {
    return `234${cleaned}`;
  }

  return cleaned;
}
