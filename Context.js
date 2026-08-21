try {
  initUnsaid();
  checkCacheEfficientWarning();
} catch (e) {
  if (typeof log === "function") log("UNSAID init/Context error: " + (e && e.message));
}

var unsaidModifier = (text) => {
  const originalText = text;
  try {
    const cfg = readUnsaidConfig();
    text = stripConfigNoise(text);

    // Cache-efficient models can discard text returned by the Context hook,
    // so UNSAID mirrors model-facing requests through its backup Story Card.
    const cacheEfficient = !!(typeof info !== "undefined" && info && info.useCacheEfficient);

    const forcedPeek = state.unsaid.forcedPeek;
    const forcedPeekCore = state.unsaid.forcedPeekCore;
    state.unsaid.forcedPeek = null;
    state.unsaid.forcedPeekCore = null;

    const forcedCodex = state.unsaid.forcedCodex;
    state.unsaid.forcedCodex = null;

    if (!cfg.enabled) {
      state.unsaid.pending = null;
      state.unsaid.pendingCoreShiftAllowed = false;
      state.unsaid.pendingCoreCheck = false;
      state.unsaid.codex.pendingNames = [];
      state.unsaid.codex.pendingForced = false;
      syncFrontMemoryHint(false);
      updateUnsaidBackupCard(cacheEfficient, "");
      return { text };
    }

    const storyAdvanced = isNewStoryTurn(text);
    if (!storyAdvanced && !forcedPeek && !forcedCodex) {
      state.unsaid.pending = null;
      state.unsaid.pendingCoreShiftAllowed = false;
      state.unsaid.pendingCoreCheck = false;
      state.unsaid.codex.pendingNames = [];
      state.unsaid.codex.pendingForced = false;
      updateUnsaidBackupCard(cacheEfficient, "");
      return { text };
    }

    state.unsaid.turn++;

    const recent = recentTurnsText(text, cfg.recentTurnsWindow);
    const active = cfg.cast.filter(name => nameAppears(name, recent));

    active.forEach(seedMindIfKnown);
    if (forcedPeek) seedMindIfKnown(forcedPeek);

    if (forcedPeek && forcedPeekCore && !cfg.allowCoreShift) {
      pushMessage(`🌗 Core-shift checks are off — turn on "Allow major events to rewrite a core truth" in the config card first.`);
      state.unsaid.pending = null;
      state.unsaid.pendingCoreShiftAllowed = false;
      state.unsaid.pendingCoreCheck = false;
      state.unsaid.codex.pendingNames = [];
      state.unsaid.codex.pendingForced = false;
      updateUnsaidBackupCard(cacheEfficient, "");
      return { text };
    }

    if (forcedPeek && forcedPeekCore) {
      const instruction = buildCoreCheckInstruction(forcedPeek, state.unsaid.minds[forcedPeek]);
      const fitted = fitInstructionToBudget(text, instruction);
      if (fitted) {
        state.unsaid.pending = forcedPeek;
        state.unsaid.pendingCoreShiftAllowed = true;
        state.unsaid.pendingCoreCheck = true;
        state.unsaid.codex.pendingNames = [];
      state.unsaid.codex.pendingForced = false;
        updateUnsaidBackupCard(cacheEfficient, fitted);
        return { text: text + fitted };
      }
      pushMessage(`🌗 Not enough room left in context to check ${forcedPeek} this turn — try again once the story frees up some space.`);
    } else if (forcedPeek) {
      const fitted = buildAndFitThoughtInstruction(forcedPeek, active, text, cfg.allowCoreShift);
      if (fitted) {
        state.unsaid.pending = forcedPeek;
        state.unsaid.pendingCoreShiftAllowed = naturalCoreShiftEligible(state.unsaid.minds[forcedPeek], cfg.allowCoreShift);
        state.unsaid.pendingCoreCheck = false;
        state.unsaid.codex.pendingNames = [];
      state.unsaid.codex.pendingForced = false;
        updateUnsaidBackupCard(cacheEfficient, fitted);
        return { text: text + fitted };
      }
      pushMessage(`👁️ Not enough room left in context to peek at ${forcedPeek} this turn — try again once the story frees up some space.`);
    }

    if (forcedCodex) {
      const type = classifyCodexEntry(forcedCodex, text);
      const priorFailures = state.unsaid.codex.attempts[forcedCodex] || 0;
      const fitted = buildAndFitCodexInstruction([forcedCodex], text, true, priorFailures, true);
      if (fitted) {
        state.unsaid.codex.attempts[forcedCodex] = (state.unsaid.codex.attempts[forcedCodex] || 0) + 1;
        state.unsaid.codex.lastAttemptTurn[forcedCodex] = state.unsaid.turn;
        state.unsaid.codex.pendingNames = [forcedCodex];
        state.unsaid.codex.pendingTypes = { [forcedCodex]: type };
        state.unsaid.codex.pendingForced = true;
        state.unsaid.codex.lastTriggerTurn = state.unsaid.turn;
        state.unsaid.pending = null;
        state.unsaid.pendingCoreShiftAllowed = false;
        state.unsaid.pendingCoreCheck = false;
        updateUnsaidBackupCard(cacheEfficient, fitted);
        return { text: text + fitted };
      }
      pushMessage(`📇 Not enough room left in context to card ${forcedCodex} this turn — try again once the story frees up some space.`);
    }

    const sinceLastCodex = state.unsaid.turn - (state.unsaid.codex.lastTriggerTurn || 0);

    if (cfg.codexEnabled) {
      // Purge stale automatic junk candidates before any legacy-state
      // migration or scheduling. This makes the fix effective immediately
      // in existing adventures, not only for names seen after installation.
      pruneMentionCounts();

      const codexRecent = recentTurnsText(
        text,
        Math.max(
          cfg.recentTurnsWindow || 3,
          cfg.codexCharacterDeadline || 5,
          (cfg.codexCharacterMinTurns || 3) + 1
        )
      );

      // Migration + false-positive cleanup for saves that were already run
      // with the previous fast-track logic. That version could mark a mere
      // off-screen reference ("Mirelle said you'd be coming") as a character
      // introduction. We now require direct scene-presence evidence before
      // starting the character timer. Existing "likely" flags with no real
      // introduction timestamp are therefore revalidated instead of trusted.
      Object.keys(state.unsaid.codex.mentionCounts).forEach(name => {
        if (storyCards.some(c => c.title && isSameCardEntity(c.title, name))) return;

        if (typeof state.unsaid.codex.firstSeenTurn[name] !== "number") {
          state.unsaid.codex.firstSeenTurn[name] = state.unsaid.turn;
        }

        const directlyIntroduced = isLikelyCharacterIntroduction(name, codexRecent);
        const hadLegacyFlag = !!state.unsaid.codex.likelyCharacters[name];
        const hasIntroTurn = typeof state.unsaid.codex.introducedTurn[name] === "number";

        if (directlyIntroduced) {
          state.unsaid.codex.likelyCharacters[name] = true;
          state.unsaid.codex.observedTypes[name] = "character";
          if (!hasIntroTurn) {
            // Conservative migration: if we cannot know which exact old turn
            // contained the introduction, start the observation clock now.
            // Waiting three extra turns is preferable to canonizing a profile
            // too early.
            state.unsaid.codex.introducedTurn[name] = state.unsaid.turn;
          }
          if (codexAppearanceCount(name) === 0) {
            recordCodexEvidence(name, codexRecent, true);
          }
        } else if (hadLegacyFlag && !hasIntroTurn) {
          delete state.unsaid.codex.likelyCharacters[name];
          state.unsaid.codex.observedTypes[name] = state.unsaid.codex.observedTypes[name] || "character";
        }
      });

      const available = findCodexCandidates(
        cfg.mentionThreshold,
        excludedNames(cfg),
        cfg.codexMaxAttempts
      ).filter(name => (state.unsaid.codex.lastAttemptTurn[name] || -999999) < state.unsaid.turn);

      const minObserve = Math.max(0, cfg.codexCharacterMinTurns || 0);
      const minAppearances = Math.max(1, cfg.codexCharacterMinAppearances || 1);
      const deadline = Math.max(minObserve, cfg.codexCharacterDeadline || 5);

      const characterCandidates = available.filter(name =>
        !!state.unsaid.codex.likelyCharacters[name] &&
        typeof state.unsaid.codex.introducedTurn[name] === "number"
      );

      // The normal path needs BOTH enough elapsed story time and enough
      // distinct on-screen appearances. The hard deadline is deliberately
      // time-only so a recurring character cannot get stranded forever
      // because they stepped out of the scene after a strong introduction.
      const deadlineCharacters = characterCandidates.filter(name => {
        const age = state.unsaid.turn - state.unsaid.codex.introducedTurn[name];
        return age >= deadline;
      });
      const matureCharacters = characterCandidates.filter(name => {
        const age = state.unsaid.turn - state.unsaid.codex.introducedTurn[name];
        return age >= minObserve && codexAppearanceCount(name) >= minAppearances;
      });

      const nonCharacters = available.filter(name => !state.unsaid.codex.likelyCharacters[name]);

      // Automatic character generation is intentionally one profile at a
      // time. Models comply much more reliably with one structured card than
      // a batch, and it gives each profile more room to use accumulated
      // evidence. Deadline characters go first; otherwise use a normally
      // mature character. Non-character entities keep the ordinary global
      // Codex cooldown and may still be batched.
      let candidates = [];
      let hardDeadline = false;
      if (deadlineCharacters.length > 0) {
        candidates = deadlineCharacters.slice(0, 1);
        hardDeadline = true;
      } else if (matureCharacters.length > 0) {
        candidates = matureCharacters.slice(0, 1);
      } else if (sinceLastCodex >= cfg.codexCooldown) {
        candidates = nonCharacters;
      }

      if (candidates.length > 0) {
        const priorFailures = candidates.reduce(
          (max, name) => Math.max(max, state.unsaid.codex.attempts[name] || 0),
          0
        );

        const fitted = buildAndFitCodexInstruction(
          candidates,
          text,
          false,
          priorFailures,
          hardDeadline
        );

        if (fitted) {
          const types = {};
          candidates.forEach(name => {
            state.unsaid.codex.attempts[name] = (state.unsaid.codex.attempts[name] || 0) + 1;
            state.unsaid.codex.lastAttemptTurn[name] = state.unsaid.turn;
            types[name] = state.unsaid.codex.observedTypes[name] || classifyCodexEntry(name, text);
          });
          state.unsaid.codex.pendingNames = candidates;
          state.unsaid.codex.pendingTypes = types;
          state.unsaid.codex.pendingForced = false;
          state.unsaid.codex.lastTriggerTurn = state.unsaid.turn;
          state.unsaid.pending = null;
          state.unsaid.pendingCoreShiftAllowed = false;
          state.unsaid.pendingCoreCheck = false;
          updateUnsaidBackupCard(cacheEfficient, fitted);
          return { text: text + fitted };
        }

        // Context-budget failures do not consume an attempt. Mature
        // characters remain eligible next turn; non-characters wait for
        // their normal scheduling opportunity.
        pushMessage(`📇 Not enough room left in context to card ${
          candidates.length === 1 ? candidates[0] : candidates.length + " eligible names"
        } right now — Codex will retry automatically later.`);
      }
    }

    state.unsaid.codex.pendingNames = [];
      state.unsaid.codex.pendingForced = false;

    if (cfg.cast.length > 0) {
      const eligible = active.filter(name => {
        const mind = state.unsaid.minds[name];
        return !mind || !mind.lastTurn || (state.unsaid.turn - mind.lastTurn) >= cfg.cooldown;
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
          state.unsaid.pendingCoreShiftAllowed = naturalCoreShiftEligible(state.unsaid.minds[chosen], cfg.allowCoreShift);
          state.unsaid.pendingCoreCheck = false;
          updateUnsaidBackupCard(cacheEfficient, fitted);
          return { text: text + fitted };
        }
      }
    }

    state.unsaid.pending = null;
    state.unsaid.pendingCoreShiftAllowed = false;
    state.unsaid.pendingCoreCheck = false;
    updateUnsaidBackupCard(cacheEfficient, "");
    return { text };
  } catch (e) {
    if (typeof log === "function") log("UNSAID Context error: " + (e && e.message));
    return { text: originalText };
  }
};

var modifier = (text) => unsaidModifier(text);

modifier(text);
