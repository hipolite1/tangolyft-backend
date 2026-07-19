const API_BASE = "https://tangolyft-backend.onrender.com";

const message = document.getElementById("message");
const requestTripBtn = document.getElementById("requestTripBtn");
const serviceTypeSelect = document.getElementById("serviceType");
const paymentModeSelect = document.getElementById("paymentMode");
const bikeDeliveryFields = document.getElementById("bikeDeliveryFields");

const checkStatusBtn = document.getElementById("checkStatusBtn");
const tripStatusCard = document.getElementById("tripStatusCard");

function showMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text;
  message.className = type;
}

function getRiderToken() {
  return localStorage.getItem("riderToken");
}

function formatTripDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function formatNaira(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `₦${value}`;
}

function toggleBikeDeliveryFields() {
  if (!serviceTypeSelect || !bikeDeliveryFields) return;

  if (serviceTypeSelect.value === "BIKE_DELIVERY") {
    bikeDeliveryFields.style.display = "block";

    if (requestTripBtn) {
      requestTripBtn.textContent = "Request Delivery";
    }
  } else {
    bikeDeliveryFields.style.display = "none";

    if (requestTripBtn) {
      requestTripBtn.textContent = "Request Ride";
    }
  }
}

serviceTypeSelect?.addEventListener("change", toggleBikeDeliveryFields);
toggleBikeDeliveryFields();

requestTripBtn?.addEventListener("click", async () => {
  const phone = document.getElementById("phone").value.trim();
  const pickupAddress = document.getElementById("pickupAddress").value.trim();
  const dropoffAddress = document.getElementById("dropoffAddress").value.trim();
  const city = document.getElementById("city").value;
  const serviceType = document.getElementById("serviceType").value;
  const paymentMode = paymentModeSelect?.value || "PAY_ON_DROPOFF";

  const itemDescription = document.getElementById("itemDescription")?.value.trim();
  const recipientName = document.getElementById("recipientName")?.value.trim();
  const recipientPhone = document.getElementById("recipientPhone")?.value.trim();
  const noteToCourier = document.getElementById("noteToCourier")?.value.trim();

  if (!phone || !pickupAddress || !dropoffAddress) {
    showMessage("Phone, pickup and dropoff are required.", "error");
    return;
  }

  if (serviceType === "BIKE_DELIVERY") {
    if (!itemDescription || !recipientName || !recipientPhone) {
      showMessage(
        "For Bike Delivery, item description, recipient name, and recipient phone are required.",
        "error",
      );
      return;
    }
  }

  const token = getRiderToken();

  if (!token) {
    showMessage("Rider login token is missing. Please login again before requesting a trip.", "error");
    return;
  }

  try {
    requestTripBtn.disabled = true;
    requestTripBtn.textContent = "Creating...";
    showMessage("Creating trip request...", "success");

    const res = await fetch(`${API_BASE}/trips/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone,
        city,
        serviceType,
        paymentMode,
        pickupAddress,
        dropoffAddress,

        pickupLat: 9.0765,
        pickupLng: 7.3986,
        dropoffLat: 9.0579,
        dropoffLng: 7.4951,

        distanceKmEst: 8,
        durationMinEst: 20,

        ...(serviceType === "BIKE_DELIVERY"
          ? {
              itemDescription,
              recipientName,
              recipientPhone,
              noteToCourier,
            }
          : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to create trip");
    }

    localStorage.setItem("lastRiderTripId", data.trip.id);
    localStorage.setItem("riderPhone", phone);

    requestTripBtn.textContent = "Trip Requested ✓";

    if (data.trip.paymentMode === "PREPAID") {
      showMessage(
        `Trip requested successfully. Trip ID: ${data.trip.id}. Go to trip status and click Pay Now to complete payment.`,
        "success",
      );
    } else {
      showMessage(
        `Trip requested successfully. Trip ID: ${data.trip.id}. You can now check your trip status using your phone number.`,
        "success",
      );
    }

    message?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    setTimeout(() => {
      requestTripBtn.textContent =
        data.trip.serviceType === "BIKE_DELIVERY" ? "Request Delivery" : "Request Ride";
    }, 5000);
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Something went wrong", "error");

    requestTripBtn.textContent =
      serviceType === "BIKE_DELIVERY" ? "Request Delivery" : "Request Ride";
  } finally {
    requestTripBtn.disabled = false;
  }
});

async function startPaystackPayment(tripId) {
  const token = getRiderToken();

  if (!token) {
    showMessage("Rider login token is missing. Please login again before paying.", "error");
    return;
  }

  try {
    showMessage("Starting Paystack payment...", "success");

    const res = await fetch(`${API_BASE}/payments/paystack/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tripId }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to start payment");
    }

    localStorage.setItem("lastPaystackReference", data.reference);
    localStorage.setItem("lastRiderTripId", tripId);

    if (!data.authorizationUrl) {
      throw new Error("Paystack checkout link missing");
    }

    window.location.href = data.authorizationUrl;
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to start payment.", "error");
  }
}

