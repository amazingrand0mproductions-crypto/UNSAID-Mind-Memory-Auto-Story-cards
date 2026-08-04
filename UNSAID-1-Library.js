// ===== UNSAID — LIBRARY =====
// Two features sharing one small script:
//
// 1. Private thoughts — occasionally reveals what a character is
//    really feeling and thinking but not saying out loud: one
//    sentence on how they feel right now, one on what they secretly
//    want. Feeling, want, and a short rolling history of each evolve
//    independently, alongside a "core truth" (their first standalone
//    thought) and how they feel about up to six specific other
//    people — with a short history per relationship too, so a
//    reaction can reference how things have shifted, not just where
//    they stand right now. A scene with someone they already have
//    history with pulls from that instead of a random new reaction.
//    Type "/peek <name>" as an action to force an immediate reveal on
//    demand. Every character's current state is also kept visible on
//    their own Story Card's notes — never their entry — so it's
//    readable at a glance without ever costing the AI any context.
//
// 2. Codex — tracks how many times each new name is mentioned, and
//    only writes a Story Card once it clears a configurable threshold
//    (so background one-off names don't get cards). Recognizes when a
//    shorter and longer version of the same name refer to one entity
//    ("Marcus" / "Marcus Cole") instead of doubling up, and never
//    cards the player's own character — manually named, or, in
//    Multiplayer, every character the platform already knows about.
//    Builds the right template for a character, location, item, or
//    faction, and keeps a separate tracking card per type. Delete a
//    card to have Codex redo it. New characters join the
//    private-thoughts cast automatically.
//
// A short, capped summary of each tracked character's core truth,
// want, and top relationship also rides in the adventure's always-on
// Memory — the one part of context that survives regardless of how
// long it's been since a character was last mentioned, so something
// established at turn 1 can still matter at turn 1000.
//
// Context-budget aware throughout, with a small safety margin built
// in, and works the same whether or not the platform's own context
// optimization is switched on: every injected instruction is checked
// against the budget before it's sent, shrinking or skipping itself
// rather than risk crowding out the story. Story Cards are looked up
// by their keys rather than list position, the config card self-heals
// its settings if a line gets edited or reordered, and relationships,
// mention tracking, and memory entries all stay capped instead of
// growing without bound over a long story.

const UNSAID_DEFAULTS = {
  enabled: true,
  codexEnabled: true,
  memorySyncEnabled: true,
  chance: 0.3,        // chance per turn a thought fires, when someone qualifies
  cooldown: 3,          // turns a character must wait before thinking again
  mentionThreshold: 3,   // a name needs MORE than this many mentions before Codex cards it
  memoryMaxEntries: 8,    // how many characters' core truths ride in always-on memory
  playerName: ""           // if set, Codex will never write a card for this name
};

const CONTEXT_SAFETY_MARGIN = 20; // leave a little headroom below the platform's stated limit
const FEELING_HISTORY_LIMIT = 3;   // how many recent feelings to remember per character
const RELATION_HISTORY_LIMIT = 2;   // how many recent feelings to remember per relationship
const MAX_MEMORY_CONTEXT_LENGTH = 700; // keeps our block well under the ~1000-1500 char limits reported for the Memory field
const MAX_CARD_ENTRY_LENGTH = 1800;     // guards against an overlong AI-generated card entry
const CORE_MEMORY_MARKER = "[UNSAID — core truths]";
const CORE_MEMORY_MAX_ENTRIES = 8;  // caps how many characters' core truths ride in always-on memory
const MAX_RELATIONS_PER_CHARACTER = 6; // caps how many other characters' feelings each mind tracks
const MENTION_TRACKING_CAP = 150; // caps how many never-carded names stay tracked at once

const CODEX_STOPWORDS = new Set([
  "I", "The", "A", "An", "You", "He", "She", "They", "It", "We", "But",
  "And", "So", "Then", "If", "When", "As", "At", "In", "On", "With",
  "This", "That", "There", "Here", "What", "Who", "Why", "How", "Yes",
  "No", "Okay", "Oh", "Well", "Suddenly", "Meanwhile", "Finally",
  "Perhaps", "Maybe", "However", "Still", "Yet", "Now", "Later",
  "Before", "After", "Once", "Just", "Even", "Also", "Instead",
  "Indeed", "Certainly", "Clearly", "Obviously", "Surely",
  "Sometimes", "Always", "Never", "Really", "Actually", "Honestly",
  "Wait", "Look", "Listen", "Right", "Alright", "Hey", "Huh", "Hmm", "Ah"
]);

