import { filterStrains, uniqueValues } from "./logic/filter.js";
import { IMPORT_TEMPLATE, validateImportText } from "./logic/import-template.js";
import { parseStrainText } from "./logic/parse.js";
import { parseWithLlm } from "./llm.js";
import { loadSettings, loadStrains, saveSettings, saveStrains } from "./storage.js";

const state = {
  strains: loadStrains().map(normalizeProfile),
  settings: loadSettings(),
  filters: {
    search: "",
    manufacturer: "",
    effect: "",
    medical: ""
  },
  selectedId: null,
  editingId: null
};

const dom = {
  grid: document.querySelector("#strainGrid"),
  profile: document.querySelector("#profilePanel"),
  search: document.querySelector("#searchInput"),
  manufacturer: document.querySelector("#manufacturerFilter"),
  effect: document.querySelector("#effectFilter"),
  medical: document.querySelector("#medicalFilter"),
  count: document.querySelector("#strainCount"),
  addButton: document.querySelector("#addStrainBtn"),
  importButton: document.querySelector("#importBtn"),
  installButton: document.querySelector("#installBtn"),
  strainDialog: document.querySelector("#strainDialog"),
  importDialog: document.querySelector("#importDialog"),
  strainForm: document.querySelector("#strainForm"),
  importForm: document.querySelector("#importForm"),
  importText: document.querySelector("#importText"),
  useTemplateBtn: document.querySelector("#useTemplateBtn"),
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

let deferredInstallPrompt = null;

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return String(value)
    .split(",")
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

function buildTagList(values, emptyText) {
  if (!values.length) {
    return `<span class="chip chip-muted">${escapeHtml(emptyText)}</span>`;
  }
  return values.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join("");
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

function currentFilteredStrains() {
  return filterStrains(state.strains, state.filters);
}

function renderGrid() {
  const filtered = currentFilteredStrains();
  dom.count.textContent = `${filtered.length} Strains`;
  if (!filtered.length) {
    dom.grid.innerHTML = `<p class="empty-state">Keine Treffer. Passe Filter oder Suche an.</p>`;
    return;
  }

  dom.grid.innerHTML = filtered
    .map((strain) => {
      const isActive = strain.id === state.selectedId;
      const image = strain.image
        ? `<img src="${strain.image}" alt="${escapeHtml(strain.name)}" class="card-image">`
        : `<div class="card-image card-image-fallback">${escapeHtml(strain.name.slice(0, 2).toUpperCase())}</div>`;
      const terpenes = strain.terpenes.slice(0, 3).map((item) => item.name).join(" • ");
      return `
        <article class="strain-card ${isActive ? "strain-card-active" : ""}" data-id="${escapeHtml(strain.id)}">
          ${image}
          <div class="card-body">
            <div class="card-title-row">
              <h3>${escapeHtml(strain.name)}</h3>
              <span>${escapeHtml(strain.thc || "n/a")}</span>
            </div>
            <p class="card-subtitle">${escapeHtml(strain.manufacturer || "Unbekannter Hersteller")}</p>
            <p class="card-subtitle">${escapeHtml(terpenes || "Terpenprofil folgt")}</p>
            <div class="chip-row">
              ${buildTagList(strain.effects.slice(0, 2), "Keine Wirkung")}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function findSelectedStrain() {
  if (!state.selectedId) {
    return null;
  }
  return state.strains.find((strain) => strain.id === state.selectedId) || null;
}

function renderTerpeneTable(terpenes) {
  if (!terpenes.length) {
    return `<p class="dimmed">Keine Terpene hinterlegt.</p>`;
  }
  return `<div class="terpene-table">${terpenes
    .map(
      (item) => `
        <div class="terpene-row">
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.amount || "k.A.")}</span>
          </div>
          <p>${escapeHtml(item.effects.join(", ") || "Keine Wirkungseinordnung")}</p>
        </div>
      `
    )
    .join("")}</div>`;
}

function renderProfile() {
  const strain = findSelectedStrain();
  if (!strain) {
    dom.profile.innerHTML = `
      <div class="profile-placeholder">
        <h2>Profilansicht</h2>
        <p>Waehle links einen Strain oder lege einen neuen an.</p>
      </div>
    `;
    return;
  }

  dom.profile.innerHTML = `
    <header class="profile-header">
      <div>
        <p class="eyebrow">Strain-Profil</p>
        <h2>${escapeHtml(strain.name)}</h2>
        <p>${escapeHtml(strain.manufacturer || "Unbekannter Hersteller")}</p>
      </div>
      <div class="profile-actions">
        <button class="ghost-btn" data-action="edit">Bearbeiten</button>
        <button class="ghost-btn danger" data-action="delete">Loeschen</button>
      </div>
    </header>
    <section class="profile-grid">
      <div class="info-card">
        <h3>Steckbrief</h3>
        <p><strong>Genetik:</strong> ${escapeHtml(strain.genetics || "k.A.")}</p>
        <p><strong>THC/CBD:</strong> ${escapeHtml(strain.thc || "k.A.")} / ${escapeHtml(strain.cbd || "k.A.")}</p>
        <p><strong>Anbau:</strong> ${escapeHtml(strain.cultivation || "k.A.")}</p>
      </div>
      <div class="info-card">
        <h3>Wirkung</h3>
        <div class="chip-row">${buildTagList(strain.effects, "Keine Eintraege")}</div>
        <p><strong>Gesamtwirkung:</strong> ${escapeHtml(strain.overallEffect || "k.A.")}</p>
        <p><strong>Onset & Dauer:</strong> ${escapeHtml(strain.onsetDuration || "k.A.")}</p>
      </div>
      <div class="info-card">
        <h3>Aroma & Charakteristik</h3>
        <div class="chip-row">${buildTagList(strain.aromaFlavor, "Keine Eintraege")}</div>
        <p><strong>Characteristic:</strong> ${escapeHtml(strain.characteristic || "k.A.")}</p>
      </div>
      <div class="info-card">
        <h3>Medizinische Anwendungen</h3>
        <div class="chip-row">${buildTagList(strain.medicalApplications, "Keine Eintraege")}</div>
      </div>
      <div class="info-card full">
        <h3>Terpenprofil</h3>
        ${renderTerpeneTable(strain.terpenes)}
      </div>
      <div class="info-card full">
        <h3>Community-Feedback</h3>
        <p>${escapeHtml(strain.communityFeedback || "Noch kein Feedback.")}</p>
      </div>
      <div class="info-card full">
        <h3>Notizen</h3>
        <p>${escapeHtml(strain.notes || "Keine Notizen.")}</p>
      </div>
    </section>
  `;
}

function renderAll() {
  renderFilterOptions();
  renderGrid();
  renderProfile();
}

function resetStrainForm() {
  dom.strainForm.reset();
  dom.terpeneRows.innerHTML = "";
  dom.imageValue.value = "";
  dom.imagePreview.src = "";
  dom.imagePreview.classList.add("hidden");
  state.editingId = null;
  addTerpeneRow();
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
    dom.strainForm.elements.effects.value = profile.effects.join(", ");
    dom.strainForm.elements.aromaFlavor.value = profile.aromaFlavor.join(", ");
    dom.strainForm.elements.overallEffect.value = profile.overallEffect;
    dom.strainForm.elements.onsetDuration.value = profile.onsetDuration;
    dom.strainForm.elements.characteristic.value = profile.characteristic;
    dom.strainForm.elements.medicalApplications.value = profile.medicalApplications.join(", ");
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
}

function closeDialog(dialog) {
  if (dialog.open) {
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

async function handleImport(event) {
  event.preventDefault();
  const text = dom.importText.value.trim();
  if (!text) {
    dom.importStatus.textContent = "Bitte fuege zuerst den Import-Text ein.";
    dom.importStatus.dataset.variant = "error";
    return;
  }

  const validation = validateImportText(text);
  if (!validation.valid) {
    dom.importStatus.textContent =
      `Template unvollstaendig. Fehlende Felder: ${validation.missing.slice(0, 5).join(", ")}${
        validation.missing.length > 5 ? "..." : ""
      }`;
    dom.importStatus.dataset.variant = "error";
    return;
  }

  dom.importStatus.textContent = "Analysiere Text...";
  dom.importStatus.dataset.variant = "working";

  let profile = parseStrainText(text);

  if (state.settings.useLlmImport) {
    try {
      const llmProfile = await parseWithLlm(text, state.settings);
      profile = mergeProfiles(profile, llmProfile);
      dom.importStatus.textContent = "Gemini-Import erfolgreich. Bitte kurz pruefen und speichern.";
      dom.importStatus.dataset.variant = "success";
    } catch (error) {
      dom.importStatus.textContent = `${error.message} Fallback auf lokalen Parser genutzt.`;
      dom.importStatus.dataset.variant = "error";
    }
  } else {
    dom.importStatus.textContent = "Lokaler Parser genutzt. Bitte Daten vor dem Speichern pruefen.";
    dom.importStatus.dataset.variant = "success";
  }

  closeDialog(dom.importDialog);
  openStrainDialog(normalizeProfile(profile));
}

function wireEvents() {
  dom.search.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderGrid();
  });
  dom.manufacturer.addEventListener("change", (event) => {
    state.filters.manufacturer = event.target.value;
    renderGrid();
  });
  dom.effect.addEventListener("change", (event) => {
    state.filters.effect = event.target.value;
    renderGrid();
  });
  dom.medical.addEventListener("change", (event) => {
    state.filters.medical = event.target.value;
    renderGrid();
  });

  dom.grid.addEventListener("click", (event) => {
    const card = event.target.closest(".strain-card");
    if (!card) {
      return;
    }
    state.selectedId = card.dataset.id;
    renderAll();
  });

  dom.profile.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) {
      return;
    }
    const strain = findSelectedStrain();
    if (!strain) {
      return;
    }
    if (action === "edit") {
      openStrainDialog(strain);
      return;
    }
    if (action === "delete") {
      const confirmDelete = confirm(`Strain "${strain.name}" wirklich loeschen?`);
      if (!confirmDelete) {
        return;
      }
      state.strains = state.strains.filter((item) => item.id !== strain.id);
      saveStrains(state.strains);
      state.selectedId = state.strains[0]?.id || null;
      renderAll();
    }
  });

  dom.addButton.addEventListener("click", () => openStrainDialog());
  dom.importButton.addEventListener("click", () => {
    dom.importStatus.textContent = "";
    dom.importStatus.dataset.variant = "";
    dom.importDialog.showModal();
  });

  dom.useTemplateBtn.addEventListener("click", () => {
    dom.importText.value = IMPORT_TEMPLATE;
    dom.importStatus.textContent = "Template eingesetzt. Felder ausfuellen und importieren.";
    dom.importStatus.dataset.variant = "success";
  });

  dom.addTerpeneBtn.addEventListener("click", () => addTerpeneRow());
  dom.terpeneRows.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("[data-remove-terpene]");
    if (!removeBtn) {
      return;
    }
    removeBtn.closest(".terpene-input-row").remove();
    if (!dom.terpeneRows.querySelector(".terpene-input-row")) {
      addTerpeneRow();
    }
  });

  dom.imageInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
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
}

function renderSettings() {
  dom.settingsUseLlm.checked = Boolean(state.settings.useLlmImport);
  dom.settingsApiKey.value = state.settings.apiKey || "";
  dom.settingsModel.value = state.settings.model || "gemini-3-flash-preview";
  dom.settingsEndpoint.value = state.settings.endpoint || "https://generativelanguage.googleapis.com/v1beta";
}

function setupPwaInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    dom.installButton.disabled = false;
  });

  dom.installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    dom.installButton.disabled = true;
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // No-op: app works without SW, install prompt still available in supported browsers.
    });
  }
}

function init() {
  wireEvents();
  renderSettings();
  state.selectedId = state.strains[0]?.id || null;
  renderAll();
  setupPwaInstall();
  registerServiceWorker();
}

init();
