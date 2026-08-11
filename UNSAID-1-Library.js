// ===== UNSAID — LIBRARY =====
//
// ⚠️ PLATFORM LIMITATION — READ FIRST
// AI Dungeon's own documentation confirms that on cache-efficient
// models, the Context hook still runs but its result is never applied
// to what the AI actually sees. That means private thoughts and
// Codex's Story Card generation — both of which work by asking the AI
// to do something via an injected Context instruction — cannot
// function on those models, through no fault of your config. This
// script detects that condition automatically (checkCacheEfficientWarning,
// in Context.js) and writes an unmissable warning Story Card the
// moment it's noticed, since a silent failure here is worse than a
// visible limitation. If you install this and nothing happens no
// matter what you try, check for that card first. The same check
// updates that card if the condition later clears — after switching
// models, for instance — rather than leaving a stale warning behind.
//
// A small script, two features:
//
// 1. PRIVATE THOUGHTS
//    Occasionally reveals what a character is really feeling and
//    thinking but not saying: one sentence on how they feel, one on
//    what they secretly want. By default this never appears in the
//    story — it's written straight to the character's own Story Card
//    notes, so learning what someone's really thinking means looking
//    them up, not having it narrated at you (a config toggle restores
//    the old inline-in-story behavior). The chance of a reveal firing
//    gets a real, automatic boost while anyone active still hasn't had
//    a first one yet — a scene with several existing characters gets
//    the whole cast started within a handful of turns instead of
//    leaving broad coverage purely to chance stacked turn after turn.
//    Once everyone active has had at least one reveal, this has no
//    effect and the configured chance applies exactly as set.
//
//    Parsing what the model actually writes has a real fallback, not
//    just a strict template match: some models attempt a reveal but
//    don't follow the exact "feeling:" colon format — writing, say,
//    "《Name, feeling the phantom warmth of...》" by continuing the
//    template's placeholder word as literal prose instead of replacing
//    it with a short emotion word. Confirmed against actual captured
//    output, not hypothetical. Rather than silently discard a reveal
//    the model clearly attempted, a looser pattern still captures the
//    full thought when the strict one doesn't match, falling back to
//    the character's last known feeling (or a neutral default) when a
//    clean single-word label can't be pulled out. Two more confirmed
//    failure modes, same real-play origin: a reveal can drop the
//    character's name entirely ("《And for the first time in fifteen
//    years...》" with no "Name," prefix at all) — recovered by treating
//    any bracketed content as belonging to whoever was actually asked,
//    since that's already known. And a reveal can simply never close —
//    an opening 《 with no matching 》 means the response got cut off,
//    and without handling that, the raw unfinished markup sits in the
//    visible story forever. Both guarded against the same way an
//    unclosed 【CARD】 tag already was. The instruction itself was also
//    reworded to spell out, explicitly, not to write "feeling" as the
//    literal emotion — a preventative fix on top of the reactive ones,
//    not a replacement for them. A core-shift attempt is recognized
//    from any of these paths, not just the strict one, so a malformed
//    response doesn't silently downgrade an earned shift into an
//    ordinary reveal.
//
//    Feeling, want, and a short rolling history of each evolve
//    independently. A "core truth" — the character's first standalone
//    thought, specifically prompted to be something real and
//    significant rather than a passing reaction — anchors who they
//    are. By default it can shift after something genuinely major (the
//    old one is kept, never erased); it can be turned permanent
//    instead via config. A shift is never a coin flip on an ordinary
//    reveal: a character's feeling landing somewhere genuinely new
//    several times running, without settling, builds tracked tension,
//    shown on their card once it crosses a threshold. Even then, an
//    ordinary shift is only offered to the AI once the character has
//    shown a little more of themselves beyond their founding thought —
//    automatic, through ordinary reveals, no command required. Tension
//    that keeps climbing well past the threshold, unresolved,
//    eventually bypasses that requirement too. A steady feeling eases
//    tension back off. "/peek <name> core" is an optional direct
//    check that always works and counts as one of those private
//    moments, but nothing here ever requires it.
//
//    Up to six specific relationships are tracked per character, each
//    with its own short history, so a reaction can reference how
//    things have shifted, not just where they stand now — a scene
//    with someone they already have history with pulls from that
//    instead of a random new reaction. Every reveal is nudged to avoid
//    repeating a character's own last wording. "/peek <name>" as an
//    action forces an immediate reveal on demand. Its detection isn't
//    anchored to the very start of the text on purpose — AI Dungeon
//    prepends "You " to Do actions and wraps Say actions as
//    You say, "..." before this script ever sees them, so an anchored
//    match would only ever fire on Story-mode input and silently miss
//    the two most common action types. It's also, configurably, less
//    likely to fire on its own during the player's own Do/Say actions
//    specifically, so it doesn't compete for attention right when
//    they've taken a deliberate action. A live style hint — "let
//    hidden feelings color actions without stating them" — rides in
//    frontMemory, the part of context closest to the point of
//    generation, separate from the factual summary kept in Memory.
//    Who counts as "active" and eligible for a reveal is judged over a
//    configurable window sized in estimated turns, not a small fixed
//    slice of text — a single detailed turn can run several thousand
//    characters, and a character clearly present early in a long turn
//    was getting missed entirely by a slice too short to reach them.
//
//
// 2. CODEX
//    Tracks how many times each new name is mentioned and only writes
//    a Story Card once it clears a configurable threshold, so
//    background one-off names don't get cards. Multi-word names with a
//    lowercase "of" ("Sword of Power") are tracked as one candidate,
//    not split into fragments — confirmed from real play that without
//    this, a fragment like "Sword" alone could out-mention and out-
//    compete the real, complete name, burning through the entire retry
//    budget on something too incomplete to ever get a usable response.
//    A sentence-initial stopword glued onto an otherwise real name
//    ("The Sword of Power...") has the stopword stripped rather than
//    losing the whole mention. A title abbreviation with its period
//    ("Dr. Moreau") is bridged into the name it precedes the same
//    way — confirmed via direct testing that without this, "Dr" and
//    "Moreau" tracked as two entirely disconnected candidates, each
//    competing on its own rather than as the one name that matters
//    (the same fix also prevents the identical abbreviation from
//    being mistaken for a sentence-ending period when a reveal's want
//    text is extracted). Compass directions, day names, and month
//    names are excluded outright — confirmed via Auto-Cards' own real
//    source that these are a genuine, recurring false positive
//    (capitalized constantly in ordinary narrative text, never a
//    sensible subject on their own), not something this project had
//    hit directly yet. Recognizes when a shorter and longer
//    version of the same name refer to one entity ("Marcus" / "Marcus
//    Cole") instead of doubling up, and never cards the player's own
//    character — named manually, or, in Multiplayer, every character
//    the platform already knows about — recognizing them under any
//    title or honorific the story gives them ("Kyle Walker" excludes
//    "Emperor Kyle Walker" too, not just an exact match). Builds the
//    right template for a character, location, item, or faction — but
//    that upfront classification is a heuristic guess, not a fact, and
//    can't enumerate every real-world place name a story might mention
//    ("Manhattan" has no descriptive word in it for a heuristic to
//    catch). Rather than force a wrong template on the model (asking
//    a city for its Race and Strength Level), the instruction invites
//    a correction, and whichever fields the response actually uses —
//    Location-specific, item-specific, or neither — decide the card's
//    real type, overriding the original guess when they disagree. The
//    same instruction also explicitly permits drawing on general
//    knowledge for anything real-world, and a reasonable in-fiction
//    guess for anything invented the story simply hasn't detailed
//    yet, rather than leaving a field blank for lack of story-given
//    specifics. Keeps a separate tracking card per type. Up to three
//    eligible names are requested together in a single instruction
//    rather than one at a time — nothing in the platform limits a
//    script to one addStoryCard per turn, so there's no reason to
//    clear a backlog that slowly. Among everything eligible, it
//    always picks whichever names are genuinely mentioned most, not
//    just whichever come up
//    first — a stray false positive that slips past the name filters
//    can't camp in front of a real, frequently-mentioned name and
//    block it. A bare title ("Emperor," "General") is never specific
//    enough to be its own subject, but the same word leading an actual
//    name ("Emperor Kyle Walker") is completely normal and unaffected.
//    Delete a card to have Codex redo it. New characters join the
//    private-thoughts cast automatically — and so does any character
//    card that already existed before UNSAID was ever installed,
//    adopted in the moment it's first noticed, so a hand-made cast
//    works immediately. A failed attempt (the model didn't produce a
//    usable card) counts against a retry budget the same way a
//    successful one does — once that's used up, Codex gives up on that
//    name for good. Rather than let that happen silently and
//    invisibly, the last exhausted attempt says so plainly and points
//    at the config card's reset option. A response that opens a card
//    block but never closes it — cut off, whether the only thing
//    attempted or dangling after other cards that did complete
//    normally — isn't simply discarded: whatever field content exists
//    is salvaged as a best-effort card when it lines up with a name
//    actually requested, the same reasoning already applied to an
//    unclosed reveal tag, and directly inspired by Auto-Cards
//    treating a genuine attempt as worth keeping rather than thrown
//    away outright. Matched positionally to the next expected name in
//    sequence, not by trusting whatever the cut-off response itself
//    says its own name is. Exhausting even one name this way already
//    takes attempts × cooldown turns at minimum before its own message
//    fires — if several different names in a row all fail, that's
//    dozens of turns before anything explains what's happening. A
//    failure pattern spanning multiple different names looks systemic
//    in a way any single name's own failure doesn't, so it's tracked
//    and surfaced separately, well before any individual name's own
//    retry budget would run out — also visible directly in
//    "/unsaid status" as its own line, not just as a one-time popup.
//
// A short summary of each tracked character's core truth, want, and
// top relationship can optionally ride in the adventure's always-on
// Memory too (off by default — see below), capped as a percentage of
// the model's actual available context rather than a flat number, so
// it scales sensibly whether the model's context is small or large —
// the one part of context that survives regardless of
// how long it's been since a character was last mentioned, so
// something established at turn 1 can still matter at turn 1000.
// Who counts as "active" for a reveal is judged primarily from the
// text actually being sent to the AI, sized generously in estimated
// turns — confirmed reliable in every case tested. AI Dungeon's own
// history array supplements this (never replaces it): its most recent
// entry gets folded in too, catching the one real gap the estimate
// alone can still miss — a single turn genuinely longer than the
// whole window. Kept as a supplement rather than the primary source
// on purpose: testing found history's per-turn text can be stale or
// empty in ways this script can't verify stay synced with what's
// actually happening, and trusting it alone once produced zero active
// characters, ever, with nothing indicating why.
//
// Context-budget aware throughout, with a small safety margin, and
// works the same whether or not the platform's own context
// optimization is switched on: every injected instruction is checked
// against the budget first, shrinking or skipping itself rather than
// crowd out the story. Story Cards are looked up by their keys rather
// than list position, the config card self-heals its settings if a
// line gets edited or reordered, and relationships, mention tracking,
// Codex's retry-attempt tracking, and memory entries all stay capped
// instead of growing without bound over a long story.
//
// "/unsaid status" as an action writes a direct, current snapshot of
// internal state to its own card on demand — what's tracked, what's
// genuinely eligible for a card right now versus what's given up and
// why, whether cache-efficient mode is active — so a real question
// about what's actually happening doesn't require guesswork or a
// screenshot to answer.

