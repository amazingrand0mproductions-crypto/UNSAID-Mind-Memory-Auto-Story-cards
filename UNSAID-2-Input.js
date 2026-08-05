// ===== UNSAID — INPUT =====
initUnsaid();

const modifier = (text) => {
  const originalText = text; // clean fallback if anything below throws
  try {
    // count mentions from the player's own action text — this, plus the
    // matching count in Output, is how Codex knows when something has
    // actually been mentioned enough times to earn a card
    trackMentions(text);

    // typing "/peek <name>" forces an immediate thought reveal for that
    // character on this turn, bypassing the usual chance roll and cooldown.
    // "/peek <name> core" instead asks specifically whether this moment
    // has been significant enough to redefine them (only does anything
    // if core-shift is enabled in config).
    const peekCoreMatch = text.trim().match(/^\/peek\s+(.+?)\s+core$/i);
    const peekMatch = peekCoreMatch || text.trim().match(/^\/peek\s+(.+)$/i);
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
