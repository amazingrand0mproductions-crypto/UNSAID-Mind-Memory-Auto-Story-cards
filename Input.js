state.message = "";

try {
  initUnsaid();
} catch (e) {
  if (typeof log === "function") log("UNSAID init/Input error: " + (e && e.message));
}

var cleanCommandEntity = (raw, maxLen) => {
  let name = String(raw || "").trim();
  name = name.replace(/^["'“”‘’]+/, "").replace(/["'“”‘’.!?]+$/, "").trim();
  name = name.replace(/\s+/g, " ");
  return name.slice(0, typeof maxLen === "number" ? maxLen : 80);
};

var unsaidModifier = (text) => {
  const originalText = text;
  try {
    const commandText = (text || "").trim();
    const isUnsaidCommand = /\/(?:unsaid|pe(?:e|a)k|card)\b/i.test(commandText);

    const cfg = readUnsaidConfig();

    // Commands are control input, not story evidence. Mention tracking is
    // part of automatic Codex, so its switches must genuinely pause that
    // tracking rather than quietly banking mentions for a future re-enable.
    if (!isUnsaidCommand && cfg.enabled && cfg.codexEnabled) trackMentions(text, false);

    if (/^\/unsaid\s+status\s*$/i.test(commandText)) {
      const report = buildStatusReport(cfg);
      let card = storyCards.find(c => c.title === "UNSAID — Status");
      if (!card) card = createOrFindCard("unsaid status", " ", "Class");
      if (card) {
        card.title = "UNSAID — Status";
        card.keys = "unsaid status";
        card.type = "Class";
        card.entry = " ";
        card.description = "Regenerated fresh each time you type \"/unsaid status\" as an action. Not sent to the AI.\n\n" + report;
        pushMessage("📋 Status written — check the \"UNSAID — Status\" card.");
      } else {
        pushMessage("📋 Couldn't write the status card this turn — try again in a moment.");
      }
      return { text: "(A quiet moment passes.)" };
    }

    if (/^\/unsaid\s+(?:help|commands?)\s*$/i.test(commandText)) {
      ensureSharedConfigCard();
      pushMessage("📖 UNSAID commands: /peek <name>, /peek <name> core, /card <name>, /unsaid status, /unsaid resetcodex. /card is a manual override and still works when automatic Codex is disabled. Full settings are on the \"UNSAID — Config\" card.");
      return { text: "(A quiet moment passes.)" };
    }

    if (/^\/unsaid\s+resetcodex\s*$/i.test(commandText)) {
      resetCodexTrackingState();
      const configCard = ensureSharedConfigCard();
      if (configCard) {
        // Re-rendering keeps the momentary config reset flag false and
        // preserves every other edited setting.
        const currentCfg = readUnsaidConfig();
        configCard.entry = spliceConfigSection(configCard.entry, CONFIG_SECTION_UNSAID, renderUnsaidSection(currentCfg));
      }
      pushMessage("♻️ Codex tracking reset. Existing Story Cards were left untouched.");
      return { text: "(A quiet moment passes.)" };
    }

    const peekMatch = commandText.match(/^\/pe(?:e|a)k\b\s*(.*?)\s*$/i);
    if (peekMatch) {
      let rawName = peekMatch[1] || "";
      const coreRequested = /\s+core\s*$/i.test(rawName);
      if (coreRequested) rawName = rawName.replace(/\s+core\s*$/i, "");
      const name = cleanCommandEntity(rawName, 60);

      if (!name) {
        pushMessage("👁️ /peek needs a character name — try \"/peek Elara\" or \"/peek Elara core\".");
        return { text: "(A quiet moment passes.)" };
      }
      if (!cfg.enabled) {
        pushMessage(`👁️ UNSAID is currently disabled — turn on "Enable UNSAID" on the config card first, or ${name} won't actually be peeked at this turn.`);
        return { text: "(A quiet moment passes.)" };
      }

      const matchedCard = findStoryCardForEntity(name);
      if (matchedCard && !isCharacterLikeCard(name)) {
        pushMessage(`👁️ "${matchedCard.title}" is typed "${matchedCard.type}" on its Story Card, not a character — skipping the peek.`);
      } else {
        state.unsaid.forcedPeek = name;
        state.unsaid.forcedPeekCore = coreRequested;
        pushMessage(coreRequested
          ? `🌗 Checking whether this moment has changed ${name}...`
          : `👁️ Peeking into ${name}'s thoughts...`);
      }
      return { text: "(A quiet moment passes.)" };
    }

    const cardMatch = commandText.match(/^\/card\b\s*(.*?)\s*$/i);
    if (cardMatch) {
      const name = cleanCommandEntity(cardMatch[1], 60);
      if (!name) {
        pushMessage("📇 /card needs a name — try \"/card Elara\".");
        return { text: "(A quiet moment passes.)" };
      }
      if (!cfg.enabled) {
        pushMessage(`📇 UNSAID is currently disabled — turn on "Enable UNSAID" on the config card first, or no card will actually be written for ${name} this turn.`);
        return { text: "(A quiet moment passes.)" };
      }
      state.unsaid.forcedCodex = name;
      pushMessage(`📇 Writing a Story Card for ${name}...`);
      return { text: "(A quiet moment passes.)" };
    }

    return { text };
  } catch (e) {
    if (typeof log === "function") log("UNSAID Input error: " + (e && e.message));
    return { text: originalText };
  }
};

var modifier = (text) => unsaidModifier(text);

modifier(text);
