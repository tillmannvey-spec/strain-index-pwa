import { filterStrains, uniqueValues } from "./logic/filter.js";
import { buildImportReviewRows } from "./logic/import-review.js";
import { parseStrainText } from "./logic/parse.js";
import { parseResearchInput } from "./logic/research.js";
import { parseWithLlm, researchStrainsWithLlm } from "./llm.js";
import { loadSettings, loadStrains, saveSettings, saveStrains } from "./storage.js";

const state = {
  strains: [],
  settings: loadSettings(),
  filters: {
    search: "",
    manufacturer: "",
    effect: "",
    medical: ""
  },
  selectedId: null,
  editingId: null,
  pendingImportedProfile: null,
  pendingLocalProfile: null,
  pendingLlmProfile: null,
  usedLlmImport: false,
  pendingResearchProfiles: [],
  importSource: ""
};

const dom = {
  grid: document.querySelector("#strainGrid"),
  search: document.querySelector("#searchInput"),
  toggleFilter: document.querySelector("#toggleFilterBtn"),
  filterPanel: document.querySelector("#filterPanel"),
  manufacturer: document.querySelector("#manufacturerFilter"),
  effect: document.querySelector("#effectFilter"),
  medical: document.querySelector("#medicalFilter"),
  count: document.querySelector("#strainCount"),
  quickAddBtn: document.querySelector("#quickAddBtn"),
  detailDialog: document.querySelector("#detailDialog"),
  detailContent: document.querySelector("#detailContent"),
  quickActionsDialog: document.querySelector("#quickActionsDialog"),
  quickResearchBtn: document.querySelector("#quickResearchBtn"),
  quickImportBtn: document.querySelector("#quickImportBtn"),
  quickCreateBtn: document.querySelector("#quickCreateBtn"),
  researchDialog: document.querySelector("#researchDialog"),
  researchForm: document.querySelector("#researchForm"),
  researchInput: document.querySelector("#researchInput"),
  researchStatus: document.querySelector("#researchStatus"),
  researchReviewDialog: document.querySelector("#researchReviewDialog"),
  researchReviewForm: document.querySelector("#researchReviewForm"),
  researchReviewList: document.querySelector("#researchReviewList"),
  strainDialog: document.querySelector("#strainDialog"),
  importDialog: document.querySelector("#importDialog"),
  importReviewDialog: document.querySelector("#importReviewDialog"),
  importReviewSource: document.querySelector("#importReviewSource"),
  importReviewContent: document.querySelector("#importReviewContent"),
  importReviewEditBtn: document.querySelector("#importReviewEditBtn"),
  strainForm: document.querySelector("#strainForm"),
  importForm: document.querySelector("#importForm"),
  importText: document.querySelector("#importText"),
  terpeneRows: document.querySelector("#terpeneRows"),
  addTerpeneBtn: document.querySelector("#addTerpeneBtn"),
  imageInput: document.querySelector("#imageInput"),
  imageValue: document.querySelector("#imageValue"),
  imagePreview: document.querySelector("#imagePreview"),
  saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
  settingsUseLlm: document.querySelector("#settingsUseLlm"),
  settingsApiKey: document.querySelector("#settingsApiKey"),
  settingsModel: document.querySelector("#settingsModel"),
  settingsEndpoint: document.querySelector("#settingsEndpoint"),
  importStatus: document.querySelector("#importStatus")
};

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return String(value)
    .replace(/[•∙]/g, ",")
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeTerpenes(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((terpene) => ({
      name: String(terpene?.name || "").trim(),
      amount: String(terpene?.amount || "").trim(),
      effects: normalizeArray(terpene?.effects)
    }))
    .filter((terpene) => terpene.name);
}

