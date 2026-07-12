const API_BASE = "http://127.0.0.1:3000";

const message = document.getElementById("message");
const requestTripBtn = document.getElementById("requestTripBtn");
const serviceTypeSelect = document.getElementById("serviceType");
const bikeDeliveryFields = document.getElementById("bikeDeliveryFields");

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

function showMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text;
  message.className = type;
}

requestTripBtn?.addEventListener("click", async () => {
  const phone = document.getElementById("phone").value.trim();
  const pickupAddress = document.getElementById("pickupAddress").value.trim();
  const dropoffAddress = document.getElementById("dropoffAddress").value.trim();
  const city = document.getElementById("city").value;
  const serviceType = document.getElementById("serviceType").value;

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

  try {
    requestTripBtn.disabled = true;
    showMessage("Creating trip request...", "success");

    const res = await fetch(`${API_BASE}/trips/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        city,
        serviceType,
        pickupAddress,
        dropoffAddress,

        pickupLat: 9.0765,
        pickupLng: 7.3986,
        dropoffLat: 9.0579,
        dropoffLng: 7.4951,

        distanceKmEst: 8,
        durationMinEst: 20,

        itemDescription,
        recipientName,
        recipientPhone,
        noteToCourier,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to create trip");
    }

   showMessage(
  "Trip requested successfully! You can now check your trip status using your phone number.",
  "success",
); 
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Something went wrong", "error");
  } finally {
    requestTripBtn.disabled = false;
  }
});

const checkStatusBtn = document.getElementById("checkStatusBtn");
const tripStatusCard = document.getElementById("tripStatusCard");

function formatTripDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

checkStatusBtn?.addEventListener("click", async () => {
  const phone = document.getElementById("statusPhone").value.trim();

  if (!phone) {
    showMessage("Phone number is required.", "error");
    return;
  }

  try {
    checkStatusBtn.disabled = true;
    showMessage("Checking trip status...", "success");

    const res = await fetch(
      `${API_BASE}/trips/status/${encodeURIComponent(phone)}`,
    );
    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to check status");
    }

    if (!data.trip) {
      tripStatusCard.innerHTML = `<p>No trip found for this phone number.</p>`;
      showMessage("", "success");
      return;
    }

    const trip = data.trip;

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
    <p><strong>Fare:</strong> ₦${trip.fare?.totalAmount || "-"}</p>

    ${deliveryDetails}

    <hr style="margin:18px 0;" />
    <p><strong>Requested:</strong> ${formatTripDate(trip.requestedAt)}</p>
    <p><strong>Accepted:</strong> ${formatTripDate(trip.acceptedAt)}</p>
    <p><strong>Started:</strong> ${formatTripDate(trip.startedAt)}</p>
    <p><strong>Completed:</strong> ${formatTripDate(trip.completedAt)}</p>
  </div>
`;

    showMessage("Trip status loaded.", "success");
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to check trip status.", "error");
  } finally {
    checkStatusBtn.disabled = false;
  }
});