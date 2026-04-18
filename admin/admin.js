const API_BASE = "https://tangolyft-backend.onrender.com";
const ADMIN_TOKEN_KEY = "tangolyft_admin_token";
const ADMIN_USER_KEY = "tangolyft_admin_user";

function $(id) {
  return document.getElementById(id);
}

function setStatus(message, type = "info") {
  const status = $("status");
  if (!status) return;
  status.textContent = message || "";
  status.className = `status ${type}`;
}

function saveAdminSession(token, user) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user || {}));
}

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

function requireAdminToken() {
  const token = getAdminToken();
  if (!token) {
    window.location.href = "./login.html";
    return null;
  }
  return token;
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setText(id, value) {
  const el = $(id);
  if (!el) return;
  el.textContent = value ?? "-";
}

async function requestOtp(phone) {
  const res = await fetch(`${API_BASE}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to request OTP");
  }
  return data;
}

async function verifyOtp(phone, otp) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, otp }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to verify OTP");
  }
  return data;
}

async function fetchPendingDrivers(token) {
  const res = await fetch(`${API_BASE}/admin/drivers/pending`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to load pending drivers");
  }
  return data.drivers || [];
}

async function fetchApprovedDrivers(token) {
  const res = await fetch(`${API_BASE}/admin/drivers/approved`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to load approved drivers");
  }
  return data.drivers || [];
}

async function fetchTrips(token) {
  const res = await fetch(`${API_BASE}/admin/trips`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to load trips");
  }
  return data.trips || [];
}

async function fetchTripDetail(token, tripId) {
  const res = await fetch(`${API_BASE}/admin/trips/${tripId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to load trip detail");
  }
  return data.trip;
}

async function approveDriver(token, driverId) {
  const res = await fetch(`${API_BASE}/admin/drivers/${driverId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to approve driver");
  }
  return data;
}

async function rejectDriver(token, driverId) {
  const note = window.prompt("Optional rejection note:", "") || "";

  const res = await fetch(`${API_BASE}/admin/drivers/${driverId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ note }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to reject driver");
  }
  return data;
}

async function suspendDriver(token, driverId) {
  const note =
    window.prompt("Suspension note:", "Suspended by admin") ||
    "Suspended by admin";

  const res = await fetch(`${API_BASE}/admin/drivers/${driverId}/suspend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ note }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to suspend driver");
  }
  return data;
}

async function unsuspendDriver(token, driverId) {
  const res = await fetch(`${API_BASE}/admin/drivers/${driverId}/unsuspend`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to unsuspend driver");
  }
  return data;
}

async function waiveCommitment(token, tripId) {
  const reason =
    window.prompt("Waiver reason:", "Waived by admin") || "Waived by admin";

  const res = await fetch(`${API_BASE}/admin/trips/${tripId}/waive-commitment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to waive commitment");
  }
  return data;
}

function getDriverId(driver) {
  return driver?.id || driver?.driverId || driver?.driver?.id || "-";
}

function getDriverPhone(driver) {
  return driver?.user?.phone || driver?.phone || "-";
}

function getDriverCity(driver) {
  return driver?.city || driver?.driver?.city || "-";
}

function getDriverType(driver) {
  return driver?.driverType || driver?.driver?.driverType || "-";
}

function getDriverKyc(driver) {
  return driver?.kycStatus || driver?.driver?.kycStatus || "-";
}

function getDriverAvailability(driver) {
  return driver?.availability || driver?.driver?.availability || "-";
}

function getTripRiderPhone(trip) {
  return trip?.rider?.phone || "-";
}

function getTripDriverLabel(trip) {
  if (!trip?.driver) return "Unassigned";
  return trip?.driver?.user?.phone || trip?.driver?.id || "Assigned";
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function renderPendingDrivers(drivers) {
  const tbody = $("driversTbody");
  const emptyState = $("emptyState");
  if (!tbody || !emptyState) return;

  tbody.innerHTML = "";

  if (!drivers.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  for (const driver of drivers) {
    const tr = document.createElement("tr");
    const driverId = getDriverId(driver);

    tr.innerHTML = `
      <td>${escapeHtml(driverId)}</td>
      <td>${escapeHtml(getDriverPhone(driver))}</td>
      <td>${escapeHtml(getDriverCity(driver))}</td>
      <td>${escapeHtml(getDriverType(driver))}</td>
      <td>${escapeHtml(getDriverKyc(driver))}</td>
      <td>
        <div class="row gap">
          <button class="btn success small approve-btn" data-id="${escapeHtml(driverId)}">Approve</button>
          <button class="btn danger small reject-btn" data-id="${escapeHtml(driverId)}">Reject</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  }

  bindPendingDriverActionButtons();
}

function renderApprovedDrivers(drivers) {
  const tbody = $("driversTbody");
  const emptyState = $("emptyState");
  if (!tbody || !emptyState) return;

  tbody.innerHTML = "";

  if (!drivers.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  for (const driver of drivers) {
    const tr = document.createElement("tr");
    const driverId = getDriverId(driver);
    const availability = getDriverAvailability(driver);
    const isSuspended = availability === "SUSPENDED";

    tr.innerHTML = `
      <td>${escapeHtml(driverId)}</td>
      <td>${escapeHtml(getDriverPhone(driver))}</td>
      <td>${escapeHtml(getDriverCity(driver))}</td>
      <td>${escapeHtml(getDriverType(driver))}</td>
      <td>${escapeHtml(availability)}</td>
      <td>${escapeHtml(getDriverKyc(driver))}</td>
      <td>
        <div class="row gap">
          ${
            isSuspended
              ? `<button class="btn success small unsuspend-btn" data-id="${escapeHtml(driverId)}">Unsuspend</button>`
              : `<button class="btn danger small suspend-btn" data-id="${escapeHtml(driverId)}">Suspend</button>`
          }
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  }

  bindApprovedDriverActionButtons();
}

function renderTrips(trips) {
  const tbody = $("tripsTbody");
  const emptyState = $("emptyState");
  if (!tbody || !emptyState) return;

  tbody.innerHTML = "";

  if (!trips.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  for (const trip of trips) {
    const tr = document.createElement("tr");
    const commitmentStatus = trip?.commitmentStatus || "-";
    const tripId = trip?.id || "";
    const isWaived = commitmentStatus === "WAIVED";

    tr.innerHTML = `
      <td>${escapeHtml(tripId || "-")}</td>
      <td>${escapeHtml(getTripRiderPhone(trip))}</td>
      <td>${escapeHtml(trip?.city || "-")}</td>
      <td>${escapeHtml(trip?.serviceType || "-")}</td>
      <td>${escapeHtml(trip?.status || "-")}</td>
      <td>${escapeHtml(commitmentStatus)}</td>
      <td>${escapeHtml(getTripDriverLabel(trip))}</td>
      <td>${escapeHtml(formatDateTime(trip?.requestedAt))}</td>
      <td>
        <div class="row gap">
          <button class="btn small view-trip-btn" data-id="${escapeHtml(tripId)}">View</button>
          ${
            isWaived
              ? `<button class="btn small" disabled>Already Waived</button>`
              : `<button class="btn success small waive-btn" data-id="${escapeHtml(tripId)}">Waive</button>`
          }
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  }

  bindTripActionButtons();
}

function bindPendingDriverActionButtons() {
  const token = getAdminToken();

  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const driverId = btn.dataset.id;
      if (!driverId) return;

      try {
        btn.disabled = true;
        setStatus("Approving driver...", "info");
        await approveDriver(token, driverId);
        setStatus("Driver approved successfully.", "success");
        await loadPendingDrivers();
      } catch (err) {
        setStatus(err.message || "Failed to approve driver.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const driverId = btn.dataset.id;
      if (!driverId) return;

      try {
        btn.disabled = true;
        setStatus("Rejecting driver...", "info");
        await rejectDriver(token, driverId);
        setStatus("Driver rejected successfully.", "success");
        await loadPendingDrivers();
      } catch (err) {
        setStatus(err.message || "Failed to reject driver.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function bindApprovedDriverActionButtons() {
  const token = getAdminToken();

  document.querySelectorAll(".suspend-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const driverId = btn.dataset.id;
      if (!driverId) return;

      try {
        btn.disabled = true;
        setStatus("Suspending driver...", "info");
        await suspendDriver(token, driverId);
        setStatus("Driver suspended successfully.", "success");
        await loadApprovedDrivers();
      } catch (err) {
        setStatus(err.message || "Failed to suspend driver.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll(".unsuspend-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const driverId = btn.dataset.id;
      if (!driverId) return;

      try {
        btn.disabled = true;
        setStatus("Unsuspending driver...", "info");
        await unsuspendDriver(token, driverId);
        setStatus("Driver unsuspended successfully.", "success");
        await loadApprovedDrivers();
      } catch (err) {
        setStatus(err.message || "Failed to unsuspend driver.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

function bindTripActionButtons() {
  const token = getAdminToken();

  document.querySelectorAll(".waive-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tripId = btn.dataset.id;
      if (!tripId) return;

      try {
        btn.disabled = true;
        setStatus("Waiving commitment...", "info");
        await waiveCommitment(token, tripId);
        setStatus("Commitment waived successfully.", "success");
        await loadTrips();
      } catch (err) {
        setStatus(err.message || "Failed to waive commitment.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  });

  document.querySelectorAll(".view-trip-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tripId = btn.dataset.id;
      if (!tripId) return;
      viewTripDetail(tripId);
    });
  });
}

function viewTripDetail(tripId) {
  window.location.href = `./trip-detail.html?tripId=${encodeURIComponent(tripId)}`;
}

function renderTripDetail(trip) {
  setText("tripId", trip?.id || "-");
  setText("riderPhone", trip?.rider?.phone || "-");
  setText("driverLabel", getTripDriverLabel(trip));
  setText("city", trip?.city || "-");
  setText("serviceType", trip?.serviceType || "-");
  setText("statusValue", trip?.status || "-");
  setText("commitmentStatus", trip?.commitmentStatus || "-");
  setText("commitmentReason", trip?.commitmentReason || "-");
  setText("pickupLat", trip?.pickupLat ?? "-");
  setText("pickupLng", trip?.pickupLng ?? "-");
  setText("dropoffLat", trip?.dropoffLat ?? trip?.delivery?.dropoffLat ?? "-");
  setText("dropoffLng", trip?.dropoffLng ?? trip?.delivery?.dropoffLng ?? "-");
  setText("fareAmount", trip?.fare?.total ?? trip?.fare?.amount ?? "-");
  setText("requestedAt", formatDateTime(trip?.requestedAt));
  setText("acceptedAt", formatDateTime(trip?.acceptedAt));
  setText("startedAt", formatDateTime(trip?.startedAt));
  setText("completedAt", formatDateTime(trip?.completedAt));
  setText("cancelledAt", formatDateTime(trip?.cancelledAt));
  setText("commitmentWaivedAt", formatDateTime(trip?.commitmentWaivedAt));
  setText("waivedBy", trip?.commitmentWaivedBy || "-");
}

async function loadPendingDrivers() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    setStatus("Loading pending drivers...", "info");
    const drivers = await fetchPendingDrivers(token);
    renderPendingDrivers(drivers);
    setStatus(`Loaded ${drivers.length} pending driver(s).`, "success");
  } catch (err) {
    renderPendingDrivers([]);
    setStatus(err.message || "Failed to load pending drivers.", "error");
  }
}

async function loadApprovedDrivers() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    setStatus("Loading approved drivers...", "info");
    const drivers = await fetchApprovedDrivers(token);
    renderApprovedDrivers(drivers);
    setStatus(`Loaded ${drivers.length} approved driver(s).`, "success");
  } catch (err) {
    renderApprovedDrivers([]);
    setStatus(err.message || "Failed to load approved drivers.", "error");
  }
}

async function loadTrips() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    setStatus("Loading trips...", "info");
    const trips = await fetchTrips(token);
    renderTrips(trips);
    setStatus(`Loaded ${trips.length} trip(s).`, "success");
  } catch (err) {
    renderTrips([]);
    setStatus(err.message || "Failed to load trips.", "error");
  }
}

async function loadTripDetailPage() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    const tripId = getQueryParam("tripId");
    if (!tripId) {
      throw new Error("Missing tripId in URL");
    }

    setStatus("Loading trip detail...", "info");
    const trip = await fetchTripDetail(token, tripId);
    renderTripDetail(trip);
    setStatus("Trip detail loaded successfully.", "success");
  } catch (err) {
    setStatus(err.message || "Failed to load trip detail.", "error");
  }
}

function initLoginPage() {
  const requestOtpBtn = $("requestOtpBtn");
  const verifyOtpBtn = $("verifyOtpBtn");
  const phoneInput = $("phone");
  const otpInput = $("otp");

  requestOtpBtn?.addEventListener("click", async () => {
    const phone = phoneInput.value.trim();
    if (!phone) {
      setStatus("Enter phone number first.", "error");
      return;
    }

    try {
      requestOtpBtn.disabled = true;
      setStatus("Requesting OTP...", "info");
      const data = await requestOtp(phone);

      let msg = "OTP requested successfully.";
      if (data.otp) {
        msg += ` Debug OTP: ${data.otp}`;
      }

      setStatus(msg, "success");
    } catch (err) {
      setStatus(err.message || "OTP request failed.", "error");
    } finally {
      requestOtpBtn.disabled = false;
    }
  });

  verifyOtpBtn?.addEventListener("click", async () => {
    const phone = phoneInput.value.trim();
    const otp = otpInput.value.trim();

    if (!phone || !otp) {
      setStatus("Enter phone and OTP.", "error");
      return;
    }

    try {
      verifyOtpBtn.disabled = true;
      setStatus("Verifying OTP...", "info");

      const data = await verifyOtp(phone, otp);

      if (!data.user || data.user.role !== "ADMIN") {
        throw new Error("This account is not an ADMIN account.");
      }

      saveAdminSession(data.token, data.user);
      setStatus("Login successful. Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "./pending-drivers.html";
      }, 500);
    } catch (err) {
      setStatus(err.message || "OTP verification failed.", "error");
    } finally {
      verifyOtpBtn.disabled = false;
    }
  });
}

function initPendingDriversPage() {
  const refreshBtn = $("refreshBtn");
  const logoutBtn = $("logoutBtn");

  refreshBtn?.addEventListener("click", async () => {
    await loadPendingDrivers();
  });

  logoutBtn?.addEventListener("click", () => {
    clearAdminSession();
    window.location.href = "./login.html";
  });

  loadPendingDrivers();
}

function initApprovedDriversPage() {
  const refreshBtn = $("refreshBtn");
  const logoutBtn = $("logoutBtn");

  refreshBtn?.addEventListener("click", async () => {
    await loadApprovedDrivers();
  });

  logoutBtn?.addEventListener("click", () => {
    clearAdminSession();
    window.location.href = "./login.html";
  });

  loadApprovedDrivers();
}

function initTripsPage() {
  const refreshBtn = $("refreshBtn");
  const logoutBtn = $("logoutBtn");

  refreshBtn?.addEventListener("click", async () => {
    await loadTrips();
  });

  logoutBtn?.addEventListener("click", () => {
    clearAdminSession();
    window.location.href = "./login.html";
  });

  loadTrips();
}

function initTripDetailPage() {
  const refreshBtn = $("refreshBtn");
  const logoutBtn = $("logoutBtn");
  const backBtn = $("backBtn");

  refreshBtn?.addEventListener("click", async () => {
    await loadTripDetailPage();
  });

  logoutBtn?.addEventListener("click", () => {
    clearAdminSession();
    window.location.href = "./login.html";
  });

  backBtn?.addEventListener("click", () => {
    window.location.href = "./trips.html";
  });

  loadTripDetailPage();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "login") {
    initLoginPage();
  }

  if (page === "pending-drivers") {
    initPendingDriversPage();
  }

  if (page === "approved-drivers") {
    initApprovedDriversPage();
  }

  if (page === "trips") {
    initTripsPage();
  }

  if (page === "trip-detail") {
    initTripDetailPage();
  }
});