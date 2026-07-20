const API_BASE = window.location.origin;

const message = document.getElementById("message");
const phoneInput = document.getElementById("phone");
const otpInput = document.getElementById("otp");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpSection = document.getElementById("otpSection");

function showMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text;
  message.className = type;
}

function normalizePhone(phone) {
  return String(phone || "").trim().replace(/\s+/g, "");
}

sendOtpBtn?.addEventListener("click", async () => {
  const phone = normalizePhone(phoneInput.value);

  if (!phone) {
    showMessage("Phone number is required.", "error");
    return;
  }

  try {
    sendOtpBtn.disabled = true;
    showMessage("Sending OTP...", "success");

    localStorage.removeItem("riderToken");
    localStorage.removeItem("lastRiderTripId");
    localStorage.removeItem("lastPaystackReference");

    const res = await fetch(`${API_BASE}/auth/request-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to send OTP");
    }

    localStorage.setItem("riderPhone", phone);

    otpSection.style.display = "block";

    const debugOtp = data.otp || data.debugOtp || data.debugOtpRaw;
    if (debugOtp && debugOtp !== "true") {
      showMessage(`OTP sent. Test OTP: ${debugOtp}`, "success");
    } else {
      showMessage("OTP sent. Check your phone or Render logs for the test OTP.", "success");
    }
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to send OTP.", "error");
  } finally {
    sendOtpBtn.disabled = false;
  }
});

verifyOtpBtn?.addEventListener("click", async () => {
  const phone = normalizePhone(phoneInput.value || localStorage.getItem("riderPhone"));
  const otp = String(otpInput.value || "").trim();

  if (!phone) {
    showMessage("Phone number is required.", "error");
    return;
  }

  if (!otp) {
    showMessage("OTP is required.", "error");
    return;
  }

  try {
    verifyOtpBtn.disabled = true;
    showMessage("Verifying OTP...", "success");

    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok || !data.token) {
      throw new Error(data.message || "OTP verification failed");
    }

    localStorage.setItem("riderToken", data.token);
    localStorage.setItem("riderPhone", phone);
    localStorage.removeItem("lastRiderTripId");
    localStorage.removeItem("lastPaystackReference");

    showMessage("Login successful. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "./request.html";
    }, 700);
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to verify OTP.", "error");
  } finally {
    verifyOtpBtn.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const savedPhone = localStorage.getItem("riderPhone");

  if (phoneInput && savedPhone && !phoneInput.value) {
    phoneInput.value = savedPhone;
  }
});
