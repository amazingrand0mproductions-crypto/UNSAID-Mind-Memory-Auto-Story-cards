
const UNSAID_DEFAULTS = {
  enabled: true,
  codexEnabled: true,
  memorySyncEnabled: false,
  showThoughtsInStory: false,
  subtleHints: true,
  jsonNotes: false,
  allowCoreShift: true,
  chance: 0.3,
  cooldown: 3,
  reduceDuringActions: true,
  recentTurnsWindow: 3,
  mentionThreshold: 3,
  codexCooldown: 5,
  codexMaxAttempts: 5,
  memoryMaxEntries: 8,
  memoryPercent: 10,
  playerName: ""
};

const CONTEXT_SAFETY_MARGIN = 20;
const MEMORY_CONTEXT_PERCENT = 0.10;
const MEMORY_CONTEXT_FALLBACK_LENGTH = 700;
const MAX_CARD_ENTRY_LENGTH = 1800;

const FEELING_HISTORY_LIMIT = 3;
const RELATION_HISTORY_LIMIT = 2;
const MAX_RELATIONS_PER_CHARACTER = 6;
const CORE_MEMORY_MAX_ENTRIES = 8;
const MENTION_TRACKING_CAP = 150;

const TENSION_THRESHOLD = 3;
const DRASTIC_TENSION_MULTIPLIER = 2;
const REVEALS_BEFORE_SHIFT_ELIGIBLE = 2;

const CORE_MEMORY_MARKER = "[UNSAID — core truths]";
const MIND_NOTES_MARKER = "💭 Inner Life — private, not visible to other characters";
const CAST_LIST_MARKER = "===";
const CODEX_MAX_ATTEMPTS = 5;
const CODEX_MAX_CANDIDATES_PER_TURN = 3;

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
  "Easy", "Careful", "Steady", "Quiet", "Patience", "Hush", "Stop",
  "Freeze", "Move", "Run", "Go", "Come", "Stay", "Help", "Please",
  "Sorry", "Thanks", "Fine", "Sure", "Great", "Good", "Bad", "Nice",
  "Your", "My", "His", "Her", "Its", "Our", "Their", "These", "Those",
  "Some", "Any", "All", "Each", "Every", "Nothing", "Something", "Anything",
  "Turn", "Chapter", "Part", "Scene", "Day", "Night", "Morning",
  "Evening", "Afternoon", "Time", "Silence", "Darkness", "Light",
  "Fate", "Death", "Life", "Space", "Everything",
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
  "Nevertheless", "Nonetheless", "Otherwise", "Therefore", "Thus",
  "For", "Or", "Can", "Could", "Should", "Would", "Must", "Shall", "Might",
  "Do", "Does", "Did", "Is", "Was", "Are", "Were", "Am", "Be", "Been", "Being",
  "Have", "Has", "Had", "Let", "Given", "Despite", "Regarding", "Considering",
  "Except", "Besides", "Unlike",
  "North", "South", "East", "West", "Northeast", "Northwest",
  "Southeast", "Southwest",
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
  "Saturday",
  "January", "February", "March", "April", "June", "July", "August",
  "September", "October", "November", "December"
]);

const CODEX_LOCATION_HINTS = /\b(city|state|street|avenue|canyon|terminal|park|building|tower|island|country|nation|kingdom|realm|district|region|planet|world|base|facility|academy|university|bridge|river|mountain|forest|desert|battleground|warzone|hall|tavern|inn|castle|fortress|temple|level|sector|wing|chamber|vault|bay|deck|outpost|colony|settlement|village|town|hamlet|station|harbor|wharf)\b/i;
const CODEX_LOCATION_SUFFIX_HINTS = /(tower|keep|hold|spire|haven|hollow|reach|scraper)/i;

const CODEX_FACTION_HINTS = /\b(order|guild|alliance|empire|faction|clan|brotherhood|council|syndicate|coalition|army|legion|cult|society|corporation|company|initiative|division|agency|federation|dynasty|tribe|vanguard|battalion|regiment|squad|cabal|circle|sect|resistance|movement|militia|garrison)\b/i;

const CODEX_ITEM_HINTS = /\b(sword|blade|gun|rifle|pistol|staff|wand|amulet|ring|armou?r|shield|artifact|device|weapon|tool|key|book|tome|potion|elixir|gem|crystal|relic|suit|mask|cloak|helmet|gauntlet|hammer|axe|bow|orb|blaster|scroll|spear|dagger|lance|trident|chalice|sigil|banner)\b/i;

const CODEX_TITLE_WORDS = new Set([
  "Emperor", "Empress", "King", "Queen", "Prince", "Princess", "Duke",
  "Duchess", "Lord", "Lady", "Sir", "Dame", "Baron", "Baroness", "Count",
  "Countess", "President", "General", "Admiral", "Captain", "Colonel",
  "Major", "Sergeant", "Lieutenant", "Commander", "Chief", "Director",
  "Minister", "Governor", "Senator", "Ambassador", "Doctor", "Professor",
  "Master", "Mistress", "Reverend", "Bishop", "Cardinal", "Judge",
  "Justice", "Mayor", "Chancellor", "Agent", "Officer", "Detective",
  "Sheriff", "Marshal", "Warden", "Overlord", "Warlord", "Elder",
  "Guardian", "Knight", "Priest", "Priestess"
]);

