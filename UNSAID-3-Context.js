try {
  initUnsaid();
  checkCacheEfficientWarning();
} catch (e) {
}

const modifier = (text) => {
  const originalText = text;
  try {
    const cfg = readUnsaidConfig();
    text = stripConfigNoise(text);

    const forcedPeek = state.unsaid.forcedPeek;
    const forcedPeekCore = state.unsaid.forcedPeekCore;
    state.unsaid.forcedPeek = null;
    state.unsaid.forcedPeekCore = null;

    const forcedCodex = state.unsaid.forcedCodex;
    state.unsaid.forcedCodex = null;

    if (!cfg.enabled) {
      state.unsaid.pending = null;
      state.unsaid.codex.pendingNames = [];
      return { text };
    }

    // A retry or regenerated output re-runs this hook for the same action. If nothing about
    // the story has actually advanced and no explicit command is pending, don't roll fresh
    // reveal odds or spend Codex attempts/cooldown again — that would let repeated retries
    // silently drain turn-based budget faster than real story progress.
    const storyAdvanced = isNewStoryTurn();
    if (!storyAdvanced && !forcedPeek && !forcedCodex) {
      state.unsaid.pending = null;
      state.unsaid.codex.pendingNames = [];
      return { text };
    }

    state.unsaid.turn++;

    const recent = recentTurnsText(text, cfg.recentTurnsWindow);
    const active = cfg.cast.filter(name => nameAppears(name, recent));
    // Pick up any core truth a creator already wrote into a card's Notes (or recover one from
    // an earlier session) before deciding what to do — otherwise a character with an
    // established truth would wrongly look "never revealed" and get treated as a first thought.
    active.forEach(seedMindIfKnown);
    if (forcedPeek) seedMindIfKnown(forcedPeek);

    if (forcedPeek && forcedPeekCore && !cfg.allowCoreShift) {
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
      state.message = `🌗 Not enough room left in context to check ${forcedPeek} this turn — try again once the story frees up some space.`;
    } else if (forcedPeek) {
      const fitted = buildAndFitThoughtInstruction(forcedPeek, active, text, cfg.allowCoreShift);
      if (fitted) {
        state.unsaid.pending = forcedPeek;
        state.unsaid.codex.pendingNames = [];
        return { text: text + fitted };
      }
      state.message = `👁️ Not enough room left in context to peek at ${forcedPeek} this turn — try again once the story frees up some space.`;
    }

    if (forcedCodex) {
      const type = classifyCodexEntry(forcedCodex, text);
      const instruction = buildCodexInstruction([forcedCodex], text);
      const fitted = fitInstructionToBudget(text, instruction);
      if (fitted) {
        state.unsaid.codex.attempts[forcedCodex] = (state.unsaid.codex.attempts[forcedCodex] || 0) + 1;
        state.unsaid.codex.pendingNames = [forcedCodex];
        state.unsaid.codex.pendingTypes = { [forcedCodex]: type };
        state.unsaid.codex.lastTriggerTurn = state.unsaid.turn;
        state.unsaid.pending = null;
        return { text: text + fitted };
      }
      state.message = `📇 Not enough room left in context to card ${forcedCodex} this turn — try again once the story frees up some space.`;
    }

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
          state.unsaid.pending = null;
          return { text: text + fitted };
        }
      }
    }
    state.unsaid.codex.pendingNames = [];

    if (cfg.cast.length > 0) {
      const eligible = active.filter(name => {
        const mind = state.unsaid.minds[name];
        return !mind || (state.unsaid.turn - mind.lastTurn) >= cfg.cooldown;
      });

      const actionType = getLastActionType();
      const isPlayerAction = actionType === "do" || actionType === "say";
      let effectiveChance = (cfg.reduceDuringActions && isPlayerAction) ? cfg.chance * 0.5 : cfg.chance;

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
    if (typeof log === "function") log("UNSAID Context error: " + (e && e.message));
    return { text: originalText };
  }
};

modifier(text)