const CODEX_LOCATION_HINTS = /\b(city|state|street|avenue|canyon|terminal|park|building|tower|island|country|nation|kingdom|realm|district|region|planet|world|base|facility|academy|university|bridge|river|mountain|forest|desert|battleground|warzone|hall|tavern|inn|castle|fortress|temple)\b/i;

const CODEX_FACTION_HINTS = /\b(order|guild|alliance|empire|faction|clan|brotherhood|council|syndicate|coalition|army|legion|cult|society|corporation|company|initiative|division|agency|federation|dynasty|tribe)\b/i;

const CODEX_ITEM_HINTS = /\b(sword|blade|gun|rifle|pistol|staff|wand|amulet|ring|armou?r|shield|artifact|device|weapon|tool|key|book|tome|potion|elixir|gem|crystal|relic|suit|mask|cloak|helmet|gauntlet|hammer|axe|bow|orb|blaster|scroll|spear|dagger|lance|trident|chalice|sigil|banner)\b/i;

const CHARACTER_CARD_FIELDS = ["Name", "Race", "Strength Level", "Background", "Personality", "Appearance", "Abilities", "Weaknesses", "Relationships"];
const LOCATION_CARD_FIELDS = ["Name", "Location", "Description", "Key Locations", "Historical Events", "Significance"];
const ITEM_CARD_FIELDS = ["Name", "Type", "Description", "Properties", "Origin", "Significance"];
const FACTION_CARD_FIELDS = ["Name", "Type", "Description", "Significance"];

const CARD_TEMPLATES = {
  character: CHARACTER_CARD_FIELDS,
  location: LOCATION_CARD_FIELDS,
  item: ITEM_CARD_FIELDS,
  faction: FACTION_CARD_FIELDS
};

const MIND_NOTES_MARKER = "[UNSAID — current state]";
const CAST_LIST_MARKER = "===";
const CODEX_MAX_ATTEMPTS = 3; // give up on a name after this many failed tries

