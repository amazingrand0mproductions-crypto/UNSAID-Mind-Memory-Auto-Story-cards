try {
  initUnsaid();
} catch (e) {
}

const modifier = (text) => {
  const originalText = text;
  try {
    trackMentions(text);

    if (/\/unsaid\s+status\b/i.test(text)) {
      const cfg = readUnsaidConfig();
      const report = buildStatusReport(cfg);
      let card = storyCards.find(c => c.title === "UNSAID — Status");
      if (!card) {
        card = createOrFindCard("unsaid status", " ", "Class");
        card.title = "UNSAID — Status";
        card.keys = "unsaid status";
        card.type = "Class";
      }
      card.entry = report;
      card.description = "Regenerated fresh each time you type \"/unsaid status\" as an action. Not sent to the AI.";
      state.message = "📋 Status written — check the \"UNSAID — Status\" card.";
      return { text: "(A quiet moment passes.)" };
    }

    const peekCoreMatch = text.match(/\/peek\s+([A-Za-z][\w\s]*?)\s+core\b/i);
    const peekMatch = peekCoreMatch || text.match(/\/peek\s+([A-Za-z][\w\s]*?)[\s"'.!?]*$/i);
    if (peekMatch) {
      const name = peekMatch[1].trim().slice(0, 60);
      state.unsaid.forcedPeek = name;
      state.unsaid.forcedPeekCore = !!peekCoreMatch;
      state.message = peekCoreMatch
        ? `🌗 Checking whether this moment has changed ${name}...`
        : `👁️ Peeking into ${name}'s thoughts...`;
      return { text: "(A quiet moment passes.)" };
    }

    return { text };
  } catch (e) {
    if (typeof log === "function") log("UNSAID Input error: " + (e && e.message));
    return { text: originalText };
  }
};
modifier(text);
