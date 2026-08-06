// ===== UNSAID — LIBRARY =====
// Two features sharing one small script:
//
// The script's activity is meant to be obvious from what it actually
// leaves behind, not from anything it announces — a character's card
// carries their real tracked state: a feeling-history trail, their
// literal last private thought, a running count of how many private
// moments they've had, current relationships, and any core-truth
// shift. That's the visible evidence UNSAID is doing something, not
// a status line saying so.
//
// The config card sticks to the settings worth actually tuning —
// on/off switches, chance, cooldown, thresholds — and leaves several
// finer knobs (retry counts, secondary cooldowns, card layout, tension
// tuning) as sensible fixed behavior instead of more things to configure.
//
// 1. Private thoughts — occasionally reveals what a character is
//    really feeling and thinking but not saying out loud: one
//    sentence on how they feel right now, one on what they secretly
//    want. By default, a reveal never appears in the story itself —
//    it's written straight to that character's own Story Card notes,
//    so learning what someone's really thinking means looking them
//    up, not having it narrated at you (configurable back to the old
//    inline behavior if you prefer it). Feeling, want, and a short
//    rolling history of each evolve independently, alongside a "core
//    truth" — their first standalone thought, specifically prompted
//    to be something real and significant rather than a passing
//    reaction, since it becomes permanent — and how they feel about
//    up to six specific other people — with a short history per
//    relationship too, so a reaction can reference how things have
//    shifted, not just where they stand right now. A scene with
//    someone they already have history with pulls from that instead
//    of a random new reaction, and each reveal is nudged to avoid
//    repeating a character's own last wording. Type "/peek <name>"
//    as an action to force an immediate reveal on demand. A live
//    style hint — "let hidden feelings color actions without stating
//    them" — rides in frontMemory, the part of context closest to
//    the point of generation, separate from the factual summary in
//    Memory. A reveal is also less likely to fire during the
//    player's own Do/Say actions specifically, so it doesn't compete
//    for attention right when they've taken a deliberate action.
//    Everything tracked about a character is written to their own
//    card's notes in a plain, clearly labeled layout by default —
//    meant to be read at a glance, not parsed — including how long
//    their current core truth has held, with a denser one-line style
//    available too. A core truth can shift after something genuinely
//    major by default — the old one kept on file rather than erased —
//    though it can be turned permanent instead if you'd rather. It's
//    never a coin flip on every reveal:
//    a character's feeling landing somewhere genuinely new, several
//    times in a row without settling, builds real tracked tension —
//    shown on their card once it crosses a threshold you set. Even
//    at that threshold, an ordinary shift is only offered to the AI
//    once the character has shown a little more of themselves beyond
//    their founding thought — this happens on its own, automatically,
//    through ordinary reveals, with no command ever required. If
//    tension keeps climbing well past that, unresolved, it eventually
//    bypasses that requirement entirely: something can matter enough
//    to happen regardless of how much has come to light yet. A
//    steady feeling eases tension back off. "/peek <name> core"
//    remains available as an optional direct check at any time — it
//    always works, and naturally counts as one of those private
//    moments too — but nothing here ever requires it.
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
  showThoughtsInStory: false, // when false, reveals go to the character's card, not the narrative
  subtleHints: true,           // let hidden feelings quietly color visible actions/body language
  allowCoreShift: true,        // whether a major event can ever rewrite a character's core truth
  chance: 0.3,        // chance per turn a thought fires, when someone qualifies
  cooldown: 3,          // turns a character must wait before thinking again
  mentionThreshold: 3,   // a name needs MORE than this many mentions before Codex cards it
  codexCooldown: 5,       // minimum turns between two Codex triggers, of any name
  codexMaxAttempts: 3,     // retries on a name before Codex gives up on it
  memoryMaxEntries: 8,      // how many characters' core truths ride in always-on memory
  playerName: ""             // if set, Codex will never write a card for this name
};

