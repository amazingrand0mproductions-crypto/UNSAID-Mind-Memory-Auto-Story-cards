// ===== UNSAID — CONTEXT =====
initUnsaid();

const modifier = (text) => {
  const originalText = text; // clean fallback if anything below throws
  try {
    const cfg = readUnsaidConfig();
    text = stripConfigNoise(text); // keep script-only config/log text out of the AI's context

    const forcedPeek = state.unsaid.forcedPeek;
    state.unsaid.forcedPeek = null; // consume it whether or not it ends up firing

    if (!cfg.enabled) {
      state.unsaid.pending = null;
      state.unsaid.codex.pendingName = null;
      return { text };
    }

    state.unsaid.turn++;

    const recent = text.slice(-600);
    const active = cfg.cast.filter(name => nameAppears(name, recent));

    // --- /peek: a forced reveal always wins the turn it's used ---
    if (forcedPeek) {
      const fitted = buildAndFitThoughtInstruction(forcedPeek, active, text);
      if (fitted) {
        state.unsaid.pending = forcedPeek;
        state.unsaid.codex.pendingName = null;
        return { text: text + fitted };
      }
    }

    // --- Codex: describe something once it's been mentioned enough times ---
    if (cfg.codexEnabled) {
      const candidate = findCodexCandidate(cfg.mentionThreshold, excludedNames(cfg));
      if (candidate) {
        const type = classifyCodexEntry(candidate, text);
        const instruction = buildCodexInstruction(candidate, type);
        const fitted = fitInstructionToBudget(text, instruction);

        if (fitted) {
          state.unsaid.codex.attempts[candidate] = (state.unsaid.codex.attempts[candidate] || 0) + 1;
          state.unsaid.codex.pendingName = candidate;
          state.unsaid.codex.pendingType = type;
          state.unsaid.pending = null; // don't stack a thought reveal the same turn
          return { text: text + fitted };
        }
      }
    }
    state.unsaid.codex.pendingName = null;

    // --- Private thoughts, the usual chance-based way ---
    if (cfg.cast.length > 0) {
      const eligible = active.filter(name => {
        const mind = state.unsaid.minds[name];
        return !mind || (state.unsaid.turn - mind.lastTurn) >= cfg.cooldown;
      });

      if (eligible.length > 0 && Math.random() < cfg.chance) {
        const chosen = eligible[Math.floor(Math.random() * eligible.length)];
        const fitted = buildAndFitThoughtInstruction(chosen, active, text);
        if (fitted) {
          state.unsaid.pending = chosen;
          return { text: text + fitted };
        }
      }
    }

    state.unsaid.pending = null;
    return { text };
  } catch (e) {
    // never let an unexpected error here break the player's turn —
    // some platform configurations (e.g. certain models with Optimized
    // Context on) restrict scripting features in undocumented ways
    if (typeof log === "function") log("UNSAID Context error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
