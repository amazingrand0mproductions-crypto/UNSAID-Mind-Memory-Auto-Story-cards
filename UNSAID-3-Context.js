// @cache-compatible
// ===== UNSAID — CONTEXT =====
// Without this directive, AI Dungeon's cache-efficient models (and any
// model running with Optimized Context on) read this hook for
// information but silently ignore whatever it returns — meaning every
// instruction below would be built, "sent," and then never actually
// reach the AI. That mismatch is consistent with the AI seeming stuck
// or repeating itself: the model would be working from context that
// never reflected what this script was trying to add.
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

    // --- Codex: describe something once it's been mentioned enough times,
    // no more than once every codexCooldown turns ---
    const sinceLastCodex = state.unsaid.turn - (state.unsaid.codex.lastTriggerTurn || 0);
    if (cfg.codexEnabled && sinceLastCodex >= cfg.codexCooldown) {
      const candidate = findCodexCandidate(cfg.mentionThreshold, excludedNames(cfg), cfg.codexMaxAttempts);
      if (candidate) {
        const type = classifyCodexEntry(candidate, text);
        const instruction = buildCodexInstruction(candidate, type);
        const fitted = fitInstructionToBudget(text, instruction);

        if (fitted) {
          state.unsaid.codex.attempts[candidate] = (state.unsaid.codex.attempts[candidate] || 0) + 1;
          state.unsaid.codex.pendingName = candidate;
          state.unsaid.codex.pendingType = type;
          state.unsaid.codex.lastTriggerTurn = state.unsaid.turn;
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
    // never let an unexpected error here break the player's turn
    if (typeof log === "function") log("UNSAID Context error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
