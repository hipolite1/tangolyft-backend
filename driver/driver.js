const API_BASE = "http://127.0.0.1:3000";

const applyForm = document.getElementById("applyForm");
const message = document.getElementById("message");

function showMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text || "";
  message.className = type || "";
}

function setDriverAvailabilityUi(availability) {
  if (!driverStatus) return;

  const status = availability || "OFFLINE";
  driverStatus.innerText = status;

  if (goOnlineBtn && goOfflineBtn) {
    if (status === "ONLINE") {
      goOnlineBtn.style.display = "none";
      goOfflineBtn.style.display = "block";
    } else {
      goOnlineBtn.style.display = "block";
      goOfflineBtn.style.display = "none";
    }
  }
}

applyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const city = document.getElementById("city").value.trim();
  const vehicleType = document.getElementById("vehicleType").value;

  try {
    showMessage("Submitting application...", "success");

    const res = await fetch(`${API_BASE}/driver/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fullName,
        phone,
        email,
        city,
        vehicleType,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Application failed");
    }

    showMessage("Application submitted successfully!", "success");
    applyForm.reset();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Something went wrong", "error");
  }
});

const requestOtpBtn = document.getElementById("requestOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

requestOtpBtn?.addEventListener("click", async () => {
  const phone = document.getElementById("phone").value.trim();

  try {
    showMessage("Requesting OTP...", "success");

    const res = await fetch(`${API_BASE}/auth/request-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to request OTP");
    }

    showMessage("OTP sent successfully!", "success");
  } catch (err) {
    console.error(err);
    showMessage(err.message || "OTP request failed", "error");
  }
});

verifyOtpBtn?.addEventListener("click", async () => {
  const phone = document.getElementById("phone").value.trim();
  const otp = document.getElementById("otp").value.trim();

  try {
    showMessage("Verifying OTP...", "success");

    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "OTP verification failed");
    }

    localStorage.setItem("driverToken", data.token);

    showMessage("Login successful!", "success");

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 1000);
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Login failed", "error");
  }
});

const goOnlineBtn = document.getElementById("goOnlineBtn");
const goOfflineBtn = document.getElementById("goOfflineBtn");
const driverStatus = document.getElementById("driverStatus");

async function driverPost(path) {
  const token = localStorage.getItem("driverToken");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

goOnlineBtn?.addEventListener("click", async () => {
  try {
    const data = await driverPost("/driver/go-online");

    setDriverAvailabilityUi(data.driver.availability);
    showMessage("You are now ONLINE", "success");

    await updateDriverLocation();
    await loadDriverInbox();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to go online", "error");
  }
});

goOfflineBtn?.addEventListener("click", async () => {
  try {
    const data = await driverPost("/driver/go-offline");

    setDriverAvailabilityUi(data.driver.availability);
    showMessage("You are now OFFLINE", "success");

    const tripCard = document.getElementById("tripCard");
    if (tripCard) {
      tripCard.innerHTML = `<p>No active trip assigned.</p>`;
    }
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to go offline", "error");
  }
});

async function loadDriverInbox() {
  const token = localStorage.getItem("driverToken");

  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/trips/inbox`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    const tripCard = document.getElementById("tripCard");

    if (!tripCard) return;

    if (data.driver?.availability) {
      setDriverAvailabilityUi(data.driver.availability);
    }

    if (message && res.ok && data.ok) {
      message.textContent = "";
      message.className = "";
    }

    if (!res.ok || !data.ok) {
      tripCard.innerHTML = `
        <p>${data.message || "Failed to load assigned trip."}</p>
      `;
      return;
    }

    const trips = data.trips || [];

    if (!trips.length) {
      tripCard.innerHTML = `
        <p>No active trip assigned.</p>
      `;
      return;
    }

    const trip = trips[0];

    let actionButtons = "";

    if (trip.status === "REQUESTED") {
      actionButtons = `
        <button onclick="acceptTrip('${trip.id}')" class="btn-primary">
          Accept Trip
        </button>
      `;
    }

    if (trip.status === "ACCEPTED") {
      actionButtons = `
        <button onclick="startTrip('${trip.id}')" class="btn-primary">
          Start Trip
        </button>
      `;
    }

    if (trip.status === "STARTED") {
      actionButtons = `
        <button onclick="completeTrip('${trip.id}')" class="btn-primary" style="background:green;">
          Complete Trip
        </button>
      `;
    }

    if (trip.status === "COMPLETED") {
      actionButtons = `
        <p class="success">Trip completed successfully.</p>
      `;
    }

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

    tripCard.innerHTML = `
      <div class="trip-box">
        <p><strong>Trip ID:</strong> ${trip.id}</p>
        <p><strong>Rider:</strong> ${trip.rider?.phone || trip.riderPhone || "-"}</p>
        <p><strong>City:</strong> ${trip.city}</p>
        <p><strong>Service:</strong> ${
  trip.serviceType === "BIKE_DELIVERY"
    ? "Bike Delivery"
    : trip.serviceType === "CAR_RIDE"
      ? "Car Ride"
      : trip.serviceType || "-"
}</p>
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

        ${deliveryDetails}

        ${actionButtons}
      </div>
    `;
  } catch (err) {
    console.error(err);

    const tripCard = document.getElementById("tripCard");
    if (tripCard) {
      tripCard.innerHTML = `<p>Failed to load assigned trip.</p>`;
    }
  }
}

async function tripAction(path, successMessage) {
  const token = localStorage.getItem("driverToken");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Trip action failed");
  }

  showMessage(successMessage, "success");
  await loadDriverInbox();
}

async function acceptTrip(tripId) {
  try {
    await tripAction(`/trips/${tripId}/accept`, "Trip accepted");
  } catch (err) {
    console.error(err);
    showMessage(err.message, "error");
  }
}

async function startTrip(tripId) {
  try {
    await tripAction(`/trips/${tripId}/start`, "Trip started");
  } catch (err) {
    console.error(err);
    showMessage(err.message, "error");
  }
}

async function completeTrip(tripId) {
  try {
    await tripAction(`/trips/${tripId}/complete`, "Trip completed");
  } catch (err) {
    console.error(err);
    showMessage(err.message, "error");
  }
}

async function updateDriverLocation() {
  const token = localStorage.getItem("driverToken");

  if (!token) return;

  const res = await fetch(`${API_BASE}/driver/location`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lat: 9.0765,
      lng: 7.3986,
      heading: 0,
      accuracyM: 10,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to update driver location");
  }

  return data;
}

async function initDriverDashboard() {
  try {
    setDriverAvailabilityUi("OFFLINE");

    await updateDriverLocation();
    await loadDriverInbox();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to load dashboard", "error");
  }
}

initDriverDashboard();