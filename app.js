(function () {
  const CASES = window.RD_CASES;
  const $ = (id) => document.getElementById(id);
  const screens = {
    title: $("screen-title"),
    play: $("screen-play"),
    resolve: $("screen-resolve"),
    end: $("screen-end"),
    settings: $("screen-settings"),
    ledger: $("screen-ledger")
  };

  const state = {
    proximity: 18,
    saved: 0,
    years: 0,
    streak: 0,
    seen: 0,
    shiftGoal: 8,
    deck: [],
    current: null,
    ticking: null,
    lastChoice: null,
    over: false
  };

  function show(name) {
    Object.values(screens).forEach((el) => el.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2200);
  }

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem("rd_progress") || "{}");
    } catch {
      return {};
    }
  }

  function saveProgress(extra) {
    const prev = loadProgress();
    const next = Object.assign({}, prev, extra);
    localStorage.setItem("rd_progress", JSON.stringify(next));
  }

  function unlockFact(caseObj) {
    const prev = loadProgress();
    const facts = prev.facts || {};
    facts[caseObj.id] = {
      name: caseObj.name,
      type: caseObj.type,
      fact: caseObj.fact,
      icon: caseObj.icon
    };
    const best = Math.max(prev.bestYears || 0, state.years);
    saveProgress({ facts, bestYears: best, shifts: (prev.shifts || 0) });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startShift() {
    stopTick();
    state.proximity = 18;
    state.saved = 0;
    state.years = 0;
    state.streak = 0;
    state.seen = 0;
    state.over = false;
    state.deck = shuffle(CASES);
    const extras = loadProgress().aiCases || [];
    if (extras.length) state.deck = shuffle(state.deck.concat(extras));
    show("play");
    nextCase();
    startTick();
  }

  function startTick() {
    stopTick();
    state.ticking = setInterval(() => {
      if (state.over || !screens.play.classList.contains("active")) return;
      bump(1.15);
    }, 1000);
  }

  function stopTick() {
    if (state.ticking) clearInterval(state.ticking);
    state.ticking = null;
  }

  function bump(n) {
    state.proximity = Math.max(0, Math.min(100, state.proximity + n));
    paintHud();
    if (state.proximity >= 100) scythe();
  }

  function paintHud() {
    $("stat-saved").textContent = state.saved;
    $("stat-years").textContent = state.years.toFixed(1);
    $("stat-streak").textContent = state.streak;
    $("stat-left").textContent = Math.max(0, state.shiftGoal - state.seen);
    $("lane-fill").style.width = state.proximity + "%";
    const left = 8 + state.proximity * 0.78;
    $("reaper").style.left = "calc(" + left + "% - 12px)";
  }

  function nextCase() {
    if (state.seen >= state.shiftGoal) return shiftComplete(true);
    if (!state.deck.length) state.deck = shuffle(CASES);
    state.current = state.deck.pop();
    const c = state.current;
    $("ward-icon").textContent = c.icon || "\ud83d\udd6f\ufe0f";
    $("case-icon").textContent = c.icon || "\ud83d\udd6f\ufe0f";
    $("case-type").textContent = c.type + " in the ledger";
    $("case-name").textContent = c.name;
    $("case-setup").textContent = c.setup;
    const box = $("choices");
    box.innerHTML = "";
    shuffle(c.choices).forEach((ch) => {
      const b = document.createElement("button");
      b.className = "choice";
      b.textContent = ch.text;
      b.addEventListener("click", () => pick(ch, b));
      box.appendChild(b);
    });
    paintHud();
  }

  function pick(choice) {
    if (state.over) return;
    state.lastChoice = choice;
    state.seen += 1;
    const delay = choice.delay || 0;
    if (delay > 0) {
      state.streak += 1;
      state.saved += 1;
      state.years += delay / 10 + state.streak * 0.15;
      bump(-delay);
    } else {
      state.streak = 0;
      bump(-delay);
    }
    unlockFact(state.current);
    $("reaper").classList.remove("swing");
    void $("reaper").offsetWidth;
    $("reaper").classList.add("swing");
    renderResolve();
    show("resolve");
  }

  function renderResolve() {
    const c = state.current;
    const ch = state.lastChoice;
    $("res-title").textContent = ch.delay > 0 ? "Time bought." : "The scythe crept closer.";
    $("res-quality").textContent = (ch.quality || "choice").toUpperCase() + "  ·  delay " + (ch.delay > 0 ? "+" : "") + ch.delay;
    $("res-lesson").textContent = ch.lesson;
    $("res-fact").textContent = c.fact;
    $("res-ai").textContent = "";
    const s = window.RD_AI.settings();
    $("btn-ai-note").style.display = s.enabled && s.key ? "inline-flex" : "none";
  }

  async function askFootnote() {
    const btn = $("btn-ai-note");
    btn.disabled = true;
    $("res-ai").textContent = "The cheap clerk is writing…";
    try {
      const note = await window.RD_AI.footnote(state.current, state.lastChoice);
      $("res-ai").textContent = note;
    } catch (err) {
      $("res-ai").textContent = "Clerk unavailable: " + err.message;
    } finally {
      btn.disabled = false;
    }
  }

  function continueShift() {
    if (state.proximity >= 100) return scythe();
    if (state.seen >= state.shiftGoal) return shiftComplete(true);
    show("play");
    nextCase();
  }

  function scythe() {
    state.over = true;
    stopTick();
    shiftComplete(false);
  }

  function shiftComplete(won) {
    state.over = true;
    stopTick();
    const prev = loadProgress();
    saveProgress({
      bestYears: Math.max(prev.bestYears || 0, state.years),
      shifts: (prev.shifts || 0) + 1
    });
    $("end-title").textContent = won ? "Dawn. The Reaper missed this shift." : "The cut arrived.";
    $("end-body").textContent = won
      ? "You walked eight cases without letting the scythe land. Knowledge is the dullest, best weapon."
      : "Proximity hit 100. The ward is gone. Read the ledger and try another night.";
    $("end-stats").innerHTML =
      "<b>" + state.years.toFixed(1) + "</b> delay marks · " +
      state.saved + " good calls · best ever " + (loadProgress().bestYears || 0).toFixed(1);
    show("end");
  }

  function openSettings() {
    const s = window.RD_AI.settings();
    $("or-key").value = s.key;
    $("or-on").checked = s.enabled;
    const sel = $("or-model");
    sel.innerHTML = "";
    window.RD_AI.MODELS.forEach((m) => {
      const o = document.createElement("option");
      o.value = m.id;
      o.textContent = m.label;
      if (m.id === s.model) o.selected = true;
      sel.appendChild(o);
    });
    show("settings");
  }

  function saveSettings() {
    window.RD_AI.save({
      key: $("or-key").value,
      model: $("or-model").value,
      enabled: $("or-on").checked
    });
    toast("Settings stay on this device.");
    show("title");
  }

  function openLedger() {
    const facts = loadProgress().facts || {};
    const list = Object.values(facts);
    $("ledger-count").textContent = list.length + " entries";
    const root = $("ledger-list");
    root.innerHTML = "";
    if (!list.length) {
      root.innerHTML = "<p class='muted'>Survive cases to write them here.</p>";
    } else {
      list.forEach((f) => {
        const el = document.createElement("article");
        el.innerHTML = "<div class='type-pill'>" + f.icon + " " + f.type + "</div><strong>" +
          escapeHtml(f.name) + "</strong><p class='tiny'>" + escapeHtml(f.fact) + "</p>";
        root.appendChild(el);
      });
    }
    show("ledger");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&", "<": "<", ">": ">", '"': """, "'": "&#39;"
    }[c]));
  }

  async function summonCase() {
    const btn = $("btn-summon");
    btn.disabled = true;
    toast("Asking a cheap model for one extra case…");
    try {
      const extra = await window.RD_AI.extraCase();
      const prev = loadProgress();
      const aiCases = prev.aiCases || [];
      aiCases.push(extra);
      saveProgress({ aiCases: aiCases.slice(-12) });
      toast("Case filed: " + extra.name);
    } catch (err) {
      toast(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  function paintTitle() {
    const p = loadProgress();
    $("best-line").textContent = p.bestYears
      ? "Best delay marks: " + Number(p.bestYears).toFixed(1) + " · shifts: " + (p.shifts || 0)
      : "No completed shifts yet.";
  }

  $("btn-begin").addEventListener("click", startShift);
  $("btn-settings").addEventListener("click", openSettings);
  $("btn-ledger").addEventListener("click", openLedger);
  $("btn-how").addEventListener("click", () => {
    $("how").hidden = !$("how").hidden;
  });
  $("btn-continue").addEventListener("click", continueShift);
  $("btn-ai-note").addEventListener("click", askFootnote);
  $("btn-again").addEventListener("click", startShift);
  $("btn-home").addEventListener("click", () => { stopTick(); paintTitle(); show("title"); });
  $("btn-home-2").addEventListener("click", () => { paintTitle(); show("title"); });
  $("btn-home-3").addEventListener("click", () => { paintTitle(); show("title"); });
  $("btn-save-settings").addEventListener("click", saveSettings);
  $("btn-summon").addEventListener("click", summonCase);

  paintTitle();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