function initUnsaid() {
  if (!state.unsaid) {
    state.unsaid = {
      // Name: { core, feeling, feelingHistory, relations: { Other: "feeling" }, lastTurn }
      minds: {},
      turn: 0,
      pending: null,
      forcedPeek: null,
      codex: { mentionCounts: {}, attempts: {}, pendingName: null, pendingType: null }
    };
  }
  if (!state.unsaid.codex) {
    state.unsaid.codex = { mentionCounts: {}, attempts: {}, pendingName: null, pendingType: null };
  }
  if (!state.unsaid.codex.mentionCounts) state.unsaid.codex.mentionCounts = {};
  ensureConfigCard();
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// matches a whole name only (so "Ari" in config can't false-trigger on
// "Aria", and matching ignores case so small typos in the story text
// don't silently break detection)
function nameAppears(name, text) {
  return new RegExp(`\\b${escapeForRegex(name)}\\b`, "i").test(text);
}

// addStoryCard returns the new card's index directly (confirmed via
// AI Dungeon's scripting docs) — or false if a card with these keys
// already exists. Use the index when we get one; fall back to a keys
// search only for that already-exists case.
function createOrFindCard(keys, initialEntry, type) {
  const idx = addStoryCard(keys, initialEntry, type);
  if (idx !== false && storyCards[idx]) return storyCards[idx];
  return storyCards.find(c => c.keys === keys) || storyCards[storyCards.length - 1];
}

function ensureConfigCard() {
  let card = storyCards.find(c => c.title === "UNSAID Config" || c.keys === "unsaid config");
  if (!card) {
    card = createOrFindCard("unsaid config", " ", "config");
    card.title = "UNSAID Config";
    card.keys = "unsaid config";
    card.type = "config";
    card.entry =
      "> Enable UNSAID: true\n" +
      "> Enable Codex: true\n" +
      "> Sync core truths to always-on memory: true\n" +
      "> Chance of a thought per turn (0 to 1): 0.3\n" +
      "> Turns before the same character can think again: 3\n" +
      "> Mentions needed before Codex creates a card: 3\n" +
      "> Characters remembered in long-term memory: 8\n" +
      "> Player character (skip when Codexing): ";
    card.description =
      "UNSAID Config — what each setting above does:\n" +
      "- Enable UNSAID: master switch for the whole script (private thoughts and Codex together). False turns everything off.\n" +
      "- Enable Codex: turns automatic Story Card generation on or off by itself. Turn this off to keep private thoughts without new cards being made.\n" +
      "- Sync core truths to always-on memory: keeps a short, capped list of characters' core truths in your adventure's Memory, which the AI always sees — unlike Story Cards, which only appear when triggered. This is what lets something a character revealed on turn 1 still reach the AI on turn 1000.\n" +
      "- Chance of a thought per turn: how likely (0 to 1) it is that an eligible, active character reveals a private thought on any given turn. Higher means more frequent reveals.\n" +
      "- Turns before the same character can think again: a cooldown, in turns, before that same character is eligible for another thought — keeps one character from dominating.\n" +
      "- Mentions needed before Codex creates a card: how many times a new name must appear before Codex writes a card for it, so background one-off names don't get cards of their own.\n" +
      "- Characters remembered in long-term memory: how many characters' core truths are allowed to ride in the always-on memory summary at once. Higher keeps more people relevant longer, but uses more of your context budget.\n" +
      "- Player character (skip when Codexing): put your own character's name here if you don't want Codex writing an AI-authored profile for them. Leave blank to let Codex treat them like anyone else. In Multiplayer, everyone's character name is already skipped automatically.\n\n" +
      "Add the names of characters who can have private thoughts below, one per line. Codex adds newly discovered characters here automatically.\n" +
      CAST_LIST_MARKER + "\n" +
      "Marcus\n" +
      "Aria";
  }
  return card;
}

function readUnsaidConfig() {
  const card = ensureConfigCard();
  const cfg = { ...UNSAID_DEFAULTS };

  const enabledMatch = card.entry.match(/Enable UNSAID:\s*(true|false)/i);
  if (enabledMatch) cfg.enabled = enabledMatch[1].toLowerCase() === "true";

  const codexMatch = card.entry.match(/Enable Codex:\s*(true|false)/i);
  if (codexMatch) cfg.codexEnabled = codexMatch[1].toLowerCase() === "true";

  const memSyncMatch = card.entry.match(/always-on memory:\s*(true|false)/i);
  if (memSyncMatch) cfg.memorySyncEnabled = memSyncMatch[1].toLowerCase() === "true";

  const chanceMatch = card.entry.match(/thought per turn[^:]*:\s*([\d.]+)/i);
  if (chanceMatch) {
    const parsedChance = parseFloat(chanceMatch[1]);
    // a malformed edit (e.g. a lone ".") parses to NaN, which would
    // otherwise silently poison cfg.chance and get written back into
    // the card as literal "NaN" — fall back to the default instead
    if (!isNaN(parsedChance)) cfg.chance = Math.min(1, Math.max(0, parsedChance));
  }

  const cooldownMatch = card.entry.match(/think again:\s*(\d+)/i);
  if (cooldownMatch) {
    const parsedCooldown = parseInt(cooldownMatch[1], 10);
    if (!isNaN(parsedCooldown)) cfg.cooldown = Math.max(0, parsedCooldown);
  }

  const mentionMatch = card.entry.match(/Mentions needed before Codex creates a card:\s*(\d+)/i);
  if (mentionMatch) {
    const parsedMentions = parseInt(mentionMatch[1], 10);
    if (!isNaN(parsedMentions)) cfg.mentionThreshold = Math.max(0, parsedMentions);
  }

  const memCountMatch = card.entry.match(/remembered in long-term memory:\s*(\d+)/i);
  if (memCountMatch) {
    const parsedMemCount = parseInt(memCountMatch[1], 10);
    if (!isNaN(parsedMemCount)) cfg.memoryMaxEntries = Math.max(0, parsedMemCount);
  }

  const playerMatch = card.entry.match(/Player character \(skip when Codexing\):\s*(.*)/i);
  if (playerMatch) cfg.playerName = playerMatch[1].trim();

  const markerIdx = card.description.indexOf(CAST_LIST_MARKER);
  const castSection = markerIdx >= 0
    ? card.description.slice(markerIdx + CAST_LIST_MARKER.length)
    : card.description.split("\n").slice(1).join("\n"); // legacy cards without the marker

  cfg.cast = castSection
    .split("\n")
    .map(line => line.trim().replace(/^[-•*]\s*/, "")) // tolerate bullet/dash lists
    .filter(Boolean);

  // self-heal: rewrite the entry in canonical form so typos or reordered
  // lines don't quietly break parsing on future turns, while keeping
  // whatever values were actually readable above. The notes/description
  // above is left alone so player edits to the explanations aren't lost.
  card.entry =
    `> Enable UNSAID: ${cfg.enabled}\n` +
    `> Enable Codex: ${cfg.codexEnabled}\n` +
    `> Sync core truths to always-on memory: ${cfg.memorySyncEnabled}\n` +
    `> Chance of a thought per turn (0 to 1): ${cfg.chance}\n` +
    `> Turns before the same character can think again: ${cfg.cooldown}\n` +
    `> Mentions needed before Codex creates a card: ${cfg.mentionThreshold}\n` +
    `> Characters remembered in long-term memory: ${cfg.memoryMaxEntries}\n` +
    `> Player character (skip when Codexing): ${cfg.playerName}`;

  return cfg;
}

// the config and log cards are for the player, not the AI — if the
// platform ever pulls their text into context (e.g. if pinned), strip
// it back out so it doesn't eat into the story's budget
function stripConfigNoise(text) {
  let cleaned = text;
  storyCards
    .filter(c => c.type === "config" && c.title && c.title.indexOf("UNSAID") === 0)
    .forEach(card => {
      if (card.entry) cleaned = cleaned.split(card.entry).join("");
      if (card.description) cleaned = cleaned.split(card.description).join("");
    });
  return cleaned;
}

// respects the platform's context budget, with a small safety margin
// so we never fill all the way to the exact last character. Works the
// same whether or not the platform's own context optimization is
// switched on, since it only ever looks at the text and info actually
// handed to this turn.
function fitInstructionToBudget(baseText, instruction) {
  const hasBudget = typeof info !== "undefined" && info && typeof info.maxChars === "number";
  if (!hasBudget) return instruction;
  const budget = info.maxChars - CONTEXT_SAFETY_MARGIN;
  if ((baseText.length + instruction.length) <= budget) return instruction;
  const room = budget - baseText.length;
  if (room > 40) return instruction.slice(0, room - 4) + "...]\n";
  return null;
}

// counts every proper-noun-looking mention in a piece of NEW text
// (a single Input or Output call, never the full sliding context) so
// the same mention is never counted more than once
function trackMentions(text) {
  if (!state.unsaid || !state.unsaid.codex) return;
  const matches = text.match(/\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,2})\b/g) || [];
  matches.forEach(raw => {
    const name = raw.trim();
    const firstWord = name.split(" ")[0];
    if (CODEX_STOPWORDS.has(firstWord)) return;
    state.unsaid.codex.mentionCounts[name] = (state.unsaid.codex.mentionCounts[name] || 0) + 1;
  });
  pruneMentionCounts();
}