async function verifyLastPaystackPayment() {
  const token = getRiderToken();
  const reference = localStorage.getItem("lastPaystackReference");

  if (!token) {
    showMessage("Rider login token is missing. Please login again before verifying payment.", "error");
    return;
  }

  if (!reference) {
    showMessage("No Paystack reference found to verify.", "error");
    return;
  }

  try {
    showMessage("Verifying payment...", "success");

    const res = await fetch(`${API_BASE}/payments/paystack/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reference }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Payment verification failed");
    }

    showMessage(data.message || "Payment verified successfully.", "success");

if (data.status === "PAID" || data.payment?.status === "PAID") {
  localStorage.removeItem("lastPaystackReference");
}

const phoneInput = document.getElementById("statusPhone");
if (phoneInput?.value) {
  await loadTripStatus(phoneInput.value.trim());
}
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to verify payment.", "error");
  }
}

function renderTripStatus(trip) {
  if (!tripStatusCard) return;

  let deliveryDetails = "";

  if (trip.serviceType === "BIKE_DELIVERY" && trip.delivery) {
    deliveryDetails = `
      <hr style="margin:18px 0;" />
      <p><strong>Item:</strong> ${trip.delivery.itemDescription || "-"}</p>
      <p><strong>Recipient:</strong> ${trip.delivery.recipientName || "-"}</p>
      <p><strong>Recipient Phone:</strong> ${trip.delivery.recipientPhone || "-"}</p>
      <p><strong>Courier Note:</strong> ${trip.delivery.noteToCourier || "-"}</p>
    `;
  }

  const paymentStatus = trip.payment?.status || "Not paid yet";
  const showPayNow =
    trip.paymentMode === "PREPAID" && trip.payment?.status !== "PAID";

  const showVerifyButton =
    trip.paymentMode === "PREPAID" &&
    trip.payment?.status !== "PAID" &&
    localStorage.getItem("lastPaystackReference");

  tripStatusCard.innerHTML = `
    <div class="trip-box">
      <p><strong>Trip ID:</strong> ${trip.id}</p>
      <p><strong>Status:</strong> ${
        trip.status === "REQUESTED"
          ? "Waiting for Driver"
          : trip.status === "ACCEPTED"
            ? "Driver Assigned"
            : trip.status === "STARTED"
              ? "Trip In Progress"
              : trip.status === "COMPLETED"
                ? "Trip Completed"
                : trip.status === "CANCELLED"
                  ? "Trip Cancelled"
                  : trip.status || "-"
      }</p>

      <p><strong>Service:</strong> ${trip.serviceType}</p>
      <p><strong>Pickup:</strong> ${trip.pickupAddress || "-"}</p>
      <p><strong>Dropoff:</strong> ${trip.dropoffAddress || "-"}</p>
      <p><strong>Driver:</strong> ${trip.driver?.user?.phone || "Not assigned yet"}</p>
      <p><strong>Fare:</strong> ${formatNaira(trip.fare?.totalAmount)}</p>
      <p><strong>Payment Mode:</strong> ${trip.paymentMode || "-"}</p>
      <p><strong>Payment Status:</strong> ${paymentStatus}</p>
      <p><strong>Payment Reference:</strong> ${trip.payment?.reference || "-"}</p>
      <p><strong>Commitment:</strong> ${trip.commitmentStatus || "-"}</p>

      ${
        showPayNow
          ? `<button class="btn-primary" id="payNowBtn" data-trip-id="${trip.id}" style="margin-top:12px;">Pay Now</button>`
          : ""
      }

      ${
        showVerifyButton
          ? `<button class="btn-primary" id="verifyPaymentBtn" style="margin-top:12px;">Verify Payment</button>`
          : ""
      }

      ${deliveryDetails}

      <hr style="margin:18px 0;" />
      <p><strong>Requested:</strong> ${formatTripDate(trip.requestedAt)}</p>
      <p><strong>Accepted:</strong> ${formatTripDate(trip.acceptedAt)}</p>
      <p><strong>Started:</strong> ${formatTripDate(trip.startedAt)}</p>
      <p><strong>Completed:</strong> ${formatTripDate(trip.completedAt)}</p>
    </div>
  `;

  const payNowBtn = document.getElementById("payNowBtn");
  payNowBtn?.addEventListener("click", async () => {
    const tripId = payNowBtn.getAttribute("data-trip-id");
    if (!tripId) {
      showMessage("Trip ID missing for payment.", "error");
      return;
    }

    payNowBtn.disabled = true;
    await startPaystackPayment(tripId);
    payNowBtn.disabled = false;
  });

  const verifyPaymentBtn = document.getElementById("verifyPaymentBtn");
  verifyPaymentBtn?.addEventListener("click", async () => {
    verifyPaymentBtn.disabled = true;
    await verifyLastPaystackPayment();
    verifyPaymentBtn.disabled = false;
  });
}

async function loadTripStatus(phone) {
  if (!tripStatusCard) return;

  const lastTripId = localStorage.getItem("lastRiderTripId");

  try {
    if (checkStatusBtn) checkStatusBtn.disabled = true;
    showMessage("Checking trip status...", "success");

    let data = null;

    if (lastTripId) {
      const exactRes = await fetch(`${API_BASE}/trips/status-by-id/${lastTripId}`);
      const exactData = await exactRes.json();

      if (exactRes.ok && exactData.ok && exactData.trip) {
        data = exactData;
      }
    }

    if (!data) {
      if (!phone) {
        showMessage("Phone number is required.", "error");
        return;
      }

      const res = await fetch(
        `${API_BASE}/trips/status/${encodeURIComponent(phone)}`,
      );

      data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Failed to check status");
      }
    }

    if (!data.trip) {
      tripStatusCard.innerHTML = `<p>No trip found.</p>`;
      showMessage("", "success");
      return;
    }

    renderTripStatus(data.trip);
    showMessage("Trip status loaded.", "success");
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to check trip status.", "error");
  } finally {
    if (checkStatusBtn) checkStatusBtn.disabled = false;
  }
}

checkStatusBtn?.addEventListener("click", async () => {
  const phone = document.getElementById("statusPhone").value.trim();
  await loadTripStatus(phone);
});

document.addEventListener("DOMContentLoaded", async () => {
  const phoneInput = document.getElementById("phone");
  const statusPhoneInput = document.getElementById("statusPhone");
  const savedPhone = localStorage.getItem("riderPhone");
  const lastReference = localStorage.getItem("lastPaystackReference");
  const lastTripId = localStorage.getItem("lastRiderTripId");

  if (phoneInput && savedPhone && !phoneInput.value) {
    phoneInput.value = savedPhone;
  }

  if (statusPhoneInput && savedPhone && !statusPhoneInput.value) {
    statusPhoneInput.value = savedPhone;
  }

  const isStatusPage = !!statusPhoneInput && !!tripStatusCard;

  if (!isStatusPage) return;

  if (lastReference && lastTripId) {
    showMessage("Checking payment confirmation...", "success");

    try {
      await verifyLastPaystackPayment();

      if (savedPhone) {
        await loadTripStatus(savedPhone);
      }
    } catch (err) {
      console.error(err);
      showMessage(
        "Payment return detected, but automatic verification failed. Please click Verify Payment.",
        "error",
      );
    }

    return;
  }

  if (savedPhone) {
    await loadTripStatus(savedPhone);
  }
});