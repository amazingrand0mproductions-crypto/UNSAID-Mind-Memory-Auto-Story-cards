// ===== UNSAID — OUTPUT =====
initUnsaid();

const modifier = (text) => {
  const originalText = text; // clean fallback if anything below throws
  try {
    const cfg = readUnsaidConfig();

    // --- Codex: parse the hidden profile block and build a Story Card ---
    // Checked regardless of whether we were expecting one: on cache
    // efficient models (or after any mismatch between what Context asked
    // for and what actually got generated), a 【CARD】 block can show up
    // unrequested — usually the model imitating a pattern left visible in
    // its own story history. Left alone, that block sits in the visible
    // narrative forever and teaches the model to keep repeating it. So it
    // always gets found and removed; it's only turned into an actual
    // Story Card when we know what name and type it's supposed to be.
    const blockPattern = /【CARD】([\s\S]*?)【\/CARD】/;
    const openTagPattern = /【CARD】/;
    const match = text.match(blockPattern);

    if (match && state.unsaid.codex.pendingName) {
      const name = state.unsaid.codex.pendingName;
      const type = state.unsaid.codex.pendingType;

      const fields = {};
      match[1].split("\n").forEach(line => {
        const fieldMatch = line.match(/^\s*([A-Za-z ]+):\s*(.+)$/);
        if (fieldMatch) fields[fieldMatch[1].trim()] = fieldMatch[2].trim();
      });

      if (fields["Name"]) {
        let card = storyCards.find(c => c.title.toLowerCase() === name.toLowerCase());
        if (!card) {
          card = createOrFindCard(name.toLowerCase(), " ", type);
        }
        card.title = name;
        card.keys = name.toLowerCase();
        card.type = type;

        const order = CARD_TEMPLATES[type] || CHARACTER_CARD_FIELDS;
        let builtEntry = order
          .filter(f => fields[f])
          .map(f => `${f}: ${fields[f]}`)
          .join("\n");
        // guards against an unusually long AI-generated profile overflowing
        // the Story Card entry field
        if (builtEntry.length > MAX_CARD_ENTRY_LENGTH) {
          builtEntry = builtEntry.slice(0, MAX_CARD_ENTRY_LENGTH - 3) + "...";
        }
        card.entry = builtEntry;

        logCodexCard(name, type, state.unsaid.codex.mentionCounts[name] || 0);
        forgetMentionTracking(name); // no longer needed once the card exists
        state.message = `📇 Codex created a ${type} card for ${name}.`;

        // newly discovered characters automatically join the private-thoughts cast
        if (type === "character") {
          const configCard = ensureConfigCard();
          if (!configCard.description.includes(name)) {
            configCard.description += `\n${name}`;
          }
          // if this character already had tracked feelings before their
          // card existed, show them on the card right away
          syncMindToCard(name, cfg.compactCardNotes, cfg.showCoreStability, cfg.allowCoreShift, cfg.tensionThreshold);
        }
      }
    }

    // strip a matched (closed) block regardless of whether it was expected
    if (match) {
      text = text.replace(blockPattern, "").replace(/\n{3,}/g, "\n\n");
    } else if (openTagPattern.test(text)) {
      // an opening tag with no closing tag means the response got cut off
      // mid-card — without this, the raw, unfinished markup stays in the
      // story forever (exactly what an unclosed 【CARD】 in the visible
      // narrative looks like). Cut from the opening tag to the end rather
      // than leave a broken fragment visible.
      text = text.replace(/【CARD】[\s\S]*$/, "").replace(/\n{3,}/g, "\n\n").trimEnd();
    }

    state.unsaid.codex.pendingName = null;
    state.unsaid.codex.pendingType = null;

    // count mentions only now that any 【CARD】 scaffolding has been
    // stripped out — otherwise the script's own field labels (and the
    // word "CARD" itself) can get tracked as if they were story content
    // and eventually Codexed into a bogus card
    trackMentions(text);

    // --- Private thought reveal ---
    if (state.unsaid.pending) {
      const name = state.unsaid.pending;
      const pattern = new RegExp(
        `《${escapeForRegex(name)},\\s*([a-zA-Z]+)(?:,\\s*(about\\s+[^:》]+|core-shift))?:\\s*([^》]*)》`,
        "i"
      );
      const thoughtMatch = text.match(pattern);

      if (thoughtMatch) {
        const feeling = thoughtMatch[1].trim().toLowerCase();
        const modifier2 = thoughtMatch[2] ? thoughtMatch[2].trim() : null;
        const isCoreShift = modifier2 && /^core-shift$/i.test(modifier2);
        const about = modifier2 && !isCoreShift ? modifier2.replace(/^about\s+/i, "").trim() : null;
        const thought = thoughtMatch[3].trim();
        const { wantSentence } = splitThoughtSentences(thought);

        // default: the reveal never appears in the story at all — it's
        // private, so it goes straight to the character's own card notes
        // instead of being narrated into the shared story text. Only
        // shown inline if the player has explicitly opted into that.
        if (cfg.showThoughtsInStory) {
          text = text.replace(pattern, (full) =>
            full.trim().startsWith("*") ? full : `*${full.trim()}*`
          );
        } else {
          text = text.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trimEnd();
        }

        if (!state.unsaid.minds[name]) state.unsaid.minds[name] = createMind();
        const mind = state.unsaid.minds[name];
        const previousFeeling = mind.feeling;
        let justShifted = false;
        if (isCoreShift && cfg.allowCoreShift && thought && thought !== mind.core) {
          // a deliberate, rare replacement of the anchor itself — the old
          // one is kept, not erased, so the shift can still be referenced.
          // Guarded against a no-op "shift" to the same text, which would
          // otherwise burn a history slot and leave the current core
          // duplicated as its own "former" belief.
          if (!mind.coreHistory) mind.coreHistory = [];
          if (mind.core) pushCapped(mind.coreHistory, mind.core, 2);
          mind.core = thought;
          mind.coreSetTurn = state.unsaid.turn;
          mind.tensionLevel = 0; // the earned moment resolves the tension that built to it
          justShifted = true;
        } else if (!mind.core && !about) {
          mind.core = thought;
          mind.coreSetTurn = state.unsaid.turn;
        }
        mind.feeling = feeling;
        if (wantSentence) mind.want = wantSentence;
        mind.lastThoughtText = thought;
        mind.lastTurn = state.unsaid.turn;
        if (!mind.feelingHistory) mind.feelingHistory = [];
        pushCapped(mind.feelingHistory, feeling, FEELING_HISTORY_LIMIT);

        // a feeling that keeps landing somewhere genuinely new builds
        // quiet tension against the core truth; one that holds steady
        // eases it back off — this is what lets a core-shift feel earned
        // rather than a coin flip available on every single reveal.
        // Capped at DRASTIC_TENSION_MULTIPLIER × the normal threshold,
        // not the threshold itself, so it can keep climbing past the
        // normal earn-point into "drastic" territory if it never resolves
        let tensionJustCrossed = false;
        if (!justShifted) {
          if (typeof mind.tensionLevel !== "number") mind.tensionLevel = 0;
          const wasBelowThreshold = mind.tensionLevel < cfg.tensionThreshold;
          const tensionCap = cfg.tensionThreshold * DRASTIC_TENSION_MULTIPLIER;
          if (previousFeeling && previousFeeling !== feeling) {
            mind.tensionLevel = Math.min(tensionCap, mind.tensionLevel + 1);
          } else if (previousFeeling === feeling) {
            mind.tensionLevel = Math.max(0, mind.tensionLevel - 1);
          }
          tensionJustCrossed = cfg.allowCoreShift && wasBelowThreshold && mind.tensionLevel >= cfg.tensionThreshold;
        }

        if (about) {
          recordRelation(name, about, feeling);
        }
        // keep the character's own card notes showing their current state —
        // visible on the card, but never sent to the AI as context
        syncMindToCard(name, cfg.compactCardNotes, cfg.showCoreStability, cfg.allowCoreShift, cfg.tensionThreshold);

        if (isCoreShift && cfg.allowCoreShift) {
          state.message = `🌗 ${name} has been fundamentally changed — check their Story Card.`;
        } else if (tensionJustCrossed) {
          state.message = `⚡ ${name}'s sense of self is starting to waver...`;
        } else {
          state.message = cfg.showThoughtsInStory
            ? `💭 ${name} is thinking something they're not saying...`
            : `💭 ${name} is secretly feeling ${feeling} — check their Story Card for the rest.`;
        }
      }
      state.unsaid.pending = null;
    }

    if (cfg.memorySyncEnabled) syncCoreMemory(cfg.memoryMaxEntries);
    syncFrontMemoryHint(cfg.subtleHints);

    return { text };
  } catch (e) {
    // never let an unexpected error here break the player's turn
    if (typeof log === "function") log("UNSAID Output error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
