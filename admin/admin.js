const API_BASE = "http://localhost:3000";
const ADMIN_TOKEN_KEY = "tangolyft_admin_token";
const ADMIN_USER_KEY = "tangolyft_admin_user";

let allTrips = [];
let tripsAutoRefreshTimer = null;
let currentTripDetail = null;

function $(id) {
  return document.getElementById(id);
}

function setStatus(message, type = "info") {
  const status = $("status");
  if (!status) return;
  status.textContent = message || "";
  status.className = `status ${type}`;
}

function getStatusBadge(status) {
  const s = (status || "-").toUpperCase();

  const base =
    "display:inline-block;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;";

  if (s === "COMPLETED") {
    return `<span style="${base}background:#e6f4ea;color:#137333;">Trip Completed</span>`;
  }

  if (s === "CANCELLED") {
    return `<span style="${base}background:#fce8e6;color:#c5221f;">Trip Cancelled</span>`;
  }

  if (s === "REQUESTED") {
    return `<span style="${base}background:#fef7e0;color:#b06000;">Waiting for Driver</span>`;
  }

  if (s === "ACCEPTED") {
    return `<span style="${base}background:#e8f0fe;color:#174ea6;">Driver Assigned</span>`;
  }

  if (s === "STARTED") {
    return `<span style="${base}background:#e8f0fe;color:#174ea6;">Trip In Progress</span>`;
  }

  return `<span style="${base}background:#f1f3f4;color:#444;">${escapeHtml(s)}</span>`;
}

function getCommitmentBadge(status) {
  const s = (status || "-").toUpperCase();

  const base =
    "display:inline-block;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;";

  if (s === "WAIVED") {
    return `<span style="${base}background:#e6f4ea;color:#137333;">Waived</span>`;
  }

  if (s === "PENDING") {
    return `<span style="${base}background:#fef7e0;color:#b06000;">Pending</span>`;
  }

  return `<span style="${base}background:#f1f3f4;color:#444;">${escapeHtml(s)}</span>`;
}

function startTripsAutoRefresh(intervalMs = 15000) {
  stopTripsAutoRefresh();

  tripsAutoRefreshTimer = setInterval(async () => {
    try {
      const token = getAdminToken();
      if (!token) return;

      const trips = await fetchTrips(token);
      allTrips = trips;
      applyTripFilters();

      const el = $("lastUpdated");
      if (el) {
        el.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      }
    } catch (e) {
      // silent fail; next tick will try again
    }
  }, intervalMs);
}

function stopTripsAutoRefresh() {
  if (tripsAutoRefreshTimer) {
    clearInterval(tripsAutoRefreshTimer);
    tripsAutoRefreshTimer = null;
  }
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

  const res = await fetch(
    `${API_BASE}/admin/trips/${tripId}/waive-commitment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    },
  );

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to waive commitment");
  }

  return data;
}

async function cancelTrip(token, tripId) {
  const reason =
    window.prompt("Cancel reason:", "Cancelled by admin") ||
    "Cancelled by admin";

  const res = await fetch(`${API_BASE}/admin/trips/${tripId}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ reason }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to cancel trip");
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

function getTripCommitmentStatus(trip) {
  return trip?.commitmentStatus || "PENDING";
}

function sortTrips(trips, sortValue) {
  const items = [...trips];

  if (sortValue === "requested_asc") {
    items.sort((a, b) => {
      const av = new Date(a?.requestedAt || 0).getTime();
      const bv = new Date(b?.requestedAt || 0).getTime();
      return av - bv;
    });
  } else if (sortValue === "requested_desc") {
    items.sort((a, b) => {
      const av = new Date(a?.requestedAt || 0).getTime();
      const bv = new Date(b?.requestedAt || 0).getTime();
      return bv - av;
    });
  } else if (sortValue === "status_asc") {
    items.sort((a, b) =>
      String(a?.status || "").localeCompare(String(b?.status || "")),
    );
  } else if (sortValue === "status_desc") {
    items.sort((a, b) =>
      String(b?.status || "").localeCompare(String(a?.status || "")),
    );
  } else if (sortValue === "commitment_asc") {
    items.sort((a, b) =>
      String(getTripCommitmentStatus(a)).localeCompare(
        String(getTripCommitmentStatus(b)),
      ),
    );
  } else if (sortValue === "commitment_desc") {
    items.sort((a, b) =>
      String(getTripCommitmentStatus(b)).localeCompare(
        String(getTripCommitmentStatus(a)),
      ),
    );
  } else if (sortValue === "city_asc") {
    items.sort((a, b) =>
      String(a?.city || "").localeCompare(String(b?.city || "")),
    );
  } else if (sortValue === "city_desc") {
    items.sort((a, b) =>
      String(b?.city || "").localeCompare(String(a?.city || "")),
    );
  }

  return items;
}

async function assignDriverToTrip(token, tripId, driverName) {
  const res = await fetch(`${API_BASE}/admin/trips/${tripId}/assign-driver`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ driverName }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to assign driver");
  }

  return data;
}