const UNSAID_DEFAULTS = {
  enabled: true,
  codexEnabled: true,
  memorySyncEnabled: false, // off by default — private data belongs on the character's own card, not in Plot Essentials
  showThoughtsInStory: false, // when false, reveals go to the character's card, not the narrative
  subtleHints: true,           // let hidden feelings quietly color visible actions/body language
  jsonNotes: false,        // write character card notes as JSON instead of plain prose
  allowCoreShift: true,        // whether a major event can ever rewrite a character's core truth
  chance: 0.3,        // chance per turn a thought fires, when someone qualifies
  cooldown: 3,          // turns a character must wait before thinking again
  reduceDuringActions: true,  // ease off the reveal chance specifically during the player's own Do/Say
  recentTurnsWindow: 3,         // how many recent turns count as "active" for a character
  mentionThreshold: 3,   // a name needs MORE than this many mentions before Codex cards it
  codexCooldown: 5,       // minimum turns between two Codex triggers, of any name
  codexMaxAttempts: 5,     // retries on a name before Codex gives up on it
  memoryMaxEntries: 8,      // how many characters' core truths ride in always-on memory
  memoryPercent: 10,          // memory summary caps at this % of the model's actual context
  playerName: ""             // if set, Codex will never write a card for this name
};

// -- context & field budgets --
const CONTEXT_SAFETY_MARGIN = 20; // leave a little headroom below the platform's stated limit
const MEMORY_CONTEXT_PERCENT = 0.10; // memory summary caps at this share of the model's actual context, not a flat number
const MEMORY_CONTEXT_FALLBACK_LENGTH = 700; // used only if info.maxChars isn't available to compute a percentage from
const MAX_CARD_ENTRY_LENGTH = 1800;     // guards against an overlong AI-generated card entry