// a very long story racks up a lot of one-off proper nouns that never
// clear the mention threshold — keep that list from growing forever
// by dropping the least-mentioned names once there are a lot of them
function pruneMentionCounts() {
  const counts = state.unsaid.codex.mentionCounts;
  const keys = Object.keys(counts);
  if (keys.length <= MENTION_TRACKING_CAP + 50) return; // don't bother until it's well over
  keys
    .sort((a, b) => counts[a] - counts[b])
    .slice(0, keys.length - MENTION_TRACKING_CAP)
    .forEach(k => delete counts[k]);
}

// layered heuristic: keyword hints first (most reliable), then
// contextual verb/preposition cues, defaulting to character last
// since most new proper nouns in a story are people
function classifyCodexEntry(name, text) {
  if (CODEX_LOCATION_HINTS.test(name)) return "location";
  if (CODEX_FACTION_HINTS.test(name)) return "faction";
  if (CODEX_ITEM_HINTS.test(name)) return "item";

  const nearLocation = new RegExp(`(in|at|near|to|from|through|inside|outside)\\s+${escapeForRegex(name)}\\b`, "i");
  if (nearLocation.test(text)) return "location";

  const nearItem = new RegExp(`(wields?|holds?|wearing|wears|using|uses|draws?|grips?|picks?\\s+up|holsters?)\\s+(the\\s+|a\\s+|an\\s+|his\\s+|her\\s+|their\\s+)?${escapeForRegex(name)}\\b`, "i");
  if (nearItem.test(text)) return "item";

  return "character";
}

