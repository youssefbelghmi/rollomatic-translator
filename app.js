// ================================
// CONFIG
// ================================
const API_URL = "https://rollomatic-translator-api.onrender.com/translate";
const REQUEST_TIMEOUT_MS = 60000;

// Access key kept ONLY in memory (so it's requested again on each reload)
let ACCESS_KEY = "";

// ================================
// Helpers UI
// ================================
const el = (id) => document.getElementById(id);

function setStatus(msg) { el("status").textContent = msg || ""; }
function setError(msg) { el("error").textContent = msg || ""; }

function setGateError(msg) {
  const gateErr = el("gateError");
  if (gateErr) gateErr.textContent = msg || "";
}

function setOutput(text) {
  el("output").textContent = text || "";
  el("copyBtn").disabled = !text || text === "The translation will appear here.";
}

function setDraftOutput(text) {
  const draftEl = el("draftOutput");
  if (!text) {
    draftEl.textContent = "The draft translation will appear here.";
    draftEl.classList.add("mutedBox");
    el("copyDraftBtn").disabled = true;
    return;
  }
  draftEl.textContent = text;
  draftEl.classList.remove("mutedBox");
  el("copyDraftBtn").disabled = false;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setTerms(terms) {
  const box = el("termsBox");
  const copyBtn = el("copyTermsBtn");

  if (!Array.isArray(terms) || terms.length === 0) {
    box.textContent = "No glossary terms found for this text.";
    box.classList.add("mutedBox");
    copyBtn.disabled = true;
    return;
  }

  box.classList.remove("mutedBox");

  const ul = document.createElement("ul");
  ul.className = "termsList";

  for (const t of terms) {
    const li = document.createElement("li");
    li.className = "termPair";
    li.innerHTML = `<span class="termPair"><code>${escapeHtml(t.src_term)}</code> → <code>${escapeHtml(t.tgt_term)}</code></span>`;
    ul.appendChild(li);
  }

  box.innerHTML = "";
  box.appendChild(ul);
  copyBtn.disabled = false;
}

function updateCopyInputBtnState() {
  const txt = el("inputText").value.trim();
  el("copyInputBtn").disabled = !txt;
}

function swapLangs() {
  const src = el("srcLang");
  const tgt = el("tgtLang");
  const tmp = src.value;
  src.value = tgt.value;
  tgt.value = tmp;
}

function clearAll() {
  el("inputText").value = "";
  setOutput("The translation will appear here.");
  setDraftOutput("");
  setTerms([]);

  setStatus("");
  setError("");

  el("copyBtn").disabled = true;
  el("copyDraftBtn").disabled = true;
  el("copyTermsBtn").disabled = true;
  el("copyInputBtn").disabled = true;
}

async function copyOutput() {
  const text = el("output").textContent;
  if (!text || text === "The translation will appear here.") return;
  await navigator.clipboard.writeText(text);
  setStatus("✔️ Copied translated text.");
  setTimeout(() => setStatus(""), 2000);
}

async function copyDraft() {
  const text = el("draftOutput").textContent;
  if (!text || text === "The draft translation will appear here.") return;
  await navigator.clipboard.writeText(text);
  setStatus("✔️ Copied SuperText translation.");
  setTimeout(() => setStatus(""), 2000);
}

async function copyInput() {
  const text = el("inputText").value.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  setStatus("✔️ Copied source text.");
  setTimeout(() => setStatus(""), 2000);
}

async function copyTerms() {
  const btn = el("copyTermsBtn");
  if (btn.disabled) return;

  const box = el("termsBox");
  const items = box.querySelectorAll("li");

  const text = (items && items.length)
    ? Array.from(items).map(li => li.textContent.trim()).join("\n")
    : box.textContent.trim();

  if (!text) return;

  await navigator.clipboard.writeText(text);
  setStatus("✔️ Copied glossary terms.");
  setTimeout(() => setStatus(""), 2000);
}

function lockUI() {
  el("translateBtn").disabled = true;
  el("swapBtn").disabled = true;
  el("clearBtn").disabled = true;

  el("copyBtn").disabled = true;
  el("copyDraftBtn").disabled = true;
  el("copyTermsBtn").disabled = true;
  el("copyInputBtn").disabled = true;

  el("inputText").disabled = true;
  el("srcLang").disabled = true;
  el("tgtLang").disabled = true;
}

function unlockUI() {
  el("translateBtn").disabled = false;
  el("swapBtn").disabled = false;
  el("clearBtn").disabled = false;

  el("inputText").disabled = false;
  el("srcLang").disabled = false;
  el("tgtLang").disabled = false;

  // Copy buttons depend on content
  el("copyBtn").disabled = true;
  el("copyDraftBtn").disabled = true;
  el("copyTermsBtn").disabled = true;
  updateCopyInputBtnState();
}

// ================================
// Real API call
// ================================
async function callBackend({ src_lang, tgt_lang, text }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-key": ACCESS_KEY,
      },
      body: JSON.stringify({ src_lang, tgt_lang, text }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.detail || `HTTP error ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ================================
// Access gate logic
// ================================
async function unlock() {
  setGateError("");

  const key = el("accessKey").value.trim();
  if (!key) {
    setGateError("Please enter the access code.");
    return;
  }

  ACCESS_KEY = key;

  try {
    await callBackend({ src_lang: "fr", tgt_lang: "en", text: "test" });

    el("gate").style.display = "none";
    unlockUI();
    setStatus("✅ Unlocked.");
    setTimeout(() => setStatus(""), 2000);
  } catch (e) {
    ACCESS_KEY = "";
    setGateError("❌ Invalid code.");
  }
}

// ================================
// Main action
// ================================
async function translateText() {
  setError("");
  setStatus("");

  const src_lang = el("srcLang").value;
  const tgt_lang = el("tgtLang").value;
  const text = el("inputText").value.trim();

  if (!text) {
    setError("Please enter some text.");
    return;
  }

  const btn = el("translateBtn");
  btn.disabled = true;
  setStatus("⏱️ Translating…");

  try {
    const data = await callBackend({ src_lang, tgt_lang, text });

    setOutput(data.translation || "");
    setDraftOutput(data.draft || "");
    setTerms(data.terms || []);

    setStatus("☑️ Done.");
  } catch (e) {
    if (e.name === "AbortError") {
      setError("Request timed out.");
    } else {
      setError(e.message || "Unknown error.");
    }
    setStatus("");
  } finally {
    btn.disabled = false;
    if (!el("error").textContent) {
      setTimeout(() => setStatus(""), 2000);
    }
  }
}

// ================================
// Wire events
// ================================
window.addEventListener("DOMContentLoaded", () => {
  lockUI();
  clearAll();

  // Gate events
  el("unlockBtn").addEventListener("click", unlock);
  el("accessKey").addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlock();
  });

  // App events
  el("swapBtn").addEventListener("click", swapLangs);
  el("clearBtn").addEventListener("click", clearAll);

  el("copyBtn").addEventListener("click", copyOutput);
  el("copyDraftBtn").addEventListener("click", copyDraft);
  el("copyTermsBtn").addEventListener("click", copyTerms);
  el("copyInputBtn").addEventListener("click", copyInput);

  el("translateBtn").addEventListener("click", translateText);

  // Enable/disable copy input as user types
  el("inputText").addEventListener("input", updateCopyInputBtnState);

  // UX: Ctrl+Enter to translate
  el("inputText").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") translateText();
  });

  // Focus the access code input
  el("accessKey").focus();
});