// -- how much history/state each character keeps --
const FEELING_HISTORY_LIMIT = 3;   // how many recent feelings to remember per character
const RELATION_HISTORY_LIMIT = 2;   // how many recent feelings to remember per relationship
const MAX_RELATIONS_PER_CHARACTER = 6; // caps how many other characters' feelings each mind tracks
const CORE_MEMORY_MAX_ENTRIES = 8;  // caps how many characters' core truths ride in always-on memory
const MENTION_TRACKING_CAP = 150; // caps how many never-carded names stay tracked at once

// -- core-truth shift mechanics --
const TENSION_THRESHOLD = 3;      // consecutive different feelings before a core-shift feels earned
const DRASTIC_TENSION_MULTIPLIER = 2; // tension can climb this many × the normal threshold when unresolved
const REVEALS_BEFORE_SHIFT_ELIGIBLE = 2; // reveals needed (founding one + at least one more) before an ordinary shift can happen — earned through normal play, no command required

// -- identity markers used to find/parse the script's own Story Cards --
const CORE_MEMORY_MARKER = "[UNSAID — core truths]";
const MIND_NOTES_MARKER = "💭 Inner Life — private, not visible to other characters";
const CAST_LIST_MARKER = "===";
const CODEX_MAX_ATTEMPTS = 5; // give up on a name after this many failed tries (fallback if config value is somehow missing)
const CODEX_MAX_CANDIDATES_PER_TURN = 3; // how many profiles to request in a single instruction