const SENTENCE_ABBREVIATIONS = new Set([
  "Dr", "Mr", "Mrs", "Ms", "Prof", "St", "Jr", "Sr", "Capt", "Gen",
  "Col", "Lt", "Sgt", "Rev", "Hon", "Fr", "Rep", "Sen", "Gov", "Adm",
  "Cmdr", "Maj", "Mt", "vs", "etc"
]);
const CODEX_TITLE_ABBREV_REGEX = new RegExp(
  `\\b(?:(?:${[...SENTENCE_ABBREVIATIONS].filter(w => w.length > 1).join("|")})\\.\\s+)?[A-Z][a-zA-Z]*(?:\\s+of\\s+[A-Z][a-zA-Z]*|\\s+[A-Z][a-zA-Z]*){0,2}\\b`,
  "g"
);

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

function checkCacheEfficientWarning() {
  const title = "UNSAID — Important, Read This ⚠️";
  const card = storyCards.find(c => c.title === title);
  const isCacheEfficient = typeof info !== "undefined" && info && !!info.useCacheEfficient;

  if (!isCacheEfficient) {
    if (card && card.entry && card.entry.indexOf("no longer detected") === -1) {
      const resolvedText =
        "This warning is no longer detected as of your most recent turn " +
        "— your current model doesn't appear to be running in " +
        "cache-efficient mode anymore, so UNSAID should be able to work " +
        "normally. Safe to delete this card.";
      card.entry = resolvedText;
      card.description = resolvedText;
    }
    return false;
  }

  const warningText =
    "Your current model is running in cache-efficient mode. AI Dungeon's " +
    "own documentation states that on these models, the Context hook " +
    "still runs but its result is never sent to the AI — meaning " +
    "UNSAID's private thoughts and auto-generated Story Cards cannot " +
    "work right now, through no fault of your config. This is a " +
    "platform limitation, not a bug in the script. To use UNSAID, " +
    "switch to a model without cache efficiency enabled, or disable " +
    "cache efficiency for this model if your plan allows it.";
  if (!card) {
    addStoryCard("unsaid warning", warningText, "Class", title, warningText);
  } else if (card.entry !== warningText) {
    card.entry = warningText;
    card.description = warningText;
  }
  return true;
}

