const API_BASE = window.location.origin;

const applyForm = document.getElementById("applyForm");
const message = document.getElementById("message");

function showMessage(text, type = "success") {
  if (!message) return;
  message.textContent = text || "";
  message.className = type || "";
}

function formatNaira(value) {
  if (value === null || value === undefined || value === "") return "₦0";
  return `₦${Number(value).toLocaleString()}`;
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
const walletCard = document.getElementById("walletCard");
const walletTransactionsCard = document.getElementById("walletTransactionsCard");
const requestCashoutBtn = document.getElementById("requestCashoutBtn");
const cashoutAmountInput = document.getElementById("cashoutAmount");

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
    await loadDriverWallet();
    await loadWalletTransactions();
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
        <button class="btn-primary trip-action-btn" data-action="accept" data-trip-id="${trip.id}">
          Accept Trip
        </button>
      `;
    }

    if (trip.status === "ACCEPTED") {
      actionButtons = `
        <button class="btn-primary trip-action-btn" data-action="start" data-trip-id="${trip.id}">
          Start Trip
        </button>
      `;
    }

    if (trip.status === "STARTED") {
      actionButtons = `
        <button class="btn-primary trip-action-btn" data-action="complete" data-trip-id="${trip.id}" style="background:green;">
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
  await loadDriverWallet();
  await loadWalletTransactions();
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

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".trip-action-btn");

  if (!button) return;

  const tripId = button.dataset.tripId;
  const action = button.dataset.action;

  if (!tripId || !action) {
    showMessage("Missing trip action details.", "error");
    return;
  }

  button.disabled = true;

  try {
    if (action === "accept") {
      await acceptTrip(tripId);
      return;
    }

    if (action === "start") {
      await startTrip(tripId);
      return;
    }

    if (action === "complete") {
      await completeTrip(tripId);
      return;
    }

    showMessage("Unknown trip action.", "error");
  } finally {
    button.disabled = false;
  }
});

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

async function loadDriverWallet() {
  const token = localStorage.getItem("driverToken");

  if (!token || !walletCard) return;

  try {
    const res = await fetch(`${API_BASE}/wallet/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to load wallet");
    }

    const balance = data.wallet?.balance || 0;

    walletCard.innerHTML = `
      <p><strong>Driver ID:</strong> ${data.driverId || "-"}</p>
      <p><strong>Driver Type:</strong> ${data.driverType || "-"}</p>
      <p><strong>Wallet Balance:</strong> ${formatNaira(balance)}</p>
    `;
  } catch (err) {
    console.error(err);
    walletCard.innerHTML = `<p>Failed to load wallet.</p>`;
  }
}

async function loadWalletTransactions() {
  const token = localStorage.getItem("driverToken");

  if (!token || !walletTransactionsCard) return;

  try {
    const res = await fetch(`${API_BASE}/wallet/transactions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to load wallet transactions");
    }

    const txs = data.txs || [];

    if (!txs.length) {
      walletTransactionsCard.innerHTML = `<p>No wallet transactions yet.</p>`;
      return;
    }

    walletTransactionsCard.innerHTML = txs
      .slice(0, 8)
      .map((tx) => {
        const type = tx.type || "-";
        const amount = formatNaira(tx.amount);
        const tripId = tx.tripId || "-";
        const shortTripId =
          tripId && tripId !== "-" && tripId.length > 12
            ? `${tripId.slice(0, 8)}...${tripId.slice(-6)}`
            : tripId;
        const note = tx.note || "-";
        const date = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "-";
        const isDebit = type === "DEBIT";

        return `
          <div class="trip-box" style="margin-bottom:14px;">
            <p>
              <strong>${isDebit ? "Payout Debit" : "Trip Credit"}</strong>
            </p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Amount:</strong> ${amount}</p>
            <p><strong>Trip ID:</strong> ${shortTripId}</p>
            <p><strong>Note:</strong> ${note}</p>
            <p><strong>Date:</strong> ${date}</p>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    walletTransactionsCard.innerHTML = `<p>Failed to load wallet transactions.</p>`;
  }
}

async function requestDriverCashout() {
  const token = localStorage.getItem("driverToken");
  const amount = Number(cashoutAmountInput?.value || 0);

  if (!token) {
    showMessage("Driver login token missing. Please login again.", "error");
    return;
  }

  if (!amount || amount <= 0) {
    showMessage("Enter a valid cashout amount.", "error");
    return;
  }

  try {
    if (requestCashoutBtn) requestCashoutBtn.disabled = true;
    showMessage("Submitting cashout request...", "success");

    const res = await fetch(`${API_BASE}/driver/cashout-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        note: "Cashout request from driver dashboard",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Cashout request failed");
    }

    showMessage(
      `Cashout request submitted for ${formatNaira(amount)}. Admin will review it.`,
      "success",
    );

    if (cashoutAmountInput) cashoutAmountInput.value = "";

    await loadDriverWallet();
    await loadWalletTransactions();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to submit cashout request.", "error");
  } finally {
    if (requestCashoutBtn) requestCashoutBtn.disabled = false;
  }
}

requestCashoutBtn?.addEventListener("click", requestDriverCashout);

async function initDriverDashboard() {
  try {
    setDriverAvailabilityUi("OFFLINE");

    await updateDriverLocation();
    await loadDriverInbox();
    await loadDriverWallet();
    await loadWalletTransactions();
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to load dashboard", "error");
  }
}

initDriverDashboard();