// treats "Marcus" and "Marcus Cole" as the same entity so Codex doesn't
// write a second card for someone who already has one under a shorter
// or longer version of their name
function isSameCardEntity(cardTitle, candidateName) {
  const title = cardTitle.toLowerCase();
  const name = candidateName.toLowerCase();
  if (title === name) return true;
  const titleWords = title.split(" ");
  const nameWords = name.split(" ");
  const shorter = titleWords.length <= nameWords.length ? titleWords : nameWords;
  const longer = titleWords.length <= nameWords.length ? nameWords : titleWords;
  return shorter.length > 0 && shorter.every(w => longer.includes(w));
}

// gathers every name Codex should never write a card for: the manually
// configured player name, plus (in Multiplayer) every character name
// the platform already knows about
function excludedNames(cfg) {
  const names = [];
  if (cfg.playerName) names.push(cfg.playerName);
  if (typeof info !== "undefined" && info && Array.isArray(info.characters)) {
    info.characters.forEach(c => { if (c && c.name) names.push(c.name); });
  }
  return names;
}

// picks a name that has cleared the mention threshold, doesn't already
// have a Story Card (or a close match to one), and hasn't exhausted its
// retries. Deleting an existing card makes its name eligible again.
function findCodexCandidate(threshold, excludeNames) {
  const exclude = (excludeNames || []).map(n => n.toLowerCase());
  const counts = state.unsaid.codex.mentionCounts;
  for (const name in counts) {
    if (counts[name] <= threshold) continue;
    if (exclude.includes(name.toLowerCase())) continue;
    if (storyCards.some(c => isSameCardEntity(c.title, name))) continue;
    if ((state.unsaid.codex.attempts[name] || 0) >= CODEX_MAX_ATTEMPTS) continue;
    return name;
  }
  return null;
}

// builds the hidden-profile instruction for whichever template fits
function buildCodexInstruction(name, type) {
  const fields = CARD_TEMPLATES[type] || CHARACTER_CARD_FIELDS;
  const body = fields.map(f => `${f}: ${f === "Name" ? name : "..."}`).join("\n");
  return `\n[Write a hidden profile for "${name}" wrapped between 【CARD】 and 【/CARD】, placed after the story text — not part of the visible narrative:\n【CARD】\n${body}\n【/CARD】\nOne short line per field.]\n`;
}

function codexLogTitle(type) {
  const heading = type.charAt(0).toUpperCase() + type.slice(1) + "s";
  return `UNSAID Codex Log — ${heading}`;
}

// one dedicated tracking card per type, so each stays short and easy
// to scan instead of one card holding everything
function ensureCodexLogCard(type) {
  const title = codexLogTitle(type);
  const keys = title.toLowerCase();
  let card = storyCards.find(c => c.title === title || c.keys === keys);
  if (!card) {
    card = createOrFindCard(keys, " ", "config");
    card.title = title;
    card.keys = keys;
    card.type = "config";
    card.entry = `Every ${type} card Codex has made, with how many times it was mentioned before the card was created. Delete a card from the story to have Codex redo it — this entry can stay.`;
    card.description = "";
  }
  return card;
}

// records (or updates) a card's entry on its type's tracking card
function logCodexCard(name, type, mentionCount) {
  const card = ensureCodexLogCard(type);
  const entries = card.description.split("\n").map(l => l.trim()).filter(Boolean);
  const line = `${name} — mentioned ${mentionCount}x before card created`;
  const existingIdx = entries.findIndex(l => l.startsWith(`${name} —`));
  if (existingIdx >= 0) entries[existingIdx] = line;
  else entries.push(line);
  card.description = entries.join("\n");
}