// settled on sensible fixed values rather than exposing every knob —
// fewer settings to tune, same behavior underneath (Codex's own timing
// settings are configurable again, further down, per request)
const TENSION_THRESHOLD = 3;      // consecutive different feelings before a core-shift feels earned
const REDUCE_DURING_ACTIONS = true; // less likely to interrupt the player's own Do/Say actions

const CONTEXT_SAFETY_MARGIN = 20; // leave a little headroom below the platform's stated limit
const FEELING_HISTORY_LIMIT = 3;   // how many recent feelings to remember per character
const RELATION_HISTORY_LIMIT = 2;   // how many recent feelings to remember per relationship
const MAX_MEMORY_CONTEXT_LENGTH = 700; // keeps our block well under the ~1000-1500 char limits reported for the Memory field
const MAX_CARD_ENTRY_LENGTH = 1800;     // guards against an overlong AI-generated card entry
const CORE_MEMORY_MARKER = "[UNSAID — core truths]";
const CORE_MEMORY_MAX_ENTRIES = 8;  // caps how many characters' core truths ride in always-on memory
const DRASTIC_TENSION_MULTIPLIER = 2; // tension can climb this many × the normal threshold when unresolved
const REVEALS_BEFORE_SHIFT_ELIGIBLE = 2; // reveals needed (founding one + at least one more) before an ordinary shift can happen — earned through normal play, no command required
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
  "Wait", "Look", "Listen", "Right", "Alright", "Hey", "Huh", "Hmm", "Ah",
  "Your", "My", "His", "Her", "Its", "Our", "Their", "These", "Those",
  "Some", "Any", "All", "Each", "Every", "Nothing", "Something", "Anything",
  "Turn", "Chapter", "Part", "Scene", "Day", "Night", "Morning",
  "Evening", "Afternoon", "Time", "Silence", "Darkness", "Light",
  "Fate", "Death", "Life", "Space", "Everything",
  // common short function words — the class of bug that keeps slipping
  // through one word at a time (e.g. "Not") gets a proper sweep here
  // instead of another single addition
  "Not", "Nor", "Only", "Too", "Off", "Out", "Up", "Down", "Away",
  "Above", "Below", "Under", "Over", "Between", "Among", "Within",
  "Without", "Behind", "Beside", "Beyond", "Around", "About", "Against",
  "Toward", "Towards", "Upon", "Onto", "Into", "Along", "Across",
  "Through", "Throughout", "During", "Both", "Either", "Neither",
  "Most", "More", "Less", "Much", "Many", "Few", "Little", "Own",
  "Such", "Same", "Other", "Another", "Next", "Last", "First",
  "Second", "Third", "Twice", "Whether", "Although", "Though",
  "Because", "Unless", "Until", "Since", "While", "Where", "Whatever",
  "Whoever", "Whenever", "Wherever", "Whichever", "Almost", "Enough",
  "Rather", "Quite", "Somehow", "Somewhat", "Anyway", "Anywhere",
  "Nowhere", "Somewhere", "Nobody", "Somebody", "Anybody", "Everybody",
  "Nevertheless", "Nonetheless", "Otherwise", "Therefore", "Thus"
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

const MIND_NOTES_MARKER = "💭 Inner Life — private, not visible to other characters";
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