async function startTrip(token, tripId) {
  const res = await fetch(`${API_BASE}/admin/trips/${tripId}/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to start trip");
  }

  return data;
}

async function completeTrip(token, tripId) {
  const res = await fetch(`${API_BASE}/admin/trips/${tripId}/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(data.message || "Failed to complete trip");
  }

  return data;
}

function renderTripStats(trips) {
  const total = trips.length;
  const requested = trips.filter((trip) => trip?.status === "REQUESTED").length;
  const active = trips.filter(
    (trip) => trip?.status === "ACCEPTED" || trip?.status === "STARTED",
  ).length;
  const completed = trips.filter((trip) => trip?.status === "COMPLETED").length;
  const waived = trips.filter(
    (trip) => getTripCommitmentStatus(trip) === "WAIVED",
  ).length;

  setText("statTotalTrips", total);
  setText("statRequestedTrips", requested);
  setText("statActiveTrips", active);
  setText("statCompletedTrips", completed);
  setText("statWaivedTrips", waived);
}

function applyTripFilters() {
  const searchInput = $("tripSearch");
  const statusFilter = $("statusFilter");
  const commitmentFilter = $("commitmentFilter");
  const sortFilter = $("sortFilter");

  const search = (searchInput?.value || "").trim().toLowerCase();
  const status = (statusFilter?.value || "").trim();
  const commitment = (commitmentFilter?.value || "").trim();
  const sortValue = (sortFilter?.value || "requested_desc").trim();

  let filtered = [...allTrips];

  if (search) {
    filtered = filtered.filter((trip) => {
      const tripId = String(trip?.id || "").toLowerCase();
      const riderPhone = String(getTripRiderPhone(trip) || "").toLowerCase();
      return tripId.includes(search) || riderPhone.includes(search);
    });
  }

  if (status) {
    filtered = filtered.filter((trip) => (trip?.status || "") === status);
  }

  if (commitment) {
    filtered = filtered.filter(
      (trip) => getTripCommitmentStatus(trip) === commitment,
    );
  }

  filtered = sortTrips(filtered, sortValue);

  renderTripStats(allTrips);
  renderTrips(filtered, false);
  setStatus(
    `Showing ${filtered.length} of ${allTrips.length} trip(s).`,
    "success",
  );
}

function bindTripFilterControls() {
  const tripSearch = $("tripSearch");
  const statusFilter = $("statusFilter");
  const commitmentFilter = $("commitmentFilter");
  const sortFilter = $("sortFilter");
  const clearFiltersBtn = $("clearFiltersBtn");

  tripSearch?.addEventListener("input", applyTripFilters);
  statusFilter?.addEventListener("change", applyTripFilters);
  commitmentFilter?.addEventListener("change", applyTripFilters);
  sortFilter?.addEventListener("change", applyTripFilters);

  clearFiltersBtn?.addEventListener("click", () => {
    if (tripSearch) tripSearch.value = "";
    if (statusFilter) statusFilter.value = "";
    if (commitmentFilter) commitmentFilter.value = "";
    if (sortFilter) sortFilter.value = "requested_desc";
    applyTripFilters();
  });
}