// words that should never START a candidate name — pronouns,
// conjunctions, common sentence-openers, and the like. Checked against
// only the first word, but a match rejects the whole candidate, multi-
// word or not (unlike CODEX_TITLE_WORDS below, which only rules out a
// title standing completely alone).
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
  "Nevertheless", "Nonetheless", "Otherwise", "Therefore", "Thus",
  // compass directions, days, and months — confirmed via Auto-Cards'
  // own default ban list that these are a real, recurring false
  // positive: capitalized constantly in narrative text, never a
  // sensible subject for a card on their own
  "North", "South", "East", "West", "Northeast", "Northwest",
  "Southeast", "Southwest",
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
  "Saturday",
  "January", "February", "March", "April", "June", "July", "August",
  "September", "October", "November", "December"
  // "May" deliberately excluded — too common as the modal verb, and
  // already unlikely to accumulate real mentions as the month alone
]);

const CODEX_LOCATION_HINTS = /\b(city|state|street|avenue|canyon|terminal|park|building|tower|island|country|nation|kingdom|realm|district|region|planet|world|base|facility|academy|university|bridge|river|mountain|forest|desert|battleground|warzone|hall|tavern|inn|castle|fortress|temple|level|sector|wing|chamber|vault|bay|deck|outpost|colony|settlement|village|town|hamlet|station|harbor|wharf)\b/i;
// a few location-suggestive words commonly fuse into one compound word in
// fantasy/sci-fi naming ("Megatower," not "Mega Tower") — checked as a
// plain substring, without a word boundary on both sides, since that
// fusion means the word itself never gets its own boundary to match
const CODEX_LOCATION_SUFFIX_HINTS = /(tower|keep|hold|spire|haven|hollow|reach|scraper)/i;

const CODEX_FACTION_HINTS = /\b(order|guild|alliance|empire|faction|clan|brotherhood|council|syndicate|coalition|army|legion|cult|society|corporation|company|initiative|division|agency|federation|dynasty|tribe|vanguard|battalion|regiment|squad|cabal|circle|sect|resistance|movement|militia|garrison)\b/i;

const CODEX_ITEM_HINTS = /\b(sword|blade|gun|rifle|pistol|staff|wand|amulet|ring|armou?r|shield|artifact|device|weapon|tool|key|book|tome|potion|elixir|gem|crystal|relic|suit|mask|cloak|helmet|gauntlet|hammer|axe|bow|orb|blaster|scroll|spear|dagger|lance|trident|chalice|sigil|banner)\b/i;

// titles are a different problem than stopwords: "Emperor" on its own
// isn't a specific enough subject for a card, but "Emperor Kyle Walker"
// (title + an actual name) is completely legitimate — so unlike
// CODEX_STOPWORDS, this only rules out the word appearing completely
// alone, never a multi-word phrase it happens to lead
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

// common abbreviations whose period isn't a real sentence end, and
// which can also prefix a name as a title ("Dr. Moreau"). Used in two
// places: splitThoughtSentences below (avoiding a false sentence-split
// on the period) and trackMentions (bridging the abbreviation into the
// name it precedes instead of tracking them as two disconnected
// candidates). Confirmed both are real, reproducible failure modes,
// not hypothetical — directly relevant here given "Dr. Moreau" is a
// major, frequently-mentioned character in this story.
const SENTENCE_ABBREVIATIONS = new Set([
  "Dr", "Mr", "Mrs", "Ms", "Prof", "St", "Jr", "Sr", "Capt", "Gen",
  "Col", "Lt", "Sgt", "Rev", "Hon", "Fr", "Rep", "Sen", "Gov", "Adm",
  "Cmdr", "Maj", "Mt", "vs", "etc"
]);
// pre-built once rather than reconstructed on every trackMentions call
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

