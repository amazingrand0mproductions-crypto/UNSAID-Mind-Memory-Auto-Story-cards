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

    // --- Codex: parse hidden profile blocks and build Story Cards ---
    // Multiple blocks can appear in one response now, since a single
    // instruction can request several profiles at once — nothing in
    // the platform limits a script to one addStoryCard per turn, so
    // there's no reason to only ever process one candidate at a time.
    // Blocks are matched in order against the names actually requested
    // this turn (Profile 1 → pendingNames[0], Profile 2 → [1], etc.),
    // the same trust-our-own-tracking approach the single-card version
    // always used rather than trusting whatever the AI wrote as "Name".
    // Checked regardless of whether any were expected: on cache
    // efficient models (or after any mismatch between what Context asked
    // for and what actually got generated), a 【CARD】 block can show up
    // unrequested — usually the model imitating a pattern left visible in
    // its own story history. Left alone, that block sits in the visible
    // narrative forever and teaches the model to keep repeating it. So
    // every closed block always gets found and removed; it's only
    // turned into an actual Story Card when it lines up with a name we
    // actually asked for.
    const blockPattern = /【CARD】([\s\S]*?)【\/CARD】/g;
    const blockMatches = [...text.matchAll(blockPattern)];
    const expectedNames = state.unsaid.codex.pendingNames || [];
    const expectedTypes = state.unsaid.codex.pendingTypes || {};
    const succeededNames = new Set();

    // pulled out so it can be reused for both a properly closed block
    // and a salvaged unclosed one below — same field-parsing, same
    // type-correction, same card-creation logic either way
    function tryBuildCard(blockContent, name, upfrontType) {
      let type = upfrontType || "character";
      const fields = {};
      blockContent.split("\n").forEach(line => {
        const fieldMatch = line.match(/^\s*([A-Za-z ]+):\s*(.+)$/);
        if (fieldMatch) fields[fieldMatch[1].trim()] = fieldMatch[2].trim();
      });
      if (!fields["Name"]) return false;

      // the upfront classification was a heuristic guess, not a fact —
      // it can't enumerate every real-world place name, and the
      // instruction now explicitly invites the model to correct it.
      // Whichever set of fields the response actually used is a far
      // more reliable signal of the real type than the guess was —
      // "Location"/"Key Locations" means it's a location regardless
      // of what was originally assumed, "Properties"/"Origin" means
      // it's an item. Item and faction share every other field, so
      // without one of those two there's no clear signal to override
      // on — the original guess stands rather than trading one weak
      // guess for another.
      if (fields["Location"] || fields["Key Locations"]) type = "location";
      else if (fields["Properties"] || fields["Origin"]) type = "item";
      else if (fields["Type"] && !fields["Race"] && !fields["Personality"] && !fields["Background"] && type === "character") {
        type = "faction"; // clearly not a character, no item-specific fields either — faction is the safer default of the two
      }

      succeededNames.add(name);
      // exact match here on purpose, unlike syncMindToCard's lookup:
      // findCodexCandidates already excludes any name matching an
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

      // newly discovered characters automatically join the private-thoughts cast
      if (type === "character") {
        const configCard = ensureConfigCard();
        if (!configCard.description.includes(name)) {
          configCard.description += `\n${name}`;
        }
        // if this character already had tracked feelings before their
        // card existed, show them on the card right away
        syncMindToCard(name, cfg.allowCoreShift, cfg.jsonNotes);
      }
      return true;
    }

    blockMatches.forEach((match, i) => {
      const name = expectedNames[i];
      if (!name) return; // more blocks than we actually requested — stripped below, not carded
      tryBuildCard(match[1], name, expectedTypes[name]);
    });

    // strip every matched (closed) block regardless of whether it lined
    // up with something we expected
    if (blockMatches.length > 0) {
      text = text.replace(blockPattern, "").replace(/\n{3,}/g, "\n\n");
    }
    // a remaining, unclosed 【CARD】 tag is checked for regardless of how
    // many closed blocks came before it — a response can contain one
    // complete card followed by a second one that got cut off, and the
    // old version of this check only ever looked for an unclosed tag
    // when there were zero closed blocks, missing that dangling case
    // entirely. Rather than only strip it, first try to salvage it:
    // the model attempted this one too, it just didn't finish — the
    // same reasoning already applied to reveals' unclosed-tag handling,
    // and directly inspired by how Auto-Cards treats a genuine attempt
    // as worth keeping rather than discarding outright. Matched
    // positionally to whichever expected name would come next in
    // sequence, the same trust-our-own-tracking approach used for
    // closed blocks, since the "Name" field in a cut-off response can
    // itself be incomplete.
    const remainingOpenMatch = text.match(/【CARD】([\s\S]*)$/);
    if (remainingOpenMatch) {
      const nextName = expectedNames[blockMatches.length];
      if (nextName && !succeededNames.has(nextName)) {
        tryBuildCard(remainingOpenMatch[1], nextName, expectedTypes[nextName]);
      }
      // strip regardless of whether the salvage attempt succeeded —
      // an unfinished block, salvaged or not, doesn't belong in the
      // visible story either way
      text = text.replace(/【CARD】[\s\S]*$/, "").replace(/\n{3,}/g, "\n\n").trimEnd();
    }

    if (succeededNames.size > 0) {
      const names = [...succeededNames];
      state.message = names.length === 1
        ? `📇 Codex created a ${expectedTypes[names[0]]} card for ${names[0]}.`
        : `📇 Codex created ${names.length} cards: ${names.join(", ")}.`;
    }

    // any requested name that didn't end up with a successful block —
    // whether the model skipped it, ran out of room, or wrote something
    // without a Name field — still counted against its retry budget the
    // moment it was requested (in Context.js). Once that budget is used
    // up, Codex silently gives up on that name forever, with no card and
    // no explanation, unless told otherwise. Surfacing that here turns
    // an invisible dead end into something actionable: delete a stray
    // card, or reset Codex tracking to retry.
    const exhausted = expectedNames.filter(name => {
      if (succeededNames.has(name)) return false;
      return (state.unsaid.codex.attempts[name] || 0) >= cfg.codexMaxAttempts;
    });
    if (exhausted.length > 0) {
      state.message = exhausted.length === 1
        ? `📇 Codex gave up on "${exhausted[0]}" after ${state.unsaid.codex.attempts[exhausted[0]]} attempts without a usable response. Use "Reset Codex tracking now" in the config card to let it try again.`
        : `📇 Codex gave up on ${exhausted.length} names (${exhausted.join(", ")}) after repeated attempts without a usable response. Use "Reset Codex tracking now" in the config card to let them try again.`;
    }

    state.unsaid.codex.pendingNames = [];
    state.unsaid.codex.pendingTypes = {};

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
        let isCoreShift = modifier2 && /^core-shift$/i.test(modifier2);
        let about = modifier2 && !isCoreShift ? modifier2.replace(/^about\s+/i, "").trim() : null;
        // modifier2 only ever gets set by the strict path — a core-shift
        // attempt that also happened to trip the loose or name-omitted
        // fallback would otherwise silently downgrade to an ordinary
        // reveal. Checked here too so a malformed-but-genuine attempt
        // still registers as one.
        if (!isCoreShift && usedFallback && /^core-shift\s*[:,]?\s*/i.test(thought)) {
          isCoreShift = true;
          thought = thought.replace(/^core-shift\s*[:,]?\s*/i, "");
        }
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
        syncMindToCard(name, cfg.allowCoreShift, cfg.jsonNotes);

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

    syncCoreMemory(cfg.memoryMaxEntries, cfg.memorySyncEnabled, cfg.memoryPercent);
    syncFrontMemoryHint(cfg.subtleHints);

    return { text };
  } catch (e) {
    // never let an unexpected error here break the player's turn
    if (typeof log === "function") log("UNSAID Output error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