function bindStatCardClicks() {
  const statusFilter = $("statusFilter");
  const commitmentFilter = $("commitmentFilter");

  $("statCardTotal")?.addEventListener("click", () => {
    if (statusFilter) statusFilter.value = "";
    if (commitmentFilter) commitmentFilter.value = "";
    applyTripFilters();
  });

  $("statCardRequested")?.addEventListener("click", () => {
    if (statusFilter) statusFilter.value = "REQUESTED";
    applyTripFilters();
  });

  $("statCardActive")?.addEventListener("click", () => {
    if (statusFilter) statusFilter.value = "";
    applyTripFilters();
  });

  $("statCardCompleted")?.addEventListener("click", () => {
    if (statusFilter) statusFilter.value = "COMPLETED";
    applyTripFilters();
  });

  $("statCardWaived")?.addEventListener("click", () => {
    if (commitmentFilter) commitmentFilter.value = "WAIVED";
    applyTripFilters();
  });
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

function renderTrips(trips, updateMaster = true) {
  const tbody = $("tripsTbody");
  const emptyState = $("emptyState");
  if (!tbody || !emptyState) return;

  if (updateMaster) {
    allTrips = Array.isArray(trips) ? trips : [];
  }

  tbody.innerHTML = "";

  if (!trips.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  for (const trip of trips) {
    const tr = document.createElement("tr");
    const commitmentStatus = getTripCommitmentStatus(trip);
    const tripId = trip?.id || "";
    const isWaived = commitmentStatus === "WAIVED";
    const isCancelled = trip?.status === "CANCELLED";
    const isCompleted = trip?.status === "COMPLETED";

    tr.innerHTML = `
      <td>${escapeHtml(tripId || "-")}</td>
      <td>${escapeHtml(getTripRiderPhone(trip))}</td>
      <td>${escapeHtml(trip?.city || "-")}</td>
      <td>${escapeHtml(
  trip?.serviceType === "BIKE_DELIVERY"
    ? "Bike Delivery"
    : trip?.serviceType === "CAR_RIDE"
      ? "Car Ride"
      : trip?.serviceType || "-"
)}</td>
      <td>${getStatusBadge(trip?.status)}</td>
      <td>${getCommitmentBadge(commitmentStatus)}</td>
      <td>${escapeHtml(getTripDriverLabel(trip))}</td>
      <td>${escapeHtml(formatDateTime(trip?.requestedAt))}</td>
      <td>${escapeHtml(formatDateTime(trip?.completedAt))}</td>
      <td>
        <div class="row gap">
          <button class="btn small view-trip-btn" data-id="${escapeHtml(tripId)}">View</button>

          ${
            isCompleted
              ? `<button class="btn small" disabled>Completed</button>`
              : isCancelled
                ? `<button class="btn small" disabled>Cancelled</button>`
                : `<button class="btn danger small cancel-btn" data-id="${escapeHtml(tripId)}">Cancel</button>`
          }

          ${
            isWaived
              ? `<button class="btn small" disabled>Already Waived</button>`
              : isCompleted
                ? `<button class="btn small" disabled>Finalized</button>`
                : isCancelled
                  ? `<button class="btn small" disabled>Cannot Waive</button>`
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

  document.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tripId = btn.dataset.id;
      if (!tripId) return;

      const confirmCancel = confirm("Cancel this trip?");
      if (!confirmCancel) return;

      try {
        btn.disabled = true;
        setStatus("Cancelling trip...", "info");
        await cancelTrip(token, tripId);
        setStatus("Trip cancelled successfully.", "success");
        await loadTrips();
      } catch (err) {
        setStatus(err.message || "Failed to cancel trip.", "error");
      } finally {
        btn.disabled = false;
      }
    });
  });

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
  currentTripDetail = trip;

  setText("tripId", trip?.id || "-");
  setText("riderPhone", trip?.rider?.phone || "-");
  setText("driverLabel", getTripDriverLabel(trip));
  setText("city", trip?.city || "-");
  setText(
  "serviceType",
  trip?.serviceType === "BIKE_DELIVERY"
    ? "Bike Delivery"
    : trip?.serviceType === "CAR_RIDE"
      ? "Car Ride"
      : trip?.serviceType || "-",
);
  $("statusValue").innerHTML = getStatusBadge(trip?.status);
  $("commitmentStatus").innerHTML = getCommitmentBadge(trip?.commitmentStatus);

  setText(
    "commitmentReason",
    getTripCommitmentStatus(trip) === "WAIVED"
      ? trip?.commitmentReason || "Waived by admin"
      : "Not waived",
  );

  setText("pickupLat", trip?.pickupLat ?? "-");
  setText("pickupLng", trip?.pickupLng ?? "-");
  setText("dropoffLat", trip?.dropoffLat ?? trip?.delivery?.dropoffLat ?? "-");
  setText("dropoffLng", trip?.dropoffLng ?? trip?.delivery?.dropoffLng ?? "-");
  setText(
  "fareAmount",
  trip?.fare?.totalAmount ??
    trip?.fare?.total ??
    trip?.fare?.amount ??
    "-",
);

setText("itemDescription", trip?.delivery?.itemDescription || "-");
setText("recipientName", trip?.delivery?.recipientName || "-");
setText("recipientPhone", trip?.delivery?.recipientPhone || "-");
setText("noteToCourier", trip?.delivery?.noteToCourier || "-");
  setText("requestedAt", formatDateTime(trip?.requestedAt));
  setText("acceptedAt", formatDateTime(trip?.acceptedAt));
  setText("startedAt", formatDateTime(trip?.startedAt));
  setText("completedAt", formatDateTime(trip?.completedAt));
  setText("cancelledAt", formatDateTime(trip?.cancelledAt));
  setText("commitmentWaivedAt", formatDateTime(trip?.commitmentWaivedAt));
  setText("waivedBy", trip?.commitmentWaivedBy || "-");

  const waiveBtn = $("waiveTripBtn");
  if (waiveBtn) {
    const isWaived = getTripCommitmentStatus(trip) === "WAIVED";
    const isCancelled = trip?.status === "CANCELLED";
    const isCompleted = trip?.status === "COMPLETED";

    if (isCompleted) {
      waiveBtn.disabled = true;
      waiveBtn.textContent = "Finalized";
      waiveBtn.classList.remove("success");
    } else if (isCancelled) {
      waiveBtn.disabled = true;
      waiveBtn.textContent = "Finalized";
      waiveBtn.classList.remove("success");
    } else if (isWaived) {
      waiveBtn.disabled = true;
      waiveBtn.textContent = "Waived";
      waiveBtn.classList.remove("success");
    } else {
      waiveBtn.disabled = false;
      waiveBtn.textContent = "Waive Commitment";
      waiveBtn.classList.add("success");
    }
  }

  const cancelBtn = $("cancelTripBtn");
  if (cancelBtn) {
    const isCancelled = trip?.status === "CANCELLED";
    const isCompleted = trip?.status === "COMPLETED";

    if (isCompleted) {
      cancelBtn.disabled = true;
      cancelBtn.textContent = "Trip Completed";
      cancelBtn.classList.remove("danger");
    } else if (isCancelled) {
      cancelBtn.disabled = true;
      cancelBtn.textContent = "Trip Cancelled";
      cancelBtn.classList.remove("danger");
    } else {
      cancelBtn.disabled = false;
      cancelBtn.textContent = "Cancel Trip";
      cancelBtn.classList.add("danger");
    }
  }
}

async function handleTripDetailWaive() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    const tripId = currentTripDetail?.id || getQueryParam("tripId");
    if (!tripId) {
      throw new Error("Missing tripId");
    }

    setStatus("Waiving commitment...", "info");
    await waiveCommitment(token, tripId);
    setStatus("Commitment waived successfully.", "success");
    await loadTripDetailPage();
  } catch (err) {
    setStatus(err.message || "Failed to waive commitment.", "error");
  }
}

async function handleTripDetailCancel() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    const tripId = currentTripDetail?.id || getQueryParam("tripId");
    if (!tripId) {
      throw new Error("Missing tripId");
    }

    const confirmCancel = confirm("Cancel this trip?");
    if (!confirmCancel) return;

    setStatus("Cancelling trip...", "info");
    await cancelTrip(token, tripId);
    setStatus("Trip cancelled successfully.", "success");
    await loadTripDetailPage();
  } catch (err) {
    setStatus(err.message || "Failed to cancel trip.", "error");
  }
}

async function handleAssignDriver() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    const tripId = currentTripDetail?.id || getQueryParam("tripId");
    const input = $("assignDriverInput");

    if (!input || !input.value.trim()) {
      throw new Error("Enter driver phone");
    }

    setStatus("Assigning driver...", "info");
    await assignDriverToTrip(token, tripId, input.value.trim());
    setStatus("Driver assigned successfully.", "success");

    input.value = "";
    await loadTripDetailPage();
  } catch (err) {
    setStatus(err.message || "Failed to assign driver.", "error");
  }
}

async function handleStartTrip() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    const tripId = currentTripDetail?.id || getQueryParam("tripId");

    setStatus("Starting trip...", "info");
    await startTrip(token, tripId);
    setStatus("Trip started successfully.", "success");
    await loadTripDetailPage();
  } catch (err) {
    setStatus(err.message || "Failed to start trip.", "error");
  }
}

async function handleCompleteTrip() {
  try {
    const token = requireAdminToken();
    if (!token) return;

    const tripId = currentTripDetail?.id || getQueryParam("tripId");

    setStatus("Completing trip...", "info");
    await completeTrip(token, tripId);
    setStatus("Trip completed successfully.", "success");
    await loadTripDetailPage();
  } catch (err) {
    setStatus(err.message || "Failed to complete trip.", "error");
  }
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
    allTrips = trips;
    applyTripFilters();
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
async function loadPayouts() {
  const token = getAdminToken();
  const payoutsTbody = $("payoutsTbody");
  const emptyState = $("emptyState");

  if (!token) {
    window.location.href = "./login.html";
    return;
  }

  if (!payoutsTbody) return;

  try {
    setStatus("Loading pending cashout requests...", "info");

    const res = await fetch(`${API_BASE}/admin/payouts/pending`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to load payouts");
    }

    const payouts = data.payouts || [];

    renderPayouts(payouts);

    if (emptyState) {
      emptyState.style.display = payouts.length ? "none" : "block";
    }

    setStatus(`Loaded ${payouts.length} pending cashout request(s).`, "success");
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Failed to load cashout requests.", "error");
  }
}

function renderPayouts(payouts) {
  const payoutsTbody = $("payoutsTbody");
  if (!payoutsTbody) return;

  payoutsTbody.innerHTML = "";

  payouts.forEach((payout) => {
    const driver = payout.driver || {};
    const user = driver.user || {};
    const wallet = driver.wallet || {};

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(payout.id || "-")}</td>
      <td>${escapeHtml(user.phone || "-")}</td>
      <td>${escapeHtml(user.fullName || "-")}</td>
      <td>₦${escapeHtml(payout.amount ?? "-")}</td>
      <td>₦${escapeHtml(wallet.balance ?? "-")}</td>
      <td>${escapeHtml(payout.status || "-")}</td>
      <td>${escapeHtml(formatDateTime(payout.createdAt))}</td>
      <td>
        <button class="btn success small mark-payout-paid-btn" data-id="${escapeHtml(payout.id)}">
          Mark Paid
        </button>
      </td>
    `;

    payoutsTbody.appendChild(tr);
  });

  bindPayoutActions();
}

function bindPayoutActions() {
  document.querySelectorAll(".mark-payout-paid-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const payoutId = btn.getAttribute("data-id");
      if (!payoutId) return;

      const confirmed = window.confirm(
        "Mark this cashout as paid? This will debit the driver's wallet.",
      );

      if (!confirmed) return;

      await handleMarkPayoutPaid(payoutId);
    });
  });
}

