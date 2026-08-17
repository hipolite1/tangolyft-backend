const API_BASE = window.location.origin;

function shouldShowDebugOtp() {
  const host = window.location.hostname;

  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}


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

    const debugOtp = data.otp || data.debugOtp || data.debugOtpRaw;

    if (shouldShowDebugOtp() && debugOtp && debugOtp !== "true") {
      showMessage(`OTP sent. Test OTP: ${debugOtp}`, "success");
    } else {
      showMessage("OTP sent successfully. Check your phone.", "success");
    }
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
    unlockDriverAlertSound();
    await requestDriverNotificationPermission();

    const data = await driverPost("/driver/go-online");

    setDriverAvailabilityUi(data.driver.availability);

    try {
      await updateDriverLocation();
      showMessage("You are now ONLINE. Location updated.", "success");
    } catch (locationErr) {
      console.error(locationErr);
      showMessage(
        "You are now ONLINE, but location was not shared. Admin may not see you as nearby.",
        "error",
      );
    }

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
      tripCard.innerHTML = `<p>No assigned trip at the moment.</p>`;
    }

    hideNewTripVisualAlert();
    lastSeenAssignedTripId = null;
    pendingDriverAlert = false;
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to go offline", "error");
  }
});


function hasValidCoords(lat, lng) {
  return lat !== undefined && lat !== null && lng !== undefined && lng !== null;
}

let lastSeenAssignedTripId = null;
let driverAlertUnlocked = false;
let driverAudioContext = null;
let pendingDriverAlert = false;
let driverAlertTimers = [];

function clearDriverAlertTimers() {
  driverAlertTimers.forEach((timerId) => clearTimeout(timerId));
  driverAlertTimers = [];
}

function primeDriverAlertSound() {
  try {
    if (!driverAudioContext || driverAudioContext.state !== "running") return;

    const oscillator = driverAudioContext.createOscillator();
    const gainNode = driverAudioContext.createGain();

    gainNode.gain.setValueAtTime(0.00001, driverAudioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(driverAudioContext.destination);
    oscillator.start();
    oscillator.stop(driverAudioContext.currentTime + 0.03);
  } catch (err) {
    console.warn("Could not prime driver alert sound", err);
  }
}

async function unlockDriverAlertSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      console.warn("Web Audio API not supported.");
      return false;
    }

    if (!driverAudioContext) {
      driverAudioContext = new AudioContext();
    }

    if (driverAudioContext.state === "suspended") {
      await driverAudioContext.resume();
    }

    driverAlertUnlocked = driverAudioContext.state === "running";

    if (driverAlertUnlocked) {
      primeDriverAlertSound();
    }

    const alertStatus = document.getElementById("tripAlertsStatus");
    if (alertStatus && driverAlertUnlocked) {
      alertStatus.style.display = "block";
      alertStatus.textContent = "Trip alerts enabled. Keep this page open while online.";
    }

    if (driverAlertUnlocked && pendingDriverAlert) {
      pendingDriverAlert = false;
      playDriverNewTripAlert();
    }

    return driverAlertUnlocked;
  } catch (err) {
    console.error("Could not unlock driver alert sound", err);
    return false;
  }
}

function playDriverBeep() {
  try {
    if (
      !driverAlertUnlocked ||
      !driverAudioContext ||
      driverAudioContext.state !== "running"
    ) {
      return false;
    }

    const oscillator = driverAudioContext.createOscillator();
    const gainNode = driverAudioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;

    gainNode.gain.setValueAtTime(0.001, driverAudioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.5,
      driverAudioContext.currentTime + 0.02,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      driverAudioContext.currentTime + 0.6,
    );

    oscillator.connect(gainNode);
    gainNode.connect(driverAudioContext.destination);

    oscillator.start();
    oscillator.stop(driverAudioContext.currentTime + 0.65);

    return true;
  } catch (err) {
    console.error("Could not play driver beep", err);
    return false;
  }
}

async function playDriverNewTripAlert() {
  clearDriverAlertTimers();

  if (driverAudioContext && driverAudioContext.state === "suspended") {
    try {
      await driverAudioContext.resume();
      driverAlertUnlocked = driverAudioContext.state === "running";
    } catch (err) {
      console.warn("Driver audio could not resume automatically", err);
    }
  }

  const played = playDriverBeep();

  if (!played) {
    pendingDriverAlert = true;

    const alertStatus = document.getElementById("tripAlertsStatus");
    if (alertStatus) {
      alertStatus.style.display = "block";
      alertStatus.textContent =
        "New trip received. Tap anywhere except Accept Trip to enable the alert sound.";
    }
    return false;
  }

  pendingDriverAlert = false;
  driverAlertTimers.push(setTimeout(playDriverBeep, 700));
  driverAlertTimers.push(setTimeout(playDriverBeep, 1400));
  return true;
}