function normalizeProfile(profile = {}) {
  return {
    id: profile.id || "",
    name: String(profile.name || "").trim(),
    manufacturer: String(profile.manufacturer || "").trim(),
    genetics: String(profile.genetics || "").trim(),
    thc: String(profile.thc || "").trim(),
    cbd: String(profile.cbd || "").trim(),
    cultivation: String(profile.cultivation || "").trim(),
    terpenes: normalizeTerpenes(profile.terpenes),
    effects: normalizeArray(profile.effects),
    aromaFlavor: normalizeArray(profile.aromaFlavor),
    overallEffect: String(profile.overallEffect || "").trim(),
    onsetDuration: String(profile.onsetDuration || "").trim(),
    characteristic: String(profile.characteristic || "").trim(),
    medicalApplications: normalizeArray(profile.medicalApplications),
    communityFeedback: String(profile.communityFeedback || "").trim(),
    notes: String(profile.notes || "").trim(),
    image: String(profile.image || "").trim(),
    createdAt: profile.createdAt || new Date().toISOString()
  };
}

function slugify(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 36);
  return cleaned || `strain-${Date.now()}`;
}

function upsertStrain(profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized.id) {
    normalized.id = slugify(normalized.name);
  }
  const index = state.strains.findIndex((strain) => strain.id === normalized.id);
  if (index >= 0) {
    state.strains[index] = normalized;
  } else {
    state.strains.unshift(normalized);
  }
  saveStrains(state.strains);
  return normalized.id;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getStrainType(strain) {
  const g = (strain.genetics || "").toLowerCase();
  if (/\bsativa\b/.test(g)) return "sativa";
  if (/\bindica\b/.test(g)) return "indica";
  return "hybrid";
}

function getStrainTypeLabel(strain) {
  const type = getStrainType(strain);
  if (type === "sativa") return "Sativa";
  if (type === "indica") return "Indica";
  return "Hybrid";
}

function buildTagList(values, emptyText) {
  if (!values.length) {
    return `<span class="tag tag-muted">${escapeHtml(emptyText)}</span>`;
  }
  return values.map((value) => `<span class="tag">${escapeHtml(value)}</span>`).join("");
}