async function handleMarkPayoutPaid(payoutId) {
  const token = getAdminToken();

  if (!token) {
    window.location.href = "./login.html";
    return;
  }

  try {
    setStatus("Marking payout as paid...", "info");

    const res = await fetch(`${API_BASE}/admin/payouts/${payoutId}/mark-paid`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.message || "Failed to mark payout as paid");
    }

    setStatus(data.message || "Payout marked as paid.", "success");

    await loadPayouts();
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Failed to mark payout as paid.", "error");
  }
}

function initPayoutsPage() {
  const refreshBtn = $("refreshBtn");
  const logoutBtn = $("logoutBtn");

  refreshBtn?.addEventListener("click", async () => {
    await loadPayouts();
  });

  logoutBtn?.addEventListener("click", () => {
    clearAdminSession();
    window.location.href = "./login.html";
  });

  loadPayouts();
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

  bindTripFilterControls();
  bindStatCardClicks();

  refreshBtn?.addEventListener("click", async () => {
    await loadTrips();
  });

  logoutBtn?.addEventListener("click", () => {
    stopTripsAutoRefresh();
    clearAdminSession();
    window.location.href = "./login.html";
  });

  loadTrips().then(() => {
    startTripsAutoRefresh(15000);
  });

  window.addEventListener("beforeunload", stopTripsAutoRefresh);
}

function initTripDetailPage() {
  const refreshBtn = $("refreshBtn");
  const logoutBtn = $("logoutBtn");
  const backBtn = $("backBtn");
  const waiveTripBtn = $("waiveTripBtn");
  const cancelTripBtn = $("cancelTripBtn");
  const assignDriverBtn = $("assignDriverBtn");
  const startTripBtn = $("startTripBtn");
  const completeTripBtn = $("completeTripBtn");

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

  waiveTripBtn?.addEventListener("click", async () => {
    await handleTripDetailWaive();
  });

  cancelTripBtn?.addEventListener("click", async () => {
    await handleTripDetailCancel();
  });

  assignDriverBtn?.addEventListener("click", async () => {
    await handleAssignDriver();
  });

  startTripBtn?.addEventListener("click", async () => {
    await handleStartTrip();
  });

  completeTripBtn?.addEventListener("click", async () => {
    await handleCompleteTrip();
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

  if (page === "payouts") {
    initPayoutsPage();
  }
});