function showNewTripVisualAlert(trip) {
  const messageText = `New trip assigned. Pickup: ${trip.pickupAddress || "-"} → Drop-off: ${trip.dropoffAddress || "-"}`;

  const banner = document.getElementById("tripAlertBanner");
  if (banner) {
    banner.style.display = "block";
    banner.textContent = `🔔 NEW TRIP ASSIGNED — ${trip.pickupAddress || "-"} → ${trip.dropoffAddress || "-"}`;
  }

  showMessage(messageText, "success");

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("New TangoMove Trip Assigned", {
      body: messageText,
    });
  }
}

function hideNewTripVisualAlert() {
  clearDriverAlertTimers();

  const banner = document.getElementById("tripAlertBanner");
  if (banner) {
    banner.style.display = "none";
    banner.textContent = "";
  }

  pendingDriverAlert = false;
}

async function requestDriverNotificationPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch (err) {
    console.warn("Notification permission not available.", err);
  }
}

function googleMapsDirectionsUrl(lat, lng, fallbackAddress) {
  if (hasValidCoords(lat, lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  }

  if (fallbackAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackAddress)}`;
  }

  return "";
}

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
        <p>No assigned trip at the moment.</p>
      `;

      hideNewTripVisualAlert();
      lastSeenAssignedTripId = null;
      return;
    }

    const trip = trips[0];

    const hasAssignedDriverForAlert = Boolean(
      trip.driverId ||
        trip.driver?.id ||
        trip.driver?.phone ||
        trip.driverPhone ||
        trip.driver,
    );

    const isNewAssignedTrip =
      trip.status === "REQUESTED" &&
      hasAssignedDriverForAlert &&
      trip.id !== lastSeenAssignedTripId;

    if (isNewAssignedTrip) {
      lastSeenAssignedTripId = trip.id;
      showNewTripVisualAlert(trip);
      await playDriverNewTripAlert();
    } else if (trip.status !== "REQUESTED" || !hasAssignedDriverForAlert) {
      hideNewTripVisualAlert();
    }

    const pickupMapsUrl = googleMapsDirectionsUrl(
      trip.pickupLat,
      trip.pickupLng,
      trip.pickupAddress,
    );

    const dropoffMapsUrl = googleMapsDirectionsUrl(
      trip.dropoffLat,
      trip.dropoffLng,
      trip.dropoffAddress,
    );

    const riderPhone = trip.rider?.phone || trip.riderPhone || "";

    const pickupNavButton = pickupMapsUrl
      ? `<a class="btn-primary nav-link-btn" href="${pickupMapsUrl}" target="_blank" rel="noopener">Navigate to Pickup</a>`
      : "";

    const dropoffNavButton = dropoffMapsUrl
      ? `<a class="btn-primary nav-link-btn" href="${dropoffMapsUrl}" target="_blank" rel="noopener">Navigate to Drop-off</a>`
      : "";

    const callRiderButton = riderPhone
      ? `<a class="btn-secondary nav-link-btn" href="tel:${riderPhone}">Call Rider</a>`
      : "";

    const hasAssignedDriver = Boolean(
      trip.driverId ||
        trip.driver?.id ||
        trip.driver?.phone ||
        trip.driverPhone ||
        trip.driver,
    );

    let displayStatus = trip.status;

    if (trip.status === "REQUESTED" && hasAssignedDriver) {
      displayStatus = "ASSIGNED_PENDING";
    }

    let actionButtons = "";

    if (displayStatus === "REQUESTED" || displayStatus === "ASSIGNED_PENDING") {
      actionButtons = `
        <div class="trip-navigation">
          ${callRiderButton}
        </div>

        <button class="btn-primary trip-action-btn" data-action="accept" data-trip-id="${trip.id}">
          Accept Trip
        </button>
      `;
    }

    if (displayStatus === "ACCEPTED") {
      actionButtons = `
        <div class="trip-navigation">
          ${pickupNavButton}
          ${callRiderButton}
        </div>

        <button class="btn-primary trip-action-btn" data-action="start" data-trip-id="${trip.id}">
          Start Trip
        </button>
      `;
    }

    if (trip.status === "STARTED") {
      actionButtons = `
        <div class="trip-navigation">
          ${dropoffNavButton}
          ${callRiderButton}
        </div>

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
        <p><strong>Pickup:</strong> ${trip.pickupAddress || "-"}</p>
        <p><strong>Drop-off:</strong> ${trip.dropoffAddress || "-"}</p>
        <p><strong>City:</strong> ${trip.city}</p>
        <p><strong>Service:</strong> ${
  trip.serviceType === "BIKE_DELIVERY"
    ? "Bike Delivery"
    : trip.serviceType === "CAR_RIDE"
      ? "Car Ride"
      : trip.serviceType || "-"
}</p>
<p><strong>Status:</strong> ${
  displayStatus === "REQUESTED"
    ? "Waiting for Driver"
    : displayStatus === "ASSIGNED_PENDING"
      ? "New Trip Assigned - Please Accept"
      : displayStatus === "ACCEPTED"
        ? "Driver Accepted"
      : displayStatus === "STARTED"
        ? "Trip In Progress"
        : displayStatus === "COMPLETED"
          ? "Trip Completed"
          : displayStatus === "CANCELLED"
            ? "Trip Cancelled"
            : displayStatus || "-"
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
    hideNewTripVisualAlert();
  } catch (err) {
    console.error(err);
    showMessage(err.message, "error");
  }
}

async function startTrip(tripId) {
  try {
    await tripAction(`/trips/${tripId}/start`, "Trip started");
    hideNewTripVisualAlert();
  } catch (err) {
    console.error(err);
    showMessage(err.message, "error");
  }
}

async function completeTrip(tripId) {
  try {
    await tripAction(`/trips/${tripId}/complete`, "Trip completed");
    hideNewTripVisualAlert();

    const tripCard = document.getElementById("tripCard");
    if (tripCard) {
      tripCard.innerHTML = `<p>No assigned trip at the moment.</p>`;
    }

    await loadDriverWallet();
    await loadWalletTransactions();
  } catch (err) {
    console.error(err);
    showMessage(err.message, "error");
  }
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest(".trip-action-btn");

  if (!button) return;

  // Never let the Accept/Start/Complete click become the delayed sound trigger.
  pendingDriverAlert = false;
  clearDriverAlertTimers();

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

function getCurrentDriverPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          heading: position.coords.heading || 0,
          accuracyM: position.coords.accuracy || null,
        });
      },
      (error) => {
        console.error(error);
        reject(new Error("Driver location permission was denied or unavailable."));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

async function updateDriverLocation() {
  const token = localStorage.getItem("driverToken");

  if (!token) return;

  const position = await getCurrentDriverPosition();

  const res = await fetch(`${API_BASE}/driver/location`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lat: position.lat,
      lng: position.lng,
      heading: position.heading,
      accuracyM: position.accuracyM,
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
      <p><strong>Driver ID:</strong> ${data.driver?.id || data.wallet?.driverId || "-"}</p>
      <p><strong>Driver Type:</strong> ${data.driver?.driverType || "-"}</p>
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
        const title = isDebit ? "Payout Paid" : "Trip Earning";
        const amountPrefix = isDebit ? "-" : "+";
        const amountClass = isDebit ? "tx-amount debit" : "tx-amount credit";
        const metaLabel = isDebit ? "Payout" : "Trip";

        return `
          <div class="wallet-tx-card ${isDebit ? "debit-card" : "credit-card"}">
            <div class="wallet-tx-top">
              <div>
                <div class="tx-title">${title}</div>
                <div class="tx-date">${date}</div>
              </div>
              <div class="${amountClass}">${amountPrefix} ${amount}</div>
            </div>

            <div class="tx-meta">
              <div><strong>${metaLabel} ID:</strong> ${shortTripId}</div>
              <div><strong>Note:</strong> ${note}</div>
            </div>
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
    showMessage("Submitting payout request...", "success");

    const res = await fetch(`${API_BASE}/driver/cashout-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        note: "Payout request from driver dashboard",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Cashout request failed");
    }

    showMessage(
      `Payout request submitted for ${formatNaira(amount)}. Admin will review it.`,
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

function enableDriverAlertSoundOnFirstInteraction() {
  const unlockFromPointer = (event) => {
    if (event.target?.closest?.(".trip-action-btn")) {
      return;
    }

    unlockDriverAlertSound();
    document.removeEventListener("click", unlockFromPointer);
    document.removeEventListener("touchstart", unlockFromPointer);
    document.removeEventListener("keydown", unlockFromKeyboard);
  };

  const unlockFromKeyboard = () => {
    unlockDriverAlertSound();
    document.removeEventListener("click", unlockFromPointer);
    document.removeEventListener("touchstart", unlockFromPointer);
    document.removeEventListener("keydown", unlockFromKeyboard);
  };

  document.addEventListener("click", unlockFromPointer);
  document.addEventListener("touchstart", unlockFromPointer, { passive: true });
  document.addEventListener("keydown", unlockFromKeyboard);
}

async function initDriverDashboard() {
  try {
    enableDriverAlertSoundOnFirstInteraction();
    setDriverAvailabilityUi("OFFLINE");

    await loadDriverInbox();
    await loadDriverWallet();
    await loadWalletTransactions();

    setInterval(async () => {
      try {
        await loadDriverInbox();
      } catch (err) {
        console.error("Failed to auto-refresh driver inbox", err);
      }
    }, 10000);
  } catch (err) {
    console.error(err);
    showMessage(err.message || "Failed to load dashboard", "error");
  }
}

initDriverDashboard();