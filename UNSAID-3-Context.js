// ===== UNSAID — CONTEXT =====
// On cache-efficient models, AI Dungeon's own documentation confirms
// this hook still runs but its returned result is never applied to
// what the AI actually sees — every instruction built below could be
// silently discarded with no error. An earlier "@cache-compatible"
// directive comment lived here on the strength of an unverified
// community tip; there's no documented basis for it actually doing
// anything, so it's been removed rather than imply a fix that isn't
// real. What's here instead: a check that writes a loud, persistent
// warning card the moment this condition is detected, so the failure
// is visible and explainable instead of looking like nothing works.
try {
  initUnsaid();
  checkCacheEfficientWarning();
} catch (e) {
  // setup and the cache-efficient check both touch Story Cards and
  // existing state — never let a problem there break the turn before
  // the modifier even runs
}

const modifier = (text) => {
  const originalText = text; // clean fallback if anything below throws
  try {
    const cfg = readUnsaidConfig();
    text = stripConfigNoise(text); // keep script-only config/log text out of the AI's context

    const forcedPeek = state.unsaid.forcedPeek;
    const forcedPeekCore = state.unsaid.forcedPeekCore;
    state.unsaid.forcedPeek = null; // consume it whether or not it ends up firing
    state.unsaid.forcedPeekCore = null;

    if (!cfg.enabled) {
      state.unsaid.pending = null;
      state.unsaid.codex.pendingNames = [];
      return { text };
    }

    state.unsaid.turn++;

    const recent = recentTurnsText(text, cfg.recentTurnsWindow);
    const active = cfg.cast.filter(name => nameAppears(name, recent));

    // --- /peek: a forced reveal always wins the turn it's used ---
    if (forcedPeek && forcedPeekCore && !cfg.allowCoreShift) {
      // asked for a core check, but the feature's off — say so plainly
      // rather than silently falling back to an ordinary peek
      state.message = `🌗 Core-shift checks are off — turn on "Allow major events to rewrite a core truth" in the config card first.`;
      state.unsaid.pending = null;
      state.unsaid.codex.pendingNames = [];
      return { text };
    }

    if (forcedPeek && forcedPeekCore) {
      const instruction = buildCoreCheckInstruction(forcedPeek, state.unsaid.minds[forcedPeek]);
      const fitted = fitInstructionToBudget(text, instruction);
      if (fitted) {
        state.unsaid.pending = forcedPeek;
        state.unsaid.codex.pendingNames = [];
        return { text: text + fitted };
      }
    } else if (forcedPeek) {
      const fitted = buildAndFitThoughtInstruction(forcedPeek, active, text, cfg.allowCoreShift);
      if (fitted) {
        state.unsaid.pending = forcedPeek;
        state.unsaid.codex.pendingNames = [];
        return { text: text + fitted };
      }
    }

    // --- Codex: describe several eligible names at once, no more than
    // once every codexCooldown turns. Nothing in the platform limits a
    // script to one addStoryCard per turn — requesting several profiles
    // together clears a backlog far faster than one candidate at a time
    // ever could ---
    const sinceLastCodex = state.unsaid.turn - (state.unsaid.codex.lastTriggerTurn || 0);
    if (cfg.codexEnabled && sinceLastCodex >= cfg.codexCooldown) {
      const candidates = findCodexCandidates(cfg.mentionThreshold, excludedNames(cfg), cfg.codexMaxAttempts);
      if (candidates.length > 0) {
        const instruction = buildCodexInstruction(candidates, text);
        const fitted = fitInstructionToBudget(text, instruction);

        if (fitted) {
          const types = {};
          candidates.forEach(name => {
            state.unsaid.codex.attempts[name] = (state.unsaid.codex.attempts[name] || 0) + 1;
            types[name] = classifyCodexEntry(name, text);
          });
          state.unsaid.codex.pendingNames = candidates;
          state.unsaid.codex.pendingTypes = types;
          state.unsaid.codex.lastTriggerTurn = state.unsaid.turn;
          state.unsaid.pending = null; // don't stack a thought reveal the same turn
          return { text: text + fitted };
        }
      }
    }
    state.unsaid.codex.pendingNames = [];

    // --- Private thoughts, the usual chance-based way ---
    if (cfg.cast.length > 0) {
      const eligible = active.filter(name => {
        const mind = state.unsaid.minds[name];
        return !mind || (state.unsaid.turn - mind.lastTurn) >= cfg.cooldown;
      });

      // a reveal competing for attention right when the player just took
      // a deliberate action can feel like it's stepping on them — ease
      // off specifically for Do/Say, leave Continue/Story untouched
      const actionType = getLastActionType();
      const isPlayerAction = actionType === "do" || actionType === "say";
      let effectiveChance = (cfg.reduceDuringActions && isPlayerAction) ? cfg.chance * 0.5 : cfg.chance;

      // getting a whole cast their first reveal shouldn't be left purely
      // to chance stacked turn after turn — while anyone active and
      // eligible has never had one yet, the roll gets a real boost, so
      // a scene with several existing characters doesn't take dozens of
      // turns before anyone but the first-picked one has said anything.
      // Once everyone active has had at least one reveal, this has no
      // effect and the configured chance applies exactly as set.
      const anyoneNeverRevealed = eligible.some(name => !state.unsaid.minds[name]);
      if (anyoneNeverRevealed) {
        effectiveChance = Math.min(0.9, effectiveChance * 2.5);
      }

      if (eligible.length > 0 && Math.random() < effectiveChance) {
        const chosen = pickBySilence(eligible, state.unsaid.turn);
        const fitted = buildAndFitThoughtInstruction(chosen, active, text, cfg.allowCoreShift);
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
