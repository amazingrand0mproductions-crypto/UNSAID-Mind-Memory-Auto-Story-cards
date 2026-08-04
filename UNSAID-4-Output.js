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
    if (state.unsaid.codex.pendingName) {
      const name = state.unsaid.codex.pendingName;
      const type = state.unsaid.codex.pendingType;
      const blockPattern = /【CARD】([\s\S]*?)【\/CARD】/;
      const match = text.match(blockPattern);

      if (match) {
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

        // the profile is for the Story Card only — keep it out of the story itself
        text = text.replace(blockPattern, "").replace(/\n{3,}/g, "\n\n");
      }

      state.unsaid.codex.pendingName = null;
      state.unsaid.codex.pendingType = null;
    }

    // --- Private thought reveal ---
    if (state.unsaid.pending) {
      const name = state.unsaid.pending;
      const pattern = new RegExp(
        `《${escapeForRegex(name)},\\s*([a-zA-Z]+)(?:,\\s*about\\s+([^:》]+))?:\\s*([^》]*)》`,
        "i"
      );
      const match = text.match(pattern);

      if (match) {
        const feeling = match[1].trim().toLowerCase();
        const about = match[2] ? match[2].trim() : null;
        const thought = match[3].trim();
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
    // never let an unexpected error here break the player's turn —
    // some platform configurations (e.g. certain models with Optimized
    // Context on) restrict scripting features in undocumented ways
    if (typeof log === "function") log("UNSAID Output error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