// records how a character feels toward someone else, capped to the
// most recent MAX_RELATIONS_PER_CHARACTER people so a long-running
// story with a big cast doesn't grow this without bound — the oldest
// untouched relation is dropped first, matching character (the AI's
// name string prefix collision this could theoretically cause is a
// non-issue since we always compare full names)
function recordRelation(name, other, feeling) {
  // defensive: this function's only call site today always creates the
  // mind first, but it shouldn't silently crash if that ever changes
  if (!state.unsaid.minds[name]) state.unsaid.minds[name] = createMind();
  const mind = state.unsaid.minds[name];
  if (!mind.relations) mind.relations = {};
  if (!mind.relationOrder) mind.relationOrder = [];
  if (!mind.relationHistory) mind.relationHistory = {};

  mind.relations[other] = feeling;
  const idx = mind.relationOrder.indexOf(other);
  if (idx !== -1) mind.relationOrder.splice(idx, 1);
  mind.relationOrder.push(other);

  // a short history per relationship (not just the latest feeling) lets
  // a reaction reference how things have shifted, e.g. resentful → wary,
  // instead of only ever stating the current feeling in isolation
  if (!mind.relationHistory[other]) mind.relationHistory[other] = [];
  pushCapped(mind.relationHistory[other], feeling, RELATION_HISTORY_LIMIT);

  while (mind.relationOrder.length > MAX_RELATIONS_PER_CHARACTER) {
    const evicted = mind.relationOrder.shift();
    delete mind.relations[evicted];
    delete mind.relationHistory[evicted];
  }
}

// gives a character's own Story Card a readable, always-current snapshot
// of what UNSAID has learned about them — written to the card's notes,
// not its entry, so it's visible to you the moment you open the card
// but never costs a single character of the AI's context. The AI
// already gets an equivalent (and more detailed) picture whenever a
// thought actually fires, so there's no need to duplicate it into the
// part of the card that gets sent to the model every time it triggers.
function syncMindToCard(name) {
  const mind = state.unsaid.minds[name];
  if (!mind) return;

  const card = storyCards.find(c => c.title.toLowerCase() === name.toLowerCase() && c.type === "character");
  if (!card) return;

  const lines = [];
  if (mind.core) lines.push(`Core truth: ${mind.core}`);
  if (mind.feeling) lines.push(`Current feeling: ${mind.feeling}`);
  if (mind.want) lines.push(`Current want: ${mind.want}`);
  if (mind.relationOrder && mind.relationOrder.length > 0) {
    lines.push("Feelings toward others:");
    mind.relationOrder.forEach(other => lines.push(`  ${other}: ${mind.relations[other]}`));
  }
  if (lines.length === 0) return;

  const base = (card.description || "").split(MIND_NOTES_MARKER)[0].replace(/\s+$/, "");
  card.description = `${base}\n\n${MIND_NOTES_MARKER}\n${lines.join("\n")}`.trim();
}

// best-effort split of a two-sentence thought into a feeling-sentence
// and a want-sentence; falls back gracefully if there's only one
function splitThoughtSentences(thought) {
  const sentences = thought.split(/(?<=[.!?])\s+/).filter(Boolean);
  return { feelingSentence: sentences[0] || thought, wantSentence: sentences[1] || null };
}

// once a card exists for a name, Codex will never reconsider it (the
// storyCards check alone rules it out), so its mention tracking is
// dead weight — clear it to keep state lean as a story grows
function forgetMentionTracking(name) {
  delete state.unsaid.codex.mentionCounts[name];
  delete state.unsaid.codex.attempts[name];
}

// the one canonical shape for a character's mind, used everywhere one
// gets created so no code path can accidentally produce a mind missing
// a field another function expects
function createMind() {
  return {
    core: null,
    feeling: null,
    feelingHistory: [],
    want: null,
    relations: {},
    relationOrder: [],
    relationHistory: {},
    lastTurn: state.unsaid.turn
  };
}

// pushes a value onto a capped array, skipping if it's identical to the
// last entry (no point recording "no change" as a new history step)
function pushCapped(arr, value, limit) {
  if (arr[arr.length - 1] !== value) {
    arr.push(value);
    if (arr.length > limit) arr.shift();
  }
}

