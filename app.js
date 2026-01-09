// ================================
// CONFIG
// ================================

// Azure backend URL (plug in later). Leave empty for DEMO mode.
// Example: "https://your-backend-domain/translate"
const API_URL = ""; // empty = DEMO mode (no network call)
const REQUEST_TIMEOUT_MS = 30000;

// ================================
// Helpers UI
// ================================
const el = (id) => document.getElementById(id);

function setStatus(msg) { el("status").textContent = msg || ""; }
function setError(msg) { el("error").textContent = msg || ""; }

function setOutput(text) {
  el("output").textContent = text || "";
  el("copyBtn").disabled = !text || text === "The translation will appear here.";
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
  el("output").textContent = "The translation will appear here.";
  setStatus("");
  setError("");
  el("copyBtn").disabled = true;
}

async function copyOutput() {
  const text = el("output").textContent;
  if (!text || text === "The translation will appear here.") return;
  await navigator.clipboard.writeText(text);
  setStatus("✅ Copied to clipboard.");
  setTimeout(() => setStatus(""), 1500);
}

// ================================
// DEMO translation (frontend only)
// ================================
function demoTranslate({ src_lang, tgt_lang, text }) {
  const header = `DEMO (backend not connected)\nSource: ${src_lang}  →  Target: ${tgt_lang}\n`;
  const body = `\nText received:\n${text}\n\n---\nResult (placeholder):\n[Translation will be available once the API is connected]\n`;
  return header + body;
}

// ================================
// Real API call (when you plug backend)
// ================================
async function callBackend({ src_lang, tgt_lang, text }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  setStatus("⏳ Translating...");

  try {
    if (!API_URL) {
      const out = demoTranslate({ src_lang, tgt_lang, text });
      setOutput(out);
      setStatus("ℹ️ DEMO mode: backend not connected.");
      return;
    }

    const data = await callBackend({ src_lang, tgt_lang, text });
    setOutput(data.translation || "");
    setStatus("✅ Done.");
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
  el("swapBtn").addEventListener("click", swapLangs);
  el("clearBtn").addEventListener("click", clearAll);
  el("copyBtn").addEventListener("click", copyOutput);
  el("translateBtn").addEventListener("click", translateText);

  // UX: Ctrl+Enter to translate
  el("inputText").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") translateText();
  });
});