// AI Dungeon's own docs are explicit: on cache-efficient models, the
// Context hook still RUNS, but its result is never applied to what
// the AI actually sees — meaning every instruction this script injects
// (thought reveals, Codex card requests) can be silently discarded
// with no error, no matter how correct the logic driving it is. This
// makes that failure mode loud and checkable instead of invisible.
function checkCacheEfficientWarning() {
  const title = "UNSAID — Important, Read This ⚠️";
  const card = storyCards.find(c => c.title === title);
  const isCacheEfficient = typeof info !== "undefined" && info && !!info.useCacheEfficient;

  if (!isCacheEfficient) {
    // condition cleared, most likely from switching models — update
    // a card left over from before rather than leave a stale warning
    // that no longer reflects what's actually happening
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
    // card exists but was left in the "resolved" state from earlier —
    // the condition is back, so restore the real warning text
    card.entry = warningText;
    card.description = warningText;
  }
  return true;
}

function initUnsaid() {
  if (!state.unsaid) {
    state.unsaid = {
      // keyed by character name — see createMind() below for the full,
      // current shape of each entry rather than duplicating it here
      // where it's guaranteed to drift out of date again
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
  // confirmed against the platform's actual sandbox source: addStoryCard
  // always pushes a new card and returns storyCards.length (the array's
  // new length), not the new card's index, and never returns false for
  // a duplicate key. The index is therefore length - 1. Every call site
  // of this function already checks for an existing card first, so this
  // was never visibly broken — the .find() fallback below happened to
  // paper over it — but it's worth being correct about what the
  // platform actually does rather than relying on that coincidence.
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

  const memPercentMatch = card.entry.match(/Memory summary size \(% of context\):\s*(\d+)/i);
  if (memPercentMatch) {
    const parsedMemPercent = parseInt(memPercentMatch[1], 10);
    if (!isNaN(parsedMemPercent)) cfg.memoryPercent = Math.min(50, Math.max(1, parsedMemPercent));
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

  // a character card that already exists — hand-made, from another
  // scenario, or from before this script was installed — should work
  // with UNSAID immediately, not sit invisible until someone manually
  // types the name into this list. Anything not already listed gets
  // adopted in, once, and the addition is written back so it's visible.
  const knownLower = cfg.cast.map(n => n.toLowerCase());
  let adopted = false;
  let adoptedThisPass = 0;
  storyCards.forEach(c => {
    if (adoptedThisPass >= 20) return; // defensive cap — an unusually large pre-existing card library shouldn't flood the cast in one pass
    if (c.type !== "character" || !c.title) return;
    if (c.title === "UNSAID Config") return;
    if (knownLower.includes(c.title.toLowerCase())) return;
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

// the config and log cards are for the player, not the AI — if the
// platform ever pulls their text into context (e.g. if pinned), strip
// it back out so it doesn't eat into the story's budget
function stripConfigNoise(text) {
  let cleaned = text;
  storyCards
    .filter(c => c.type === "Class" && c.title && c.title.indexOf("UNSAID") === 0)
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
  // bridges a single lowercase "of" across two capitalized words
  // ("Sword of Power") so it's captured as one candidate rather than
  // splitting into fragments — confirmed from real play: without this,
  // "Sword" alone got tracked as its own competing candidate, and being
  // mentioned constantly, it won selection over and over while never
  // being a complete enough name for the AI to write a real profile —
  // burning through the entire retry budget on a fragment that was
  // never going to succeed, while the real multi-word name never got
  // a turn at all. Deliberately narrow to just "of," not "the"/"and"
  // too — those turned out to cause a different real failure: a
  // sentence-initial capitalized word directly followed by "the"
  // ("Then the Sword of Power...") would greedily bridge into "Then
  // the Sword," burning both extension slots on the wrong bridge and
  // leaving "of Power" completely unmatched. Confirmed by testing that
  // exact sentence directly. "of" alone doesn't share this risk near
  // as often, since it rarely trails a bare sentence-initial word.
  // also bridges a title abbreviation with its period ("Dr.") into the
  // name it precedes — confirmed via direct testing: without this,
  // "Dr. Moreau" tracked as two entirely separate, disconnected
  // candidates ("Dr" and "Moreau"), each competing on its own rather
  // than as the one name that actually matters.
  const matches = text.match(CODEX_TITLE_ABBREV_REGEX) || [];
  matches.forEach(raw => {
    let name = raw.trim();
    let words = name.split(" ");
    // a leading stopword doesn't just belong to the FIRST word of a
    // candidate — sentence-initial capitalization means an ordinary
    // article can end up glued onto a real multi-word name ("The Sword
    // of Power..."). Dropping the whole candidate for that would lose
    // a completely legitimate mention; stripping the stopword and
    // keeping the rest counts it toward the name that actually matters.
    while (words.length > 1 && CODEX_STOPWORDS.has(words[0])) {
      words = words.slice(1);
      name = words.join(" ");
    }
    if (words.length === 1 && CODEX_STOPWORDS.has(words[0])) return;
    // a bare title ("Emperor," "General") isn't specific enough to be
    // its own subject — but the same word leading a longer phrase
    // ("Emperor Kyle Walker") is a completely normal way to name
    // someone, so this only blocks the single-word case
    if (words.length === 1 && CODEX_TITLE_WORDS.has(name)) return;
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
  if (keys.length > MENTION_TRACKING_CAP + 50) { // don't bother until it's well over
    keys
      .sort((a, b) => counts[a] - counts[b])
      .slice(0, keys.length - MENTION_TRACKING_CAP)
      .forEach(k => delete counts[k]);
  }
  // attempts was never cleaned up alongside mentionCounts — a name
  // tried a few times and then never mentioned again (or crowded out
  // of the top tracked names by others) would sit here forever over a
  // very long story. Nothing left references an attempts entry once
  // its mention count is gone, so there's nothing to lose by dropping it.
  const attempts = state.unsaid.codex.attempts;
  Object.keys(attempts).forEach(name => {
    if (!(name in counts)) delete attempts[name];
  });
}

// layered heuristic: keyword hints first (most reliable), then
// contextual verb/preposition cues, defaulting to character last
// since most new proper nouns in a story are people
function classifyCodexEntry(name, text) {
  if (CODEX_LOCATION_HINTS.test(name)) return "location";
  if (CODEX_LOCATION_SUFFIX_HINTS.test(name)) return "location";
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
  // sources disagree on the exact field here — info.characters (array
  // of {name}) vs info.characterNames (array of plain strings) — so
  // both are checked rather than betting on one
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

// picks the MOST-mentioned name that's cleared the threshold, doesn't
// already have a Story Card (or a close match to one), and hasn't
// exhausted its retries. Deleting an existing card makes its name
// eligible again. Prioritizing by mention count (not just whichever
// name happens to be first in iteration order) matters: a stray
// false-positive that slips past the stopword list can otherwise sit
// at the front and burn through its retries before a genuinely
// significant, frequently-mentioned name ever gets a turn.
function findCodexCandidates(threshold, excludeNames, maxAttempts, maxCount) {
  const exclude = excludeNames || [];
  const cap = typeof maxAttempts === "number" ? maxAttempts : CODEX_MAX_ATTEMPTS;
  const limit = typeof maxCount === "number" ? maxCount : CODEX_MAX_CANDIDATES_PER_TURN;
  const counts = state.unsaid.codex.mentionCounts;
  const eligible = [];
  for (const name in counts) {
    if (counts[name] <= threshold) continue;
    // reuses the same word-subset match as duplicate-card detection —
    // an exact match alone would miss that "Emperor Kyle Walker" is
    // the same person as an excluded "Kyle Walker", letting the
    // player's own character keep winning the most-mentioned slot
    // under every title or honorific the story gives them
    if (exclude.some(ex => isSameCardEntity(ex, name))) continue;
    if (storyCards.some(c => isSameCardEntity(c.title, name))) continue;
    if ((state.unsaid.codex.attempts[name] || 0) >= cap) continue;
    eligible.push({ name, count: counts[name] });
  }
  eligible.sort((a, b) => b.count - a.count);

  // several eligible names can be fragments and full phrases of the
  // same thing at once ("Sword" and "Sword of Power" both crossing the
  // threshold from the same mentions) — picking both in one batch would
  // waste a slot on a near-duplicate, so each pick excludes any name
  // still in the running that's a word-subset match of one already
  // taken this batch, the same logic used against existing cards above
  const picked = [];
  for (const candidate of eligible) {
    if (picked.length >= limit) break;
    if (picked.some(p => isSameCardEntity(p.name, candidate.name))) continue;
    picked.push(candidate);
  }
  return picked.map(p => p.name);
}

// builds one instruction covering several candidates at once, each
// wrapped in its own numbered 【CARD】 block — confirmed nothing in the
// platform stops a script from creating more than one Story Card in a
// single turn, so there's no reason to process a backlog of eligible
// names one at a time when several can be requested together
function buildCodexInstruction(names, text) {
  const blocks = names.map((name, i) => {
    const type = classifyCodexEntry(name, text);
    const fields = CARD_TEMPLATES[type] || CHARACTER_CARD_FIELDS;
    const body = fields.map(f => `${f}: ${f === "Name" ? name : "..."}`).join("\n");
    const mind = type === "character" ? state.unsaid.minds[name] : null;
    const knownNote = mind && mind.core
      ? ` They've privately shown this about themselves: "${mind.core}" — let Personality and Background agree with it, not invent something that contradicts it.`
      : "";
    // the upfront classification is a heuristic guess, not a verified
    // fact — it can't know every real-world place name, and something
    // like "Manhattan" defaulting to a character template would ask
    // for a Race and Strength Level, fields that make no sense for a
    // city. Rather than force the wrong template, the model is told
    // outright it can swap to whichever template actually fits.
    const correctionNote = ` If "${name}" is actually a location, item, or faction rather than a character, use Location/Description/Key Locations/Historical Events/Significance, or Type/Description/Properties/Origin/Significance, or Type/Description/Significance instead of the fields below — whichever genuinely fits it.`;
    return `Profile ${i + 1} — "${name}":${knownNote}${correctionNote}\n【CARD】\n${body}\n【/CARD】`;
  }).join("\n\n");

  return `\n[Finish the story normally first — that's the priority. Then, on new lines after it, add ${names.length > 1 ? "these brief hidden profiles" : "a brief hidden profile"} wrapped between 【CARD】 and 【/CARD】, not part of the visible narrative:\n${blocks}\nKeep each field to a few words — this should take one or two lines total per profile, not paragraphs. Use whatever the story has actually shown; where it hasn't shown much yet, fill in your best reasonable answer instead of leaving a field blank or vague — draw on general knowledge for anything real-world (an actual place, a well-known title, a common item), and a sensible, in-fiction guess for anything invented that the story just hasn't detailed yet.]\n`;
}

function codexLogTitle(type) {
  const heading = type.charAt(0).toUpperCase() + type.slice(1) + "s";
  return `UNSAID Codex Log — ${heading}`;
}

// a direct window into what UNSAID actually thinks is going on right
// now, written on demand via "/unsaid status" — meant to answer,
// without any back-and-forth, questions like "is this even running,"
// "why hasn't anyone gotten a card yet," and "what does Codex think
// is worth carding." Pure internal state, no AI involvement needed.
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

  lines.push(`\nCast (${cfg.cast.length}): ${cfg.cast.join(", ") || "empty"}`);

  return lines.join("\n");
}

// one dedicated tracking card per type, so each stays short and easy
// to scan instead of one card holding everything
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
// Finds the card via the same word-subset match used elsewhere (not an
// exact title match) — confirmed a real, common case this was missing:
// a scenario's cards titled with full names ("Sera Walker") while the
// story, and therefore the AI's reveals, refer to them by a shorter
// form ("Sera"). An exact match silently found nothing to write to.
function syncMindToCard(name, allowCoreShift, useJson) {
  const mind = state.unsaid.minds[name];
  if (!mind) return;

  // exact-match alone missed a very real, common case: a scenario's
  // pre-made character cards titled with full names ("Sera Walker")
  // while the story — and therefore the AI's reveals — refers to them
  // by a shorter form ("Sera"). Reusing the same word-subset match
  // already relied on elsewhere (Codex dedup, player exclusion) fixes
  // that the same way, instead of silently finding nothing to write to.
  const card = storyCards.find(c => c.type === "character" && isSameCardEntity(c.title, name));
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

  // opt-in, off by default: plain prose stays the default deliberately
  // (established preference — meant to be skimmed at a glance, not
  // parsed), but the same underlying data can be written as JSON
  // instead for anyone who specifically wants a machine-readable form
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
    return;
  }

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
// merges a fragment back into the next one when splitting on [.!?]
// only looks like a sentence end because it terminates in a known
// abbreviation (SENTENCE_ABBREVIATIONS, defined above with the other
// constants) — without this, "Dr." gets treated as a full sentence
// boundary, confirmed as a real, reproducible failure: "She thinks of
// Dr. Smith and feels afraid..." fractures into "She thinks of Dr."
// as its own sentence, corrupting whatever comes after it (typically
// the want text extracted from a reveal).
function splitThoughtSentences(thought) {
  const rawSentences = thought.split(/(?<=[.!?])\s+/).filter(Boolean);
  // merge a fragment back into the next one when it only looks like a
  // sentence end because it terminates in a known abbreviation
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
  return `\n[Consider whether recent events have genuinely, permanently changed how ${chosen} sees themselves — not just a passing mood.${coreNote}${tensionNote} If yes, reveal it as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" (replace [one-word-emotion] with an actual word, not the literal placeholder) (2 italicized sentences). If nothing that significant has happened, don't force it — continue the story normally with no reveal at all.]\n`;
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
    instruction = `\n[${chosen}'s unspoken reaction to ${target} — 2 italicized sentences: how they really feel about ${target} right now, and what they secretly want from this moment. ${target} can't perceive it.${coreNote}${relationNote}${historyNote}${wantNote}${varietyNote} Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally. Format: "《${chosen}, [one-word-emotion], about ${target}: thought.》"]\n`;
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
        ? ` Their feelings have been unraveling for a long time now, unresolved — something this significant would happen regardless. If it's truly earned, you may format this instead as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" to replace their old anchor.`
        : ` Their feelings have been genuinely shifting for a while now, not settling back — if this moment plays into that and something has truly changed how they see themselves, you may format this instead as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" to replace their old anchor. Only do this if it's really earned.`)
      : "";
    instruction = `\n[${chosen}'s private thought — 2 italicized sentences: how they really feel right now, and what they secretly want. Consistent with "${mind.core}" and their feeling of ${mind.feeling} unless this scene shifts it.${historyNote}${wantNote}${varietyNote}${shiftNote} Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally. Format: "《${chosen}, [one-word-emotion]: thought.》" No one else perceives it.]\n`;
  } else {
    // this is the moment their very first private thought gets set — and
    // whatever comes out of it becomes their permanent core truth, so it
    // shouldn't read like a passing reaction to whatever's on screen
    instruction = `\n[This is ${chosen}'s very first private thought — once revealed, it becomes a lasting truth about who they fundamentally are, something real and significant enough to define them going forward, not a fleeting reaction to this moment. 2 italicized sentences: what this deep truth is, and what they secretly want because of it. Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally. Format: "《${chosen}, [one-word-emotion]: thought.》" No one else perceives it.]\n`;
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

// a flat character-count slice of the sliding context can badly
// under- or over-shoot "recently" depending on how long turns actually
// run — a single AI response can be several thousand characters in a
// detailed, slow-paced story, so a small fixed slice might only cover
// the tail end of the most recent turn and miss a character who was
// clearly active earlier in that same response. Scanning an actual
// number of recent turns from the real history array is more robust
// to that variance. Falls back to the flat slice when history isn't
// available (e.g. a test harness, or a hook that doesn't receive it).
// a flat character-count slice of the sliding context can badly
// under- or over-shoot "recently" depending on how long turns actually
// run — a single AI response can be several thousand characters in a
// detailed, slow-paced story, so a small fixed slice might only cover
// the tail end of the most recent turn and miss a character who was
// clearly active earlier in that same response. Sizing the slice by
// an estimated number of turns fixes that. Deliberately built on the
// text parameter alone, not the history array: testing found a real,
// concerning failure mode where history's per-entry text can be stale
// or empty in ways this script has no way to verify are always kept
// in sync with what's actually about to be sent to the AI — trusting
// that silently produced zero active characters, ever, with nothing
// to indicate why. The text parameter has no such uncertainty: it's
// confirmed to always be exactly what's happening right now.
const ESTIMATED_CHARS_PER_TURN = 900; // a rough, deliberately generous estimate — better to over-include than silently miss someone
function recentTurnsText(text, turnCount) {
  const n = typeof turnCount === "number" && turnCount > 0 ? turnCount : 3;
  const base = text.slice(-(n * ESTIMATED_CHARS_PER_TURN));
  // history is used here only as a supplement, never the primary or
  // sole source — testing already confirmed a real failure mode where
  // trusting it alone produced zero active characters when its text
  // field was stale or empty. Used this way, that risk can't recur:
  // if history is unreliable, this contributes nothing and the base
  // slice above is unaffected; if it's reliable, it catches one real
  // gap the estimate can still miss — a single turn genuinely longer
  // than the whole estimated window, which the flat slice wouldn't
  // fully cover even though it's the single most recent turn.
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
function syncCoreMemory(maxEntries, enabled, percent) {
  if (!state.memory || typeof state.memory !== "object") return;

  // off by default, and can be turned off after having been on — either
  // way, a block written during an earlier turn shouldn't just sit
  // there forever once this stops running. Explicitly clear it rather
  // than silently leave stale private data behind in Plot Essentials.
  if (!enabled) {
    const withoutBlock = (state.memory.context || "").split(CORE_MEMORY_MARKER)[0].replace(/\s+$/, "");
    if (withoutBlock !== (state.memory.context || "")) state.memory.context = withoutBlock;
    return;
  }

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
  // scales with the model's actual context size rather than a flat
  // number — a fixed cap makes no sense across the wide range of
  // context sizes different models/plans actually offer. Falls back
  // to a flat number only if info.maxChars genuinely isn't available.
  const memoryBudget = (typeof info !== "undefined" && info && typeof info.maxChars === "number")
    ? Math.max(200, Math.round(info.maxChars * ((typeof percent === "number" ? percent : MEMORY_CONTEXT_PERCENT * 100) / 100)))
    : MEMORY_CONTEXT_FALLBACK_LENGTH;
  // the Memory field has a real (if not precisely documented) size limit —
  // trim entries off the end rather than risk overflowing it silently
  while (block.length > memoryBudget && lines.length > 1) {
    lines.pop();
    block = `${header}\n${lines.join("\n")}`;
  }

  state.memory.context = lines.length > 0
    ? `${existing}\n\n${block}`.trim()
    : existing;
}
