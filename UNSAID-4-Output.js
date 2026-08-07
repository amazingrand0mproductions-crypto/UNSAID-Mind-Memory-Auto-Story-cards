// ===== UNSAID — OUTPUT =====
try {
  initUnsaid();
} catch (e) {
  // setup touches Story Cards and existing state — never let a
  // problem there break the turn before the modifier even runs
}

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
    const expectedName = state.unsaid.codex.pendingName;
    const expectedType = state.unsaid.codex.pendingType;
    let codexSucceeded = false;

    if (match && expectedName) {
      const name = expectedName;
      const type = expectedType;

      const fields = {};
      match[1].split("\n").forEach(line => {
        const fieldMatch = line.match(/^\s*([A-Za-z ]+):\s*(.+)$/);
        if (fieldMatch) fields[fieldMatch[1].trim()] = fieldMatch[2].trim();
      });

      if (fields["Name"]) {
        codexSucceeded = true;
        // exact match here on purpose, unlike syncMindToCard's lookup:
        // findCodexCandidate already excludes any name matching an
        // existing card via isSameCardEntity, so by now "name" normally
        // has no card at all. This writes to entry — the card's actual
        // lore — not just notes, so loosening the match here risks
        // overwriting a real, hand-authored card's content with a
        // generic AI profile if a partial match ever did occur, which
        // would be worse than just making a separate new card.
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
          syncMindToCard(name, cfg.allowCoreShift);
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

    // an attempt that was requested and didn't produce a usable card —
    // whether the model ignored the instruction entirely, or wrote
    // something that didn't include a Name field — still counted against
    // the retry budget the moment it was requested (in Context.js). Once
    // that budget is used up, Codex silently gives up on this name
    // forever, with no card and no explanation, unless told otherwise.
    // Surfacing that here turns an invisible dead end into something
    // actionable: delete a stray card, or reset Codex tracking to retry.
    if (expectedName && !codexSucceeded) {
      const usedAttempts = state.unsaid.codex.attempts[expectedName] || 0;
      if (usedAttempts >= cfg.codexMaxAttempts) {
        state.message = `📇 Codex gave up on "${expectedName}" after ${usedAttempts} attempt${usedAttempts === 1 ? "" : "s"} without a usable response. Use "Reset Codex tracking now" in the config card to let it try again.`;
      }
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
      const strictPattern = new RegExp(
        `《${escapeForRegex(name)},\\s*([a-zA-Z]+)(?:,\\s*(about\\s+[^:》]+|core-shift))?:\\s*([^》]*)》`,
        "i"
      );
      let matchedPattern = strictPattern;
      let thoughtMatch = text.match(strictPattern);
      let feeling, modifier2, thought, usedFallback = false;

      if (thoughtMatch) {
        feeling = thoughtMatch[1].trim().toLowerCase();
        // confirmed from real play: a model can hit the colon format
        // correctly but still echo the template's placeholder word
        // itself as the "emotion" ("《Sera, feeling: ...》" — literally
        // capturing "feeling" as if it were a one-word emotion). Treat
        // that the same as not having extracted a clean label at all.
        if (feeling === "feeling" || feeling === "emotion" || feeling === "thought") feeling = null;
        modifier2 = thoughtMatch[2] ? thoughtMatch[2].trim() : null;
        thought = thoughtMatch[3].trim();
      } else {
        // Confirmed real failure mode, not a hypothetical: a model can
        // attempt the reveal but skip the colon format, e.g. writing
        // "《Name, feeling the phantom warmth of...》" — treating our
        // template's placeholder word "feeling" as literal prose to
        // continue rather than replacing it with a short emotion word.
        // Rather than silently discard a reveal the model clearly did
        // attempt, loosely capture everything between the name and the
        // closing bracket instead.
        const loosePattern = new RegExp(`《${escapeForRegex(name)},\\s*([^》]+)》`, "i");
        const looseMatch = text.match(loosePattern);
        if (looseMatch) {
          matchedPattern = loosePattern;
          thought = looseMatch[1].trim().replace(/^feeling\s+/i, "");
          usedFallback = true;
        } else {
          // also confirmed from real play: a reveal can drop the
          // character's name entirely — "《And for the first time in
          // fifteen years...》" with no "Name," prefix at all. Neither
          // pattern above can match that, since both anchor on the name.
          // We already know who was asked (state.unsaid.pending), so any
          // 《...》 block present at all, whoever it nominally belongs to,
          // is treated as theirs rather than discarded.
          const anyBracketPattern = /《([^》]+)》/;
          const anyMatch = text.match(anyBracketPattern);
          if (anyMatch) {
            matchedPattern = anyBracketPattern;
            thought = anyMatch[1].trim().replace(/^feeling\s+/i, "");
            usedFallback = true;
          }
        }
      }

      // an opening 《 with no closing 》 means the response got cut off
      // mid-reveal — confirmed happening in real play. Without this, the
      // raw, unfinished markup (e.g. "*《Sera, feeling: ...") stays in
      // the visible story forever, exactly the failure mode already
      // guarded against for an unclosed 【CARD】 tag.
      if (!thoughtMatch && !usedFallback && text.indexOf("《") !== -1) {
        text = text.replace(/《[\s\S]*$/, "").replace(/\n{3,}/g, "\n\n").trimEnd();
      }

      if (thoughtMatch || (usedFallback && thought)) {
        if (!feeling) {
          const existingMind = state.unsaid.minds[name];
          feeling = (existingMind && existingMind.feeling) || "conflicted";
        }
        const isCoreShift = modifier2 && /^core-shift$/i.test(modifier2);
        const about = modifier2 && !isCoreShift ? modifier2.replace(/^about\s+/i, "").trim() : null;
        const { wantSentence } = splitThoughtSentences(thought);

        // default: the reveal never appears in the story at all — it's
        // private, so it goes straight to the character's own card notes
        // instead of being narrated into the shared story text. Only
        // shown inline if the player has explicitly opted into that.
        if (cfg.showThoughtsInStory) {
          text = text.replace(matchedPattern, (full) =>
            full.trim().startsWith("*") ? full : `*${full.trim()}*`
          );
        } else {
          text = text.replace(matchedPattern, "").replace(/\n{3,}/g, "\n\n").trimEnd();
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
        // counts every reveal, automatic or /peek — no command required,
        // this is what naturally opens up eligibility for a core-shift
        // once a character has shown a little more of themselves
        mind.revealCount = (mind.revealCount || 0) + 1;
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
          const wasBelowThreshold = mind.tensionLevel < TENSION_THRESHOLD;
          const tensionCap = TENSION_THRESHOLD * DRASTIC_TENSION_MULTIPLIER;
          if (previousFeeling && previousFeeling !== feeling) {
            mind.tensionLevel = Math.min(tensionCap, mind.tensionLevel + 1);
          } else if (previousFeeling === feeling) {
            mind.tensionLevel = Math.max(0, mind.tensionLevel - 1);
          }
          tensionJustCrossed = cfg.allowCoreShift && wasBelowThreshold && mind.tensionLevel >= TENSION_THRESHOLD;
        }

        if (about) {
          recordRelation(name, about, feeling);
        }
        // keep the character's own card notes showing their current state —
        // visible on the card, but never sent to the AI as context
        syncMindToCard(name, cfg.allowCoreShift);

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