// builds a private-thought instruction for the given character (used by
// both the normal chance-based reveal and a forced /peek), then fits it
// to the context budget. Returns null if there's no room to send it.
function buildAndFitThoughtInstruction(chosen, active, baseText) {
  const mind = state.unsaid.minds[chosen];

  const others = (active || []).filter(n => n !== chosen);
  // prefer reacting to someone they already have history with, over
  // introducing a brand new reaction at random
  const withHistory = others.filter(n => mind && mind.relations && mind.relations[n]);
  const target = withHistory.length > 0
    ? withHistory[Math.floor(Math.random() * withHistory.length)]
    : (others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null);

  const historyNote = mind && mind.feelingHistory && mind.feelingHistory.length > 1
    ? ` Their feelings lately have gone: ${mind.feelingHistory.join(" → ")}.`
    : "";
  const wantNote = mind && mind.want ? ` Last known want: "${mind.want}" (can change if the scene moves them).` : "";

  let instruction;
  if (target) {
    const relHistory = mind && mind.relationHistory && mind.relationHistory[target];
    const coreNote = mind && mind.core ? ` Core truth: "${mind.core}".` : "";
    const relationNote = relHistory && relHistory.length > 1
      ? ` Their feeling toward ${target} has gone: ${relHistory.join(" → ")} — build on that shift unless the scene reverses it.`
      : (mind && mind.relations && mind.relations[target]
        ? ` Feels ${mind.relations[target]} toward ${target} unless this scene shifts it.`
        : "");
    instruction = `\n[${chosen}'s unspoken reaction to ${target} — 2 italicized sentences: how they really feel about ${target} right now, and what they secretly want from this moment. ${target} can't perceive it.${coreNote}${relationNote}${historyNote}${wantNote} Format: "《${chosen}, feeling, about ${target}: thought.》"]\n`;
  } else if (mind && mind.core) {
    instruction = `\n[${chosen}'s private thought — 2 italicized sentences: how they really feel right now, and what they secretly want. Consistent with "${mind.core}" and their feeling of ${mind.feeling} unless this scene shifts it.${historyNote}${wantNote} Format: "《${chosen}, feeling: thought.》" No one else perceives it.]\n`;
  } else {
    instruction = `\n[${chosen}'s private thought — 2 italicized sentences: how they really feel right now, and what they secretly want. Format: "《${chosen}, feeling: thought.》" No one else perceives it.]\n`;
  }

  return fitInstructionToBudget(baseText, instruction);
}

// Story Cards only reach the AI when their keyword triggers have
// appeared recently — a character who hasn't come up in a while can
// quietly drop out of context even though their card still exists.
// The adventure's Memory (state.memory.context), by contrast, is
// always included regardless of how many turns have passed. Keeping
// a short, capped list of characters' core truths there means
// something a character revealed on turn 1 can still reach the AI on
// turn 1000, not just while their card happens to get triggered.
function syncCoreMemory(maxEntries) {
  if (!state.memory || typeof state.memory !== "object") return;
  const cap = typeof maxEntries === "number" ? maxEntries : CORE_MEMORY_MAX_ENTRIES;

  const names = Object.keys(state.unsaid.minds)
    .filter(name => state.unsaid.minds[name].core)
    .sort((a, b) => (state.unsaid.minds[b].lastTurn || 0) - (state.unsaid.minds[a].lastTurn || 0))
    .slice(0, cap);

  const lines = names.map(name => {
    const mind = state.unsaid.minds[name];
    const lastRelation = mind.relationOrder && mind.relationOrder.length > 0
      ? mind.relationOrder[mind.relationOrder.length - 1]
      : null;
    const relationNote = lastRelation ? ` (feels ${mind.relations[lastRelation]} toward ${lastRelation})` : "";
    const wantNote = mind.want ? `, currently wants: ${mind.want}` : "";
    return `${name}: ${mind.core}${relationNote}${wantNote}`;
  });

  const existing = (state.memory.context || "").split(CORE_MEMORY_MARKER)[0].replace(/\s+$/, "");
  let block = `${CORE_MEMORY_MARKER}\n${lines.join("\n")}`;
  // the Memory field has a real (if not precisely documented) size limit —
  // trim entries off the end rather than risk overflowing it silently
  while (block.length > MAX_MEMORY_CONTEXT_LENGTH && lines.length > 1) {
    lines.pop();
    block = `${CORE_MEMORY_MARKER}\n${lines.join("\n")}`;
  }

  state.memory.context = lines.length > 0
    ? `${existing}\n\n${block}`.trim()
    : existing;
}