// On "cache efficient" models, AI Dungeon reads the Context hook but does
// NOT use what it returns — the model never actually sees anything this
// script injects, even though the hook still runs. Left unchecked, that
// means Codex and private thoughts silently fail every single turn: no
// instruction ever reaches the model, yet the AI — seeing 【CARD】 blocks
// or 《...》 thought lines already sitting in its own story history from
// earlier turns — starts imitating that formatting unprompted, with
// nothing steering what it writes. That's what produces near-identical
// repeated "thoughts" and cards eating whole turns: the AI is copying a
// pattern it can see, not responding to a request it never received.
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
      "-- General --\n" +
      "> Enable UNSAID: true\n" +
      "> Enable Codex: true\n" +
      "-- Private Thoughts --\n" +
      "> Chance of a thought per turn (0 to 1): 0.3\n" +
      "> Turns before the same character can think again: 3\n" +
      "> Show private thoughts in the story text: false\n" +
      "> Let hidden feelings subtly color actions: true\n" +
      "-- Core Truth --\n" +
      "> Allow major events to rewrite a core truth: true\n" +
      "-- Codex --\n" +
      "> Mentions needed before Codex creates a card: 3\n" +
      "> Minimum turns between Codex cards: 5\n" +
      "> Codex retries before giving up on a name: 3\n" +
      "> Reset Codex tracking now: false\n" +
      "> Player character (skip when Codexing): \n" +
      "-- Memory --\n" +
      "> Sync core truths to always-on memory: true\n" +
      "> Characters remembered in long-term memory: 8";
    card.description =
      "UNSAID Config — what each setting above does:\n" +
      "- Enable UNSAID: master switch for the whole script (private thoughts and Codex together). False turns everything off.\n" +
      "- Enable Codex: turns automatic Story Card generation on or off by itself. Turn this off to keep private thoughts without new cards being made.\n" +
      "- Chance of a thought per turn: how likely (0 to 1) it is that an eligible, active character reveals a private thought on any given turn. Higher means more frequent reveals. (Reveals are already a little less likely during your own Do/Say actions, and a character's own core truth naturally takes a bit longer to shift than an ordinary mood, on a fixed pace behind the scenes.)\n" +
      "- Turns before the same character can think again: a cooldown, in turns, before that same character is eligible for another thought — keeps one character from dominating.\n" +
      "- Show private thoughts in the story text: when false (default), a reveal never appears in your story — it's written straight to that character's own Story Card instead, so you look them up rather than having their private thoughts narrated at you. Set to true for the old behavior: an italicized line shown right in the story.\n" +
      "- Let hidden feelings subtly color actions: when true (default), a character's hidden feeling is allowed to quietly show through in their body language and tone in the actual story — a tight smile, a held breath — without ever stating the feeling outright or giving away their private thought. Turn off for characters who should read as unreadable.\n" +
      "- Allow major events to rewrite a core truth: on by default. A genuinely major story event can replace a character's core truth, earned naturally through ordinary play (no commands needed) — their old core truth is kept on file rather than erased, and how long the current one has held is shown right on their card. Turn off if you want core truths to stay permanent instead.\n" +
      "- Mentions needed before Codex creates a card: how many times a new name must appear before Codex writes a card for it, so background one-off names don't get cards of their own.\n" +
      "- Minimum turns between Codex cards: how many turns must pass between one Codex card and the next, regardless of how many names qualify — keeps Codex from taking over several turns in a row.\n" +
      "- Codex retries before giving up on a name: how many times Codex will try to get a properly formatted card out of the AI before giving up on that name for good. Raise this if cards are failing to complete.\n" +
      "- Reset Codex tracking now: set to true and Codex will forget every failed attempt and cooldown timer, then flip this back to false on its own. Use this if cards seem stuck and not being made.\n" +
      "- Player character (skip when Codexing): put your own character's name here if you don't want Codex writing an AI-authored profile for them. Leave blank to let Codex treat them like anyone else. In Multiplayer, everyone's character name is already skipped automatically.\n" +
      "- Sync core truths to always-on memory: keeps a short, capped list of characters' core truths in your adventure's Memory, which the AI always sees — unlike Story Cards, which only appear when triggered. This is what lets something a character revealed on turn 1 still reach the AI on turn 1000.\n" +
      "- Characters remembered in long-term memory: how many characters' core truths are allowed to ride in the always-on memory summary at once. Higher keeps more people relevant longer, but uses more of your context budget.\n\n" +
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

  const showInStoryMatch = card.entry.match(/Show private thoughts in the story text:\s*(true|false)/i);
  if (showInStoryMatch) cfg.showThoughtsInStory = showInStoryMatch[1].toLowerCase() === "true";

  const subtleHintsMatch = card.entry.match(/subtly color actions:\s*(true|false)/i);
  if (subtleHintsMatch) cfg.subtleHints = subtleHintsMatch[1].toLowerCase() === "true";

  const coreShiftMatch = card.entry.match(/rewrite a core truth:\s*(true|false)/i);
  if (coreShiftMatch) cfg.allowCoreShift = coreShiftMatch[1].toLowerCase() === "true";

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

  const codexCooldownMatch = card.entry.match(/Minimum turns between Codex cards:\s*(\d+)/i);
  if (codexCooldownMatch) {
    const parsedCodexCooldown = parseInt(codexCooldownMatch[1], 10);
    if (!isNaN(parsedCodexCooldown)) cfg.codexCooldown = Math.max(0, parsedCodexCooldown);
  }

  const codexAttemptsMatch = card.entry.match(/Codex retries before giving up on a name:\s*(\d+)/i);
  if (codexAttemptsMatch) {
    const parsedAttempts = parseInt(codexAttemptsMatch[1], 10);
    if (!isNaN(parsedAttempts)) cfg.codexMaxAttempts = Math.max(1, parsedAttempts);
  }

  // a manual escape hatch: flipping this to true clears every failed
  // attempt, cooldown timer, and pending mention count, so a Codex that
  // seems stuck gets a clean slate. Flips itself back to false once used.
  const resetMatch = card.entry.match(/Reset Codex tracking now:\s*(true|false)/i);
  if (resetMatch && resetMatch[1].toLowerCase() === "true") {
    state.unsaid.codex.attempts = {};
    state.unsaid.codex.mentionCounts = {};
    state.unsaid.codex.lastTriggerTurn = 0;
  }

  const memCountMatch = card.entry.match(/remembered in long-term memory:\s*(\d+)/i);
  if (memCountMatch) {
    const parsedMemCount = parseInt(memCountMatch[1], 10);
    if (!isNaN(parsedMemCount)) cfg.memoryMaxEntries = Math.max(0, parsedMemCount);
  }

  // [ \t]* rather than \s* here on purpose — \s* would happily cross the
  // newline when this value is blank and land on the next line (which,
  // now that settings are grouped under section headers, could be a
  // header like "-- Memory --" getting captured as the player's name)
  const playerMatch = card.entry.match(/Player character \(skip when Codexing\):[ \t]*(.*)/i);
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
    "-- General --\n" +
    `> Enable UNSAID: ${cfg.enabled}\n` +
    `> Enable Codex: ${cfg.codexEnabled}\n` +
    "-- Private Thoughts --\n" +
    `> Chance of a thought per turn (0 to 1): ${cfg.chance}\n` +
    `> Turns before the same character can think again: ${cfg.cooldown}\n` +
    `> Show private thoughts in the story text: ${cfg.showThoughtsInStory}\n` +
    `> Let hidden feelings subtly color actions: ${cfg.subtleHints}\n` +
    "-- Core Truth --\n" +
    `> Allow major events to rewrite a core truth: ${cfg.allowCoreShift}\n` +
    "-- Codex --\n" +
    `> Mentions needed before Codex creates a card: ${cfg.mentionThreshold}\n` +
    `> Minimum turns between Codex cards: ${cfg.codexCooldown}\n` +
    `> Codex retries before giving up on a name: ${cfg.codexMaxAttempts}\n` +
    `> Reset Codex tracking now: false\n` +
    `> Player character (skip when Codexing): ${cfg.playerName}\n` +
    "-- Memory --\n" +
    `> Sync core truths to always-on memory: ${cfg.memorySyncEnabled}\n` +
    `> Characters remembered in long-term memory: ${cfg.memoryMaxEntries}`;

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

  // "at"/"to"/"from"/"near" are too common before a PERSON's name too
  // ("looks at Aria", "walks to Marcus") to reliably signal a place —
  // only the more spatially-specific ones are used here
  const nearLocation = new RegExp(`(in|inside|outside|through)\\s+${escapeForRegex(name)}\\b`, "i");
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

