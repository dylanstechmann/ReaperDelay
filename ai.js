/* Optional, tiny OpenRouter client. Key stays in localStorage only. */
window.RD_AI = (function () {
  const MODELS = [
    { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 free" },
    { id: "qwen/qwen3-8b:free", label: "Qwen3 8B free" },
    { id: "deepseek/deepseek-chat", label: "DeepSeek chat (cheap)" },
    { id: "qwen/qwen-2.5-7b-instruct", label: "Qwen 2.5 7B (cheap)" },
    { id: "qwen/qwen3-4b:free", label: "Qwen3 4B free" }
  ];

  function settings() {
    return {
      key: localStorage.getItem("rd_or_key") || "",
      model: localStorage.getItem("rd_or_model") || MODELS[0].id,
      enabled: localStorage.getItem("rd_or_on") === "1"
    };
  }

  function save(partial) {
    if (partial.key !== undefined) localStorage.setItem("rd_or_key", partial.key.trim());
    if (partial.model) localStorage.setItem("rd_or_model", partial.model);
    if (partial.enabled !== undefined) localStorage.setItem("rd_or_on", partial.enabled ? "1" : "0");
  }

  async function complete(user, maxTokens) {
    const s = settings();
    if (!s.enabled || !s.key) throw new Error("AI is off or no key is saved.");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + s.key,
        "Content-Type": "application/json",
        "HTTP-Referer": location.origin || "http://localhost",
        "X-Title": "Reaper Delay"
      },
      body: JSON.stringify({
        model: s.model,
        temperature: 0.4,
        max_tokens: maxTokens || 160,
        messages: [
          {
            role: "system",
            content: "You are a terse public-health clerk in a grim but kind game. No medical advice theater. No graphic violence. 1-3 short sentences. Plain language. If unsure, say so."
          },
          { role: "user", content: user }
        ]
      })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error("OpenRouter " + res.status + ": " + t.slice(0, 180));
    }
    const data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
  }

  async function footnote(caseObj, choice) {
    return complete(
      "Case: " + caseObj.name + " — " + caseObj.setup +
      "\nPlayer chose: " + choice.text +
      "\nBuilt-in lesson: " + choice.lesson +
      "\nAdd one extra teaching footnote the player has not already read. No preamble.",
      120
    );
  }

  async function extraCase() {
    const raw = await complete(
      'Invent ONE original educational case for this game. Return ONLY compact JSON with keys: type ("person"|"animal"|"thing"), icon (one emoji), name, setup, fact, choices (array of 4 objects with text, quality in best|good|bad|worst, delay number, lesson). One best, one good, two bad/worst. Delay +8 to +28 for good/best, negative for bad. Topic must be real harm-reduction / maintenance / ecology / first aid. No graphic gore.',
      420
    );
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < 0) throw new Error("Model did not return JSON.");
    const obj = JSON.parse(raw.slice(start, end + 1));
    return { id: "ai-" + Date.now(), ...validateCase(obj) };
  }

  function validateCase(obj) {
    if (!obj || typeof obj !== "object" || !["person", "animal", "thing"].includes(obj.type)) {
      throw new Error("Case must have a valid type.");
    }
    function text(value, field, limit) {
      if (typeof value !== "string" || !value.trim() || value.length > limit) {
        throw new Error("Case has invalid " + field + ".");
      }
      return value.trim();
    }
    if (!Array.isArray(obj.choices) || obj.choices.length !== 4) {
      throw new Error("Case must contain exactly four choices.");
    }
    const choices = obj.choices.map((choice) => {
      if (!choice || !["best", "good", "bad", "worst"].includes(choice.quality) ||
          typeof choice.delay !== "number" || !Number.isFinite(choice.delay)) {
        throw new Error("Case has invalid choice scoring.");
      }
      const positive = choice.quality === "best" || choice.quality === "good";
      if (positive ? choice.delay < 8 || choice.delay > 28 : choice.delay >= 0 || choice.delay < -100) {
        throw new Error("Case has out-of-range choice scoring.");
      }
      return {
        text: text(choice.text, "choice text", 500),
        quality: choice.quality,
        delay: choice.delay,
        lesson: text(choice.lesson, "lesson", 1500)
      };
    });
    if (choices.filter((choice) => choice.quality === "best").length !== 1 ||
        choices.filter((choice) => choice.quality === "good").length !== 1) {
      throw new Error("Case must contain one best and one good choice.");
    }
    return {
      type: obj.type,
      icon: obj.icon ? text(obj.icon, "icon", 32) : "\ud83d\udd6f\ufe0f",
      name: text(obj.name, "name", 150),
      setup: text(obj.setup, "setup", 1500),
      fact: text(obj.fact, "fact", 1500),
      choices
    };
  }

  return { MODELS, settings, save, footnote, extraCase, validateCase };
})();
