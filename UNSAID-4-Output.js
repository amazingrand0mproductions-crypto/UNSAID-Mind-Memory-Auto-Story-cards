// ===== UNSAID — OUTPUT =====
initUnsaid();

const modifier = (text) => {
  const originalText = text; // clean fallback if anything below throws
  try {
    const cfg = readUnsaidConfig();

    // count mentions from the AI's own response text — combined with
    // Input's count, this is the full picture Codex uses for the threshold
    trackMentions(text);

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
          syncMindToCard(name);
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

    // --- Private thought reveal ---
    if (state.unsaid.pending) {
      const name = state.unsaid.pending;
      const pattern = new RegExp(
        `《${escapeForRegex(name)},\\s*([a-zA-Z]+)(?:,\\s*about\\s+([^:》]+))?:\\s*([^》]*)》`,
        "i"
      );
      const thoughtMatch = text.match(pattern);

      if (thoughtMatch) {
        const feeling = thoughtMatch[1].trim().toLowerCase();
        const about = thoughtMatch[2] ? thoughtMatch[2].trim() : null;
        const thought = thoughtMatch[3].trim();
        const { wantSentence } = splitThoughtSentences(thought);

        text = text.replace(pattern, (full) =>
          full.trim().startsWith("*") ? full : `*${full.trim()}*`
        );

        if (!state.unsaid.minds[name]) state.unsaid.minds[name] = createMind();
        const mind = state.unsaid.minds[name];
        if (!mind.core && !about) mind.core = thought;
        mind.feeling = feeling;
        if (wantSentence) mind.want = wantSentence;
        mind.lastTurn = state.unsaid.turn;
        if (!mind.feelingHistory) mind.feelingHistory = [];
        pushCapped(mind.feelingHistory, feeling, FEELING_HISTORY_LIMIT);

        if (about) {
          recordRelation(name, about, feeling);
        }
        // keep the character's own card notes showing their current state —
        // visible on the card, but never sent to the AI as context
        syncMindToCard(name);

        state.message = `💭 ${name} is thinking something they're not saying...`;
      }
      state.unsaid.pending = null;
    }

    if (cfg.memorySyncEnabled) syncCoreMemory(cfg.memoryMaxEntries);

    return { text };
  } catch (e) {
    // never let an unexpected error here break the player's turn
    if (typeof log === "function") log("UNSAID Output error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
