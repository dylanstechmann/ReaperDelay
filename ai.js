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
    if (!obj.setup || !Array.isArray(obj.choices) || obj.choices.length < 3) {
      throw new Error("JSON missing fields.");
    }
    obj.id = "ai-" + Date.now();
    obj.type = obj.type || "person";
    obj.icon = obj.icon || "\ud83d\udd6f\ufe0f";
    return obj;
  }

  return { MODELS, settings, save, footnote, extraCase };
})();