function initUnsaid() {
  if (!state.unsaid) {
    state.unsaid = {
      minds: {},
      turn: 0,
      pending: null,
      forcedPeek: null,
      codex: { mentionCounts: {}, attempts: {}, pendingNames: [], pendingTypes: {}, consecutiveFailedNames: [] }
    };
  }
  if (!state.unsaid.codex) {
    state.unsaid.codex = { mentionCounts: {}, attempts: {}, pendingNames: [], pendingTypes: {}, consecutiveFailedNames: [] };
  }
  if (!state.unsaid.codex.mentionCounts) state.unsaid.codex.mentionCounts = {};
  if (!state.unsaid.codex.pendingNames) state.unsaid.codex.pendingNames = [];
  if (!state.unsaid.codex.pendingTypes) state.unsaid.codex.pendingTypes = {};
  if (!state.unsaid.codex.consecutiveFailedNames) state.unsaid.codex.consecutiveFailedNames = [];
  if (typeof state.unsaid.lastActionCount !== "number") state.unsaid.lastActionCount = -1;
  ensureConfigCard();
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameAppears(name, text) {
  return new RegExp(`\\b${escapeForRegex(name)}\\b`, "i").test(text);
}

function createOrFindCard(keys, initialEntry, type) {
  addStoryCard(keys, initialEntry, type);
  const idx = storyCards.length - 1;
  if (storyCards[idx]) return storyCards[idx];
  return storyCards.find(c => c.keys === keys) || storyCards[storyCards.length - 1];
}

function ensureConfigCard() {
  let card = storyCards.find(c => c.title === "UNSAID Config" || c.keys === "unsaid config");
  if (!card) {
    card = createOrFindCard("unsaid config", " ", "Class");
    card.title = "UNSAID Config";
    card.keys = "unsaid config";
    card.type = "Class";
    card.entry =
      "-- General --\n" +
      "> Enable UNSAID: true\n" +
      "> Enable Codex: true\n" +
      "-- Private Thoughts --\n" +
      "> Chance of a thought per turn (0 to 1): 0.3\n" +
      "> Turns before the same character can think again: 3\n" +
      "> Ease off during your own Do/Say actions: true\n" +
      "> Recent turns counted as \"active\": 3\n" +
      "> Show private thoughts in the story text: false\n" +
      "> Let hidden feelings subtly color actions: true\n" +
      "> Store card notes as JSON: false\n" +
      "-- Core Truth --\n" +
      "> Allow major events to rewrite a core truth: true\n" +
      "-- Codex --\n" +
      "> Mentions needed before Codex creates a card: 3\n" +
      "> Minimum turns between Codex cards: 5\n" +
      "> Codex retries before giving up on a name: 5\n" +
      "> Reset Codex tracking now: false\n" +
      "> Player character (skip when Codexing): \n" +
      "-- Memory --\n" +
      "> Sync core truths to always-on memory: false\n" +
      "> Characters remembered in long-term memory: 8\n" +
      "> Memory summary size (% of context): 10";
    card.description =
      "Commands (type as an action):\n" +
      "- /unsaid status — writes a live status report to a separate \"UNSAID — Status\" card. Not sent to the AI.\n" +
      "- /peek <character name> — force a private thought from that character right now.\n" +
      "- /peek <character name> core — force a check for whether this moment has changed that character's core truth.\n" +
      "- /card <character name> — force Codex to write or refresh that character's Story Card right now, skipping the mention count and cooldown.\n\n" +
      "UNSAID Config — what each setting above does:\n" +
      "- Enable UNSAID: master switch for the whole script (private thoughts and Codex together). False turns everything off.\n" +
      "- Enable Codex: turns automatic Story Card generation on or off by itself. Turn this off to keep private thoughts working normally on your existing, hand-made cards without any new ones being generated.\n" +
      "- Chance of a thought per turn: how likely (0 to 1) it is that an eligible, active character reveals a private thought on any given turn. Higher means more frequent reveals. (Reveals are already a little less likely during your own Do/Say actions, and a character's own core truth naturally takes a bit longer to shift than an ordinary mood, on a fixed pace behind the scenes.)\n" +
      "- Turns before the same character can think again: a cooldown, in turns, before that same character is eligible for another thought — keeps one character from dominating.\n" +
      "- Ease off during your own Do/Say actions: when true (default), a reveal is less likely to fire specifically on turns where you took a deliberate Do or Say action, so it doesn't compete for attention right when you've acted. Turns you didn't directly drive (Continue, Story) are unaffected either way.\n" +
      "- Recent turns counted as \"active\": roughly how many recent turns get scanned for who's currently active and eligible for a reveal, sized generously since a single detailed turn can run to several thousand characters — raise it if characters feel like they drop out of relevance too fast in a slow-paced story, lower it to keep the cast tightly focused on only the very latest turn.\n" +
      "- Show private thoughts in the story text: when false (default), a reveal never appears in your story — it's written straight to that character's own Story Card instead, so you look them up rather than having their private thoughts narrated at you. Set to true for the old behavior: an italicized line shown right in the story.\n" +
      "- Let hidden feelings subtly color actions: when true (default), a character's hidden feeling is allowed to quietly show through in their body language and tone in the actual story — a tight smile, a held breath — without ever stating the feeling outright or giving away their private thought. Turn off for characters who should read as unreadable.\n" +
      "- Store card notes as JSON: off by default — notes are written as plain, skimmable prose. Turn on to instead write the exact same data as structured JSON, if you specifically want it machine-parseable rather than easy to read at a glance.\n" +
      "- Allow major events to rewrite a core truth: on by default. A genuinely major story event can replace a character's core truth, earned naturally through ordinary play (no commands needed) — their old core truth is kept on file rather than erased, and how long the current one has held is shown right on their card. Turn off if you want core truths to stay permanent instead.\n" +
      "- Mentions needed before Codex creates a card: how many times a new name must appear before Codex writes a card for it, so background one-off names don't get cards of their own.\n" +
      "- Minimum turns between Codex cards: how many turns must pass between one Codex card and the next, regardless of how many names qualify — keeps Codex from taking over several turns in a row.\n" +
      "- Codex retries before giving up on a name: how many times Codex will try to get a properly formatted card out of the AI before giving up on that name for good. Raise this if cards are failing to complete.\n" +
      "- Reset Codex tracking now: set to true and Codex will forget every failed attempt and cooldown timer, then flip this back to false on its own. Use this if cards seem stuck and not being made.\n" +
      "- Player character (skip when Codexing): put your own character's name here if you don't want Codex writing an AI-authored profile for them. Leave blank to let Codex treat them like anyone else. In Multiplayer, everyone's character name is already skipped automatically.\n" +
      "- Sync core truths to always-on memory: off by default. Every reveal already lives on the character's own Story Card notes — private, never sent to the AI, no context cost. Turning this on additionally keeps a short, capped summary in your adventure's Plot Essentials/Memory, which the AI always sees regardless of whether a card is currently triggered — the tradeoff is that summary does cost context and does reach the AI, unlike the card notes. Turn on only if you want something revealed on turn 1 to keep influencing the AI's writing on turn 1000 even for a character who hasn't come up in a while.\n" +
      "- Characters remembered in long-term memory: how many characters' core truths are allowed to ride in the always-on memory summary at once. Higher keeps more people relevant longer, but uses more of your context budget.\n" +
      "- Memory summary size (% of context): the always-on summary caps itself at this share of your model's actual available context, not a flat number — so it stays proportional whether you're on a small-context model or a large one. Only matters if the setting above is turned on.\n\n" +
      "Add the names of characters who can have private thoughts below, one per line. Codex adds newly discovered characters here automatically.\n" +
      CAST_LIST_MARKER + "\n" +
      "Marcus\n" +
      "Aria";
  }
  return card;
}

function readUnsaidConfig() {
  const card = ensureConfigCard();
  if (!card.description.includes("Commands (type as an action):")) {
    card.description =
      "Commands (type as an action):\n" +
      "- /unsaid status — writes a live status report to a separate \"UNSAID — Status\" card. Not sent to the AI.\n" +
      "- /peek <character name> — force a private thought from that character right now.\n" +
      "- /peek <character name> core — force a check for whether this moment has changed that character's core truth.\n" +
      "- /card <character name> — force Codex to write or refresh that character's Story Card right now, skipping the mention count and cooldown.\n\n" +
      card.description;
  }
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

  const jsonNotesMatch = card.entry.match(/Store card notes as JSON:\s*(true|false)/i);
  if (jsonNotesMatch) cfg.jsonNotes = jsonNotesMatch[1].toLowerCase() === "true";

  const coreShiftMatch = card.entry.match(/rewrite a core truth:\s*(true|false)/i);
  if (coreShiftMatch) cfg.allowCoreShift = coreShiftMatch[1].toLowerCase() === "true";

  const chanceMatch = card.entry.match(/thought per turn[^:]*:\s*([\d.]+)/i);
  if (chanceMatch) {
    const parsedChance = parseFloat(chanceMatch[1]);
    if (!isNaN(parsedChance)) cfg.chance = Math.min(1, Math.max(0, parsedChance));
  }

  const cooldownMatch = card.entry.match(/think again:\s*(\d+)/i);
  if (cooldownMatch) {
    const parsedCooldown = parseInt(cooldownMatch[1], 10);
    if (!isNaN(parsedCooldown)) cfg.cooldown = Math.max(0, parsedCooldown);
  }

  const reduceMatch = card.entry.match(/Ease off during your own Do\/Say actions:\s*(true|false)/i);
  if (reduceMatch) cfg.reduceDuringActions = reduceMatch[1].toLowerCase() === "true";

  const recentTurnsMatch = card.entry.match(/Recent turns counted as "active":\s*(\d+)/i);
  if (recentTurnsMatch) {
    const parsedRecentTurns = parseInt(recentTurnsMatch[1], 10);
    if (!isNaN(parsedRecentTurns)) cfg.recentTurnsWindow = Math.max(1, parsedRecentTurns);
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

  const memPercentMatch = card.entry.match(/Memory summary size \(% of context\):\s*(\d+)/i);
  if (memPercentMatch) {
    const parsedMemPercent = parseInt(memPercentMatch[1], 10);
    if (!isNaN(parsedMemPercent)) cfg.memoryPercent = Math.min(50, Math.max(1, parsedMemPercent));
  }

  const playerMatch = card.entry.match(/Player character \(skip when Codexing\):[ \t]*(.*)/i);
  if (playerMatch) cfg.playerName = playerMatch[1].trim();

  const markerIdx = card.description.indexOf(CAST_LIST_MARKER);
  const castSection = markerIdx >= 0
    ? card.description.slice(markerIdx + CAST_LIST_MARKER.length)
    : card.description.split("\n").slice(1).join("\n");

  cfg.cast = castSection
    .split("\n")
    .map(line => line.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);

  const knownLower = cfg.cast.map(n => n.toLowerCase());
  let adopted = false;
  let adoptedThisPass = 0;
  storyCards.forEach(c => {
    if (adoptedThisPass >= 20) return;
    if (!c.title) return;
    // Opt-out rather than opt-in: only skip cards whose type clearly says they're NOT a
    // character (location/faction/item), plus UNSAID's own "Class"-typed admin cards. Anything
    // else — "Character" or any other/custom type a card might actually be stored with — is
    // treated as a character candidate, so this doesn't depend on guessing the exact type string.
    if (isCardOfKind(c, "location") || isCardOfKind(c, "faction") || isCardOfKind(c, "item") || isCardOfKind(c, "class")) return;
    if (c.title === "UNSAID Config") return;
    if (cfg.playerName && isSameCardEntity(c.title, cfg.playerName)) return;
    if (cfg.cast.some(existing => isSameCardEntity(c.title, existing))) return;
    cfg.cast.push(c.title);
    knownLower.push(c.title.toLowerCase());
    adopted = true;
    adoptedThisPass++;
  });
  if (adopted) {
    const alreadyListed = castSection.split("\n").map(l => l.trim());
    const newlyAdopted = cfg.cast.filter(n => !alreadyListed.includes(n));
    card.description += "\n" + newlyAdopted.join("\n");
  }

  card.entry =
    "-- General --\n" +
    `> Enable UNSAID: ${cfg.enabled}\n` +
    `> Enable Codex: ${cfg.codexEnabled}\n` +
    "-- Private Thoughts --\n" +
    `> Chance of a thought per turn (0 to 1): ${cfg.chance}\n` +
    `> Turns before the same character can think again: ${cfg.cooldown}\n` +
    `> Ease off during your own Do/Say actions: ${cfg.reduceDuringActions}\n` +
    `> Recent turns counted as "active": ${cfg.recentTurnsWindow}\n` +
    `> Show private thoughts in the story text: ${cfg.showThoughtsInStory}\n` +
    `> Let hidden feelings subtly color actions: ${cfg.subtleHints}\n` +
    `> Store card notes as JSON: ${cfg.jsonNotes}\n` +
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
    `> Characters remembered in long-term memory: ${cfg.memoryMaxEntries}\n` +
    `> Memory summary size (% of context): ${cfg.memoryPercent}`;

  return cfg;
}

function stripConfigNoise(text) {
  let cleaned = text;
  storyCards
    .filter(c => isCardOfKind(c, "class") && c.title && c.title.indexOf("UNSAID") === 0)
    .forEach(card => {
      if (card.entry) cleaned = cleaned.split(card.entry).join("");
      if (card.description) cleaned = cleaned.split(card.description).join("");
    });
  return cleaned;
}

function fitInstructionToBudget(baseText, instruction) {
  const hasBudget = typeof info !== "undefined" && info && typeof info.maxChars === "number";
  if (!hasBudget) return instruction;
  const budget = info.maxChars - CONTEXT_SAFETY_MARGIN;
  if ((baseText.length + instruction.length) <= budget) return instruction;
  const room = budget - baseText.length;
  if (room > 40) return instruction.slice(0, room - 4) + "...]\n";
  return null;
}

function trackMentions(text) {
  if (!state.unsaid || !state.unsaid.codex) return;
  const matches = text.match(CODEX_TITLE_ABBREV_REGEX) || [];
  matches.forEach(raw => {
    let name = raw.trim();
    let words = name.split(" ");
    while (words.length > 1 && CODEX_STOPWORDS.has(words[0])) {
      words = words.slice(1);
      name = words.join(" ");
    }
    if (words.length === 1 && CODEX_STOPWORDS.has(words[0])) return;
    if (words.length === 1 && CODEX_TITLE_WORDS.has(name)) return;
    state.unsaid.codex.mentionCounts[name] = (state.unsaid.codex.mentionCounts[name] || 0) + 1;
  });
  pruneMentionCounts();
}

function pruneMentionCounts() {
  const counts = state.unsaid.codex.mentionCounts;
  const keys = Object.keys(counts);
  if (keys.length > MENTION_TRACKING_CAP + 50) {
    keys
      .sort((a, b) => counts[a] - counts[b])
      .slice(0, keys.length - MENTION_TRACKING_CAP)
      .forEach(k => delete counts[k]);
  }
  const attempts = state.unsaid.codex.attempts;
  Object.keys(attempts).forEach(name => {
    if (!(name in counts)) delete attempts[name];
  });
}

function classifyCodexEntry(name, text) {
  if (CODEX_LOCATION_HINTS.test(name)) return "location";
  if (CODEX_LOCATION_SUFFIX_HINTS.test(name)) return "location";
  if (CODEX_FACTION_HINTS.test(name)) return "faction";
  if (CODEX_ITEM_HINTS.test(name)) return "item";

  const nearLocation = new RegExp(`(in|inside|outside|through)\\s+${escapeForRegex(name)}\\b`, "i");
  if (nearLocation.test(text)) return "location";

  const nearItem = new RegExp(`(wields?|holds?|wearing|wears|using|uses|draws?|grips?|picks?\\s+up|holsters?)\\s+(the\\s+|a\\s+|an\\s+|his\\s+|her\\s+|their\\s+)?${escapeForRegex(name)}\\b`, "i");
  if (nearItem.test(text)) return "item";

  return "character";
}

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

const CARD_TYPE_DISPLAY = { character: "Character", location: "Location", item: "Item", faction: "Faction" };
function platformType(kind) {
  return CARD_TYPE_DISPLAY[kind] || kind;
}
function isCardOfKind(card, kind) {
  return !!card && typeof card.type === "string" && card.type.toLowerCase() === kind.toLowerCase();
}

function excludedNames(cfg) {
  const names = [];
  if (cfg.playerName) names.push(cfg.playerName);
  if (typeof info !== "undefined" && info) {
    if (Array.isArray(info.characters)) {
      info.characters.forEach(c => {
        if (typeof c === "string") names.push(c);
        else if (c && c.name) names.push(c.name);
      });
    }
    if (Array.isArray(info.characterNames)) {
      info.characterNames.forEach(n => { if (typeof n === "string") names.push(n); });
    }
  }
  return names;
}

function findCodexCandidates(threshold, excludeNames, maxAttempts, maxCount) {
  const exclude = excludeNames || [];
  const cap = typeof maxAttempts === "number" ? maxAttempts : CODEX_MAX_ATTEMPTS;
  const limit = typeof maxCount === "number" ? maxCount : CODEX_MAX_CANDIDATES_PER_TURN;
  const counts = state.unsaid.codex.mentionCounts;
  const eligible = [];
  for (const name in counts) {
    if (counts[name] <= threshold) continue;
    if (exclude.some(ex => isSameCardEntity(ex, name))) continue;
    if (storyCards.some(c => isSameCardEntity(c.title, name))) continue;
    if ((state.unsaid.codex.attempts[name] || 0) >= cap) continue;
    eligible.push({ name, count: counts[name] });
  }
  eligible.sort((a, b) => b.count - a.count);

  const picked = [];
  for (const candidate of eligible) {
    if (picked.length >= limit) break;
    if (picked.some(p => isSameCardEntity(p.name, candidate.name))) continue;
    picked.push(candidate);
  }
  return picked.map(p => p.name);
}

function buildCodexInstruction(names, text) {
  const blocks = names.map((name, i) => {
    const type = classifyCodexEntry(name, text);
    const fields = CARD_TEMPLATES[type] || CHARACTER_CARD_FIELDS;
    const body = fields.map(f => `${f}: ${f === "Name" ? name : "..."}`).join("\n");
    const mind = type === "character" ? state.unsaid.minds[name] : null;
    const knownNote = mind && mind.core
      ? ` They've privately shown this about themselves: "${mind.core}" — let Personality and Background agree with it, not invent something that contradicts it.`
      : "";
    const correctionNote = type === "character"
      ? ` If "${name}" is actually a location, item, or faction rather than a character, use Location/Description/Key Locations/Historical Events/Significance, or Type/Description/Properties/Origin/Significance, or Type/Description/Significance instead of the fields below — whichever genuinely fits it.`
      : "";
    return `Profile ${i + 1} — "${name}":${knownNote}${correctionNote}\n【CARD】\n${body}\n【/CARD】`;
  }).join("\n\n");

  return `\n[Finish the story normally first — that's the priority. Then, on new lines after it, add ${names.length > 1 ? "these brief hidden profiles" : "a brief hidden profile"} wrapped between 【CARD】 and 【/CARD】, not part of the visible narrative:\n${blocks}\nKeep each field to a few words — this should take one or two lines total per profile, not paragraphs. Use whatever the story has actually shown; where it hasn't shown much yet, fill in your best reasonable answer instead of leaving a field blank or vague — draw on general knowledge for anything real-world (an actual place, a well-known title, a common item), and a sensible, in-fiction guess for anything invented that the story just hasn't detailed yet.]\n`;
}

function codexLogTitle(type) {
  const heading = type.charAt(0).toUpperCase() + type.slice(1) + "s";
  return `UNSAID Codex Log — ${heading}`;
}

function buildStatusReport(cfg) {
  const lines = [];
  lines.push(`UNSAID: ${cfg.enabled ? "enabled" : "DISABLED"}  |  Codex: ${cfg.codexEnabled ? "enabled" : "disabled"}  |  Turn: ${state.unsaid.turn}`);

  const cacheCard = storyCards.find(c => c.title === "UNSAID — Important, Read This ⚠️");
  if (cacheCard && cacheCard.entry && cacheCard.entry.indexOf("no longer detected") === -1) {
    lines.push(`⚠️ Cache-efficient mode is currently detected — private thoughts and Codex cannot function right now, see that card for details.`);
  }

  const mindNames = Object.keys(state.unsaid.minds);
  lines.push(`\nTracked minds (${mindNames.length}):`);
  if (mindNames.length === 0) {
    lines.push(`  none yet`);
  } else {
    mindNames.forEach(name => {
      const m = state.unsaid.minds[name];
      const coreNote = m.core ? "has a core truth" : "no standalone thought yet";
      lines.push(`  ${name} — ${coreNote}, feeling: ${m.feeling || "none yet"}, ${m.revealCount || 0} reveal(s), last active turn ${m.lastTurn}`);
    });
  }

  const counts = state.unsaid.codex.mentionCounts;
  const attempts = state.unsaid.codex.attempts;
  const tracked = Object.keys(counts);
  const exhausted = tracked.filter(n => (attempts[n] || 0) >= cfg.codexMaxAttempts);
  const eligible = tracked.filter(n => counts[n] > cfg.mentionThreshold && !exhausted.includes(n));
  lines.push(`\nCodex mention-tracking: ${tracked.length} name(s) tracked, ${eligible.length} genuinely eligible now (above the mention threshold of ${cfg.mentionThreshold}, not yet exhausted)`);
  if (eligible.length > 0) {
    lines.push(`  eligible now: ${eligible.slice(0, 10).map(n => `${n} (${counts[n]}x)`).join(", ")}${eligible.length > 10 ? ", ..." : ""}`);
  }
  if (exhausted.length > 0) {
    lines.push(`  gave up after ${cfg.codexMaxAttempts} attempts: ${exhausted.join(", ")} — "Reset Codex tracking now" to retry`);
  }
  const turnsSinceCodex = state.unsaid.turn - (state.unsaid.codex.lastTriggerTurn || 0);
  lines.push(`  ${turnsSinceCodex}/${cfg.codexCooldown} turns since Codex last triggered`);
  const strugglingCount = (state.unsaid.codex.consecutiveFailedNames || []).length;
  if (strugglingCount > 0) {
    lines.push(`  ${strugglingCount} different name(s) in a row with no successful card yet${strugglingCount >= 3 ? " — looks systemic, not just bad luck on a few names" : ""}`);
  }
  const revealMisses = state.unsaid.consecutiveRevealMisses || 0;
  if (revealMisses > 0) {
    lines.push(`\nReveal requests: ${revealMisses} in a row produced nothing usable${revealMisses >= 5 ? " — may indicate a model compliance issue, not a specific character" : ""}`);
  }

  lines.push(`\nCast (${cfg.cast.length}): ${cfg.cast.join(", ") || "empty"}`);

  if (cfg.cast.length > 0) {
    lines.push(`\nCast → Story Card resolution (what each name actually matches right now):`);
    cfg.cast.forEach(name => {
      const matches = storyCards.filter(c => c.title && isSameCardEntity(c.title, name));
      if (matches.length === 0) {
        lines.push(`  ${name} → no matching Story Card found — thoughts have nowhere to be saved`);
      } else if (matches.length === 1) {
        lines.push(`  ${name} → "${matches[0].title}" (type: "${matches[0].type || ""}")`);
      } else {
        lines.push(`  ${name} → ${matches.length} cards match! Using the first: "${matches[0].title}" (type: "${matches[0].type || ""}") — others: ${matches.slice(1).map(c => `"${c.title}"`).join(", ")}`);
      }
    });
  }

  return lines.join("\n");
}

function ensureCodexLogCard(type) {
  const title = codexLogTitle(type);
  const keys = title.toLowerCase();
  let card = storyCards.find(c => c.title === title || c.keys === keys);
  if (!card) {
    card = createOrFindCard(keys, " ", "Class");
    card.title = title;
    card.keys = keys;
    card.type = "Class";
    card.entry = `Every ${type} card Codex has made, with how many times it was mentioned before the card was created. Delete a card from the story to have Codex redo it — this entry can stay.`;
    card.description = "";
  }
  return card;
}

function logCodexCard(name, type, mentionCount) {
  const card = ensureCodexLogCard(type);
  const entries = card.description.split("\n").map(l => l.trim()).filter(Boolean);
  const line = `${name} — mentioned ${mentionCount}x before card created`;
  const existingIdx = entries.findIndex(l => l.startsWith(`${name} —`));
  if (existingIdx >= 0) entries[existingIdx] = line;
  else entries.push(line);
  card.description = entries.join("\n");
}

function recordRelation(name, other, feeling) {
  if (!state.unsaid.minds[name]) state.unsaid.minds[name] = createMind();
  const mind = state.unsaid.minds[name];
  if (!mind.relations) mind.relations = {};
  if (!mind.relationOrder) mind.relationOrder = [];
  if (!mind.relationHistory) mind.relationHistory = {};

  mind.relations[other] = feeling;
  const idx = mind.relationOrder.indexOf(other);
  if (idx !== -1) mind.relationOrder.splice(idx, 1);
  mind.relationOrder.push(other);

  if (!mind.relationHistory[other]) mind.relationHistory[other] = [];
  pushCapped(mind.relationHistory[other], feeling, RELATION_HISTORY_LIMIT);

  while (mind.relationOrder.length > MAX_RELATIONS_PER_CHARACTER) {
    const evicted = mind.relationOrder.shift();
    delete mind.relations[evicted];
    delete mind.relationHistory[evicted];
  }
}

function syncMindToCard(name, allowCoreShift, useJson) {
  const mind = state.unsaid.minds[name];
  if (!mind) return false;

  // Match purely by name. Earlier versions also required card.type to equal "character", but
  // that made this silently fail whenever a card's stored type didn't come back exactly as
  // expected — the reveal would still report success even though nothing was written. A name
  // that's already an active, tracked cast member doesn't need re-verifying by type here.
  const card = storyCards.find(c => c.title && isSameCardEntity(c.title, name));
  if (!card) return false;

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

  if (useJson) {
    const relations = {};
    if (mind.relationOrder) {
      mind.relationOrder.forEach(other => {
        const hist = mind.relationHistory && mind.relationHistory[other];
        relations[other] = { current: mind.relations[other], history: hist || [mind.relations[other]] };
      });
    }
    const jsonBody = {
      core: mind.core || null,
      coreStableSince: stabilityNote ? state.unsaid.turn - mind.coreSetTurn : null,
      formerlyBelieved: mind.coreHistory && mind.coreHistory.length > 0 ? mind.coreHistory[mind.coreHistory.length - 1] : null,
      tension: tensionNote,
      feeling: mind.feeling || null,
      feelingHistory: mind.feelingHistory || [],
      lastThought: mind.lastThoughtText || null,
      want: mind.want || null,
      relations,
      revealCount: mind.revealCount || 0
    };
    const base = (card.description || "").split(MIND_NOTES_MARKER)[0].replace(/\s+$/, "");
    card.description = `${base}\n\n${MIND_NOTES_MARKER}\n${JSON.stringify(jsonBody, null, 2)}`.trim();
    return true;
  }

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
  if (sections.length === 0) return false;
  const body = sections.join("\n\n");

  const base = (card.description || "").split(MIND_NOTES_MARKER)[0].replace(/\s+$/, "");
  card.description = `${base}\n\n${MIND_NOTES_MARKER}\n${body}`.trim();
  return true;
}

function splitThoughtSentences(thought) {
  const rawSentences = thought.split(/(?<=[.!?])\s+/).filter(Boolean);
  const sentences = [];
  for (let i = 0; i < rawSentences.length; i++) {
    const s = rawSentences[i];
    const words = s.trim().split(/\s+/);
    const lastWord = (words[words.length - 1] || "").replace(/\.$/, "");
    if (SENTENCE_ABBREVIATIONS.has(lastWord) && i + 1 < rawSentences.length) {
      rawSentences[i + 1] = s + " " + rawSentences[i + 1];
      continue;
    }
    sentences.push(s);
  }
  return { feelingSentence: sentences[0] || thought, wantSentence: sentences[1] || null };
}

function forgetMentionTracking(name) {
  delete state.unsaid.codex.mentionCounts[name];
  delete state.unsaid.codex.attempts[name];
}

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

function pushCapped(arr, value, limit) {
  if (arr[arr.length - 1] !== value) {
    arr.push(value);
    if (arr.length > limit) arr.shift();
  }
}

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

function buildCoreCheckInstruction(chosen, mind) {
  const coreNote = mind && mind.core ? ` Their current anchor: "${mind.core}".` : "";
  const tensionNote = mind && typeof mind.tensionLevel === "number"
    ? (mind.tensionLevel >= TENSION_THRESHOLD
      ? " Their feelings have been genuinely unsettled for a while now — this may well be the moment."
      : " Their feelings have been fairly steady lately, for what that's worth.")
    : "";
  return `\n[Consider whether recent events have genuinely, permanently changed how ${chosen} sees themselves — not just a passing mood.${coreNote}${tensionNote} If yes, reveal it (keep the 《 》 characters exactly as shown, they're required, not decorative) as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" (replace [one-word-emotion] with an actual word, not the literal placeholder) (2 italicized sentences). If nothing that significant has happened, don't force it — continue the story normally with no reveal at all.]\n`;
}

function buildAndFitThoughtInstruction(chosen, active, baseText, allowCoreShift) {
  const mind = state.unsaid.minds[chosen];

  const others = (active || []).filter(n => n !== chosen);
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
    instruction = `\n[${chosen}'s unspoken reaction to ${target} — 2 italicized sentences: how they really feel about ${target} right now, and what they secretly want from this moment. ${target} can't perceive it.${coreNote}${relationNote}${historyNote}${wantNote}${varietyNote} Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally. Format (keep the 《 》 characters exactly as shown, they're required, not decorative): "《${chosen}, [one-word-emotion], about ${target}: thought.》"]\n`;
  } else if (mind && mind.core) {
    const atThreshold = allowCoreShift && typeof mind.tensionLevel === "number" &&
      mind.tensionLevel >= TENSION_THRESHOLD;
    const atDrasticTier = allowCoreShift && typeof mind.tensionLevel === "number" &&
      mind.tensionLevel >= TENSION_THRESHOLD * DRASTIC_TENSION_MULTIPLIER;
    const naturallyEligible = (mind.revealCount || 0) >= REVEALS_BEFORE_SHIFT_ELIGIBLE;
    const shiftEligible = atDrasticTier || (atThreshold && naturallyEligible);
    const shiftNote = shiftEligible
      ? (atDrasticTier && !naturallyEligible
        ? ` Their feelings have been unraveling for a long time now, unresolved — something this significant would happen regardless. If it's truly earned, you may format this instead as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" to replace their old anchor.`
        : ` Their feelings have been genuinely shifting for a while now, not settling back — if this moment plays into that and something has truly changed how they see themselves, you may format this instead as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" to replace their old anchor. Only do this if it's really earned.`)
      : "";
    instruction = `\n[${chosen}'s private thought — 2 italicized sentences: how they really feel right now, and what they secretly want. Consistent with "${mind.core}" and their feeling of ${mind.feeling} unless this scene shifts it.${historyNote}${wantNote}${varietyNote}${shiftNote} Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally. Format (keep the 《 》 characters exactly as shown, they're required, not decorative): "《${chosen}, [one-word-emotion]: thought.》" No one else perceives it.]\n`;
  } else {
    instruction = `\n[This is ${chosen}'s very first private thought — once revealed, it becomes a lasting truth about who they fundamentally are, something real and significant enough to define them going forward, not a fleeting reaction to this moment. 2 italicized sentences: what this deep truth is, and what they secretly want because of it. Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally. Format (keep the 《 》 characters exactly as shown, they're required, not decorative): "《${chosen}, [one-word-emotion]: thought.》" No one else perceives it.]\n`;
  }

  return fitInstructionToBudget(baseText, instruction);
}

function getLastActionType() {
  if (typeof history !== "undefined" && Array.isArray(history) && history.length > 0) {
    return history[history.length - 1].type || null;
  }
  return null;
}

// AI Dungeon's info.actionCount only advances on a genuine new action — not on a retry or
// regenerated output for the same action — so it's a reliable signal for "has the story
// actually moved forward since we last spent turn-based budget (cooldowns, Codex attempts)?"
function isNewStoryTurn() {
  if (typeof info === "undefined" || !info || !Number.isInteger(info.actionCount)) {
    return true;
  }
  const current = Math.abs(info.actionCount);
  const isNew = state.unsaid.lastActionCount !== current;
  state.unsaid.lastActionCount = current;
  return isNew;
}

const ESTIMATED_CHARS_PER_TURN = 900;
function recentTurnsText(text, turnCount) {
  const n = typeof turnCount === "number" && turnCount > 0 ? turnCount : 3;
  const base = text.slice(-(n * ESTIMATED_CHARS_PER_TURN));
  let supplement = "";
  if (typeof history !== "undefined" && Array.isArray(history) && history.length > 0) {
    const last = history[history.length - 1];
    if (last && typeof last.text === "string" && last.text.length > 0) {
      supplement = last.text;
    }
  }
  return supplement ? base + "\n" + supplement : base;
}

const FRONT_MEMORY_MARKER = "[UNSAID hint]";

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

function syncCoreMemory(maxEntries, enabled, percent) {
  if (!state.memory || typeof state.memory !== "object") return;

  if (!enabled) {
    const withoutBlock = (state.memory.context || "").split(CORE_MEMORY_MARKER)[0].replace(/\s+$/, "");
    if (withoutBlock !== (state.memory.context || "")) state.memory.context = withoutBlock;
    return;
  }

  const cap = typeof maxEntries === "number" ? maxEntries : CORE_MEMORY_MAX_ENTRIES;

  const names = Object.keys(state.unsaid.minds)
    .filter(name => {
      const m = state.unsaid.minds[name];
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

  const header = `${CORE_MEMORY_MARKER} (private — not known to other characters)`;

  const existing = (state.memory.context || "").split(CORE_MEMORY_MARKER)[0].replace(/\s+$/, "");
  let block = `${header}\n${lines.join("\n")}`;
  const memoryBudget = (typeof info !== "undefined" && info && typeof info.maxChars === "number")
    ? Math.max(200, Math.round(info.maxChars * ((typeof percent === "number" ? percent : MEMORY_CONTEXT_PERCENT * 100) / 100)))
    : MEMORY_CONTEXT_FALLBACK_LENGTH;
  while (block.length > memoryBudget && lines.length > 1) {
    lines.pop();
    block = `${header}\n${lines.join("\n")}`;
  }

  state.memory.context = lines.length > 0
    ? `${existing}\n\n${block}`.trim()
    : existing;
}
