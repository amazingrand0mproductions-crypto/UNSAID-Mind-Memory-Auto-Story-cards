// ===== UNSAID — INPUT =====
try {
  initUnsaid();
} catch (e) {
  // setup touches Story Cards and existing state — never let a
  // problem there break the turn before the modifier even runs
}

const modifier = (text) => {
  const originalText = text; // clean fallback if anything below throws
  try {
    // count mentions from the player's own action text — this, plus the
    // matching count in Output, is how Codex knows when something has
    // actually been mentioned enough times to earn a card
    trackMentions(text);

    // typing "/unsaid status" writes a direct, current snapshot of
    // internal state to a dedicated card — what's tracked, what Codex
    // is close to carding, what's given up and why, whether cache-
    // efficient mode is active. No AI involvement needed for this one,
    // so it completes immediately, the same turn. Same not-anchored
    // reasoning as /peek: Do/Say text gets reformatted before this
    // hook ever sees it.
    if (/\/unsaid\s+status\b/i.test(text)) {
      const cfg = readUnsaidConfig();
      const report = buildStatusReport(cfg);
      let card = storyCards.find(c => c.title === "UNSAID — Status");
      if (!card) {
        card = createOrFindCard("unsaid status", " ", "Class");
        card.title = "UNSAID — Status";
        card.keys = "unsaid status";
        card.type = "Class";
      }
      card.entry = report;
      card.description = "Regenerated fresh each time you type \"/unsaid status\" as an action. Not sent to the AI.";
      state.message = "📋 Status written — check the \"UNSAID — Status\" card.";
      return { text: "(A quiet moment passes.)" };
    }

    // typing "/peek <name>" forces an immediate thought reveal for that
    // character on this turn, bypassing the usual chance roll and cooldown.
    // "/peek <name> core" instead asks specifically whether this moment
    // has been significant enough to redefine them (only does anything
    // if core-shift is enabled in config).
    //
    // NOT anchored to the start of the text on purpose: AI Dungeon's own
    // docs confirm Do mode prepends "You " and Say mode wraps the whole
    // input as You say, "..." before this hook ever sees it — an
    // anchored ^/peek match would silently never fire on either of the
    // two most common action types, only on Story mode, which mostly
    // passes text through unchanged.
    const peekCoreMatch = text.match(/\/peek\s+([A-Za-z][\w\s]*?)\s+core\b/i);
    const peekMatch = peekCoreMatch || text.match(/\/peek\s+([A-Za-z][\w\s]*?)[\s"'.!?]*$/i);
    if (peekMatch) {
      const name = peekMatch[1].trim().slice(0, 60);
      state.unsaid.forcedPeek = name;
      state.unsaid.forcedPeekCore = !!peekCoreMatch;
      state.message = peekCoreMatch
        ? `🌗 Checking whether this moment has changed ${name}...`
        : `👁️ Peeking into ${name}'s thoughts...`;
      return { text: "(A quiet moment passes.)" };
    }

    return { text };
  } catch (e) {
    // never let an unexpected error here break the player's turn —
    // some platform configurations (e.g. certain models with Optimized
    // Context on) restrict scripting features in undocumented ways
    if (typeof log === "function") log("UNSAID Input error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
