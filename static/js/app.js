/* ───────────────────────────────────────────────────────
   MIRA — Frontend Application Logic
──────────────────────────────────────────────────────── */

"use strict";

// ── State ─────────────────────────────────────────────
let patients = [];
let deleteTargetId = null;

// ── DOM refs ──────────────────────────────────────────
const patientBody    = document.getElementById("patientBody");
const emptyRow       = document.getElementById("emptyRow");
const searchInput    = document.getElementById("searchInput");
const statTotal      = document.getElementById("statTotal");
const statToday      = document.getElementById("statToday");

const modalOverlay   = document.getElementById("modalOverlay");
const modal          = document.getElementById("modal");
const modalTitle     = document.getElementById("modalTitle");
const formError      = document.getElementById("formError");
const btnSave        = document.getElementById("btnSave");
const btnSaveText    = document.getElementById("btnSaveText");
const btnSaveSpinner = document.getElementById("btnSaveSpinner");
const remarksGroup   = document.getElementById("remarksGroup");
const remarksBox     = document.getElementById("remarksBox");

const confirmOverlay = document.getElementById("confirmOverlay");
const confirmName    = document.getElementById("confirmName");
const confirmDelete  = document.getElementById("confirmDelete");

const viewOverlay    = document.getElementById("viewOverlay");
const viewBody       = document.getElementById("viewBody");

// ── Helpers ───────────────────────────────────────────
function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => { el.className = "toast"; }, 3200);
}

function fmtDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function valueBadge(val, low, high) {
  const n = parseFloat(val);
  let cls = "val-normal";
  if (n > high) cls = "val-high";
  else if (n < low) cls = "val-low";
  return `<span class="val-badge ${cls}">${n.toFixed(1)}</span>`;
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ── Render table ──────────────────────────────────────
function renderTable(list) {
  // Remove existing data rows (not emptyRow)
  [...patientBody.querySelectorAll("tr:not(#emptyRow)")].forEach(r => r.remove());

  if (list.length === 0) {
    emptyRow.style.display = "";
    return;
  }
  emptyRow.style.display = "none";

  list.forEach((p, i) => {
    const tr = document.createElement("tr");
    const shortRemark = p.remarks
      ? `<span class="remarks-short">${p.remarks}</span>`
      : `<span style="color:#94a3b8">Pending</span>`;

    tr.innerHTML = `
      <td style="color:var(--muted);font-size:.8rem">${i + 1}</td>
      <td>
        <div class="patient-name">${esc(p.full_name)}</div>
        <div class="patient-email">${esc(p.email)}</div>
      </td>
      <td>${fmtDate(p.dob)}</td>
      <td>${valueBadge(p.glucose, 70, 99)}</td>
      <td>${valueBadge(p.haemoglobin, 12, 17.5)}</td>
      <td>${valueBadge(p.cholesterol, 0, 199)}</td>
      <td class="remarks-cell">${shortRemark}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="View" data-action="view" data-id="${p.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon" title="Edit" data-action="edit" data-id="${p.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" title="Delete" data-action="delete" data-id="${p.id}" data-name="${esc(p.full_name)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    `;
    patientBody.appendChild(tr);
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateStats() {
  statTotal.textContent = patients.length;
  const today = todayStr();
  const todayCount = patients.filter(p =>
    p.created_at && p.created_at.startsWith(today)
  ).length;
  statToday.textContent = todayCount;
}

// ── Load all patients ─────────────────────────────────
async function loadPatients() {
  try {
    const res = await fetch("/api/patients");
    patients = await res.json();
    const query = searchInput.value.toLowerCase();
    const filtered = query
      ? patients.filter(p =>
          p.full_name.toLowerCase().includes(query) ||
          p.email.toLowerCase().includes(query))
      : patients;
    renderTable(filtered);
    updateStats();
  } catch (e) {
    toast("Failed to load patients", "error");
  }
}

// ── Open / close modal ────────────────────────────────
function openModal(titleText, patient = null) {
  modalTitle.textContent = titleText;
  formError.style.display = "none";
  remarksGroup.style.display = "none";

  document.getElementById("fieldId").value    = patient ? patient.id    : "";
  document.getElementById("fieldName").value  = patient ? patient.full_name : "";
  document.getElementById("fieldDob").value   = patient ? patient.dob   : "";
  document.getElementById("fieldEmail").value = patient ? patient.email : "";
  document.getElementById("fieldGlucose").value = patient ? patient.glucose  : "";
  document.getElementById("fieldHaemo").value   = patient ? patient.haemoglobin : "";
  document.getElementById("fieldChol").value    = patient ? patient.cholesterol : "";

  if (patient && patient.remarks) {
    remarksBox.textContent = patient.remarks;
    remarksGroup.style.display = "";
  }

  btnSaveText.textContent = patient
    ? "Re-run AI Assessment & Save"
    : "Generate AI Assessment & Save";

  modalOverlay.classList.add("open");
  document.getElementById("fieldName").focus();
}

function closeModal() { modalOverlay.classList.remove("open"); }

// ── Save (create / update) ────────────────────────────
async function savePatient() {
  formError.style.display = "none";

  const id          = document.getElementById("fieldId").value;
  const full_name   = document.getElementById("fieldName").value.trim();
  const dob         = document.getElementById("fieldDob").value;
  const email       = document.getElementById("fieldEmail").value.trim();
  const glucose     = document.getElementById("fieldGlucose").value;
  const haemoglobin = document.getElementById("fieldHaemo").value;
  const cholesterol = document.getElementById("fieldChol").value;

  const payload = { full_name, dob, email, glucose, haemoglobin, cholesterol };

  // Client-side quick checks before hitting server
  if (!full_name) { showFormError("Full name is required."); return; }
  if (!dob)       { showFormError("Date of birth is required."); return; }
  if (!email)     { showFormError("Email address is required."); return; }

  setBusy(true);

  try {
    const url    = id ? `/api/patients/${id}` : "/api/patients";
    const method = id ? "PUT" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      showFormError(data.error || "Something went wrong.");
      return;
    }

    // Show the AI remark inside the still-open modal briefly
    if (data.remarks) {
      remarksBox.textContent = data.remarks;
      remarksGroup.style.display = "";
    }

    toast(id ? "Patient updated successfully." : "Patient added successfully.", "success");
    await loadPatients();
    setTimeout(closeModal, 800);

  } catch (e) {
    showFormError("Network error — please try again.");
  } finally {
    setBusy(false);
  }
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.style.display = "";
}

function setBusy(busy) {
  btnSave.disabled = busy;
  btnSaveText.style.display = busy ? "none" : "";
  btnSaveSpinner.style.display = busy ? "" : "none";
}

// ── View patient ──────────────────────────────────────
function openView(patient) {
  viewBody.innerHTML = `
    <div class="view-grid">
      <div class="view-field">
        <span class="view-label">Full Name</span>
        <span class="view-value">${esc(patient.full_name)}</span>
      </div>
      <div class="view-field">
        <span class="view-label">Date of Birth</span>
        <span class="view-value">${fmtDate(patient.dob)}</span>
      </div>
      <div class="view-field">
        <span class="view-label">Email Address</span>
        <span class="view-value">${esc(patient.email)}</span>
      </div>
      <div class="view-field">
        <span class="view-label">Added</span>
        <span class="view-value">${patient.created_at ? patient.created_at.split(" ")[0] : "—"}</span>
      </div>
      <div class="view-field">
        <span class="view-label">Glucose (mg/dL)</span>
        <span class="view-value">${valueBadge(patient.glucose, 70, 99)}</span>
      </div>
      <div class="view-field">
        <span class="view-label">Haemoglobin (g/dL)</span>
        <span class="view-value">${valueBadge(patient.haemoglobin, 12, 17.5)}</span>
      </div>
      <div class="view-field" style="grid-column:span 2">
        <span class="view-label">Cholesterol (mg/dL)</span>
        <span class="view-value">${valueBadge(patient.cholesterol, 0, 199)}</span>
      </div>
      <div class="view-remarks" style="grid-column:1/-1">
        <div class="view-ai-label">🤖 AI Health Assessment</div>
        ${patient.remarks || '<em style="color:#94a3b8">No assessment available.</em>'}
      </div>
    </div>
  `;
  viewOverlay.classList.add("open");
}

// ── Delete ────────────────────────────────────────────
async function doDelete() {
  if (!deleteTargetId) return;
  try {
    const res = await fetch(`/api/patients/${deleteTargetId}`, { method: "DELETE" });
    if (!res.ok) { toast("Delete failed.", "error"); return; }
    toast("Patient deleted.", "success");
    confirmOverlay.classList.remove("open");
    deleteTargetId = null;
    await loadPatients();
  } catch (e) {
    toast("Network error.", "error");
  }
}

// ── Event delegation for table buttons ────────────────
patientBody.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const patient = patients.find(p => p.id === id);
  if (!patient) return;

  const action = btn.dataset.action;
  if (action === "view") {
    openView(patient);
  } else if (action === "edit") {
    openModal("Edit Patient", patient);
  } else if (action === "delete") {
    deleteTargetId = id;
    confirmName.textContent = patient.full_name;
    confirmOverlay.classList.add("open");
  }
});

// ── Wire up buttons ───────────────────────────────────
document.getElementById("btnNew").addEventListener("click", () => openModal("New Patient"));
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("btnCancel").addEventListener("click", closeModal);
document.getElementById("btnSave").addEventListener("click", savePatient);

document.getElementById("confirmCancel").addEventListener("click", () => {
  confirmOverlay.classList.remove("open");
  deleteTargetId = null;
});
document.getElementById("confirmDelete").addEventListener("click", doDelete);
document.getElementById("viewClose").addEventListener("click",  () => viewOverlay.classList.remove("open"));
document.getElementById("viewClose2").addEventListener("click", () => viewOverlay.classList.remove("open"));

// Close overlay on background click
[modalOverlay, confirmOverlay, viewOverlay].forEach(ov => {
  ov.addEventListener("click", (e) => {
    if (e.target === ov) ov.classList.remove("open");
  });
});

// Search
searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();
  const filtered = q
    ? patients.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q))
    : patients;
  renderTable(filtered);
});

// ── Init ──────────────────────────────────────────────
loadPatients();