function renderText(value, fallback = "k.A.") {
  const text = String(value || "").trim();
  if (!text) {
    return `<p>${escapeHtml(fallback)}</p>`;
  }
  return text
    .split(/\n+/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function renderBulletList(values, fallback = "Keine Eintraege") {
  if (!values.length) {
    return `<p>${escapeHtml(fallback)}</p>`;
  }
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function renderFilterOptions() {
  const setOptions = (select, values, label) => {
    const current = select.value;
    select.innerHTML = `<option value="">${label}</option>${values
      .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join("")}`;
    select.value = values.includes(current) ? current : "";
  };
  setOptions(dom.manufacturer, uniqueValues(state.strains, "manufacturer"), "Alle Hersteller");
  setOptions(dom.effect, uniqueValues(state.strains, "effects"), "Alle Wirkungen");
  setOptions(dom.medical, uniqueValues(state.strains, "medicalApplications"), "Alle medizinischen Wirkungen");
}

function setFilterPanelVisible(visible) {
  dom.filterPanel.hidden = !visible;
  dom.toggleFilter.setAttribute("aria-expanded", visible ? "true" : "false");
}

function currentFilteredStrains() {
  return filterStrains(state.strains, state.filters);
}

function renderCard(strain) {
  const type = getStrainType(strain);
  const label = getStrainTypeLabel(strain);
  const isActive = strain.id === state.selectedId;
  return `
    <article class="card${isActive ? " card-active" : ""}" data-id="${escapeHtml(strain.id)}" data-type="${type}">
      <div class="card-name">${escapeHtml(strain.name)}</div>
      <div class="card-meta">
        <span class="card-thc">${escapeHtml(strain.thc || "—")}</span>
        <span class="card-type" data-type="${type}">${escapeHtml(label)}</span>
      </div>
    </article>
  `;
}

function renderStrains() {
  const filtered = currentFilteredStrains();
  dom.count.textContent = `${filtered.length} Strains`;
  if (!filtered.length) {
    dom.grid.innerHTML = `<p class="empty-state">Keine Treffer. Passe Filter oder Suche an.</p>`;
    return;
  }
  dom.grid.innerHTML = filtered.map((strain) => renderCard(strain)).join("");
}

function findSelectedStrain() {
  if (!state.selectedId) return null;
  return state.strains.find((strain) => strain.id === state.selectedId) || null;
}

function renderTerpeneTable(terpenes) {
  if (!terpenes.length) {
    return `<p>Keine Terpene hinterlegt.</p>`;
  }
  return `<div class="terpene-list">${terpenes
    .map(
      (item) => `
        <div>
          <div class="terpene-item">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.amount || "k.A.")}</span>
          </div>
          ${item.effects.length ? `<div class="terpene-effects">${escapeHtml(item.effects.join(", "))}</div>` : ""}
        </div>
      `
    )
    .join("")}</div>`;
}

function renderProfile() {
  const strain = findSelectedStrain();
  if (!strain) {
    dom.detailContent.innerHTML = "";
    return;
  }

  const type = getStrainType(strain);
  const label = getStrainTypeLabel(strain);

  dom.detailContent.innerHTML = `
    <div class="detail-hero">
      <span class="detail-type" data-type="${type}">${escapeHtml(label)}</span>
      <h2 class="detail-name">${escapeHtml(strain.name)}</h2>
      <div class="detail-subtitle">
        <span>${escapeHtml(strain.manufacturer || "Unbekannter Hersteller")}</span>
        <span class="sep">/</span>
        <span>THC ${escapeHtml(strain.thc || "k.A.")}</span>
        ${strain.cbd ? `<span class="sep">/</span><span>CBD ${escapeHtml(strain.cbd)}</span>` : ""}
      </div>
    </div>
    <div class="detail-actions">
      <button class="ghost-btn small" data-action="edit">Bearbeiten</button>
      <button class="ghost-btn small danger" data-action="delete">Löschen</button>
    </div>
    <div class="detail-sections">
      <section class="detail-section">
        <h3>Steckbrief</h3>
        <dl class="kv-grid">
          <dt>Genetik</dt><dd>${escapeHtml(strain.genetics || "k.A.")}</dd>
          <dt>Anbau</dt><dd>${escapeHtml(strain.cultivation || "k.A.")}</dd>
        </dl>
      </section>
      <section class="detail-section">
        <h3>Wirkung</h3>
        <div class="tag-row">${buildTagList(strain.effects, "Keine Eintraege")}</div>
        ${strain.overallEffect ? `<p><strong>Gesamtwirkung:</strong></p>${renderText(strain.overallEffect)}` : ""}
        ${strain.onsetDuration ? `<p><strong>Onset & Dauer:</strong></p>${renderText(strain.onsetDuration)}` : ""}
      </section>
      <section class="detail-section">
        <h3>Aroma & Charakteristik</h3>
        <div class="tag-row">${buildTagList(strain.aromaFlavor, "Keine Eintraege")}</div>
        ${strain.characteristic ? renderText(strain.characteristic) : ""}
      </section>
      <section class="detail-section">
        <h3>Medizinische Anwendungen</h3>
        ${renderBulletList(strain.medicalApplications)}
      </section>
      <section class="detail-section">
        <h3>Terpenprofil</h3>
        ${renderTerpeneTable(strain.terpenes)}
      </section>
      <section class="detail-section">
        <h3>Community-Feedback</h3>
        ${renderText(strain.communityFeedback, "Noch kein Feedback.")}
      </section>
      <section class="detail-section">
        <h3>Notizen</h3>
        ${renderText(strain.notes, "Keine Notizen.")}
      </section>
    </div>
  `;
}

function openDetailDialog(strainId) {
  state.selectedId = strainId;
  renderProfile();
  renderStrains();
  dom.detailDialog.showModal();
}

function renderAll() {
  renderFilterOptions();
  renderStrains();
}

function resetStrainForm() {
  dom.strainForm.reset();
  dom.terpeneRows.innerHTML = "";
  dom.imageValue.value = "";
  dom.imagePreview.src = "";
  dom.imagePreview.classList.add("hidden");
  state.editingId = null;
  addTerpeneRow();
  syncAutoGrow(dom.strainForm);
}

function addTerpeneRow(value = { name: "", amount: "", effects: [] }) {
  const row = document.createElement("div");
  row.className = "terpene-input-row";
  row.innerHTML = `
    <input type="text" placeholder="Name" data-terpene-name value="${escapeHtml(value.name)}">
    <input type="text" placeholder="Anteil (z.B. 0.4%)" data-terpene-amount value="${escapeHtml(value.amount)}">
    <input type="text" placeholder="Wirkungen (comma separated)" data-terpene-effects value="${escapeHtml(
      (value.effects || []).join(", ")
    )}">
    <button type="button" class="ghost-btn small danger" data-remove-terpene>Entfernen</button>
  `;
  dom.terpeneRows.appendChild(row);
}

function openStrainDialog(profile = null) {
  resetStrainForm();
  if (profile) {
    state.editingId = profile.id;
    dom.strainForm.elements.name.value = profile.name;
    dom.strainForm.elements.manufacturer.value = profile.manufacturer;
    dom.strainForm.elements.genetics.value = profile.genetics;
    dom.strainForm.elements.thc.value = profile.thc;
    dom.strainForm.elements.cbd.value = profile.cbd;
    dom.strainForm.elements.cultivation.value = profile.cultivation;
    dom.strainForm.elements.effects.value = profile.effects.join("\n");
    dom.strainForm.elements.aromaFlavor.value = profile.aromaFlavor.join("\n");
    dom.strainForm.elements.overallEffect.value = profile.overallEffect;
    dom.strainForm.elements.onsetDuration.value = profile.onsetDuration;
    dom.strainForm.elements.characteristic.value = profile.characteristic;
    dom.strainForm.elements.medicalApplications.value = profile.medicalApplications.join("\n");
    dom.strainForm.elements.communityFeedback.value = profile.communityFeedback;
    dom.strainForm.elements.notes.value = profile.notes;
    dom.imageValue.value = profile.image || "";
    if (profile.image) {
      dom.imagePreview.src = profile.image;
      dom.imagePreview.classList.remove("hidden");
    }
    dom.terpeneRows.innerHTML = "";
    if (profile.terpenes.length) {
      profile.terpenes.forEach((terpene) => addTerpeneRow(terpene));
    } else {
      addTerpeneRow();
    }
  }
  dom.strainDialog.showModal();
  syncAutoGrow(dom.strainForm);
}

function closeDialog(dialog) {
  if (dialog?.open) {
    dialog.close();
  }
}

function formToProfile() {
  const terpenes = Array.from(dom.terpeneRows.querySelectorAll(".terpene-input-row"))
    .map((row) => ({
      name: row.querySelector("[data-terpene-name]").value.trim(),
      amount: row.querySelector("[data-terpene-amount]").value.trim(),
      effects: normalizeArray(row.querySelector("[data-terpene-effects]").value)
    }))
    .filter((item) => item.name);

  return normalizeProfile({
    id: state.editingId || "",
    name: dom.strainForm.elements.name.value,
    manufacturer: dom.strainForm.elements.manufacturer.value,
    genetics: dom.strainForm.elements.genetics.value,
    thc: dom.strainForm.elements.thc.value,
    cbd: dom.strainForm.elements.cbd.value,
    cultivation: dom.strainForm.elements.cultivation.value,
    terpenes,
    effects: dom.strainForm.elements.effects.value,
    aromaFlavor: dom.strainForm.elements.aromaFlavor.value,
    overallEffect: dom.strainForm.elements.overallEffect.value,
    onsetDuration: dom.strainForm.elements.onsetDuration.value,
    characteristic: dom.strainForm.elements.characteristic.value,
    medicalApplications: dom.strainForm.elements.medicalApplications.value,
    communityFeedback: dom.strainForm.elements.communityFeedback.value,
    notes: dom.strainForm.elements.notes.value,
    image: dom.imageValue.value
  });
}

function mergeProfiles(base, override) {
  const normalizedBase = normalizeProfile(base);
  const normalizedOverride = normalizeProfile(override);
  const merged = { ...normalizedBase };
  Object.keys(merged).forEach((key) => {
    const next = normalizedOverride[key];
    if (Array.isArray(next)) {
      if (next.length > 0) {
        merged[key] = next;
      }
      return;
    }
    if (typeof next === "string" && next.trim()) {
      merged[key] = next.trim();
    }
  });
  return merged;
}

function confidenceClass(confidence) {
  if (confidence === "Hoch") return "high";
  if (confidence === "Mittel") return "medium";
  return "low";
}

function renderImportReview() {
  const rows = buildImportReviewRows(
    state.pendingLocalProfile || {},
    state.pendingLlmProfile || {},
    state.pendingImportedProfile || {},
    state.usedLlmImport
  );

  if (!rows.length) {
    dom.importReviewContent.innerHTML = `<p class="empty-state">Keine auswertbaren Felder erkannt.</p>`;
    return;
  }

  dom.importReviewContent.innerHTML = rows
    .map((row) => {
      const localDiff = row.localValue ? `Lokal: ${escapeHtml(row.localValue)}` : "Lokal: -";
      const llmDiff = state.usedLlmImport ? `Gemini: ${escapeHtml(row.llmValue || "-")}` : "Gemini: deaktiviert";
      return `
        <article class="import-row">
          <div class="import-row-head">
            <h4>${escapeHtml(row.label)}</h4>
            <span class="meta-chip ${confidenceClass(row.confidence)}">${escapeHtml(row.source)} · ${escapeHtml(row.confidence)}</span>
          </div>
          <p class="import-value">${escapeHtml(row.value)}</p>
          <p class="import-diff">${localDiff}<br>${llmDiff}</p>
        </article>
      `;
    })
    .join("");
}

function renderResearchReview() {
  const profiles = state.pendingResearchProfiles;
  if (!profiles.length) {
    dom.researchReviewList.innerHTML = `<p class="empty-state">Keine Profile gefunden.</p>`;
    return;
  }

  dom.researchReviewList.innerHTML = profiles
    .map((profile, index) => {
      const p = normalizeProfile(profile);
      return `
        <label class="research-item">
          <input type="checkbox" name="researchPick" value="${index}" checked>
          <div>
            <strong>${escapeHtml(p.name || `Strain ${index + 1}`)}</strong>
            <p>${escapeHtml(p.manufacturer || "Hersteller k.A.")}</p>
            <p>${escapeHtml([p.thc ? `THC ${p.thc}` : "", p.cbd ? `CBD ${p.cbd}` : ""].filter(Boolean).join(" / ") || "THC/CBD k.A.")}</p>
            <p>${escapeHtml(p.effects.slice(0, 5).join(", ") || "Keine Wirkungsdaten")}</p>
          </div>
        </label>
      `;
    })
    .join("");
}

async function handleImport(event) {
  event.preventDefault();
  const text = dom.importText.value.trim();
  if (!text) {
    dom.importStatus.textContent = "Bitte fuege zuerst den Import-Text ein.";
    dom.importStatus.dataset.variant = "error";
    return;
  }

  dom.importStatus.textContent = "Analysiere Text...";
  dom.importStatus.dataset.variant = "working";

  const localProfile = normalizeProfile(parseStrainText(text));
  let llmProfile = null;
  let profile = localProfile;
  let source = "Lokaler Parser";
  let usedLlm = false;

  if (state.settings.useLlmImport) {
    try {
      llmProfile = normalizeProfile(await parseWithLlm(text, state.settings));
      profile = mergeProfiles(profile, llmProfile);
      source = "Lokaler Parser + Gemini";
      usedLlm = true;
      dom.importStatus.textContent = "Import analysiert. Bitte Review pruefen.";
      dom.importStatus.dataset.variant = "success";
    } catch (error) {
      dom.importStatus.textContent = `${error.message} Fallback auf lokalen Parser genutzt.`;
      dom.importStatus.dataset.variant = "error";
    }
  } else {
    dom.importStatus.textContent = "Lokaler Parser genutzt. Bitte Review pruefen.";
    dom.importStatus.dataset.variant = "success";
  }

  state.pendingImportedProfile = normalizeProfile(profile);
  state.pendingLocalProfile = localProfile;
  state.pendingLlmProfile = llmProfile;
  state.usedLlmImport = usedLlm;
  state.importSource = source;
  dom.importReviewSource.textContent = `Quelle: ${source}`;
  renderImportReview();
  dom.importReviewDialog.showModal();
}

async function handleResearch(event) {
  event.preventDefault();
  const names = parseResearchInput(dom.researchInput.value);
  if (!names.length) {
    dom.researchStatus.textContent = "Bitte mindestens einen Strain-Namen eingeben.";
    dom.researchStatus.dataset.variant = "error";
    return;
  }

  dom.researchStatus.textContent = "Starte Gemini Research...";
  dom.researchStatus.dataset.variant = "working";

  try {
    const researched = await researchStrainsWithLlm(names, state.settings);
    state.pendingResearchProfiles = researched.map((profile, index) => {
      const normalized = normalizeProfile(profile);
      if (!normalized.name) {
        normalized.name = names[index] || "";
      }
      return normalized;
    });
    dom.researchStatus.textContent = `${state.pendingResearchProfiles.length} Profile gefunden.`;
    dom.researchStatus.dataset.variant = "success";
    renderResearchReview();
    closeDialog(dom.researchDialog);
    dom.researchReviewDialog.showModal();
  } catch (error) {
    dom.researchStatus.textContent = error.message;
    dom.researchStatus.dataset.variant = "error";
  }
}

function handleCardSelection(event) {
  const card = event.target.closest(".card");
  if (!card) return;
  openDetailDialog(card.dataset.id);
}

function autoGrowTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 44)}px`;
}

function syncAutoGrow(root = document) {
  root.querySelectorAll("textarea[data-autogrow]").forEach((textarea) => autoGrowTextarea(textarea));
}

function wireEvents() {
  dom.search.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderStrains();
  });
  dom.manufacturer.addEventListener("change", (event) => {
    state.filters.manufacturer = event.target.value;
    renderStrains();
  });
  dom.effect.addEventListener("change", (event) => {
    state.filters.effect = event.target.value;
    renderStrains();
  });
  dom.medical.addEventListener("change", (event) => {
    state.filters.medical = event.target.value;
    renderStrains();
  });

  dom.toggleFilter.addEventListener("click", () => {
    setFilterPanelVisible(dom.filterPanel.hidden);
  });

  dom.grid.addEventListener("click", handleCardSelection);

  dom.detailContent.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    const strain = findSelectedStrain();
    if (!strain) return;
    if (action === "edit") {
      closeDialog(dom.detailDialog);
      openStrainDialog(strain);
      return;
    }
    if (action === "delete") {
      const confirmDelete = confirm(`Strain "${strain.name}" wirklich loeschen?`);
      if (!confirmDelete) return;
      state.strains = state.strains.filter((item) => item.id !== strain.id);
      saveStrains(state.strains);
      state.selectedId = null;
      closeDialog(dom.detailDialog);
      renderAll();
    }
  });

  dom.quickAddBtn.addEventListener("click", () => {
    dom.quickActionsDialog.showModal();
  });

  dom.quickCreateBtn.addEventListener("click", () => {
    closeDialog(dom.quickActionsDialog);
    openStrainDialog();
  });

  dom.quickResearchBtn.addEventListener("click", () => {
    closeDialog(dom.quickActionsDialog);
    dom.researchStatus.textContent = "";
    dom.researchStatus.dataset.variant = "";
    dom.researchInput.value = "";
    dom.researchDialog.showModal();
  });

  dom.quickImportBtn.addEventListener("click", () => {
    closeDialog(dom.quickActionsDialog);
    dom.importDialog.showModal();
    syncAutoGrow(dom.importDialog);
  });

  dom.addTerpeneBtn.addEventListener("click", () => addTerpeneRow());
  dom.terpeneRows.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("[data-remove-terpene]");
    if (!removeBtn) return;
    removeBtn.closest(".terpene-input-row").remove();
    if (!dom.terpeneRows.querySelector(".terpene-input-row")) {
      addTerpeneRow();
    }
  });

  dom.imageInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    dom.imageValue.value = dataUrl;
    dom.imagePreview.src = dataUrl;
    dom.imagePreview.classList.remove("hidden");
  });

  dom.strainForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const profile = formToProfile();
    if (!profile.name) {
      alert("Bitte mindestens einen Strain-Namen eintragen.");
      return;
    }
    const savedId = upsertStrain(profile);
    state.selectedId = savedId;
    closeDialog(dom.strainDialog);
    renderAll();
  });

  dom.importForm.addEventListener("submit", handleImport);
  dom.researchForm.addEventListener("submit", handleResearch);

  dom.researchReviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const picks = Array.from(dom.researchReviewForm.querySelectorAll("input[name='researchPick']:checked")).map((el) =>
      Number(el.value)
    );
    if (!picks.length) {
      alert("Bitte mindestens einen Strain auswaehlen.");
      return;
    }

    let lastId = null;
    picks.forEach((index) => {
      const profile = state.pendingResearchProfiles[index];
      if (!profile) {
        return;
      }
      lastId = upsertStrain(profile);
    });
    state.selectedId = lastId;
    saveStrains(state.strains);
    closeDialog(dom.researchReviewDialog);
    renderAll();
    if (lastId) {
      openDetailDialog(lastId);
    }
  });

  dom.importReviewEditBtn.addEventListener("click", () => {
    const imported = state.pendingImportedProfile;
    if (!imported) {
      closeDialog(dom.importReviewDialog);
      return;
    }
    closeDialog(dom.importReviewDialog);
    closeDialog(dom.importDialog);
    openStrainDialog(imported);
  });

  dom.saveSettingsBtn.addEventListener("click", () => {
    state.settings = {
      useLlmImport: dom.settingsUseLlm.checked,
      apiKey: dom.settingsApiKey.value.trim(),
      model: dom.settingsModel.value.trim() || "gemini-3-flash-preview",
      endpoint: dom.settingsEndpoint.value.trim() || "https://generativelanguage.googleapis.com/v1beta"
    };
    saveSettings(state.settings);
    dom.importStatus.textContent = "Import-Einstellungen gespeichert.";
    dom.importStatus.dataset.variant = "success";
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = button.closest("dialog");
      closeDialog(dialog);
    });
  });

  document.querySelectorAll("textarea[data-autogrow]").forEach((textarea) => {
    textarea.addEventListener("input", () => autoGrowTextarea(textarea));
  });
}

function renderSettings() {
  dom.settingsUseLlm.checked = Boolean(state.settings.useLlmImport);
  dom.settingsApiKey.value = state.settings.apiKey || "";
  dom.settingsModel.value = state.settings.model || "gemini-3-flash-preview";
  dom.settingsEndpoint.value = state.settings.endpoint || "https://generativelanguage.googleapis.com/v1beta";
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

async function init() {
  const loadedStrains = await loadStrains();
  state.strains = loadedStrains.map(normalizeProfile);
  wireEvents();
  renderSettings();
  setFilterPanelVisible(false);
  renderAll();
  syncAutoGrow(document);
  registerServiceWorker();
}

init();