// picks the MOST-mentioned name that's cleared the threshold, doesn't
// already have a Story Card (or a close match to one), and hasn't
// exhausted its retries. Deleting an existing card makes its name
// eligible again. Prioritizing by mention count (not just whichever
// name happens to be first in iteration order) matters: a stray
// false-positive that slips past the stopword list can otherwise sit
// at the front and burn through its retries before a genuinely
// significant, frequently-mentioned name ever gets a turn.
function findCodexCandidate(threshold, excludeNames, maxAttempts) {
  const exclude = (excludeNames || []).map(n => n.toLowerCase());
  const cap = typeof maxAttempts === "number" ? maxAttempts : CODEX_MAX_ATTEMPTS;
  const counts = state.unsaid.codex.mentionCounts;
  let best = null;
  let bestCount = -1;
  for (const name in counts) {
    if (counts[name] <= threshold) continue;
    if (exclude.includes(name.toLowerCase())) continue;
    if (storyCards.some(c => isSameCardEntity(c.title, name))) continue;
    if ((state.unsaid.codex.attempts[name] || 0) >= cap) continue;
    if (counts[name] > bestCount) {
      best = name;
      bestCount = counts[name];
    }
  }
  return best;
}

// builds the hidden-profile instruction for whichever template fits
function buildCodexInstruction(name, type) {
  const fields = CARD_TEMPLATES[type] || CHARACTER_CARD_FIELDS;
  const body = fields.map(f => `${f}: ${f === "Name" ? name : "..."}`).join("\n");

  // if private thoughts have already established something true about
  // this character, hand it to Codex so the Personality/Background it
  // writes doesn't contradict what's already been privately shown
  const mind = type === "character" ? state.unsaid.minds[name] : null;
  const knownNote = mind && mind.core
    ? ` They've privately shown this about themselves: "${mind.core}" — let Personality and Background agree with it, not invent something that contradicts it.`
    : "";

  return `\n[Finish the story normally first — that's the priority. Then, on new lines after it, add a brief hidden profile for "${name}" wrapped between 【CARD】 and 【/CARD】, not part of the visible narrative:${knownNote}\n【CARD】\n${body}\n【/CARD】\nKeep each field to a few words — this should take one or two lines total, not paragraphs.]\n`;
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
function syncMindToCard(name, allowCoreShift) {
  const mind = state.unsaid.minds[name];
  if (!mind) return;

  const card = storyCards.find(c => c.title.toLowerCase() === name.toLowerCase() && c.type === "character");
  if (!card) return;

  const stabilityNote = typeof mind.coreSetTurn === "number" && state.unsaid.turn > mind.coreSetTurn
    ? ` (steady for ${state.unsaid.turn - mind.coreSetTurn} turn${state.unsaid.turn - mind.coreSetTurn === 1 ? "" : "s"})`
    : "";
  const tensionActive = allowCoreShift && typeof mind.tensionLevel === "number" &&
    mind.tensionLevel >= TENSION_THRESHOLD;
  const naturallyEligible = (mind.revealCount || 0) >= REVEALS_BEFORE_SHIFT_ELIGIBLE;
  const tensionNote = tensionActive
    ? (naturallyEligible
      ? "increasingly tested"
      : "increasingly tested — though it'll take one more private moment before a shift is possible")
    : null;

  // plain layout — clear labels, spaced out, meant to be skimmed at a glance
  const sections = [];
  if (mind.core) sections.push(`Core truth:\n${mind.core}${stabilityNote}`);
  if (tensionNote) sections.push(`⚡ Their sense of self feels ${tensionNote}.`);
  if (mind.coreHistory && mind.coreHistory.length > 0) {
    sections.push(`Formerly believed:\n${mind.coreHistory[mind.coreHistory.length - 1]}`);
  }
  if (mind.feeling) sections.push(`Currently feeling: ${mind.feeling}`);
  if (mind.feelingHistory && mind.feelingHistory.length > 1) {
    sections.push(`Recent feelings: ${mind.feelingHistory.join(" → ")}`);
  }
  if (mind.lastThoughtText) sections.push(`Last private thought:\n${mind.lastThoughtText}`);
  if (mind.want) sections.push(`Wants: ${mind.want}`);
  if (mind.relationOrder && mind.relationOrder.length > 0) {
    const relLines = mind.relationOrder.map(other => {
      const hist = mind.relationHistory && mind.relationHistory[other];
      const trail = hist && hist.length > 1 ? hist.join(" → ") : mind.relations[other];
      return `  • ${other} — ${trail}`;
    });
    sections.push(`Feelings toward others:\n${relLines.join("\n")}`);
  }
  if (mind.revealCount) {
    sections.push(`${mind.revealCount} private moment${mind.revealCount === 1 ? "" : "s"} recorded so far.`);
  }
  if (sections.length === 0) return;
  const body = sections.join("\n\n");

  const base = (card.description || "").split(MIND_NOTES_MARKER)[0].replace(/\s+$/, "");
  card.description = `${base}\n\n${MIND_NOTES_MARKER}\n${body}`.trim();
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
    coreHistory: [],
    coreSetTurn: null,
    tensionLevel: 0,
    revealCount: 0,
    feeling: null,
    feelingHistory: [],
    want: null,
    lastThoughtText: null,
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
// picks among eligible characters, weighting toward whoever's gone
// longest without a reveal (or never had one), so one character
// doesn't crowd out a quieter one just by rolling well more often
function pickBySilence(names, currentTurn) {
  const weights = names.map(name => {
    const mind = state.unsaid.minds[name];
    return mind ? Math.max(1, currentTurn - mind.lastTurn) : 999;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < names.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return names[i];
  }
  return names[names.length - 1];
}

// used only by "/peek <name> core" — explicitly asks whether this
// moment is significant enough to redefine the character, rather than
// leaving it purely to chance during an ordinary reveal
function buildCoreCheckInstruction(chosen, mind) {
  const coreNote = mind && mind.core ? ` Their current anchor: "${mind.core}".` : "";
  const tensionNote = mind && typeof mind.tensionLevel === "number"
    ? (mind.tensionLevel >= TENSION_THRESHOLD
      ? " Their feelings have been genuinely unsettled for a while now — this may well be the moment."
      : " Their feelings have been fairly steady lately, for what that's worth.")
    : "";
  return `\n[Consider whether recent events have genuinely, permanently changed how ${chosen} sees themselves — not just a passing mood.${coreNote}${tensionNote} If yes, reveal it as "《${chosen}, feeling, core-shift: new lasting truth.》" (2 italicized sentences). If nothing that significant has happened, don't force it — continue the story normally with no reveal at all.]\n`;
}

function buildAndFitThoughtInstruction(chosen, active, baseText, allowCoreShift) {
  const mind = state.unsaid.minds[chosen];

  const others = (active || []).filter(n => n !== chosen);
  // prefer reacting to someone they already have history with, over
  // introducing a brand new reaction at random — and among those, the
  // most recently relevant relationship wins rather than a random old
  // one that hasn't mattered in a while (relationOrder is oldest-first,
  // so the last entry present is the most recently touched)
  const withHistory = others.filter(n => mind && mind.relations && mind.relations[n]);
  let target = null;
  if (withHistory.length > 0 && mind && mind.relationOrder) {
    for (let i = mind.relationOrder.length - 1; i >= 0; i--) {
      if (withHistory.includes(mind.relationOrder[i])) {
        target = mind.relationOrder[i];
        break;
      }
    }
  }
  if (!target) {
    target = withHistory.length > 0
      ? withHistory[Math.floor(Math.random() * withHistory.length)]
      : (others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null);
  }

  const historyNote = mind && mind.feelingHistory && mind.feelingHistory.length > 1
    ? ` Their feelings lately have gone: ${mind.feelingHistory.join(" → ")}.`
    : "";
  const wantNote = mind && mind.want ? ` Last known want: "${mind.want}" (can change if the scene moves them).` : "";

  const varietyNote = mind && mind.lastThoughtText
    ? ` Word this differently than last time — don't reuse: "${mind.lastThoughtText}"`
    : "";

  let instruction;
  if (target) {
    const relHistory = mind && mind.relationHistory && mind.relationHistory[target];
    const coreNote = mind && mind.core ? ` Core truth: "${mind.core}".` : "";
    const relationNote = relHistory && relHistory.length > 1
      ? ` Their feeling toward ${target} has gone: ${relHistory.join(" → ")} — build on that shift unless the scene reverses it.`
      : (mind && mind.relations && mind.relations[target]
        ? ` Feels ${mind.relations[target]} toward ${target} unless this scene shifts it.`
        : "");
    instruction = `\n[${chosen}'s unspoken reaction to ${target} — 2 italicized sentences: how they really feel about ${target} right now, and what they secretly want from this moment. ${target} can't perceive it.${coreNote}${relationNote}${historyNote}${wantNote}${varietyNote} Format: "《${chosen}, feeling, about ${target}: thought.》"]\n`;
  } else if (mind && mind.core) {
    const atThreshold = allowCoreShift && typeof mind.tensionLevel === "number" &&
      mind.tensionLevel >= TENSION_THRESHOLD;
    const atDrasticTier = allowCoreShift && typeof mind.tensionLevel === "number" &&
      mind.tensionLevel >= TENSION_THRESHOLD * DRASTIC_TENSION_MULTIPLIER;
    const naturallyEligible = (mind.revealCount || 0) >= REVEALS_BEFORE_SHIFT_ELIGIBLE;
    // an ordinary earned shift only gets offered once the character has
    // shown a bit more of themselves beyond the founding thought — no
    // command needed, this happens on its own through normal play as
    // more private moments occur. Sustained tension that climbs all
    // the way to the drastic tier bypasses that requirement entirely:
    // something can matter enough to happen regardless of how much
    // has come to light about them yet.
    const shiftEligible = atDrasticTier || (atThreshold && naturallyEligible);
    const shiftNote = shiftEligible
      ? (atDrasticTier && !naturallyEligible
        ? ` Their feelings have been unraveling for a long time now, unresolved — something this significant would happen regardless. If it's truly earned, you may format this instead as "《${chosen}, feeling, core-shift: new lasting truth.》" to replace their old anchor.`
        : ` Their feelings have been genuinely shifting for a while now, not settling back — if this moment plays into that and something has truly changed how they see themselves, you may format this instead as "《${chosen}, feeling, core-shift: new lasting truth.》" to replace their old anchor. Only do this if it's really earned.`)
      : "";
    instruction = `\n[${chosen}'s private thought — 2 italicized sentences: how they really feel right now, and what they secretly want. Consistent with "${mind.core}" and their feeling of ${mind.feeling} unless this scene shifts it.${historyNote}${wantNote}${varietyNote}${shiftNote} Format: "《${chosen}, feeling: thought.》" No one else perceives it.]\n`;
  } else {
    // this is the moment their very first private thought gets set — and
    // whatever comes out of it becomes their permanent core truth, so it
    // shouldn't read like a passing reaction to whatever's on screen
    instruction = `\n[This is ${chosen}'s very first private thought — once revealed, it becomes a lasting truth about who they fundamentally are, something real and significant enough to define them going forward, not a fleeting reaction to this moment. 2 italicized sentences: what this deep truth is, and what they secretly want because of it. Format: "《${chosen}, feeling: thought.》" No one else perceives it.]\n`;
  }

  return fitInstructionToBudget(baseText, instruction);
}

// Story Cards only reach the AI when their keyword triggers have
// appeared recently — a character who hasn't come up in a while can
// quietly drop out of context even though their card still exists.
// The adventure's Memory (state.memory.context), by contrast, is
// always included regardless of how many turns have passed. Keeping
// a short, capped list of characters' core truths there means
// history is a real, read-only global the platform provides — each
// entry has a type: "do", "say", "story", "continue", "start", "see".
// Used to tell a player-driven action apart from a passive one.
function getLastActionType() {
  if (typeof history !== "undefined" && Array.isArray(history) && history.length > 0) {
    return history[history.length - 1].type || null;
  }
  return null;
}

const FRONT_MEMORY_MARKER = "[UNSAID hint]";

// frontMemory sits at the very end of context, right after the last
// player action — closer to the point of generation than anything
// else a script can set. That makes it the right place for a live
// style instruction (as opposed to state.memory.context, which is
// better suited to background facts since it sits at the very start).
// Kept as one closed, complete sentence on purpose: an unfinished one
// here risks the AI trying to literally continue it in its output.
function syncFrontMemoryHint(subtleHints) {
  if (!state.memory || typeof state.memory !== "object") return;
  const existing = (state.memory.frontMemory || "").split(FRONT_MEMORY_MARKER)[0].replace(/\s+$/, "");
  if (!subtleHints) {
    state.memory.frontMemory = existing;
    return;
  }
  const hint = `${FRONT_MEMORY_MARKER} Let each character's private feelings subtly color their actions and tone right now, without ever stating them outright.`;
  state.memory.frontMemory = existing ? `${existing}\n\n${hint}` : hint;
}

// something a character revealed on turn 1 can still reach the AI on
// turn 1000, not just while their card happens to get triggered.
function syncCoreMemory(maxEntries) {
  if (!state.memory || typeof state.memory !== "object") return;
  const cap = typeof maxEntries === "number" ? maxEntries : CORE_MEMORY_MAX_ENTRIES;

  const names = Object.keys(state.unsaid.minds)
    .filter(name => {
      const m = state.unsaid.minds[name];
      // a character who's only ever had reactions to someone else (no
      // standalone thought yet) still has real relationship data worth
      // persisting, so they're not excluded just for lacking a core truth
      return m.core || (m.relationOrder && m.relationOrder.length > 0);
    })
    .sort((a, b) => (state.unsaid.minds[b].lastTurn || 0) - (state.unsaid.minds[a].lastTurn || 0))
    .slice(0, cap);

  const lines = names.map(name => {
    const mind = state.unsaid.minds[name];
    const recentRelations = mind.relationOrder
      ? mind.relationOrder.slice(-2).reverse()
      : [];
    const relationNote = recentRelations.length > 0
      ? ` (${recentRelations.map(other => `feels ${mind.relations[other]} toward ${other}`).join("; ")})`
      : "";
    const feelingNote = mind.feeling ? `, currently feeling ${mind.feeling}` : "";
    const wantNote = mind.want ? `, wants: ${mind.want}` : "";
    const shiftNote = mind.coreHistory && mind.coreHistory.length > 0
      ? ` — formerly believed: "${mind.coreHistory[mind.coreHistory.length - 1]}"`
      : "";
    const base = mind.core || "no standalone thought yet";
    return `${name}: ${base}${shiftNote}${feelingNote}${relationNote}${wantNote}`;
  });

  // this framing line is what turns the summary from a private log into
  // an actual writing cue — it's what lets a hidden feeling quietly
  // color a character's body language in the visible story, without
  // ever stating the feeling outright
  // this block is pure background knowledge — the actual "let these
  // color actions" instruction now lives in frontMemory instead, since
  // that sits right at the end of context, next to what the AI is about
  // to write, rather than competing for attention way at the beginning
  const header = `${CORE_MEMORY_MARKER} (private — not known to other characters)`;

  const existing = (state.memory.context || "").split(CORE_MEMORY_MARKER)[0].replace(/\s+$/, "");
  let block = `${header}\n${lines.join("\n")}`;
  // the Memory field has a real (if not precisely documented) size limit —
  // trim entries off the end rather than risk overflowing it silently
  while (block.length > MAX_MEMORY_CONTEXT_LENGTH && lines.length > 1) {
    lines.pop();
    block = `${header}\n${lines.join("\n")}`;
  }

  state.memory.context = lines.length > 0
    ? `${existing}\n\n${block}`.trim()
    : existing;
}
