// UNSAID — standalone AI Dungeon script library
// Private thoughts, inner-life persistence, Codex Story Cards, and entity detection only.

var NAME_ALPHANUM = "a-zA-Z0-9";

var COMMON_CAPITALIZED_STOPWORDS = [
  "I", "The", "A", "An", "You", "He", "She", "They", "It", "We", "But",
  "And", "So", "Then", "If", "When", "As", "At", "In", "On", "With",
  "This", "That", "There", "Here", "What", "Who", "Why", "How", "Yes",
  "No", "Okay", "Oh", "Well", "Suddenly", "Meanwhile", "Finally",
  "Perhaps", "Maybe", "However", "Still", "Yet", "Now", "Later",
  "Before", "After", "Once", "Just", "Even", "Also", "Instead",
  "Indeed", "Certainly", "Clearly", "Obviously", "Surely",
  "Sometimes", "Always", "Never", "Really", "Actually", "Honestly",
  "Wait", "Look", "Listen", "Right", "Alright", "Hey", "Hi", "Hello", "Huh", "Hmm", "Ah", "Heh",
  "Easy", "Careful", "Steady", "Quiet", "Patience", "Hush", "Stop",
  "Freeze", "Move", "Run", "Go", "Come", "Stay", "Help", "Please",
  "Sorry", "Thanks", "Fine", "Sure", "Great", "Good", "Bad", "Nice", "Bold",
  "Your", "My", "His", "Her", "Its", "Our", "Their", "These", "Those",
  "Some", "Any", "All", "Each", "Every", "Nothing", "Something", "Anything", "Someone", "Everyone",
  "Which", "People", "Outside", "Got", "Like", "Yeah", "To", "Very",
  "Inside", "Others", "Sounds", "Absolutely", "Especially", "Downstairs",
  "Bodies", "Honesty", "Accepted",
  // Ordinary descriptive adjectives with essentially zero plausibility as
  // an actual character/place name on their own (unlike "Red" or
  // "Ancient," left alone elsewhere for having real nickname/epithet
  // plausibility) — confirmed a real, reachable instance of exactly the
  // "words becoming cards" failure class via a full sandbox scenario
  // replay: a dialogue line opening with "Old instincts keep
  // resurfacing..." made "Old" the sentence's only capitalized word,
  // which then became `lastEntity` and silently attached itself to a
  // *later*, unrelated sentence and become a false entity candidate.
  "Old", "New", "Young", "Small", "Large", "Long", "Short", "Certain",
  "Sure", "True", "Real", "Whole", "Empty", "Full", "Simple",
  // Found via a fresh round of stopword-hunting across sentence-initial
  // dialogue openers, narration/scene-setting adverbs, and interjections
  // — the same systematic approach that found "Old" last round, applied
  // more broadly this time. A few of these (Apparently, Eventually,
  // Recently) are common sentence openers rather than durable names; keeping
  // them out of Codex prevents false Story Card candidates and wasted retries.
  "Frankly", "Naturally", "Apparently", "Supposedly", "Technically",
  "Ultimately", "Eventually", "Regardless", "Nearby", "Ahead", "Overhead",
  "Underneath", "Nope", "Yep", "Ugh", "Wow", "Oof", "Argh", "Phew",
  "Terrific", "Excellent", "Understood", "Agreed", "Precisely", "Exactly",
  "Presumably", "Curiously", "Strangely", "Interestingly", "Unfortunately",
  "Fortunately", "Surprisingly", "Predictably", "Understandably",
  "Admittedly", "Reportedly", "Allegedly", "According",
  "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "One", "Turn", "Chapter", "Part", "Scene", "Day", "Night", "Morning",
  "Evening", "Afternoon", "Time", "Silence", "Darkness", "Light",
  "Fate", "Death", "Life", "Space", "Everything", "Damn", "Greetings", "Traffic",

  "Rain", "Snow", "Fog", "Mist", "Frost", "Thunder", "Lightning", "Wind",
  "Storm", "Dawn", "Dusk", "Twilight", "Midnight", "Noon", "Sunrise", "Sunset",
  "Not", "Nor", "Only", "Too", "Off", "Out", "Up", "Down", "Away", "Of", "From",
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
  "September", "October", "November", "December",

  // Contractions now get captured as one token by the apostrophe-aware name
  // regex (needed for real names like O'Brien) — without these, common
  // dialogue contractions get tracked as if they were name candidates.
  "Don't", "Won't", "Can't", "Isn't", "Wasn't", "Wouldn't", "Couldn't",
  "Shouldn't", "Didn't", "Doesn't", "Aren't", "Weren't", "Hasn't",
  "Haven't", "Hadn't", "I'm", "I'll", "I've", "I'd", "You're", "You'll",
  "You've", "You'd", "He's", "He'll", "He'd", "She's", "She'll", "She'd",
  "It's", "It'll", "That's", "That'll", "There's", "There'll", "Here's",
  "What's", "What'll", "Let's", "We're", "We'll", "We've", "We'd",
  "They're", "They'll", "They've", "They'd", "Who's", "Who'll",

  // A dialogue line's first word (or an inverted dialogue tag's opening
  // verb) gets capitalized by ordinary sentence rules regardless of what
  // the word is, and prose is full of narration/attribution verbs that
  // show up this way constantly — a real transcript surfaced "Talking",
  // "Seen", "Forget", "Call", "Fitting" this way in a single short
  // exchange, and this project's own sandbox testing surfaced "Muttered,"
  // "Whispered," "Sighed," and "Frowning" doing the same thing to entity
  // detection. None of these are enumerable in advance the way a
  // closed word class is — this covers the common recurring ones rather
  // than only the specific ones observed, since the underlying pattern is
  // general, not particular to any one story.
  "Talking", "Seen", "Forget", "Forgot", "Forgotten", "Call", "Called",
  "Calling", "Fitting", "Asked", "Asking", "Told", "Telling", "Replied",
  "Replying", "Answered", "Answering", "Muttered", "Muttering",
  "Whispered", "Whispering", "Shouted", "Shouting", "Cried", "Crying",
  "Gasped", "Gasping", "Sighed", "Sighing", "Laughed", "Laughing",
  "Smiled", "Smiling", "Nodded", "Nodding", "Shook", "Shaking",
  "Frowned", "Frowning", "Grinned", "Grinning", "Blinked", "Blinking",
  "Paused", "Pausing", "Continued", "Continuing", "Added", "Adding",
  "Admitted", "Admitting", "Explained", "Explaining", "Insisted",
  "Insisting", "Murmured", "Murmuring", "Snapped", "Snapping",
  "Growled", "Growling", "Breathed", "Breathing", "Watched", "Watching",
  "Stared", "Staring", "Glanced", "Glancing", "Shrugged", "Shrugging",

  // Prompt/template labels and ordinary sentence-openers that should never
  // become autonomous Story Card candidates.
  "AI", "Instruction", "Instructions", "World", "Lore", "Recent", "Story",
  "Stories", "Character", "Characters", "Card", "Cards", "Codex", "Unsaid",
  "Hint", "Profile", "Profiles", "Rule", "Rules", "Field", "Fields",
  "Name", "Race", "Strength", "Level", "Background", "Personality",
  "Appearance", "Ability", "Abilities", "Weakness", "Weaknesses",
  "Relationship", "Relationships", "Type", "Description", "Significance",
  "Properties", "Origin", "Location", "Locations", "Historical", "Events",
  "Action", "Actions", "Input", "Output", "Context", "System", "Assistant",
  "User", "Player", "Dungeon", "Master", "Template", "Task", "Mandatory",
  "Visible", "Hidden", "Text", "Note", "Notes",

  // Present-tense narration/dialogue words and scene-setting adverbs. The
  // past/gerund forms were already covered above.
  "Say", "Says", "Ask", "Asks", "Reply", "Replies", "Answer", "Answers",
  "Look", "Looks", "Step", "Steps", "Walk", "Walks", "Reach", "Reaches",
  "Turn", "Turns", "Follow", "Follows", "Stare", "Stares", "Glance", "Glances",
  "Smile", "Smiles", "Nod", "Nods", "Frown", "Frowns", "Shrug", "Shrugs",
  "Whisper", "Whispers", "Murmur", "Murmurs", "Shout", "Shouts", "Laugh",
  "Laughs", "Sigh", "Sighs", "Pause", "Pauses", "Continue", "Continues",
  "Slowly", "Quickly", "Softly", "Quietly", "Gently", "Carefully",
  "Immediately", "Abruptly", "Briefly", "Slightly", "Barely", "Nearly",
  "Simply", "Moment", "Voice", "Eyes", "Hand", "Hands", "Face", "Head",

  // More high-frequency sentence openers, temporal words, stage directions,
  // and generic actions. These are useful prose but terrible autonomous
  // entity candidates, especially at the beginning of generated sentences.
  "Suddenly", "Finally", "Meanwhile", "Later", "Earlier", "Soon", "Still",
  "Even", "Perhaps", "Maybe", "Actually", "Instead", "Together", "Apart",
  "Nearby", "Ahead", "Behind", "Inside", "Outside", "Upstairs", "Downstairs",
  "Today", "Tonight", "Tomorrow", "Yesterday", "Morning", "Afternoon",
  "Evening", "Night", "Day", "Dawn", "Dusk", "Midnight", "Noon",
  "Yes", "No", "Okay", "Alright", "Fine", "Sure", "Well", "Right",
  "Someone", "Somebody", "Something", "Anyone", "Anybody", "Anything",
  "Everyone", "Everybody", "Everything", "Nobody", "Nothing",
  "Grab", "Grabs", "Grabbed", "Take", "Takes", "Took", "Taking",
  "Place", "Places", "Placed", "Move", "Moves", "Moved", "Moving",
  "Run", "Runs", "Ran", "Running", "Raise", "Raises", "Raised", "Raising",
  "Lower", "Lowers", "Lowered", "Open", "Opens", "Opened", "Opening",
  "Close", "Closes", "Closed", "Closing", "Hold", "Holds", "Held",
  "Keep", "Keeps", "Kept", "Feel", "Feels", "Felt", "Feeling",
  "Seem", "Seems", "Seemed", "Appear", "Appears", "Appeared",
  "Remain", "Remains", "Remained", "Begin", "Begins", "Began",
  "Start", "Starts", "Started", "Stop", "Stops", "Stopped",
  "Leave", "Leaves", "Left", "Return", "Returns", "Returned",
  "Enter", "Enters", "Entered", "Arrive", "Arrives", "Arrived",
  "Come", "Comes", "Came", "Go", "Goes", "Went", "Sit", "Sits", "Sat",
  "Stand", "Stands", "Stood", "Lean", "Leans", "Leaned",
  "Pull", "Pulls", "Pulled", "Push", "Pushes", "Pushed",
  "Swallow", "Swallows", "Swallowed", "Tilt", "Tilts", "Tilted",
  "Shift", "Shifts", "Shifted", "Wince", "Winces", "Winced",
  "Flinch", "Flinches", "Flinched", "Exhale", "Exhales", "Exhaled",
  "Inhale", "Inhales", "Inhaled",
  "Narrator", "Narration", "Response", "Continue", "Continuation", "Dialogue",
  "Conversation", "Setting", "Summary", "Memory", "Plot", "Essentials",
  "Author", "Authors", "Scenario", "Adventure", "Quest", "Chapter", "Section",
  "Current", "Previous", "Following", "Opening", "Ending", "Example", "Examples",
  "Important", "Note", "Reminder", "Format", "Formatting", "Marker", "Markers",
  "Required", "Optional", "Default", "Defaults", "Config", "Configuration",
  "Enabled", "Disabled", "True", "False", "None", "Unknown", "TBD",
  "Said", "Spoke", "Speaking", "Tell", "Tells", "Think", "Thinks", "Thought",
  "Wonder", "Wonders", "Notice", "Notices", "Hear", "Hears", "Saw", "Seeing",
  "Watch", "Watches", "Approach", "Approaches", "Approached", "Cross",
  "Crosses", "Crossed", "Pass", "Passes", "Passed", "Waits", "Waited",
  "Sudden", "Soft", "Low", "High", "Deep", "Faint", "Brief", "Slow", "Fast" ,

  // Additional script/config scaffolding words filtered in v1.2.
  "Prompt", "History", "Key", "Faction", "Category", "Categories", "Catalog", "Mature", "Adult", "Adults", "Private", "Core", "Truth", "Evidence", "Entity", "Entities", "Theme", "Themes", "Model", "Models", "Script", "Scripts", "Hook", "Hooks", "Cache", "Optimized", "Status", "Command", "Commands", "Enable", "Allow", "Minimum", "Maximum", "Chance", "Cooldown", "Reset", "Detected", "Tracking", "Tracked", "Eligible", "Pending", "Retry", "Retries", "Attempts", "TurnCount", "Version", "Warning", "Backup", "Delivery", "FrontMemory", "StoryCard", "StoryCards", "Established", "Facts",
  "Genre", "Genres", "Tone", "Tones", "Era", "Eras", "Adapt", "Adaptive", "Adaptation",
  "Override", "Overrides", "Grounded", "Speculative", "Intimate", "Local", "Scale", "Scales",
  "Canon", "Canonical", "Instructional", "Diagnostic", "Diagnostics", "Automatic", "Automatically"
];





var FRONT_MEMORY_MARKER = "[UNSAID hint]";

function setManagedFrontMemorySegment(marker, body) {
  if (typeof state === "undefined") return;
  if (!state.memory || typeof state.memory !== "object") state.memory = {};

  const current = typeof state.memory.frontMemory === "string"
    ? state.memory.frontMemory
    : "";
  const kept = current
    .split("\n")
    .filter(line => line.trim().indexOf(marker) !== 0)
    .join("\n")
    .replace(/^\n+|\n+$/g, "");

  const compactBody = body == null ? "" : String(body).replace(/\s+/g, " ").trim();
  const segment = compactBody ? `${marker} ${compactBody}` : "";
  state.memory.frontMemory = kept && segment
    ? `${kept}\n\n${segment}`
    : (kept || segment);
}

var UNSAID_ALWAYS_MATCH_KEYS = "the, a, and, you, said, was";

var UNSAID_DEFAULTS = {
  enabled: true,
  codexEnabled: true,
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
  codexMaxAttempts: 8,
  // Automatic character cards wait for actual story evidence instead of
  // canonizing guesses immediately after a name appears.
  codexCharacterMinTurns: 3,
  codexCharacterMinAppearances: 2,
  codexCharacterDeadline: 5,
  playerName: ""
};

var CONTEXT_SAFETY_MARGIN = 20;
var MAX_CARD_ENTRY_LENGTH = 1800;
// Generous enough that no normal game ever notices it, low enough to
// bound the per-turn cost of scanning the cast list for who's currently
// "active" — see readUnsaidConfig for the full reasoning.
var MAX_CAST_SIZE = 60;

var FEELING_HISTORY_LIMIT = 3;
var RELATION_HISTORY_LIMIT = 2;
var MAX_RELATIONS_PER_CHARACTER = 6;
var MENTION_TRACKING_CAP = 150;

var TENSION_THRESHOLD = 3;
var DRASTIC_TENSION_MULTIPLIER = 2;
var REVEALS_BEFORE_SHIFT_ELIGIBLE = 2;

var MIND_NOTES_MARKER = "💭 Inner Life — private, not visible to other characters";
var CAST_LIST_MARKER = "===";
var CODEX_MAX_ATTEMPTS = 5;
var CODEX_MAX_CANDIDATES_PER_TURN = 3;
// Once a name is confidently identified as a character, failed card
// generations retry on the next real story turn instead of waiting for the
// global Codex cooldown. This is what lets a newly introduced character
// actually finish inside the configured deadline rather than merely getting
// its first attempt near that deadline.
var CODEX_CHARACTER_RETRY_INTERVAL = 1;
var CODEX_EVIDENCE_PER_NAME = 6;
var CODEX_EVIDENCE_SNIPPET_LENGTH = 260;

// Built from the shared capitalized-word stopword base plus Codex-specific extras.
// Large Codex-only lexical filter. Card generation benefits from aggressive
// precision because ordinary sentence-openers should not become Story Cards.
var CODEX_EXTRA_STOPWORDS = [
  "aboard", "about", "above", "across", "after", "against", "along", "alongside", "although", "amid", "amidst", "among",
  "amongst", "around", "as", "at", "because", "before", "behind", "below", "beneath", "beside", "besides", "between",
  "beyond", "both", "but", "by", "concerning", "considering", "despite", "down", "during", "either", "except", "excluding",
  "following", "for", "from", "given", "if", "in", "including", "inside", "into", "like", "near", "neither",
  "nor", "of", "off", "on", "onto", "opposite", "or", "outside", "over", "past", "regarding", "round",
  "since", "than", "though", "through", "throughout", "till", "to", "toward", "towards", "under", "underneath", "unlike",
  "until", "unto", "up", "upon", "versus", "via", "when", "whenever", "where", "whereas", "wherever", "whether",
  "while", "whilst", "with", "within", "without", "yet", "all", "another", "any", "anybody", "anyone", "anything",
  "each", "enough", "everybody", "everyone", "everything", "few", "fewer", "he", "her", "hers", "herself", "him",
  "himself", "his", "I", "it", "its", "itself", "many", "me", "mine", "more", "most", "much",
  "my", "myself", "no", "nobody", "none", "noone", "nothing", "one", "other", "others", "our", "ours",
  "ourselves", "several", "she", "some", "somebody", "someone", "something", "such", "that", "their", "theirs", "them",
  "themselves", "these", "they", "this", "those", "us", "we", "what", "whatever", "which", "whichever", "who",
  "whoever", "whom", "whomever", "whose", "you", "your", "yours", "yourself", "yourselves", "am", "are", "aren't",
  "be", "became", "become", "becomes", "becoming", "been", "being", "can", "cannot", "can't", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "done", "don't", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "is", "isn't", "might", "must", "mustn't", "need", "needs", "needed", "needing",
  "ought", "shall", "should", "shouldn't", "was", "wasn't", "were", "weren't", "won't", "would", "wouldn't", "zero",
  "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen",
  "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty", "sixty", "seventy",
  "eighty", "ninety", "hundred", "thousand", "million", "billion", "first", "second", "third", "fourth", "fifth", "sixth",
  "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth",
  "nineteenth", "twentieth", "next", "previous", "last", "former", "latter", "single", "double", "triple", "numerous", "countless",
  "multiple", "half", "quarter", "whole", "total", "entire", "partial", "absolutely", "accordingly", "additionally", "admittedly", "afterwards",
  "again", "almost", "already", "also", "altogether", "apparently", "approximately", "arguably", "aside", "away", "basically", "certainly",
  "consequently", "conversely", "currently", "definitely", "directly", "else", "elsewhere", "especially", "essentially", "eventually", "evidently", "exactly",
  "finally", "frankly", "frequently", "generally", "genuinely", "gradually", "hence", "honestly", "hopefully", "however", "immediately", "increasingly",
  "indeed", "initially", "instead", "interestingly", "largely", "literally", "meanwhile", "merely", "mostly", "naturally", "nearly", "nevertheless",
  "nonetheless", "normally", "notably", "obviously", "occasionally", "oddly", "often", "otherwise", "overall", "particularly", "perhaps", "possibly",
  "practically", "presumably", "probably", "promptly", "quite", "rarely", "rather", "really", "recently", "regardless", "relatively", "reportedly",
  "roughly", "seriously", "simply", "slightly", "slowly", "somehow", "sometimes", "soon", "specifically", "still", "strangely", "suddenly",
  "supposedly", "surely", "technically", "then", "therefore", "thereby", "thus", "together", "too", "typically", "ultimately", "unfortunately",
  "usually", "very", "virtually", "well", "wholly", "widely", "accept", "accepts", "accepted", "accepting", "acknowledge", "acknowledges",
  "acknowledged", "acknowledging", "add", "adds", "added", "adding", "admit", "admits", "admitted", "admitting", "agree", "agrees",
  "agreed", "agreeing", "announce", "announces", "announced", "announcing", "answer", "answers", "answered", "answering", "argue", "argues",
  "argued", "arguing", "ask", "asks", "asked", "asking", "bark", "barks", "barked", "barking", "beg", "begs",
  "begged", "begging", "blurt", "blurts", "blurted", "blurting", "breathe", "breathes", "breathed", "breathing", "call", "calls",
  "called", "calling", "chuckle", "chuckles", "chuckled", "chuckling", "confess", "confesses", "confessed", "confessing", "continue", "continues",
  "continued", "continuing", "cry", "cries", "cried", "crying", "declare", "declares", "declared", "declaring", "demand", "demands",
  "demanded", "demanding", "exclaim", "exclaims", "exclaimed", "exclaiming", "explain", "explains", "explained", "explaining", "gasp", "gasps",
  "gasped", "gasping", "giggle", "giggles", "giggled", "giggling", "grin", "grins", "grinned", "grinning", "growl", "growls",
  "growled", "growling", "hiss", "hisses", "hissed", "hissing", "insist", "insists", "insisted", "insisting", "laugh", "laughs",
  "laughed", "laughing", "mention", "mentions", "mentioned", "mentioning", "mumble", "mumbles", "mumbled", "mumbling", "murmur", "murmurs",
  "murmured", "murmuring", "mutter", "mutters", "muttered", "muttering", "nod", "nods", "nodded", "nodding", "note", "notes",
  "noted", "noting", "observe", "observes", "observed", "observing", "point", "points", "pointed", "pointing", "protest", "protests",
  "protested", "protesting", "question", "questions", "questioned", "questioning", "remark", "remarks", "remarked", "remarking", "repeat", "repeats",
  "repeated", "repeating", "reply", "replies", "replied", "replying", "respond", "responds", "responded", "responding", "say", "says",
  "said", "saying", "shout", "shouts", "shouted", "shouting", "sigh", "sighs", "sighed", "sighing", "smile", "smiles",
  "smiled", "smiling", "snap", "snaps", "snapped", "snapping", "speak", "speaks", "spoke", "spoken", "speaking", "stammer",
  "stammers", "stammered", "stammering", "state", "states", "stated", "stating", "tell", "tells", "told", "telling", "whisper",
  "whispers", "whispered", "whispering", "yell", "yells", "yelled", "yelling", "approach", "approaches", "approached", "approaching", "arrive",
  "arrives", "arrived", "arriving", "back", "backs", "backed", "backing", "begin", "begins", "began", "begun", "beginning",
  "bend", "bends", "bent", "bending", "blink", "blinks", "blinked", "blinking", "bow", "bows", "bowed", "bowing",
  "break", "breaks", "broke", "broken", "breaking", "bring", "brings", "brought", "bringing", "brush", "brushes", "brushed",
  "brushing", "carry", "carries", "carried", "carrying", "catch", "catches", "caught", "catching", "circle", "circles", "circled",
  "circling", "climb", "climbs", "climbed", "climbing", "close", "closes", "closed", "closing", "come", "comes", "came",
  "coming", "crouch", "crouches", "crouched", "crouching", "cross", "crosses", "crossed", "crossing", "descend", "descends", "descended",
  "descending", "draw", "draws", "drew", "drawn", "drawing", "drop", "drops", "dropped", "dropping", "enter", "enters",
  "entered", "entering", "escape", "escapes", "escaped", "escaping", "exhale", "exhales", "exhaled", "exhaling", "fall", "falls",
  "fell", "fallen", "falling", "flinch", "flinches", "flinched", "flinching", "follow", "follows", "followed", "freeze", "freezes",
  "froze", "frozen", "freezing", "gesture", "gestures", "gestured", "gesturing", "grab", "grabs", "grabbed", "grabbing", "halt",
  "halts", "halted", "halting", "head", "heads", "headed", "heading", "hold", "holds", "held", "holding", "inhale",
  "inhales", "inhaled", "inhaling", "jump", "jumps", "jumped", "jumping", "keep", "keeps", "kept", "keeping", "kneel",
  "kneels", "knelt", "kneeling", "lean", "leans", "leaned", "leaning", "leave", "leaves", "left", "leaving", "lift",
  "lifts", "lifted", "lifting", "look", "looks", "looked", "looking", "lower", "lowers", "lowered", "lowering", "move",
  "moves", "moved", "moving", "open", "opens", "opened", "opening", "pace", "paces", "paced", "pacing", "pass",
  "passes", "passed", "passing", "pause", "pauses", "paused", "pausing", "peer", "peers", "peered", "peering", "pick",
  "picks", "picked", "picking", "pivot", "pivots", "pivoted", "pivoting", "place", "places", "placed", "placing", "pull",
  "pulls", "pulled", "pulling", "push", "pushes", "pushed", "pushing", "raise", "raises", "raised", "raising", "reach",
  "reaches", "reached", "reaching", "recoil", "recoils", "recoiled", "recoiling", "remain", "remains", "remained", "remaining", "return",
  "returns", "returned", "returning", "rise", "rises", "risen", "rising", "run", "runs", "ran", "running", "settle",
  "settles", "settled", "settling", "shake", "shakes", "shook", "shaken", "shaking", "shift", "shifts", "shifted", "shifting",
  "sit", "sits", "sat", "sitting", "spin", "spins", "spun", "spinning", "stand", "stands", "stood", "standing",
  "start", "starts", "started", "starting", "step", "steps", "stepped", "stepping", "stop", "stops", "stopped", "stopping",
  "stumble", "stumbles", "stumbled", "stumbling", "swallow", "swallows", "swallowed", "swallowing", "take", "takes", "took", "taken",
  "taking", "tilt", "tilts", "tilted", "tilting", "tremble", "trembles", "trembled", "trembling", "turn", "turns", "turned",
  "turning", "walk", "walks", "walked", "walking", "watch", "watches", "watched", "watching", "wave", "waves", "waved",
  "waving", "wince", "winces", "winced", "wincing", "believe", "believes", "believed", "believing", "care", "cares", "cared",
  "caring", "consider", "considers", "considered", "decide", "decides", "decided", "deciding", "expect", "expects", "expected", "expecting",
  "fear", "fears", "feared", "fearing", "feel", "feels", "felt", "feeling", "forget", "forgets", "forgot", "forgotten",
  "forgetting", "guess", "guesses", "guessed", "guessing", "hate", "hates", "hated", "hating", "hear", "hears", "heard",
  "hearing", "hopes", "hoped", "hoping", "imagine", "imagines", "imagined", "imagining", "know", "knows", "knew", "known",
  "knowing", "likes", "liked", "liking", "love", "loves", "loved", "loving", "mean", "means", "meant", "meaning",
  "mind", "minds", "minded", "minding", "notice", "notices", "noticed", "noticing", "prefer", "prefers", "preferred", "preferring",
  "realize", "realizes", "realized", "realizing", "recall", "recalls", "recalled", "recalling", "recognize", "recognizes", "recognized", "recognizing",
  "remember", "remembers", "remembered", "remembering", "sense", "senses", "sensed", "sensing", "suppose", "supposes", "supposed", "supposing",
  "think", "thinks", "thought", "thinking", "understand", "understands", "understood", "understanding", "want", "wants", "wanted", "wanting",
  "wonder", "wonders", "wondered", "wondering", "wish", "wishes", "wished", "wishing", "air", "area", "body", "bodies",
  "bottom", "ceiling", "center", "centre", "corner", "corridor", "darkness", "distance", "door", "doorway", "edge", "end",
  "entrance", "exit", "face", "faces", "floor", "front", "ground", "hall", "hallway", "hand", "hands", "home",
  "interior", "light", "middle", "moment", "moments", "room", "rooms", "side", "silence", "space", "stairs", "staircase",
  "street", "surface", "table", "tables", "top", "wall", "walls", "window", "windows", "voice", "voices", "eye",
  "eyes", "gaze", "expression", "expressions", "breath", "breaths", "shoulder", "shoulders", "arm", "arms", "finger", "fingers",
  "foot", "feet", "footsteps", "hair", "lips", "mouth", "jaw", "chest", "heart", "posture", "stance", "shadow",
  "shadows", "sound", "sounds", "noise", "noises", "smell", "scent", "temperature", "weather", "action", "actions", "adventure",
  "adventures", "author", "authors", "card", "cards", "chapter", "chapters", "character", "characters", "choice", "choices", "config",
  "configuration", "context", "continuation", "conversation", "description", "detail", "details", "dialogue", "ending", "entry", "entries", "event",
  "events", "example", "examples", "fact", "facts", "field", "fields", "format", "formatting", "game", "games", "genre",
  "genres", "history", "input", "instruction", "instructions", "lore", "memory", "model", "models", "name", "names", "narration",
  "narrative", "narrator", "output", "paragraph", "paragraphs", "part", "parts", "player", "players", "plot", "profile", "profiles",
  "prompt", "prompts", "response", "responses", "rule", "rules", "scenario", "scenarios", "scene", "scenes", "script", "scripts",
  "section", "sections", "setting", "settings", "status", "story", "stories", "summary", "summaries", "system", "systems", "task",
  "tasks", "text", "texts", "theme", "themes", "version", "world", "worlds", "able", "afraid", "alive", "alone",
  "angry", "anxious", "awake", "aware", "bad", "bare", "basic", "beautiful", "better", "big", "bitter", "black",
  "blank", "bright", "broad", "calm", "careful", "certain", "clear", "cold", "common", "complete", "concerned", "confused",
  "dark", "dead", "deep", "different", "difficult", "distant", "dry", "early", "easy", "empty", "exact", "familiar",
  "far", "fast", "final", "fine", "flat", "free", "fresh", "full", "general", "gentle", "good", "great",
  "hard", "heavy", "high", "hollow", "hot", "huge", "important", "impossible", "large", "late", "little", "local",
  "long", "loud", "low", "main", "major", "minor", "narrow", "new", "normal", "obvious", "old", "ordinary",
  "pale", "personal", "possible", "quiet", "quick", "ready", "real", "recent", "right", "rough", "safe", "same",
  "serious", "sharp", "short", "silent", "simple", "slow", "small", "soft", "solid", "strange", "strong", "sudden",
  "sure", "tall", "thin", "tired", "true", "unclear", "unusual", "warm", "weak", "wide", "wrong", "young",
  "afternoon", "ago", "daytime", "dusk", "evening", "forever", "later", "midnight", "morning", "night", "noon", "nowadays",
  "once", "overnight", "present", "presently", "shortly", "someday", "sometime", "sunrise", "sunset", "today", "tomorrow", "tonight",
  "twice", "yesterday", "ai", "assistant", "automatic", "automatically", "backup", "cache", "canon", "canonical", "category", "categories",
  "codex", "command", "commands", "compound", "core", "current", "deadline", "detected", "diagnostic", "diagnostics", "disabled", "enable",
  "enabled", "entity", "entities", "evidence", "forced", "frontmemory", "hint", "hook", "hooks", "mandatory", "marker", "markers",
  "mature", "minimum", "maximum", "optimized", "optional", "override", "pending", "payoff", "private", "required", "reset", "resolved",
  "retry", "retries", "seed", "seeds", "strict", "subtle", "template", "templates", "thread", "threads", "tracking", "tracked",
  "unsaid", "warning", "s", "bury", "burying", "buries", "buried", "fitting", "talking",
  "seen", "honesty", "traffic", "according", "alleged", "allegedly", "apparent", "reported", "rumored", "rumoured"
];

var CODEX_STOPWORDS = new Set([
  ...COMMON_CAPITALIZED_STOPWORDS,
  ...CODEX_EXTRA_STOPWORDS
].map(w => w.toLowerCase()));


// Automatic Codex discovery should prefer durable *named* entities over
// ordinary scene nouns. A capitalized common noun at the start of a sentence
// ("Food", "Dinner", "Coffee", "Table") can otherwise look exactly like a
// one-word proper name to the tokenizer, and ordinary narration verbs such as
// "takes" or "moves" can then accidentally promote it to a character.
//
// Keep this separate from CODEX_STOPWORDS: words such as "Chicken", "Cafe",
// "Library", "King", or "Spoon" can legitimately occur inside a real proper
// name ("Dragon's Breath Fried Chicken", "Moonlight Cafe", "The Golden
// Spoon"). The generic-noun guard rejects them only when the whole candidate
// is still just an ordinary concept, while explicit naming/business cues can
// rescue a genuinely named entity.
var CODEX_GENERIC_FOOD_WORDS = new Set([
  "food","foods","meal","meals","breakfast","brunch","lunch","dinner","supper","snack","snacks",
  "appetizer","appetizers","starter","starters","entree","entrees","entrée","entrées","main","course","courses",
  "dessert","desserts","dish","dishes","plate","plates","bowl","bowls","serving","servings","portion","portions",
  "recipe","recipes","ingredient","ingredients","menu","menus","special","specials","buffet","feast","banquet",
  "drink","drinks","beverage","beverages","water","coffee","tea","juice","soda","pop","cola","lemonade",
  "milk","milkshake","shake","smoothie","smoothies","cocoa","chocolate","beer","ale","lager","wine","cider",
  "cocktail","cocktails","mocktail","mocktails","liquor","spirits","whiskey","whisky","vodka","gin","rum",
  "tequila","champagne","espresso","latte","cappuccino","mocha",
  "bread","toast","roll","rolls","bun","buns","bagel","bagels","croissant","croissants","muffin","muffins",
  "cereal","oatmeal","porridge","pancake","pancakes","waffle","waffles","egg","eggs","omelet","omelette",
  "bacon","sausage","sausages","ham","chicken","turkey","beef","pork","lamb","mutton","duck","goose",
  "steak","steaks","meat","meats","fish","seafood","salmon","tuna","shrimp","prawn","prawns","crab","lobster",
  "burger","burgers","hamburger","hamburgers","sandwich","sandwiches","wrap","wraps","pizza","pizzas",
  "pasta","spaghetti","lasagna","lasagne","macaroni","noodle","noodles","ramen","rice","risotto",
  "soup","soups","stew","stews","chili","curry","curries","salad","salads","fries","chips","crisps",
  "potato","potatoes","vegetable","vegetables","veggie","veggies","fruit","fruits","apple","apples",
  "banana","bananas","orange","oranges","berry","berries","grape","grapes","melon","peach","peaches",
  "pear","pears","pineapple","mango","mangoes","lemon","lemons","lime","limes","tomato","tomatoes",
  "onion","onions","garlic","pepper","peppers","carrot","carrots","corn","bean","beans","peas","mushroom","mushrooms",
  "cheese","butter","cream","yogurt","yoghurt","sauce","sauces","gravy","dressing","dip","dips","jam","jelly",
  "salt","sugar","flour","oil","vinegar","spice","spices","herb","herbs","seasoning","seasonings",
  "cake","cakes","pie","pies","cookie","cookies","biscuit","biscuits","brownie","brownies","donut","donuts",
  "doughnut","doughnuts","pastry","pastries","candy","candies","sweet","sweets","icecream","ice","gelato",
  "pudding","custard","cheesecake","cupcake","cupcakes","tart","tarts",
  "fried","grilled","roasted","baked","boiled","steamed","smoked","toasted","spicy","sweet","savory","savoury",
  "sour","salty","fresh","frozen","hot","cold","warm","raw","cooked","crispy","creamy","cheesy","garlicky"
].map(w => w.toLowerCase()));

var CODEX_GENERIC_SCENE_NOUNS = new Set([
  "thing","things","stuff","object","objects","item","items","belonging","belongings","possession","possessions",
  "place","places","area","areas","spot","spots","location","locations","site","sites","scene","scenes",
  "room","rooms","bedroom","bedrooms","bathroom","bathrooms","kitchen","kitchens","hallway","hallways",
  "corridor","corridors","livingroom","basement","attic","garage","garden","yard","porch","balcony",
  "door","doors","window","windows","wall","walls","floor","floors","ceiling","ceilings","roof","roofs",
  "table","tables","chair","chairs","desk","desks","bed","beds","couch","couches","sofa","sofas","shelf","shelves",
  "cabinet","cabinets","drawer","drawers","counter","counters","lamp","lamps","light","lights","mirror","mirrors",
  "box","boxes","bag","bags","bottle","bottles","cup","cups","glass","glasses","mug","mugs","fork","forks",
  "knife","knives","spoon","spoons","napkin","napkins","towel","towels","blanket","blankets","pillow","pillows",
  "clothes","clothing","shirt","shirts","pants","trousers","dress","dresses","jacket","jackets","coat","coats",
  "shoe","shoes","boot","boots","hat","hats","glove","gloves","scarf","scarves",
  "phone","phones","computer","computers","laptop","laptops","tablet","tablets","screen","screens","television","tv",
  "book","books","paper","papers","page","pages","letter","letters","note","notes","photo","photos","picture","pictures",
  "car","cars","truck","trucks","vehicle","vehicles","bike","bikes","bicycle","bicycles","bus","buses","train","trains",
  "road","roads","street","streets","path","paths","trail","trails","bridge","bridges","building","buildings",
  "store","stores","shop","shops","market","markets","school","schools","hospital","hospitals","office","offices",
  "park","parks","library","libraries","restaurant","restaurants","cafe","cafes","diner","diners","bar","bars",
  "tree","trees","forest","forests","river","rivers","lake","lakes","mountain","mountains","hill","hills","field","fields",
  "sky","cloud","clouds","rain","snow","wind","weather","sun","moon","star","stars",
  "hand","hands","arm","arms","leg","legs","foot","feet","head","face","eyes","eye","hair","mouth","lips","voice",
  "body","bodies","heart","hearts","blood","breath","breathing","smile","smiles","gaze","expression","expressions",
  "sound","sounds","noise","noises","music","song","songs","silence","air","smell","scent","taste","feeling","feelings",
  "time","times","moment","moments","minute","minutes","hour","hours","day","days","week","weeks","month","months",
  "year","years","morning","afternoon","evening","night","today","tomorrow","yesterday",
  "work","job","jobs","money","cash","home","family","friend","friends","people","person","someone","somebody",
  "problem","problems","question","questions","answer","answers","idea","ideas","plan","plans","choice","choices",
  "conversation","conversations","message","messages","text","texts","call","calls","story","stories","memory","memories",
  "dream","dreams","thought","thoughts","secret","secrets","truth","truths","lie","lies","news","information"
].map(w => w.toLowerCase()));

var CODEX_GENERIC_DESCRIPTORS = new Set([
  "big","small","little","large","tiny","huge","old","new","young","ancient","modern","good","bad","best","worst",
  "first","last","next","other","another","same","different","normal","ordinary","simple","plain","special",
  "red","blue","green","yellow","black","white","brown","gray","grey","gold","golden","silver","dark","light",
  "bright","pale","deep","soft","hard","rough","smooth","clean","dirty","wet","dry","heavy","lightweight",
  "hot","cold","warm","cool","fast","slow","quick","quiet","loud","sweet","bitter","sour","salty","spicy",
  "fresh","stale","fried","grilled","roasted","baked","boiled","steamed","smoked","raw","cooked","crispy","creamy"
].map(w => w.toLowerCase()));

var CODEX_GENERIC_COMMON_NOUNS = new Set([
  ...CODEX_GENERIC_FOOD_WORDS,
  ...CODEX_GENERIC_SCENE_NOUNS
]);

function codexGenericWords(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[^a-z0-9' -]+/g, " ")
    .split(/\s+/)
    .map(w => w.replace(/^['-]+|['-]+$/g, "").replace(/'s$/i, ""))
    .filter(Boolean);
}

function hasStrongCodexBusinessOrNamedContext(name, text) {
  const source = typeof text === "string" ? text : "";
  const cleanName = String(name || "").trim();
  if (!source || !cleanName) return false;
  const n = escapeForRegex(cleanName);
  const businessKinds = "restaurant|diner|bistro|caf[eé]|coffee\\s+shop|bakery|pizzeria|steakhouse|deli|bar|pub|store|shop|market|company|corporation|brand|hotel|inn|tavern";
  const patterns = [
    new RegExp(`\\b(?:${businessKinds})\\s+(?:called|named|known\\s+as)\\s+["“”'‘’]?${n}\\b`, "i"),
    new RegExp(`\\b${n}\\b\\s+(?:${businessKinds})\\b`, "i"),
    new RegExp(`\\b(?:ordered\\s+from|ate\\s+at|dined\\s+at|works?\\s+at|worked\\s+at|employed\\s+by|shops?\\s+at)\\s+["“”'‘’]?${n}\\b`, "i")
  ];
  return patterns.some(re => re.test(source));
}

function isGenericCodexCommonNounCandidate(name, source) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return true;

  // Explicit identity language always wins. This keeps intentionally unusual
  // names valid: "I'm Coffee", "the dish called Moonfire Stew", "the
  // restaurant named The Golden Spoon", etc.
  if (hasExplicitCodexNamingCue(cleanName, source) ||
      hasStrongCodexBusinessOrNamedContext(cleanName, source)) {
    return false;
  }

  const words = codexGenericWords(cleanName);
  if (!words.length) return true;

  const content = words.filter(w => !["the","a","an","of","and","or","with","in","on","at","for","from","to"].includes(w));
  if (!content.length) return true;

  // Food and drink are especially noisy in normal prose. Do not auto-card a
  // meal/ingredient/dish just because it was capitalized or repeated. A
  // genuinely *named* dish/brand/business can still pass through the explicit
  // naming/context exceptions above.
  if (content.some(w => CODEX_GENERIC_FOOD_WORDS.has(w))) {
    return true;
  }

  const genericCount = content.filter(w =>
    CODEX_GENERIC_COMMON_NOUNS.has(w) ||
    CODEX_GENERIC_DESCRIPTORS.has(w) ||
    CODEX_STOPWORDS.has(w) ||
    CODEX_TITLE_WORDS.has(w)
  ).length;

  if (content.length === 1 && genericCount === 1) return true;
  if (genericCount === content.length) return true;
  if (content.length >= 2 && genericCount / content.length >= 0.75) return true;

  return false;
}

var CODEX_LOCATION_HINTS = /\b(city|state|street|road|lane|avenue|boulevard|canyon|terminal|park|building|tower|island|country|nation|kingdom|realm|district|region|planet|world|base|facility|academy|university|school|campus|bridge|river|mountain|forest|desert|battleground|warzone|hall|tavern|inn|hotel|motel|castle|fortress|temple|church|mosque|shrine|level|sector|wing|chamber|vault|bay|deck|outpost|colony|settlement|village|town|hamlet|station|harbor|harbour|wharf|apartment|house|home|office|warehouse|factory|farm|ranch|arena|stadium|courtroom|courthouse|prison|jail|laboratory|lab|theater|theatre|cinema|museum|library|mall|market|beach|cave|mine|ruins?|cemetery|graveyard|neighborhood|neighbourhood|suburb|block)\b/i;
var CODEX_LOCATION_SUFFIX_HINTS = /(tower|keep|hold|spire|haven|hollow|reach|scraper)/i;

// "Faction" doubles as the best fit for any organization — guild-and-empire
// fantasy terms, but also modern businesses, restaurants, and services,
// none of which fit "location" or "item" well. A real game's Story Cards
// (custom-typed "Business", "Restaurant", "Social Media") showed this gap
// directly: none of the fantasy-only terms below matched "Thorne
// Industries" or "Dragon's Breath Fried Chicken", so both silently fell
// back to being guessed as a character.
var CODEX_FACTION_HINTS = /\b(order|guild|alliance|empire|faction|clan|brotherhood|council|syndicate|coalition|army|legion|cult|society|corporation|company|companies|initiative|division|agency|federation|dynasty|tribe|vanguard|battalion|regiment|squad|squadron|fleet|crew|cabal|circle|sect|resistance|movement|militia|garrison|industries|industry|enterprises|incorporated|holdings|conglomerate|group|partners|associates|firm|labs?|laboratory|laboratories|studio|studios|productions|pharmaceuticals|restaurant|diner|bistro|caf[eé]|eatery|grill|kitchen|bakery|brewery|pizzeria|steakhouse|deli|hospital|clinic|salon|boutique|store|shop|franchise|chain|brand|app|platform|network|streaming|team|club|league|union|association|foundation|charity|church|ministry|department|bureau|office|committee|party|campaign|band|orchestra|label|school|college|university|house|family|court|government|police|fire department)\b/i;

// Sci-fi vessel/mech/robot vocabulary was missing here entirely — the
// modern-vehicle words (car/truck/van/vehicle) already reflect an earlier
// real gap being closed the same way, but nothing parallel ever got added
// for the sci-fi equivalent, meaning a starship, mech, or robot with a
// name that happens to include one of these words (e.g. "the Mothership,"
// "Unit-9 the Android") had no name-level signal at all and fell entirely
// on the correction-note-plus-scoring fallback — the same accepted,
// unavoidable limitation as a wholly invented name like "Starhopper" with
// no recognizable component in it at all.
var CODEX_ITEM_HINTS = /\b(sword|blade|gun|rifle|pistol|staff|wand|amulet|ring|armou?r|shield|artifact|device|weapon|tool|key|book|tome|potion|elixir|gem|crystal|relic|suit|mask|cloak|helmet|gauntlet|hammer|axe|bow|orb|blaster|scroll|spear|dagger|lance|trident|chalice|sigil|banner|car|truck|motorcycle|motorbike|van|jeep|convertible|sedan|coupe|vehicle|automobile|ship|starship|spaceship|spacecraft|shuttle|cruiser|frigate|freighter|corvette|mech|mecha|robot|android|cyborg|rover|submarine|tank|helicopter|aircraft|airship|mothership|jacket|dress|gown|coat|shirt|blouse|jeans|skirt|boots|shoes|sneakers|scarf|gloves|necklace|bracelet|earrings|sunglasses|phone|smartphone|laptop|tablet|computer|console|headset|drone|camera|backpack|purse|wallet|suitcase|bicycle|bike|bus|train|tram|boat|yacht|guitar|violin|piano|instrument|microphone|recording|photograph|photo|letter|document|file|contract|map|badge|medicine|medication|serum|vial|inhaler|watch|radio|communicator)\b/i;

var CODEX_TITLE_WORDS = new Set([
  "Emperor", "Empress", "King", "Queen", "Prince", "Princess", "Duke",
  "Duchess", "Lord", "Lady", "Sir", "Dame", "Baron", "Baroness", "Count",
  "Countess", "President", "General", "Admiral", "Captain", "Colonel",
  "Major", "Sergeant", "Lieutenant", "Commander", "Chief", "Director",
  "Minister", "Governor", "Senator", "Ambassador", "Doctor", "Professor",
  "Master", "Mistress", "Reverend", "Bishop", "Cardinal", "Judge",
  "Justice", "Mayor", "Chancellor", "Agent", "Officer", "Detective",
  "Sheriff", "Marshal", "Warden", "Overlord", "Warlord", "Elder",
  "Guardian", "Knight", "Priest", "Priestess",
  // Everyday courtesy titles — a distinct flavor (address form rather
  // than rank/office) but the exact same problem: "Mr. Carver" and
  // "Ms. Ogena" burning their own separate Codex retry budgets instead
  // of being recognized as "Carver" and "Jessica Ogena" (confirmed via a
  // real player's status report a few rounds back) turned out to be only
  // half of this same bug — this list already existed specifically to
  // keep a bare title word from becoming its own candidate, but was never
  // used to *strip* a leading title from a longer candidate the way the
  // stopword list below is, and the courtesy-title fix only patched
  // isSameCardEntity's comparison, never mention-tracking's own counting.
  // Confirmed directly: "Commander Reyes" and bare "Reyes" were tracked
  // as two entirely separate candidates because the leading rank word
  // was never stripped at the point mentions actually get counted, and
  // in one sandbox run this went further — one candidate's card fields
  // ended up written under the *other* candidate's bare-surname title
  // entirely, a genuine cross-assignment, not just wasted budget. One
  // shared set, used for both jobs everywhere, closes both at once.
  "Mr", "Mrs", "Ms", "Miss", "Dr", "Madam", "Mx",
  "Prof", "Capt", "Gen", "Col", "Lt", "Sgt", "Cmdr", "Maj", "Adm", "Rev",
  "Hon", "Gov", "Sen", "Rep", "Det", "Insp"
].map(w => w.toLowerCase()));

var SENTENCE_ABBREVIATIONS = new Set([
  "Dr", "Mr", "Mrs", "Ms", "Prof", "St", "Jr", "Sr", "Capt", "Gen",
  "Col", "Lt", "Sgt", "Rev", "Hon", "Fr", "Rep", "Sen", "Gov", "Adm",
  "Cmdr", "Maj", "Mt", "vs", "etc"
]);
// A name "word" is a capitalized token that may contain internal
// apostrophes, hyphens, or digits (O'Brien, Ba'al, Draconic-Ballgown,
// Agent47) — built from the shared NAME_ALPHANUM class at the top of this file.
var CODEX_NAME_TOKEN = `[A-Z][${NAME_ALPHANUM}]*(?:['\u2019-][${NAME_ALPHANUM}]+)*`;
var CODEX_TITLE_ABBREV_REGEX = new RegExp(
  `\\b(?:(?:${[...SENTENCE_ABBREVIATIONS].filter(w => w.length > 1).join("|")})\\.\\s+)?${CODEX_NAME_TOKEN}(?:\\s+of\\s+${CODEX_NAME_TOKEN}|\\s+${CODEX_NAME_TOKEN}){0,2}\\b`,
  "g"
);


// Automatic Codex discovery intentionally uses a much stricter standard than
// a manual `/card <name>` command. Capitalization alone is not entity evidence:
// every generated sentence starts with a capital letter, which is how words
// such as "Which", "Already", "Six", "Burying", and "To" can otherwise age
// into completely bogus Story Cards.
//
// `hasExplicitCodexNamingCue` is the escape hatch for unusual *real* names.
// A character genuinely named Six, Which, Summer, etc. is still allowed when
// the story explicitly names them ("I'm Six", "a woman named Six", "codename
// Six"). Generic narration such as "Which comes..." is never enough.
function codexStopKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9'.-]+$/gi, "")
    .replace(/\.$/, "")
    .replace(/'s$/i, "")
    .trim();
}

function hasExplicitCodexNamingCue(name, text) {
  const source = typeof text === "string" ? text : "";
  const cleanName = String(name || "").trim();
  if (!source || !cleanName) return false;

  const n = escapeForRegex(cleanName);
  const quote = `["“”'‘’]?`;
  const personKind = [
    "person", "woman", "man", "girl", "boy", "lady", "gentleman", "teenager",
    "teen", "adult", "child", "youth", "stranger", "traveler", "traveller",
    "guard", "soldier", "knight", "mage", "wizard", "witch", "priest",
    "priestess", "captain", "doctor", "nurse", "merchant", "officer",
    "detective", "pilot", "engineer", "teacher", "professor", "student",
    "lawyer", "attorney", "judge", "athlete", "coach", "musician", "singer",
    "actor", "artist", "scientist", "researcher", "agent", "android", "robot",
    "synthetic", "ai", "alien", "creature", "spirit", "ghost", "vampire",
    "werewolf", "superhero", "hero", "villain", "elf", "dwarf", "orc", "fae",
    "demon", "angel", "dragon", "deity", "god", "goddess", "dog", "cat",
    "horse", "animal", "companion", "npc"
  ].join("|");
  const entityKind = [
    personKind,
    "city", "town", "village", "kingdom", "realm", "district", "region",
    "planet", "world", "station", "base", "facility", "school", "academy",
    "college", "university", "hospital", "hotel", "tavern", "inn", "house",
    "building", "street", "road", "river", "mountain", "forest", "island",
    "company", "corporation", "agency", "organization", "organisation", "group",
    "guild", "order", "clan", "faction", "team", "club", "band", "crew",
    "restaurant", "diner", "bistro", "cafe", "café", "bakery", "pizzeria",
    "steakhouse", "deli", "bar", "pub", "store", "shop", "brand",
    "dish", "meal", "food", "drink", "beverage", "cocktail", "dessert", "recipe", "menu item",
    "ship", "starship", "vehicle", "car", "train", "boat", "weapon", "sword",
    "gun", "device", "artifact", "relic", "book", "document", "app", "network"
  ].join("|");

  const cues = [
    new RegExp(`\\b(?:I\\s*(?:am|'m|’m)|my\\s+name\\s+(?:is|'s|’s)|call\\s+me|people\\s+call\\s+me|they\\s+call\\s+me|I\\s+go\\s+by|this\\s+is|meet)\\s+${quote}${n}\\b`, "i"),
    new RegExp(`\\b(?:introduces?|introduced)\\s+(?:himself|herself|themself|themselves|itself)\\s+as\\s+${quote}${n}\\b`, "i"),
    new RegExp(`\\b(?:${entityKind})\\s+(?:named|called|known\\s+as|dubbed|codenamed|designated)\\s+${quote}${n}\\b`, "i"),
    new RegExp(`\\b(?:named|called|known\\s+as|dubbed|codenamed|designated)\\s+${quote}${n}\\b`, "i"),
    new RegExp(`\\b(?:codename|code\\s+name|callsign|call\\s+sign|designation|nickname|alias)\\s*(?::|=|is\\s+)?\\s*${quote}${n}\\b`, "i"),
    new RegExp(`\\b${n}\\b\\s+(?:is|was)\\s+(?:my|his|her|their|its|the)\\s+(?:name|nickname|codename|callsign|designation)\\b`, "i")
  ];
  return cues.some(re => re.test(source));
}

function codexLooksLikeSentenceStarterMorphology(name, source) {
  const clean = String(name || "").trim();
  if (!clean || /\s/.test(clean)) return false;
  // Restrict this heuristic to very characteristic prose-form suffixes.
  // Plain -ed/-ly are deliberately not used because real names such as Reed,
  // Jared, Ashley and Kelly would be collateral damage.
  if (!/(?:ing|ingly|edly|ously|ively)$/i.test(clean)) return false;
  const s = typeof source === "string" ? source : "";
  if (!s) return true;
  const n = escapeForRegex(clean);
  return new RegExp(`(?:^|[.!?]["'”’)]*\\s+|\\n+\\s*|["“]\\s*)${n}\\b`, "i").test(s);
}

function normalizeCodexCandidate(raw, source) {
  let name = stripPossessive(String(raw || "")
    .replace(/^[\s"'“”‘’([{<]+|[\s"'“”‘’)\]}>.,:;!?—–-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim());
  if (!name || name.length > 80 || !/[A-Za-z]/.test(name)) return null;

  const originalExplicit = hasExplicitCodexNamingCue(name, source);
  let words = name.split(/\s+/).filter(Boolean);

  // Sentence-openers and titles can be captured together with the real
  // proper noun ("Which Harlan", "Captain Reyes"). Strip them only when
  // the complete phrase was not explicitly named as an entity.
  if (!originalExplicit) {
    while (words.length > 1 &&
      (CODEX_STOPWORDS.has(codexStopKey(words[0])) || CODEX_TITLE_WORDS.has(codexStopKey(words[0])))) {
      words.shift();
    }
    while (words.length > 1 &&
      (CODEX_STOPWORDS.has(codexStopKey(words[words.length - 1])) ||
       CODEX_TITLE_WORDS.has(codexStopKey(words[words.length - 1])))) {
      words.pop();
    }
    name = words.join(" ").trim();
  }

  if (!name || !words.length) return null;
  const explicit = originalExplicit || hasExplicitCodexNamingCue(name, source);
  const keys = words.map(codexStopKey).filter(Boolean);

  if (!keys.length) return null;

  // Reject ordinary common nouns before movement/dialogue heuristics get a
  // chance to reinterpret them as people. This is the main protection
  // against cards for Food, Dinner, Coffee, Table, etc.
  if (!explicit && isGenericCodexCommonNounCandidate(name, source)) {
    return null;
  }

  if (!explicit) {
    if (keys.length === 1 &&
        (CODEX_STOPWORDS.has(keys[0]) || CODEX_TITLE_WORDS.has(keys[0]))) {
      return null;
    }

    // A phrase made mostly from generic/function words is prose, not a
    // durable named entity. "of" and similar connectors are tolerated only
    // when there is enough actual proper-noun material around them.
    const genericCount = keys.filter(k =>
      CODEX_STOPWORDS.has(k) || CODEX_TITLE_WORDS.has(k)
    ).length;
    if (genericCount === keys.length) return null;
    if (keys.length > 1 && genericCount >= Math.ceil(keys.length * 0.67)) return null;

    if (keys.length === 1 && codexLooksLikeSentenceStarterMorphology(name, source)) {
      return null;
    }
  }

  if (keys.length === 1) {
    if (name.length <= 1 && !explicit) return null;
    if (/^(?:[ivxlcdm]+)$/i.test(name) && name.length <= 8 && !explicit) return null;
    if (/^\d+(?:st|nd|rd|th)?$/i.test(name) && !explicit) return null;

    // Short all-caps words are usually acronyms/headings. Explicit naming is
    // required, which still permits characters such as ARIA, VEX, Q, etc.
    if (name.length <= 5 && name === name.toUpperCase() &&
        /[A-Z]{2,}/.test(name) && !explicit) {
      return null;
    }
  }

  return name;
}

function codexEvidenceTextFor(name) {
  try {
    const evidence = state && state.unsaid && state.unsaid.codex &&
      state.unsaid.codex.evidence && state.unsaid.codex.evidence[name];
    if (!Array.isArray(evidence)) return "";
    return evidence
      .map(item => item && typeof item.text === "string" ? item.text : "")
      .filter(Boolean)
      .join(" ");
  } catch (e) {
    return "";
  }
}



function isEstablishedExplicitCodexCharacter(name) {
  try {
    const codex = state && state.unsaid && state.unsaid.codex;
    if (!codex || !codex.likelyCharacters || !codex.likelyCharacters[name]) return false;
    return hasExplicitCodexNamingCue(name, codexEvidenceTextFor(name));
  } catch (e) {
    return false;
  }
}

function isClearlyJunkCodexName(name) {
  const raw = String(name || "").trim();
  if (!raw) return true;
  const evidenceText = codexEvidenceTextFor(raw);
  if (hasExplicitCodexNamingCue(raw, evidenceText)) return false;

  if (isGenericCodexCommonNounCandidate(raw, evidenceText)) return true;

  const words = raw.split(/\s+/).filter(Boolean);
  const keys = words.map(codexStopKey).filter(Boolean);
  if (!keys.length) return true;
  if (raw.length <= 1) return true;

  if (keys.length === 1) {
    if (CODEX_STOPWORDS.has(keys[0]) || CODEX_TITLE_WORDS.has(keys[0])) return true;
    if (codexLooksLikeSentenceStarterMorphology(raw, "")) return true;
    if (/^\d+(?:st|nd|rd|th)?$/i.test(raw)) return true;
    if (/^(?:[ivxlcdm]+)$/i.test(raw) && raw.length <= 8) return true;
    return false;
  }

  const genericCount = keys.filter(k =>
    CODEX_STOPWORDS.has(k) || CODEX_TITLE_WORDS.has(k)
  ).length;
  return genericCount === keys.length ||
    genericCount >= Math.ceil(keys.length * 0.67);
}

function isSafeTrackedCodexName(name) {
  // Evidence is important for intentionally unusual names that are otherwise
  // stop words. "I'm Six" remains valid; an old persisted candidate called
  // "Six" with no naming evidence is discarded automatically.
  const evidenceText = codexEvidenceTextFor(name);
  return !!normalizeCodexCandidate(name, evidenceText);
}

var CHARACTER_CARD_FIELDS = ["Name", "Race", "Strength Level", "Background", "Personality", "Appearance", "Abilities", "Weaknesses", "Relationships"];
var LOCATION_CARD_FIELDS = ["Name", "Location", "Description", "Key Locations", "Historical Events", "Significance"];
var ITEM_CARD_FIELDS = ["Name", "Type", "Description", "Properties", "Origin", "Significance"];
var FACTION_CARD_FIELDS = ["Name", "Type", "Description", "Significance"];

var CARD_TEMPLATES = {
  character: CHARACTER_CARD_FIELDS,
  location: LOCATION_CARD_FIELDS,
  item: ITEM_CARD_FIELDS,
  faction: FACTION_CARD_FIELDS
};

// Cache-efficient models can discard returned Context-hook text. Confirmed directly
// against AI Dungeon's own scripting documentation: on a cache-efficient
// model, the Context hook still runs and can *read* the context, but
// whatever text it *returns* is silently discarded — the model never sees
// it. That means every one of UNSAID's own instructions (Codex card
// requests, private-thought reveal requests, core-shift checks), which are
// delivered purely by appending to the returned context text, were being
// built correctly and then thrown away before the model ever saw them, on
// any such model — a total, silent failure completely independent of
// instruction wording or which name was requested. This matches real
// captured evidence closely (clean, legitimate names exhausting every
// retry with zero cards created; reveal requests producing nothing
// usable), though the specific evidence gathered didn't show the existing
// cache-efficient warning card active at the time, so this closes a real
// platform-limitation gap without being a confirmed fix for that specific
// report — the markdown-formatting fix already made is the one directly
// confirmed against that evidence. A Story Card's entry, unlike the hook's
// returned text, does still reach the model on these models, so the same
// near-universal-match-keys trick carries whichever instruction would
// otherwise have been silently lost.
function updateUnsaidBackupCard(cacheEfficient, instructionText) {
  const title = "UNSAID — Backup Delivery";
  if (!cacheEfficient) { removeStoryCardByTitle(title); return; }
  const entry = instructionText || " ";
  const notes = "BACKUP INSTRUCTION DELIVERY\n\n" +
    "Active only because Optimized Context was detected this turn — see the \"UNSAID — Important, " +
    "Read This ⚠️\" card. Carries whichever Codex card request or private-thought request would " +
    "otherwise be delivered by appending directly to the model context, which doesn't reach the " +
    "model on this kind of model.";
  let card = storyCards.find(c => c.title === title);
  if (!card) {
    card = createOrFindCard(UNSAID_ALWAYS_MATCH_KEYS, entry, "Class");
    if (card) { card.title = title; }
  }
  if (card) {
    card.keys = UNSAID_ALWAYS_MATCH_KEYS;
    card.type = "Class";
    card.entry = entry;
    card.description = notes;
  }
}

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
    "still runs but its result is never sent to the AI — meaning UNSAID's " +
    "private thoughts and auto-generated Story Cards can't be delivered " +
    "the normal way. As a backup, the same request is now also written to " +
    "a \"UNSAID — Backup Delivery\" card, which the AI does still see, the " +
    "This backup should keep most requests working, though timing may be less precise. " +
    "For the most reliable results, switch to a model without cache " +
    "efficiency enabled, or disable cache efficiency for this model if " +
    "your plan allows it.";
  if (!card) {
    const newCard = createOrFindCard("unsaid warning", warningText, "Class");
    if (newCard) {
      newCard.title = title;
      newCard.description = warningText;
    }
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
      forcedPeekCore: null,
      forcedCodex: null,
      consecutiveRevealMisses: 0,
      lastActionCount: -1,
      lastStorySignature: null,
      pendingCoreShiftAllowed: false,
      pendingCoreCheck: false,
      codex: {
        mentionCounts: {},
        attempts: {},
        firstSeenTurn: {},
        introducedTurn: {},
        likelyCharacters: {},
        observedTypes: {},
        appearanceTurns: {},
        evidence: {},
        lastMentionTurn: {},
        lastAttemptTurn: {},
        pendingNames: [],
        pendingTypes: {},
        pendingForced: false,
        consecutiveFailedNames: [],
        lastTriggerTurn: 0
      }
    };
  }
  // Backfill every field below individually, not just on first creation —
  // if state.unsaid already exists (e.g. continuing an adventure across
  // script versions) but is missing one of these, code that indexes
  // straight into it (state.unsaid.codex.attempts[name] = ...) throws,
  // which the caller's try/catch swallows silently, killing UNSAID for
  // that whole turn. Backfill defensively for adventures persisted across versions.
  if (!state.unsaid.minds || typeof state.unsaid.minds !== "object") state.unsaid.minds = {};
  if (typeof state.unsaid.turn !== "number") state.unsaid.turn = 0;
  if (typeof state.unsaid.forcedPeekCore === "undefined") state.unsaid.forcedPeekCore = null;
  if (typeof state.unsaid.forcedCodex === "undefined") state.unsaid.forcedCodex = null;
  if (typeof state.unsaid.consecutiveRevealMisses !== "number") state.unsaid.consecutiveRevealMisses = 0;
  if (typeof state.unsaid.lastStorySignature !== "string") state.unsaid.lastStorySignature = null;
  if (typeof state.unsaid.pendingCoreShiftAllowed !== "boolean") state.unsaid.pendingCoreShiftAllowed = false;
  if (typeof state.unsaid.pendingCoreCheck !== "boolean") state.unsaid.pendingCoreCheck = false;
  if (!state.unsaid.codex || typeof state.unsaid.codex !== "object") {
    state.unsaid.codex = {
      mentionCounts: {},
      attempts: {},
      firstSeenTurn: {},
      introducedTurn: {},
      likelyCharacters: {},
      observedTypes: {},
      appearanceTurns: {},
      evidence: {},
      lastMentionTurn: {},
      lastAttemptTurn: {},
      pendingNames: [],
      pendingTypes: {},
      pendingForced: false,
      consecutiveFailedNames: [],
      lastTriggerTurn: 0
    };
  }
  if (!state.unsaid.codex.mentionCounts || typeof state.unsaid.codex.mentionCounts !== "object") state.unsaid.codex.mentionCounts = {};
  if (!state.unsaid.codex.attempts || typeof state.unsaid.codex.attempts !== "object") state.unsaid.codex.attempts = {};
  if (!state.unsaid.codex.firstSeenTurn || typeof state.unsaid.codex.firstSeenTurn !== "object") state.unsaid.codex.firstSeenTurn = {};
  if (!state.unsaid.codex.introducedTurn || typeof state.unsaid.codex.introducedTurn !== "object") state.unsaid.codex.introducedTurn = {};
  if (!state.unsaid.codex.likelyCharacters || typeof state.unsaid.codex.likelyCharacters !== "object") state.unsaid.codex.likelyCharacters = {};
  if (!state.unsaid.codex.observedTypes || typeof state.unsaid.codex.observedTypes !== "object") state.unsaid.codex.observedTypes = {};
  if (!state.unsaid.codex.appearanceTurns || typeof state.unsaid.codex.appearanceTurns !== "object") state.unsaid.codex.appearanceTurns = {};
  if (!state.unsaid.codex.evidence || typeof state.unsaid.codex.evidence !== "object") state.unsaid.codex.evidence = {};
  if (!state.unsaid.codex.lastMentionTurn || typeof state.unsaid.codex.lastMentionTurn !== "object") state.unsaid.codex.lastMentionTurn = {};
  if (!state.unsaid.codex.lastAttemptTurn || typeof state.unsaid.codex.lastAttemptTurn !== "object") state.unsaid.codex.lastAttemptTurn = {};
  if (!Array.isArray(state.unsaid.codex.pendingNames)) state.unsaid.codex.pendingNames = [];
  if (!state.unsaid.codex.pendingTypes || typeof state.unsaid.codex.pendingTypes !== "object") state.unsaid.codex.pendingTypes = {};
  if (typeof state.unsaid.codex.pendingForced !== "boolean") state.unsaid.codex.pendingForced = false;
  if (!Array.isArray(state.unsaid.codex.consecutiveFailedNames)) state.unsaid.codex.consecutiveFailedNames = [];
  if (typeof state.unsaid.codex.lastTriggerTurn !== "number") state.unsaid.codex.lastTriggerTurn = 0;
  if (typeof state.unsaid.lastActionCount !== "number") state.unsaid.lastActionCount = -1;
  ensureSharedConfigCard();
}

function escapeForRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Shared UNSAID entity/name helper: strips a trailing
// possessive or contraction ("Ba'al's" -> "Ba'al", "O'Brien's" -> "O'Brien")
// without touching a genuine internal apostrophe. Handles both the straight
// (') and curly (\u2019) apostrophe, since models sometimes generate either.
function stripPossessive(w) {
  return w.replace(/['\u2019](s|re|ve|ll|d|m)$/i, "").replace(/['\u2019]$/, "");
}

// Identifies UNSAID's own admin/status cards so they cannot be mistaken for story entities.
// Canonical prefix for UNSAID admin/system Story Cards.
var OWN_CARD_TITLE_PREFIXES = ["UNSAID"];

function isOwnCard(title) {
  return !!title && OWN_CARD_TITLE_PREFIXES.some(p => title.indexOf(p) === 0);
}

function pushMessage(msg) {
  if (!msg) return;
  state.message = state.message ? state.message + " " + msg : msg;
}

function nameAppears(name, text) {
  if (!name || !text) return false;
  const n = escapeForRegex(String(name).trim());
  return new RegExp(`(?:^|[^A-Za-z0-9])${n}(?=$|[^A-Za-z0-9])`, "i").test(String(text));
}

function createOrFindCard(keys, initialEntry, type) {
  try {
    const idx = addStoryCard(keys, initialEntry, type);
    if (typeof idx === "number" && storyCards[idx]) return storyCards[idx];
    return storyCards.find(c => c.keys === keys) || null;
  } catch (e) {
    return storyCards.find(c => c.keys === keys) || null;
  }
}

function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[n];
}

function findConfigCardTolerant(title, maxDistance) {
  if (typeof storyCards === "undefined" || !storyCards) return null;
  for (let i = 0; i < storyCards.length; i++) {
    if (storyCards[i] && storyCards[i].title === title) return storyCards[i];
  }
  const target = title.toLowerCase().replace(/[^a-z]/g, "");
  const limit = typeof maxDistance === "number" ? maxDistance : 2;
  for (let i = 0; i < storyCards.length; i++) {
    const card = storyCards[i];
    if (!card || typeof card.title !== "string") continue;
    const candidate = card.title.toLowerCase().replace(/[^a-z]/g, "");
    if (Math.abs(candidate.length - target.length) > limit) continue;
    if (levenshteinDistance(candidate, target) <= limit) return card;
  }
  return null;
}

// ---- UNSAID config card ----
var CONFIG_CARD_TITLE = "UNSAID — Config";
var CONFIG_SECTION_UNSAID = "== UNSAID ==";

function extractConfigSection(fullText, marker) {
  const clean = String(fullText || "");
  const idx = clean.indexOf(marker);
  return idx === -1 ? clean : clean.slice(idx);
}

function spliceConfigSection(fullText, marker, newSectionText) {
  return String(newSectionText || "").replace(/\s+$/, "") + "\n";
}

function removeStoryCardByTitle(title) {
  try {
    for (let i = 0; i < storyCards.length; i++) {
      if (storyCards[i] && storyCards[i].title === title) { removeStoryCard(i); return true; }
    }
  } catch (e) {}
  return false;
}

function renderUnsaidSection(cfg) {
  return CONFIG_SECTION_UNSAID + "\n" +
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
    `> Minimum story turns to observe a newly introduced character before carding: ${cfg.codexCharacterMinTurns}\n` +
    `> Minimum on-screen appearances before normal character carding: ${cfg.codexCharacterMinAppearances}\n` +
    `> Maximum turns before a newly introduced character card is forced: ${cfg.codexCharacterDeadline}\n` +
    `> Reset Codex tracking now: false\n` +
    `> Player character (skip when Codexing): ${cfg.playerName}\n`;
}

var CONFIG_DEFAULT_UNSAID_NOTES_SECTION =
  CONFIG_SECTION_UNSAID + "\n" +
  "Commands (type as an action):\n" +
  "- /unsaid status — writes a live status report to a separate \"UNSAID — Status\" card. Not sent to the AI.\n" +
  "- /unsaid help — shows the command list and refreshes access to this config card.\n" +
  "- /unsaid resetcodex — clears Codex detection/retry timing without deleting any Story Cards.\n" +
  "- /peek <character name> — force a private thought from that character right now. Quoted names are accepted.\n" +
  "- /peek <character name> core — force a check for whether this moment has changed that character's core truth.\n" +
  "- /card <character name> — force Codex to write or refresh that character's Story Card right now, skipping automatic observation/cooldown gates. Quoted names are accepted.\n\n" +
  "Pre-authoring a character's inner life: write \"💭 Inner Life — private, not visible to other characters\" followed by \"Core truth:\" and their established truth into a character's own Notes before their first reveal, and UNSAID will start from that instead of inventing one.\n\n" +
  "- Enable UNSAID: master switch for private thoughts + Codex together. False turns both off.\n" +
  "- Enable Codex: auto-Story-Card generation on its own. Turn it off to keep private thoughts working with existing hand-made cards without new cards appearing.\n" +
  "- Chance of a thought per turn: how likely (0–1) an eligible, active character reveals a thought on a given turn.\n" +
  "- Turns before the same character can think again: cooldown before that character is eligible again.\n" +
  "- Ease off during your own Do/Say actions: reveals are a little less likely specifically on turns you directly acted.\n" +
  "- Recent turns counted as \"active\": how many recent turns get scanned for who's currently eligible.\n" +
  "- Show private thoughts in the story text: off by default — reveals go to the character's own card, not your story.\n" +
  "- Let hidden feelings subtly color actions: lets a feeling show through tone/body language without stating it outright.\n" +
  "- Store card notes as JSON: off = plain prose, on = the same data as structured JSON.\n" +
  "- Allow major events to rewrite a core truth: on by default — old truths are kept on file, never erased.\n" +
  "- Mentions needed before Codex creates a card: how many mentions before a new name gets carded.\n" +
  "- Minimum turns between Codex cards: cooldown between one Codex card and the next.\n" +
  "- Codex retries before giving up on a name: attempts before automatic background retries stop on non-character names; introduced characters keep retrying.\n" +
  "- Minimum story turns to observe a newly introduced character before carding: automatic character cards cannot be requested before this many full story turns have passed after the character appears on-screen.\n" +
  "- Minimum on-screen appearances before normal character carding: separate output turns that should show the character before normal carding.\n" +
  "- Maximum turns before a newly introduced character card is forced: hard deadline for escalating a profile request.\n" +
  "- Reset Codex tracking now: set true to clear failed attempts/cooldowns and introduction timing; flips back to false automatically.\n" +
  "- Player character (skip when Codexing): your own name, so Codex skips writing a profile for you.\n\n" +
  "Characters who can have private thoughts, one per line — Codex adds newly discovered ones automatically:\n" +
  CAST_LIST_MARKER;

function ensureSharedConfigCard() {
  let card = findConfigCardTolerant(CONFIG_CARD_TITLE);
  if (card && card.title !== CONFIG_CARD_TITLE) card.title = CONFIG_CARD_TITLE;

  if (!card) {
    // Migrate the old standalone UNSAID card when present. If a combined
    // UNSPOKEN TURNS config exists, copy only its UNSAID section and leave
    // the old card untouched so this standalone script never manages another system.
    const oldStandalone = findConfigCardTolerant("UNSAID Config");
    const oldCombined = findConfigCardTolerant("UNSPOKEN TURNS — Config");
    let entry = renderUnsaidSection(UNSAID_DEFAULTS);
    let notes = CONFIG_DEFAULT_UNSAID_NOTES_SECTION;

    if (oldStandalone) {
      if (oldStandalone.entry && oldStandalone.entry.trim()) entry = CONFIG_SECTION_UNSAID + "\n" + oldStandalone.entry.trim() + "\n";
      if (oldStandalone.description && oldStandalone.description.trim()) notes = CONFIG_SECTION_UNSAID + "\n" + oldStandalone.description.trim();
    } else if (oldCombined) {
      const oldEntry = extractConfigSection(oldCombined.entry, CONFIG_SECTION_UNSAID);
      const oldNotes = extractConfigSection(oldCombined.description, CONFIG_SECTION_UNSAID);
      if (oldEntry && oldEntry.indexOf(CONFIG_SECTION_UNSAID) !== -1) entry = oldEntry;
      if (oldNotes && oldNotes.indexOf(CONFIG_SECTION_UNSAID) !== -1) notes = oldNotes;
    }

    try {
      const idx = addStoryCard(CONFIG_CARD_TITLE.toLowerCase(), entry, "Class");
      card = (typeof idx === "number" && storyCards[idx]) ? storyCards[idx] : null;
    } catch (e) {}
    if (!card) card = storyCards.find(sc => sc && sc.keys === CONFIG_CARD_TITLE.toLowerCase()) || null;
    if (card) {
      card.title = CONFIG_CARD_TITLE;
      card.type = "Class";
      card.entry = entry;
      card.description = notes;
      if (oldStandalone) removeStoryCardByTitle("UNSAID Config");
    }
  }

  if (card) {
    if (!card.entry || card.entry.indexOf(CONFIG_SECTION_UNSAID) === -1) card.entry = renderUnsaidSection(UNSAID_DEFAULTS);
    if (!card.description || card.description.indexOf(CONFIG_SECTION_UNSAID) === -1) card.description = CONFIG_DEFAULT_UNSAID_NOTES_SECTION;
  }
  return card;
}

function resetCodexTrackingState() {
  if (!state.unsaid || !state.unsaid.codex) return;
  const codex = state.unsaid.codex;
  codex.attempts = {};
  codex.mentionCounts = {};
  codex.firstSeenTurn = {};
  codex.introducedTurn = {};
  codex.likelyCharacters = {};
  codex.observedTypes = {};
  codex.lastAttemptTurn = {};
  codex.appearanceTurns = {};
  codex.evidence = {};
  codex.lastMentionTurn = {};
  codex.pendingNames = [];
  codex.pendingTypes = {};
  codex.consecutiveFailedNames = [];
  codex.lastTriggerTurn = 0;
}

function readUnsaidConfig() {
  const card = ensureSharedConfigCard();
  if (!card) return { ...UNSAID_DEFAULTS, cast: [] };

  const preAuthoringNote = "Pre-authoring a character's inner life: write \"💭 Inner Life — private, not visible to other characters\" followed by \"Core truth:\" and their established truth into a character's own Notes before their first reveal, and UNSAID will start from that instead of inventing one. Matches the same format this script writes when it syncs a reveal, so copying an existing character's Notes as a template works too.";
  let unsaidNotes = extractConfigSection(card.description, CONFIG_SECTION_UNSAID) || CONFIG_DEFAULT_UNSAID_NOTES_SECTION;
  if (!unsaidNotes.includes("Commands (type as an action):")) {
    unsaidNotes = CONFIG_SECTION_UNSAID + "\n" +
      "Commands (type as an action):\n" +
      "- /unsaid status — writes a live status report to a separate \"UNSAID — Status\" card. Not sent to the AI.\n" +
      "- /peek <character name> — force a private thought from that character right now.\n" +
      "- /peek <character name> core — force a check for whether this moment has changed that character's core truth.\n" +
      "- /card <character name> — force Codex to write or refresh that character's Story Card right now, skipping the mention count and cooldown.\n\n" +
      preAuthoringNote + "\n\n" +
      unsaidNotes.replace(CONFIG_SECTION_UNSAID + "\n", "");
  } else if (!unsaidNotes.includes("Pre-authoring a character's inner life:")) {
    const cardLine = "- /card <character name> — force Codex to write or refresh that character's Story Card right now, skipping the mention count and cooldown.";
    unsaidNotes = unsaidNotes.includes(cardLine)
      ? unsaidNotes.replace(cardLine, cardLine + "\n\n" + preAuthoringNote)
      : unsaidNotes.replace(CONFIG_SECTION_UNSAID + "\n", CONFIG_SECTION_UNSAID + "\n" + preAuthoringNote + "\n\n");
  }
  card.description = spliceConfigSection(card.description, CONFIG_SECTION_UNSAID, unsaidNotes);

  const cfg = { ...UNSAID_DEFAULTS };
  const entrySection = extractConfigSection(card.entry, CONFIG_SECTION_UNSAID);

  const enabledMatch = entrySection.match(/Enable UNSAID:\s*(true|false)/i);
  if (enabledMatch) cfg.enabled = enabledMatch[1].toLowerCase() === "true";

  const codexMatch = entrySection.match(/Enable Codex:\s*(true|false)/i);
  if (codexMatch) cfg.codexEnabled = codexMatch[1].toLowerCase() === "true";

  const showInStoryMatch = entrySection.match(/Show private thoughts in the story text:\s*(true|false)/i);
  if (showInStoryMatch) cfg.showThoughtsInStory = showInStoryMatch[1].toLowerCase() === "true";

  const subtleHintsMatch = entrySection.match(/subtly color actions:\s*(true|false)/i);
  if (subtleHintsMatch) cfg.subtleHints = subtleHintsMatch[1].toLowerCase() === "true";

  const jsonNotesMatch = entrySection.match(/Store card notes as JSON:\s*(true|false)/i);
  if (jsonNotesMatch) cfg.jsonNotes = jsonNotesMatch[1].toLowerCase() === "true";

  const coreShiftMatch = entrySection.match(/rewrite a core truth:\s*(true|false)/i);
  if (coreShiftMatch) cfg.allowCoreShift = coreShiftMatch[1].toLowerCase() === "true";

  const chanceMatch = entrySection.match(/thought per turn[^:]*:\s*([\d.]+)/i);
  if (chanceMatch) {
    const parsedChance = parseFloat(chanceMatch[1]);
    if (!isNaN(parsedChance)) cfg.chance = Math.min(1, Math.max(0, parsedChance));
  }

  const cooldownMatch = entrySection.match(/think again:\s*(\d+)/i);
  if (cooldownMatch) {
    const parsedCooldown = parseInt(cooldownMatch[1], 10);
    if (!isNaN(parsedCooldown)) cfg.cooldown = Math.min(500, Math.max(0, parsedCooldown));
  }

  const reduceMatch = entrySection.match(/Ease off during your own Do\/Say actions:\s*(true|false)/i);
  if (reduceMatch) cfg.reduceDuringActions = reduceMatch[1].toLowerCase() === "true";

  const recentTurnsMatch = entrySection.match(/Recent turns counted as "active":\s*(\d+)/i);
  if (recentTurnsMatch) {
    const parsedRecentTurns = parseInt(recentTurnsMatch[1], 10);
    if (!isNaN(parsedRecentTurns)) cfg.recentTurnsWindow = Math.min(20, Math.max(1, parsedRecentTurns));
  }

  const mentionMatch = entrySection.match(/Mentions needed before Codex creates a card:\s*(\d+)/i);
  if (mentionMatch) {
    const parsedMentions = parseInt(mentionMatch[1], 10);
    if (!isNaN(parsedMentions)) cfg.mentionThreshold = Math.min(50, Math.max(1, parsedMentions));
  }

  const codexCooldownMatch = entrySection.match(/Minimum turns between Codex cards:\s*(\d+)/i);
  if (codexCooldownMatch) {
    const parsedCodexCooldown = parseInt(codexCooldownMatch[1], 10);
    if (!isNaN(parsedCodexCooldown)) cfg.codexCooldown = Math.min(500, Math.max(0, parsedCodexCooldown));
  }

  const codexAttemptsMatch = entrySection.match(/Codex retries before giving up on a name:\s*(\d+)/i);
  if (codexAttemptsMatch) {
    const parsedAttempts = parseInt(codexAttemptsMatch[1], 10);
    if (!isNaN(parsedAttempts)) cfg.codexMaxAttempts = Math.min(50, Math.max(1, parsedAttempts));
  }

  const codexMinObserveMatch = entrySection.match(/Minimum story turns to observe a newly introduced character before carding:\s*(\d+)/i);
  if (codexMinObserveMatch) {
    const parsedMinObserve = parseInt(codexMinObserveMatch[1], 10);
    if (!isNaN(parsedMinObserve)) cfg.codexCharacterMinTurns = Math.max(0, parsedMinObserve);
  }

  const codexAppearanceMatch = entrySection.match(/Minimum on-screen appearances before normal character carding:\s*(\d+)/i);
  if (codexAppearanceMatch) {
    const parsedAppearances = parseInt(codexAppearanceMatch[1], 10);
    if (!isNaN(parsedAppearances)) cfg.codexCharacterMinAppearances = Math.max(1, Math.min(20, parsedAppearances));
  }

  const codexDeadlineMatch = entrySection.match(/Maximum turns before a newly introduced character card is forced:\s*(\d+)/i);
  if (codexDeadlineMatch) {
    const parsedDeadline = parseInt(codexDeadlineMatch[1], 10);
    if (!isNaN(parsedDeadline)) cfg.codexCharacterDeadline = Math.max(1, parsedDeadline);
  }
  cfg.codexCharacterMinTurns = Math.min(100, Math.max(0, cfg.codexCharacterMinTurns));
  cfg.codexCharacterDeadline = Math.min(200, Math.max(cfg.codexCharacterMinTurns, cfg.codexCharacterDeadline));

  const resetMatch = entrySection.match(/Reset Codex tracking now:\s*(true|false)/i);
  if (resetMatch && resetMatch[1].toLowerCase() === "true") {
    resetCodexTrackingState();
  }

  const playerMatch = entrySection.match(/Player character \(skip when Codexing\):[ \t]*(.*)/i);
  if (playerMatch) cfg.playerName = playerMatch[1].trim().slice(0, 80);

  // If nothing was typed into the config card, fall back to a name-like
  // scenario placeholder answer (e.g. a Character Creator's "What is your
  // character's name?" prompt) — saves a manual setup step, and a value
  // typed into the config card always overrides this.
  if (!cfg.playerName && typeof state !== "undefined" && Array.isArray(state.placeholders)) {
    const nameAnswer = state.placeholders.find(p => {
      if (!p || typeof p.question !== "string" || typeof p.answer !== "string" || !p.answer.trim()) return false;
      const q = p.question;
      if (!/\bname\b/i.test(q)) return false;
      // Avoid treating world-building prompts such as "What is your
      // kingdom's name?" as the player's identity.
      if (/\b(?:kingdom|realm|city|town|village|country|nation|planet|world|ship|starship|faction|guild|clan|company|organization|organisation|pet|companion|weapon|item)\b/i.test(q)) return false;
      return /\b(?:your|character|player|protagonist|hero)\b/i.test(q);
    });
    if (nameAnswer) cfg.playerName = nameAnswer.answer.trim();
  }

  const markerIdx = unsaidNotes.indexOf(CAST_LIST_MARKER);
  const castSection = markerIdx >= 0 ? unsaidNotes.slice(markerIdx + CAST_LIST_MARKER.length) : "";

  cfg.cast = castSection
    .split("\n")
    .map(line => line.trim().replace(/^[-•*]\s*/, "").slice(0, 80))
    .filter(Boolean)
    .filter((name, index, arr) =>
      arr.findIndex(other => isSameCardEntity(other, name)) === index
    );

  const knownLower = cfg.cast.map(n => n.toLowerCase());
  let adopted = false;
  let adoptedThisPass = 0;
  storyCards.forEach(c => {
    if (adoptedThisPass >= 20) return;
    if (!c.title) return;

    // Opt-IN on type, not opt-out: only adopt a card whose type is blank
    // (common for casually-made character cards) or literally "character"
    // in any casing. Enumerating known non-character types (location,
    // faction, item, class, and whatever else) can never keep up with
    // scenarios that use their own rich custom typing — a real game
    // observed via user report had "Business", "Restaurant", "Vehicle",
    // "Clothing", "Animal Spirit" card types, none of which matched the
    // old exclusion list, so a fried chicken restaurant and a 1965 Mustang
    // ended up in the cast getting private thoughts generated for them.
    // A card explicitly typed as anything other than blank/"character" is
    // a clear, deliberate signal from the player that it isn't a person.
    const rawType = (c.type || "").trim().toLowerCase();
    if (rawType && rawType !== "character") return;
    if (isOwnCard(c.title)) return;
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
    // trim first: the extracted section may already carry a trailing
    // newline left by the previous splice, and blindly appending another
    // would compound one extra blank line per adoption event over time
    unsaidNotes = unsaidNotes.replace(/\s+$/, "") + "\n" + newlyAdopted.join("\n");
  }

  if (cfg.playerName) {
    const beforeCount = cfg.cast.length;
    cfg.cast = cfg.cast.filter(n => !isSameCardEntity(n, cfg.playerName));
    if (cfg.cast.length !== beforeCount) {
      const markerIdx2 = unsaidNotes.indexOf(CAST_LIST_MARKER);
      if (markerIdx2 !== -1) {
        const head = unsaidNotes.slice(0, markerIdx2 + CAST_LIST_MARKER.length);
        unsaidNotes = `${head}\n${cfg.cast.join("\n")}`;
      }
    }
  }

  // Nothing previously capped how large this list could grow — over a
  // genuinely long game with hundreds of Codex-carded characters, this
  // both bloats the config card itself and, more importantly, means
  // `active = cfg.cast.filter(name => nameAppears(name, recent))` below
  // runs one regex test per cast member on every single turn, which
  // starts to matter against the platform's 2-second-per-hook execution
  // limit. Reading Auto-Cards' source directly for this round surfaced
  // exactly this discipline throughout their own code — they cap every
  // growing collection (candidate titles, memory banks, pending queues)
  // rather than letting any of them grow unboundedly, for the same
  // reason. Trimming the oldest-adopted names first (the ones least
  // likely to still be narratively active) is the same tradeoff the
  // Codex log already makes at its own cap.
  if (MAX_CAST_SIZE < cfg.cast.length) {
    cfg.cast = cfg.cast.slice(cfg.cast.length - MAX_CAST_SIZE);
    const markerIdx3 = unsaidNotes.indexOf(CAST_LIST_MARKER);
    if (markerIdx3 !== -1) {
      const head = unsaidNotes.slice(0, markerIdx3 + CAST_LIST_MARKER.length);
      unsaidNotes = `${head}\n${cfg.cast.join("\n")}`;
    }
  }

  card.description = spliceConfigSection(card.description, CONFIG_SECTION_UNSAID, unsaidNotes);
  card.entry = spliceConfigSection(card.entry, CONFIG_SECTION_UNSAID, renderUnsaidSection(cfg));

  return cfg;
}

function stripConfigNoise(text) {
  let cleaned = text;
  storyCards
    .filter(c => isCardOfKind(c, "class") && isOwnCard(c.title))
    .forEach(card => {
      // Guard against stripping on trivially short content — several of our
      // own admin cards can deliberately use a single-space entry,
      // kept out of AI context on purpose). Splitting on " " itself would
      // strip every space out of the whole text, which is exactly what was
      // happening here. Only strip substantial, genuinely-our-own content.
      if (card.entry && card.entry.trim().length > 10) cleaned = cleaned.split(card.entry).join("");
      if (card.description && card.description.trim().length > 10) cleaned = cleaned.split(card.description).join("");
    });
  return cleaned;
}

function fitInstructionToBudget(baseText, instruction) {
  const hasBudget = typeof info !== "undefined" && info && typeof info.maxChars === "number";
  if (!hasBudget) return instruction;

  const budget = Math.max(0, info.maxChars - CONTEXT_SAFETY_MARGIN);
  const baseLength = typeof baseText === "string" ? baseText.length : 0;
  if ((baseLength + instruction.length) <= budget) return instruction;

  const room = budget - baseLength;
  if (room <= 40) return null;

  // Never chop a structured request through its closing marker. A truncated
  // CARD or private-thought template is worse than waiting a turn because it
  // virtually guarantees an unusable response and burns retry budget.
  const structured = /【CARD】|【\/CARD】|《|》/.test(instruction);
  if (structured) return null;

  return instruction.slice(0, Math.max(0, room - 4)).replace(/\s+$/, "") + "...]\n";
}


// Codex used to treat every capitalized entity the same and wait for a raw
// mention threshold. That makes a real character introduction unnecessarily
// slow, while the global card cooldown can make a failed first attempt take
// many more turns. These cues are deliberately person-shaped: self
// introductions, speech/action attribution, a person noun attached to the
// name, or a possessive body/voice cue. Locations/items/factions still use
// the normal mention-threshold path.
function isLikelyCharacterIntroduction(name, text) {
  const source = typeof text === "string" ? text : "";
  if (!source || !name) return false;

  // Do not let generic movement/dialogue cues promote an ordinary sentence
  // starter into a person. A stop-word-like name must first be explicitly
  // named ("I'm Six", "a woman named Six", etc.).
  if (!normalizeCodexCandidate(name, source) &&
      !isEstablishedExplicitCodexCharacter(name)) return false;

  const n = escapeForRegex(name);

  // Presence cues are intentionally stronger than a plain mention. This is
  // what separates "Mirelle said you'd be coming" from Mirelle actually
  // entering, speaking, moving, or being physically described in the scene.
  const directCues = [
    new RegExp(`\\b(?:I\\s*(?:am|'m|’m)|my\\s+name\\s+is|name\\s*(?:is|'s|’s)|call\\s+me|this\\s+is|meet|known\\s+as|go\\s+by)\\s+["“”'‘’]?${n}\\b`, "i"),
    new RegExp(`\\b(?:you|he|she|they|we)\\s+(?:see|spot|notice|meet|find|face|approach|watch|hear)\\s+(?:the\\s+|a\\s+|an\\s+)?${n}\\b`, "i"),
    new RegExp(`\\b${n}(?:'s|’s)\\s+(?:eyes?|voice|hands?|face|expression|smile|gaze|shoulders?|breath|hair|fingers?|arms?|feet|heart|cheeks?|lips?|posture|jaw|stance|grip|step|footsteps?)\\b`, "i"),
    new RegExp(`\\b${n}\\b[^\\n.!?]{0,64}\\b(?:steps?|stepped|walks?|walked|approaches?|approached|enters?|entered|arrives?|arrived|comes?|came|sits?|sat|stands?|stood|leans?|leaned|reaches?|reached|turns?|turned|looks?|looked|glances?|glanced|stares?|stared|smiles?|smiled|frowns?|frowned|nods?|nodded|shrugs?|shrugged|runs?|ran|follows?|followed|kneels?|knelt|rises?|rose|flinches?|flinched|grabs?|grabbed|takes?|took|places?|placed|pushes?|pushed|pulls?|pulled|moves?|moved|laughs?|laughed|sighs?|sighed|winces?|winced|swallows?|swallowed|gestures?|gestured|speaks?|spoke)\\b`, "i"),
    new RegExp(`\\b(?:a|an|the)\\s+(?:young\\s+|old\\s+|elderly\\s+)?(?:girl|boy|woman|man|person|lady|gentleman|teenager|teen|child|youth|guard|soldier|knight|mage|wizard|witch|priest|priestess|captain|doctor|merchant|stranger|traveler|traveller|officer|detective|pilot|engineer|nurse|bartender|teacher|professor|student|lawyer|attorney|judge|athlete|coach|musician|singer|actor|artist|scientist|researcher|agent|android|robot|synthetic|AI|alien|creature|spirit|ghost|vampire|werewolf|superhero|hero|villain|elf|dwarf|orc|fae|demon|angel|dragon|deity|god|goddess|dog|cat|horse|animal|companion)\\s+(?:named|called)\\s+${n}\\b`, "i"),
    new RegExp(`\\b${n}\\b\\s+(?:says?|asks?|replies?|answers?|whispers?|murmurs?|shouts?|calls?|adds?|admits?|explains?|insists?|snaps?|growls?|mutters?|laughs?|sighs?)\\s*[,.:!?-]?\\s*["“]`, "i"),
    new RegExp(`["”][^\\n]{0,40}\\b${n}\\b\\s+(?:says?|asks?|replies?|answers?|whispers?|murmurs?|shouts?|adds?|admits?|explains?|insists?|snaps?|growls?|mutters?)\\b`, "i")
  ];

  return directCues.some(re => re.test(source));
}

function codexEvidenceSentences(name, source) {
  if (!name || !source) return [];
  const chunks = String(source).match(/[^.!?\n]+(?:[.!?]+|$)/g) || [String(source)];
  const results = [];
  for (const raw of chunks) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line || !nameAppears(name, line)) continue;
    const clipped = line.length > CODEX_EVIDENCE_SNIPPET_LENGTH
      ? line.slice(0, CODEX_EVIDENCE_SNIPPET_LENGTH - 1).trimEnd() + "…"
      : line;
    if (!results.includes(clipped)) results.push(clipped);
    if (results.length >= 2) break;
  }
  return results;
}

function recordCodexEvidence(name, source, countsAsAppearance) {
  const codex = state.unsaid.codex;
  if (!codex.evidence[name]) codex.evidence[name] = [];
  const snippets = codexEvidenceSentences(name, source);
  snippets.forEach(snippet => {
    const duplicate = codex.evidence[name].some(item =>
      item && typeof item.text === "string" && item.text.toLowerCase() === snippet.toLowerCase()
    );
    if (!duplicate) codex.evidence[name].push({ turn: state.unsaid.turn, text: snippet });
  });
  if (codex.evidence[name].length > CODEX_EVIDENCE_PER_NAME) {
    codex.evidence[name] = codex.evidence[name].slice(-CODEX_EVIDENCE_PER_NAME);
  }

  if (countsAsAppearance) {
    if (!Array.isArray(codex.appearanceTurns[name])) codex.appearanceTurns[name] = [];
    if (!codex.appearanceTurns[name].includes(state.unsaid.turn)) {
      codex.appearanceTurns[name].push(state.unsaid.turn);
      if (codex.appearanceTurns[name].length > 30) {
        codex.appearanceTurns[name] = codex.appearanceTurns[name].slice(-30);
      }
    }
  }
}

function codexAppearanceCount(name) {
  const turns = state.unsaid.codex.appearanceTurns && state.unsaid.codex.appearanceTurns[name];
  return Array.isArray(turns) ? turns.length : 0;
}

function trackMentions(text, observeIntroductions) {
  if (!state.unsaid || !state.unsaid.codex) return;
  const source = typeof text === "string" ? text : "";
  if (!source) return;

  const canConfirmIntroductions = observeIntroductions !== false;
  const matches = source.match(CODEX_TITLE_ABBREV_REGEX) || [];
  const seenThisPass = new Set();
  const actionEpoch = (typeof info !== "undefined" && info && Number.isInteger(info.actionCount))
    ? info.actionCount
    : state.unsaid.turn;

  matches.forEach(raw => {
    let name = normalizeCodexCandidate(raw, source);

    // Once an unusual stop-word-like character was explicitly introduced,
    // keep recognizing that established name on later turns. The original
    // explicit naming evidence remains the trust anchor; this does not
    // resurrect old junk candidates that lack such evidence.
    if (!name) {
      const rawName = stripPossessive(String(raw || "").trim());
      const established = Object.keys(state.unsaid.codex.likelyCharacters || {})
        .find(k => isEstablishedExplicitCodexCharacter(k) && isSameCardEntity(k, rawName));
      if (established) name = established;
    }
    if (!name) return;

    const keys = Object.keys(state.unsaid.codex.mentionCounts);
    const exactKey = keys.find(k => k.toLowerCase() === name.toLowerCase());
    const fuzzyKey = exactKey || keys.find(k => isSameCardEntity(k, name));
    const key = fuzzyKey || name;
    if (seenThisPass.has(key)) return;
    seenThisPass.add(key);

    // Count at most once per action epoch. Repeating a name five times in one
    // paragraph should not make it look five turns more established.
    if (state.unsaid.codex.lastMentionTurn[key] !== actionEpoch) {
      state.unsaid.codex.mentionCounts[key] = (state.unsaid.codex.mentionCounts[key] || 0) + 1;
      state.unsaid.codex.lastMentionTurn[key] = actionEpoch;
    }
    if (typeof state.unsaid.codex.firstSeenTurn[key] !== "number") {
      state.unsaid.codex.firstSeenTurn[key] = state.unsaid.turn;
    }

    const presence = canConfirmIntroductions && isLikelyCharacterIntroduction(key, source);
    const observedType = presence ? "character" : classifyCodexEntry(key, source);
    if (!state.unsaid.codex.observedTypes[key] || observedType !== "character") {
      state.unsaid.codex.observedTypes[key] = observedType;
    }

    if (presence) {
      if (!state.unsaid.codex.likelyCharacters[key]) {
        state.unsaid.codex.likelyCharacters[key] = true;
        state.unsaid.codex.introducedTurn[key] = state.unsaid.turn;
      }
      state.unsaid.codex.observedTypes[key] = "character";
      recordCodexEvidence(key, source, true);
    } else if (canConfirmIntroductions && state.unsaid.codex.likelyCharacters[key]) {
      // Once a person has genuinely appeared, later references are still
      // useful evidence even if this specific sentence is off-screen.
      recordCodexEvidence(key, source, false);
    } else if (canConfirmIntroductions && observedType !== "character") {
      // Non-character entities need their own evidence too. Without this,
      // an automatically detected item/location/faction could reach the
      // mention threshold with no targeted context saved for the card prompt,
      // making nearby objects or foods much easier for the model to confuse.
      recordCodexEvidence(key, source, false);
    }
  });

  pruneMentionCounts();
}


function pruneMentionCounts() {
  const counts = state.unsaid.codex.mentionCounts;
  Object.keys(counts).forEach(name => {
    if (storyCards.some(c => c.title && isSameCardEntity(c.title, name))) {
      forgetMentionTracking(name);
      return;
    }

    // Clean up stale garbage left in persistent state by older builds.
    // This happens automatically on the next real turn, so names such as
    // Which / Six / S / Burying / Already / To cannot remain eligible just
    // because they accumulated mentions before this filter existed.
    if (!isSafeTrackedCodexName(name)) {
      forgetMentionTracking(name);
    }
  });

  const keys = Object.keys(counts);
  if (keys.length > MENTION_TRACKING_CAP + 50) {
    keys
      .sort((a, b) => {
        const aProtected = state.unsaid.codex.likelyCharacters[a] ? 1 : 0;
        const bProtected = state.unsaid.codex.likelyCharacters[b] ? 1 : 0;
        if (aProtected !== bProtected) return aProtected - bProtected;
        const countDiff = (counts[a] || 0) - (counts[b] || 0);
        if (countDiff !== 0) return countDiff;
        return (state.unsaid.codex.firstSeenTurn[a] || 0) - (state.unsaid.codex.firstSeenTurn[b] || 0);
      })
      .slice(0, keys.length - MENTION_TRACKING_CAP)
      .forEach(forgetMentionTracking);
  }

  const attempts = state.unsaid.codex.attempts;
  Object.keys(attempts).forEach(name => {
    if (!(name in counts)) delete attempts[name];
  });
}

function classifyCodexEntry(name, text) {
  // Strong on-screen person evidence outranks a misleading noun-shaped name.
  // A character can genuinely be named River, Castle, Angel, etc.
  if (isLikelyCharacterIntroduction(name, text)) return "character";
  if (CODEX_LOCATION_HINTS.test(name)) return "location";
  if (CODEX_LOCATION_SUFFIX_HINTS.test(name)) return "location";
  if (CODEX_FACTION_HINTS.test(name)) return "faction";
  if (CODEX_ITEM_HINTS.test(name)) return "item";

  const n = escapeForRegex(name);
  const nearLocation = new RegExp(`(in|inside|outside|through|into)\\s+(?:the\\s+)?${n}\\b`, "i");
  const describedAsLocation = new RegExp(`\\b(?:city|town|village|hamlet|kingdom|realm|district|region|port|harbor|harbour|forest|woods|mountain|valley|island|station|outpost|colony|settlement|tavern|inn|hotel|motel|castle|fortress|temple|academy|school|college|university|campus|facility|base|office|apartment|house|home|warehouse|factory|farm|ranch|arena|stadium|courtroom|courthouse|prison|jail|theater|theatre|museum|library|mall|market|beach|cave|mine|ruins?|cemetery|graveyard|neighbou?rhood|suburb)\\s+(?:of|called|named)\\s+${n}\\b|\\b${n}\\b\\s+(?:is|was)\\s+(?:an?\\s+|the\\s+)?(?:city|town|village|hamlet|kingdom|realm|district|region|port|harbor|harbour|forest|station|outpost|colony|settlement|tavern|inn|hotel|motel|castle|fortress|temple|academy|school|college|university|campus|facility|base|office|apartment|house|home|warehouse|factory|farm|ranch|arena|stadium|courtroom|courthouse|prison|jail|theater|theatre|museum|library|mall|market|beach|cave|mine|ruins?|cemetery|graveyard|neighbou?rhood|suburb)\\b`, "i");
  if (nearLocation.test(text) || describedAsLocation.test(text)) return "location";

  const nearItem = new RegExp(`(wields?|holds?|wearing|wears|wore|donned|dressed\\s+in|put\\s+on|slipped\\s+into|using|uses|draws?|grips?|picks?\\s+up|holsters?|drove|drives|driving|parked|rode|riding|climbed\\s+into|hopped\\s+into|flew|flying|piloted|piloting|boarded|boarding|launched|launching|docked|docking)\\s+(the\\s+|a\\s+|an\\s+|his\\s+|her\\s+|their\\s+)?${n}\\b`, "i");
  const describedAsItem = new RegExp(`\\b(?:sword|blade|gun|rifle|pistol|staff|wand|amulet|ring|artifact|device|weapon|tool|key|book|tome|relic|ship|starship|vehicle|car|truck|motorcycle|bicycle|train|boat|robot|android|mech|phone|computer|laptop|camera|instrument|guitar|document|letter|contract|map|medicine|medication|serum)\\s+(?:called|named)\\s+${n}\\b|\\b${n}\\b\\s+(?:is|was)\\s+(?:an?\\s+|the\\s+)?(?:sword|blade|gun|rifle|pistol|staff|wand|amulet|ring|artifact|device|weapon|tool|key|book|tome|relic|ship|starship|vehicle|car|truck|motorcycle|bicycle|train|boat|robot|android|mech|phone|computer|laptop|camera|instrument|guitar|document|letter|contract|map|medicine|medication|serum)\\b`, "i");
  if (nearItem.test(text) || describedAsItem.test(text)) return "item";

  // Ordinary food words are filtered from automatic discovery, but a
  // deliberately named/signature consumable can still be a legitimate item
  // card when the story explicitly presents it as one.
  const describedAsConsumable = new RegExp(
    `\\b(?:dish|meal|food|drink|beverage|cocktail|mocktail|dessert|recipe|menu\\s+item|special)\\s+` +
    `(?:called|named|known\\s+as|dubbed)\\s+["“”'‘’]?${n}\\b|` +
    `\\b${n}\\b\\s+(?:is|was)\\s+(?:an?\\s+|the\\s+)?` +
    `(?:dish|meal|food|drink|beverage|cocktail|mocktail|dessert|recipe|menu\\s+item|special)\\b`,
    "i"
  );
  if (describedAsConsumable.test(text)) return "item";

  // A name with no recognizable keyword in itself ("Dragon's Breath Fried
  // Chicken" contains no obvious business word) can still be caught from
  // how the story actually refers to it — ordering food from it, working
  // at it, being a customer of it all point at an organization/venue.
  // Deliberately specific phrases only — a bare "at"/"from" would also
  // match ordinary location references ("stood at the harbor") and
  // misclassify those instead.
  const nearBusiness = new RegExp(`(ordered\\s+from|ate\\s+at|dined\\s+at|grabbed\\s+(food\\s+)?from|work(?:s|ed)?\\s+(at|for)|employed\\s+(at|by)|shops?\\s+at|shopping\\s+at)\\s+${escapeForRegex(name)}\\b`, "i");
  if (nearBusiness.test(text)) return "faction";

  // A generic name ("Silver Hand", "VyrMusic") is often immediately
  // followed by the word that actually classifies it ("Silver Hand
  // guild", "VyrMusic app") — the hint checks above only look inside the
  // name itself, so this catches the same signal sitting just outside it.
  const followedByFactionWord = new RegExp(`${n}\\s+(order|guild|alliance|empire|faction|clan|brotherhood|council|syndicate|coalition|army|legion|cult|society|corporation|compan(?:y|ies)|division|agency|federation|dynasty|tribe|app|platform|website|network|restaurant|diner|caf[eé]|bakery|store|shop|team|club|league|union|association|foundation|charity|department|bureau|committee|party|campaign|band|orchestra|label|school|college|university|crew|fleet|police|government)\\b`, "i");
  const describedAsFaction = new RegExp(`\\b(?:order|guild|alliance|faction|clan|brotherhood|council|syndicate|coalition|company|corporation|agency|organization|organisation|group|gang|cult|society|restaurant|store|shop|brand|network|team|club|league|union|association|foundation|charity|department|bureau|committee|party|campaign|band|orchestra|label|school|college|university|crew|fleet|police|government)\\s+(?:called|named)\\s+${n}\\b|\\b${n}\\b\\s+(?:is|was)\\s+(?:an?\\s+|the\\s+)?(?:order|guild|alliance|faction|clan|brotherhood|council|syndicate|coalition|company|corporation|agency|organization|organisation|group|gang|cult|society|restaurant|store|shop|brand|network|team|club|league|union|association|foundation|charity|department|bureau|committee|party|campaign|band|orchestra|label|school|college|university|crew|fleet|police|government)\\b`, "i");
  if (followedByFactionWord.test(text) || describedAsFaction.test(text)) return "faction";

  return "character";
}

// A courtesy title alone doesn't identify anyone — "Mr. Carver" and
// "Ms. Ogena" refer to the same people as "Carver"/"Carver Graywolf" and
// "Jessica Ogena," but the word-subset check below couldn't see that
// whenever the title word added an extra word beyond what the full name
// already had, since neither side was then a subset of the other.
// Confirmed directly from a real player's status report: "Mr. Carver,"
// "Mr. Graywolf," "Ms. Ogena," and "Miss Ogena" were all separately
// burning their own 5-attempt Codex retry budget as if each were a
// distinct, never-before-seen person, alongside "Carver," "Carver
// Graywolf," and "Jessica Ogena" already being tracked under their own
// names — pure waste on names that were never actually new. Stripping a
// leading courtesy title before comparing closes that gap the same way
// for every matching/dedup use of this function at once.
var COURTESY_TITLE_WORDS = new Set(["mr", "mrs", "ms", "miss", "dr", "sir", "lady", "lord", "madam", "mx"]);
function stripCourtesyTitle(words) {
  if (words.length > 1 && COURTESY_TITLE_WORDS.has(words[0].replace(/\.$/, ""))) {
    return words.slice(1);
  }
  return words;
}

function isSameCardEntity(cardTitle, candidateName) {
  if (!cardTitle || !candidateName || isOwnCard(cardTitle)) return false;

  const normalizeWords = (value) => {
    const cleaned = String(value)
      .toLowerCase()
      .replace(/[“”"'‘’.,:;!?()[\]{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripCourtesyTitle(cleaned.split(" ").filter(Boolean));
  };

  const titleWords = normalizeWords(cardTitle);
  const nameWords = normalizeWords(candidateName);
  if (!titleWords.length || !nameWords.length) return false;
  if (titleWords.join(" ") === nameWords.join(" ")) return true;

  const shorter = titleWords.length <= nameWords.length ? titleWords : nameWords;
  const longer = titleWords.length <= nameWords.length ? nameWords : titleWords;

  // Require the shorter alias to appear contiguously. This keeps useful
  // "Harlan" <-> "Harlan Voss" matching while avoiding arbitrary word-set
  // matches such as reversed or interleaved names.
  for (let i = 0; i <= longer.length - shorter.length; i++) {
    let allMatch = true;
    for (let j = 0; j < shorter.length; j++) {
      if (longer[i + j] !== shorter[j]) { allMatch = false; break; }
    }
    if (allMatch) return shorter.length > 1 || shorter[0].length >= 3;
  }
  return false;
}

var CARD_TYPE_DISPLAY = { character: "Character", location: "Location", item: "Item", faction: "Faction" };
function findStoryCardForEntity(name) {
  if (!name || typeof storyCards === "undefined" || !Array.isArray(storyCards)) return null;

  const clean = (value) => String(value || "")
    .toLowerCase()
    .replace(/[“”"'‘’.,:;!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const exact = storyCards.filter(card =>
    card && card.title && !isOwnCard(card.title) && clean(card.title) === clean(name)
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact[0];

  const fuzzy = storyCards.filter(card =>
    card && card.title && isSameCardEntity(card.title, name)
  );
  return fuzzy.length === 1 ? fuzzy[0] : null;
}

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
  const likelyCharacters = state.unsaid.codex.likelyCharacters || {};
  const introducedTurn = state.unsaid.codex.introducedTurn || {};
  const observedTypes = state.unsaid.codex.observedTypes || {};
  const eligible = [];

  for (const name in counts) {
    const introducedCharacter = !!likelyCharacters[name];

    // Revalidate at scheduling time as a second line of defense. This also
    // protects against old persisted state that reaches Context before the
    // normal scanner has had a chance to touch it.
    if (!isSafeTrackedCodexName(name)) {
      forgetMentionTracking(name);
      continue;
    }

    if (!introducedCharacter && counts[name] < threshold) continue;
    if (exclude.some(ex => isSameCardEntity(ex, name))) continue;
    if (storyCards.some(c => isSameCardEntity(c.title, name))) continue;

    // Character-shaped names are NOT auto-carded from hearsay/backstory
    // mentions alone. They join automatic Codex only after Output has seen
    // a direct on-screen introduction. This prevents "Mirelle said..."
    // from producing a profile before Mirelle ever appears.
    if (!introducedCharacter && (observedTypes[name] || "character") === "character") continue;

    // Introduced characters are never permanently exhausted; other entity
    // types still respect the configurable retry cap.
    if (!introducedCharacter && (state.unsaid.codex.attempts[name] || 0) >= cap) continue;

    eligible.push({
      name,
      count: counts[name],
      fastTrack: introducedCharacter,
      introduced: typeof introducedTurn[name] === "number"
        ? introducedTurn[name]
        : Number.MAX_SAFE_INTEGER
    });
  }

  eligible.sort((a, b) => {
    if (a.fastTrack !== b.fastTrack) return a.fastTrack ? -1 : 1;
    if (a.fastTrack && a.introduced !== b.introduced) return a.introduced - b.introduced;
    return b.count - a.count;
  });

  const picked = [];
  for (const candidate of eligible) {
    if (picked.length >= limit) break;
    if (picked.some(p => isSameCardEntity(p.name, candidate.name))) continue;
    picked.push(candidate);
  }
  return picked.map(p => p.name);
}


function buildCodexInstruction(names, text, forced, priorFailures, hardDeadline, compact) {
  const failures = typeof priorFailures === "number" ? priorFailures : 0;

  const blocks = names.map((name, i) => {
    const trackedType = state.unsaid.codex.likelyCharacters[name]
      ? "character"
      : (state.unsaid.codex.observedTypes[name] || null);
    const type = trackedType || classifyCodexEntry(name, text);
    const fields = CARD_TEMPLATES[type] || CHARACTER_CARD_FIELDS;
    const body = fields.map(f => `${f}: ${f === "Name" ? name : "..."}`).join("\n");
    const mind = type === "character" ? state.unsaid.minds[name] : null;
    const knownNote = mind && mind.core
      ? ` Already-established private truth: "${mind.core}". Personality and Background must agree with it.`
      : "";
    const correctionNote = type === "character"
      ? ` If "${name}" is genuinely a location, item, or faction instead, switch to that matching template rather than pretending it is a person.`
      : "";

    const introTurn = state.unsaid.codex.introducedTurn && state.unsaid.codex.introducedTurn[name];
    const observedTurns = type === "character" && typeof introTurn === "number"
      ? Math.max(0, state.unsaid.turn - introTurn)
      : null;
    const appearances = type === "character" ? codexAppearanceCount(name) : 0;
    const observationNote = observedTurns !== null
      ? ` Observed for ${observedTurns} full story turn${observedTurns === 1 ? "" : "s"} across ${appearances} on-screen appearance${appearances === 1 ? "" : "s"}.`
      : "";

    const evidenceItems = (state.unsaid.codex.evidence && state.unsaid.codex.evidence[name]) || [];
    const evidenceLimit = compact ? 1 : 3;
    const evidenceClip = compact ? 140 : 190;
    const evidenceText = evidenceItems.slice(-evidenceLimit)
      .map(item => item && item.text ? item.text.replace(/\s+/g, " ").trim().slice(0, evidenceClip) : "")
      .filter(Boolean)
      .join(" | ");
    const evidenceNote = evidenceText
      ? ` Story evidence to weigh before inferring anything: ${evidenceText}`
      : "";

    return `Profile ${i + 1} — "${name}":${knownNote}${correctionNote}${observationNote}${evidenceNote}\nIdentity lock: this block is ONLY for "${name}". Do not substitute a nearby person, food, object, place, brand, or similarly named entity. The Name field must stay "${name}".\n【CARD】\n${body}\n【/CARD】`;
  }).join("\n\n");

  let priorityLine;
  if (hardDeadline) {
    priorityLine =
      `HARD DEADLINE: write the hidden profile block${names.length > 1 ? "s" : ""} FIRST, before any visible story prose. ` +
      `Do not postpone, summarize, or skip ${names.length > 1 ? "them" : "it"}.`;
  } else if (forced) {
    priorityLine =
      `The player explicitly requested ${names.length > 1 ? "these cards" : "this card"}. ` +
      `Write the hidden profile block${names.length > 1 ? "s" : ""} FIRST, before any visible story prose.`;
  } else if (failures > 0) {
    priorityLine =
      `A previous automatic attempt did not produce a usable card. ` +
      `This retry is mandatory: write the hidden profile block${names.length > 1 ? "s" : ""} FIRST, before continuing the story.`;
  } else {
    priorityLine =
      `Before continuing the visible story, write the hidden profile block${names.length > 1 ? "s" : ""} FIRST. ` +
      `The script removes ${names.length > 1 ? "these blocks" : "this block"} before the player sees the response, so the story can continue normally afterward.`;
  }

  const rules = compact
    ? `Rules: keep the CARD markers exactly; one short concrete line per field; no blanks, "...", Unknown, N/A or TBD. The Name field must stay the exact requested entity; never substitute a nearby food/object/person/place/business. Use established evidence first and infer missing details conservatively without contradicting the story. Fit every field to the actual scenario: Race means species/nature/kind; Strength Level means relevant capability, not automatically combat; Abilities may be skills/expertise/powers/resources; Relationships must be evidence-based. Do not mention this task outside the hidden block.${forced || hardDeadline ? " Visible story prose is optional after the block." : " Continue the visible story after the block."}`
    : `Rules:
- Keep the 【CARD】 and 【/CARD】 markers exactly.
- Output exactly one short line per listed field.
- Replace every "..." with a concrete, specific value. Never leave "...", "unknown", "N/A", "TBD", or a blank field.
- The Name field must identify exactly the requested entity. Never substitute a nearby food, object, person, place, business, or similarly named thing.
- Analyze all supplied story evidence before filling fields. Repeated behavior and explicit facts outrank first impressions.
- Use established facts first. Infer only what is still missing, and keep those inferences conservative, specific, and compatible with the story.
- Do not turn hearsay into an on-screen event, invent a relationship that contradicts the text, or overstate abilities that have not been demonstrated.
- For Background/Personality/Relationships, connect details to what the character has actually said, done, feared, wanted, or been described as.
- Interpret fields in a scenario-neutral way. "Race" means species/nature/kind (Human for an ordinary human, the actual nature for an AI/robot/construct/nonhuman). "Strength Level" means relevant capability/status in THIS setting, not automatically combat power. "Abilities" can be practical skills, expertise, social/professional strengths, powers, resources, or special traits. "Weaknesses" means actual limitations/vulnerabilities, not forced combat flaws.
- Never invent magic, futuristic technology, superpowers, criminal ties, aristocratic titles, romance, military rank, or other genre-specific facts unless the scenario supports them.
- Preserve established pronouns, culture, era, technology level, social norms, power scale, and tone.
- Do not explain the profile or mention this task outside the hidden card block.
${forced || hardDeadline ? "- Once the card block is complete, visible story prose is optional this turn." : "- After the card block is complete, continue the visible story normally."}`;

  return `\n[UNSAID CODEX — mandatory script task. ${priorityLine}
${blocks}
${rules}]
`;
}

function buildAndFitCodexInstruction(names, baseText, forced, priorFailures, hardDeadline) {
  const full = buildCodexInstruction(names, baseText, forced, priorFailures, hardDeadline, false);
  return fitInstructionToBudget(baseText, full) ||
    fitInstructionToBudget(
      baseText,
      buildCodexInstruction(names, baseText, forced, priorFailures, hardDeadline, true)
    );
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
    lines.push(`⚠️ Cache-efficient mode is currently detected — private thoughts and Codex cannot function normally right now; see the warning card.`);
  }

  const mindNames = Object.keys(state.unsaid.minds);
  lines.push(`\nTracked minds (${mindNames.length}):`);
  if (mindNames.length === 0) {
    lines.push("  none yet");
  } else {
    mindNames.forEach(name => {
      const m = state.unsaid.minds[name] || {};
      const coreNote = m.core ? "has a core truth" : "no standalone thought yet";
      const lastActiveNote = m.lastTurn ? `last active turn ${m.lastTurn}` : "not yet revealed under tracking";
      lines.push(`  ${name} — ${coreNote}, feeling: ${m.feeling || "none yet"}, ${m.revealCount || 0} reveal(s), ${lastActiveNote}`);
    });
  }

  const codex = state.unsaid.codex;
  const counts = codex.mentionCounts || {};
  const attempts = codex.attempts || {};
  const tracked = Object.keys(counts);
  const likelyCharacters = codex.likelyCharacters || {};
  const introducedTurn = codex.introducedTurn || {};
  const observedTypes = codex.observedTypes || {};
  const alreadyCarded = tracked.filter(n => storyCards.some(c => c.title && isSameCardEntity(c.title, n)));
  const minObserve = Math.max(0, cfg.codexCharacterMinTurns || 0);
  const minAppearances = Math.max(1, cfg.codexCharacterMinAppearances || 1);
  const deadline = Math.max(minObserve, cfg.codexCharacterDeadline || 5);

  const introduced = tracked.filter(n =>
    likelyCharacters[n] &&
    !alreadyCarded.includes(n) &&
    typeof introducedTurn[n] === "number"
  );
  const readyCharacters = introduced.filter(n => {
    const age = state.unsaid.turn - introducedTurn[n];
    return age >= deadline || (age >= minObserve && codexAppearanceCount(n) >= minAppearances);
  });
  const waitingCharacters = introduced.filter(n => !readyCharacters.includes(n));
  const hearsayCharacters = tracked.filter(n =>
    !likelyCharacters[n] &&
    !alreadyCarded.includes(n) &&
    (observedTypes[n] || "character") === "character"
  );
  const nonCharacterEligible = tracked.filter(n =>
    !likelyCharacters[n] &&
    !alreadyCarded.includes(n) &&
    observedTypes[n] && observedTypes[n] !== "character" &&
    counts[n] >= cfg.mentionThreshold &&
    (attempts[n] || 0) < cfg.codexMaxAttempts
  );
  const exhausted = tracked.filter(n =>
    observedTypes[n] && observedTypes[n] !== "character" &&
    (attempts[n] || 0) >= cfg.codexMaxAttempts
  );

  lines.push(`\nCodex tracking: ${tracked.length} name(s)`);
  if (waitingCharacters.length > 0) {
    lines.push(`  observing on-screen characters: ${waitingCharacters.slice(0, 10).map(n => {
      const age = Math.max(0, state.unsaid.turn - introducedTurn[n]);
      const appearances = codexAppearanceCount(n);
      return `${n} (${age}/${minObserve} turns, ${appearances}/${minAppearances} appearances, ${counts[n]} mention(s))`;
    }).join(", ")}${waitingCharacters.length > 10 ? ", ..." : ""}`);
  }
  if (readyCharacters.length > 0) {
    lines.push(`  ready for a character card: ${readyCharacters.slice(0, 10).map(n => {
      const age = Math.max(0, state.unsaid.turn - introducedTurn[n]);
      return `${n} (${age} turns, ${codexAppearanceCount(n)} appearance(s))`;
    }).join(", ")}${readyCharacters.length > 10 ? ", ..." : ""}`);
  }
  if (hearsayCharacters.length > 0) {
    lines.push(`  referenced but not introduced on-screen: ${hearsayCharacters.slice(0, 10).map(n => `${n} (${counts[n]} mention(s))`).join(", ")}${hearsayCharacters.length > 10 ? ", ..." : ""}`);
  }
  if (nonCharacterEligible.length > 0) {
    lines.push(`  eligible non-character entities: ${nonCharacterEligible.slice(0, 10).map(n => `${n} (${observedTypes[n]}, ${counts[n]} mention(s))`).join(", ")}${nonCharacterEligible.length > 10 ? ", ..." : ""}`);
  }
  if (introduced.length > 0) {
    lines.push(`  character gate: ${minObserve} full turn(s) + ${minAppearances} on-screen appearance(s); hard deadline ${deadline} turn(s)`);
  }
  if (alreadyCarded.length > 0) {
    lines.push(`  already carded and skipped: ${alreadyCarded.slice(0, 10).join(", ")}${alreadyCarded.length > 10 ? ", ..." : ""}`);
  }
  if (exhausted.length > 0) {
    lines.push(`  non-character candidates paused after ${cfg.codexMaxAttempts} failed attempts: ${exhausted.join(", ")} — "/card <name>" still works directly`);
  }

  const turnsSinceCodex = state.unsaid.turn - (codex.lastTriggerTurn || 0);
  lines.push(`  Codex cooldown: ${turnsSinceCodex}/${cfg.codexCooldown} turns`);
  const strugglingCount = (codex.consecutiveFailedNames || []).length;
  if (strugglingCount > 0) {
    lines.push(`  unsuccessful-name streak: ${strugglingCount}${strugglingCount >= 3 ? " — likely a formatting/model-compliance issue" : ""}`);
  }

  const revealMisses = state.unsaid.consecutiveRevealMisses || 0;
  if (revealMisses > 0) {
    lines.push(`\nReveal requests: ${revealMisses} in a row produced nothing usable${revealMisses >= 5 ? " — may indicate a model-compliance issue" : ""}`);
  }

  lines.push(`\nCast (${cfg.cast.length}): ${cfg.cast.join(", ") || "empty"}`);
  if (cfg.cast.length > 0) {
    lines.push("\nCast → Story Card resolution:");
    cfg.cast.forEach(name => {
      const matches = storyCards.filter(c => c.title && isSameCardEntity(c.title, name));
      if (matches.length === 0) {
        lines.push(`  ${name} → no matching Story Card found`);
      } else if (matches.length === 1) {
        lines.push(`  ${name} → "${matches[0].title}" (type: "${matches[0].type || ""}")`);
      } else {
        lines.push(`  ${name} → ${matches.length} matching cards; using "${matches[0].title}" first`);
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
    if (!card) return null;
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
  if (!card) return;
  const entries = card.description.split("\n").map(l => l.trim()).filter(Boolean);
  const line = `${name} — mentioned ${mentionCount}x before card created`;
  const existingIdx = entries.findIndex(l => l.startsWith(`${name} —`));
  if (existingIdx >= 0) entries[existingIdx] = line;
  else entries.push(line);
  if (entries.length > 500) entries.splice(0, entries.length - 500);
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

  const card = findStoryCardForEntity(name);
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
  delete state.unsaid.codex.firstSeenTurn[name];
  delete state.unsaid.codex.introducedTurn[name];
  delete state.unsaid.codex.likelyCharacters[name];
  delete state.unsaid.codex.observedTypes[name];
  delete state.unsaid.codex.appearanceTurns[name];
  delete state.unsaid.codex.evidence[name];
  delete state.unsaid.codex.lastMentionTurn[name];
  delete state.unsaid.codex.lastAttemptTurn[name];
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

function loadMindFromCard(card) {
  if (!card || !card.description) return null;
  const idx = card.description.indexOf(MIND_NOTES_MARKER);
  if (idx === -1) return null;
  const body = card.description.slice(idx + MIND_NOTES_MARKER.length).trim();
  if (!body) return null;

  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const mind = createMind();
      if (typeof parsed.core === "string") mind.core = parsed.core;
      if (typeof parsed.feeling === "string") mind.feeling = parsed.feeling;
      if (Array.isArray(parsed.feelingHistory)) mind.feelingHistory = parsed.feelingHistory.filter(f => typeof f === "string").slice(-FEELING_HISTORY_LIMIT);
      if (typeof parsed.lastThought === "string") mind.lastThoughtText = parsed.lastThought;
      if (typeof parsed.want === "string") mind.want = parsed.want;
      if (typeof parsed.revealCount === "number" && parsed.revealCount >= 0) mind.revealCount = parsed.revealCount;
      // Both of these are written (coreStableSince, formerlyBelieved) but
      // were never read back on reload, in either format — coreStableSince
      // actually stores an *elapsed turn count* (state.unsaid.turn minus
      // the real coreSetTurn at write time), so state.unsaid.turn minus
      // that count reconstructs a coreSetTurn that's at least approximately
      // right, rather than the reload always restarting the stability
      // clock from zero as if the belief had just now been established.
      if (typeof parsed.coreStableSince === "number" && parsed.coreStableSince >= 0) {
        mind.coreSetTurn = state.unsaid.turn - parsed.coreStableSince;
      }
      if (typeof parsed.formerlyBelieved === "string" && parsed.formerlyBelieved) {
        mind.coreHistory = [parsed.formerlyBelieved];
      }
      if (parsed.relations && typeof parsed.relations === "object") {
        Object.keys(parsed.relations).forEach(other => {
          const r = parsed.relations[other];
          const current = r && typeof r === "object" ? r.current : r;
          if (typeof current === "string") {
            mind.relations[other] = current;
            mind.relationOrder.push(other);
            mind.relationHistory[other] = (r && Array.isArray(r.history) && r.history.length > 0) ? r.history : [current];
          }
        });
      }
      return mind.core || mind.feeling || mind.relationOrder.length > 0 ? mind : null;
    }
  } catch (e) {}

  const mind = createMind();
  let found = false;
  const coreMatch = body.match(/Core truth:\n([\s\S]*?)(?:\n\n|$)/);
  if (coreMatch && coreMatch[1].trim()) {
    // The prose writer (syncMindToCard) appends a stability annotation
    // directly onto this same line — "<belief> (steady for N turns)" —
    // since it reads naturally as one sentence for the player. But that
    // annotation is a transient, freshly-recomputed display value (from
    // state.unsaid.turn - mind.coreSetTurn), not part of the belief
    // itself, and this capture group has no way to tell them apart from
    // plain text. Confirmed directly via a full sync-then-reload cycle:
    // without stripping it here, a reload after the core had stabilized
    // permanently baked the stale "(steady for 6 turns)" text into
    // mind.core itself — corrupting the actual belief a little more
    // permanently with every future reload, and something the model
    // would then see as if it were literally part of the character's
    // stated belief on their next reveal instruction.
    const rawCore = coreMatch[1].trim();
    const stabilityMatch = rawCore.match(/\s*\(steady for (\d+) turns?\)\s*$/);
    mind.core = rawCore.replace(/\s*\(steady for \d+ turns?\)\s*$/, "");
    // The elapsed-turn count this annotation encodes is exactly what's
    // needed to reconstruct coreSetTurn (never otherwise read back on
    // reload, same gap as the JSON path above) — an approximation, since
    // state.unsaid.turn at reload time isn't the same moment as the
    // original sync, but far better than always restarting the
    // stability clock from zero as if the belief had just now formed.
    if (stabilityMatch) mind.coreSetTurn = state.unsaid.turn - parseInt(stabilityMatch[1], 10);
    found = true;
  }
  const formerlyMatch = body.match(/Formerly believed:\n([\s\S]*?)(?:\n\n|$)/);
  if (formerlyMatch && formerlyMatch[1].trim()) {
    mind.coreHistory = [formerlyMatch[1].trim()];
    found = true;
  }
  const feelingMatch = body.match(/Currently feeling:\s*([^\n]+)/);
  if (feelingMatch) { mind.feeling = feelingMatch[1].trim(); found = true; }
  const wantMatch = body.match(/Wants:\s*([^\n]+)/);
  if (wantMatch) { mind.want = wantMatch[1].trim(); found = true; }
  const lastThoughtMatch = body.match(/Last private thought:\n([\s\S]*?)(?:\n\n|$)/);
  if (lastThoughtMatch && lastThoughtMatch[1].trim()) { mind.lastThoughtText = lastThoughtMatch[1].trim(); found = true; }
  const countMatch = body.match(/(\d+) private moments? recorded/);
  if (countMatch) { mind.revealCount = parseInt(countMatch[1], 10); found = true; }
  const relBlockMatch = body.match(/Feelings toward others:\n([\s\S]*?)(?:\n\n|$)/);
  if (relBlockMatch) {
    relBlockMatch[1].split("\n").forEach(line => {
      const m = line.match(/^\s*[•\-*]\s*(.+?)\s*—\s*(.+)$/);
      if (!m) return;
      const other = m[1].trim();
      const trail = m[2].trim();
      const current = trail.includes(" → ") ? trail.split(" → ").pop().trim() : trail;
      if (!other || !current) return;
      mind.relations[other] = current;
      mind.relationOrder.push(other);
      mind.relationHistory[other] = [current];
      found = true;
    });
  }
  return found ? mind : null;
}

function seedMindIfKnown(name) {
  if (!name || state.unsaid.minds[name]) return;
  const card = findStoryCardForEntity(name);
  const loaded = card ? loadMindFromCard(card) : null;
  if (loaded) {
    // A mind loaded from an existing card's saved JSON never has a
    // lastTurn field (that JSON blob doesn't track it — see
    // loadMindFromCard above), so this always needed *some* value to
    // make the newly-adopted character immediately eligible rather than
    // waiting through a full cooldown as if they'd just been revealed.
    // Backdating to turn-1000 worked for that one arithmetic check, but
    // leaked straight into two other places that also read lastTurn:
    // `/unsaid status` printed the raw negative number as their actual
    // "last active turn" (confirmed directly from a real player's status
    // report showing "-680" — alarming and clearly wrong-looking even
    // though nothing was actually broken), and pickBySilence uses
    // `currentTurn - lastTurn` as a *weight*, so a fake 1000-turn gap
    // gave a freshly-adopted character a wildly outsized chance of
    // winning every reveal roll versus anyone genuinely tracked, until
    // their own first reveal fixed it. Leaving lastTurn unset instead,
    // with the two read sites below now checking for that explicitly,
    // gets the same "eligible right away" behavior honestly.
    state.unsaid.minds[name] = loaded;
  }
}

function pushCapped(arr, value, limit) {
  if (arr[arr.length - 1] !== value) {
    arr.push(value);
    if (arr.length > limit) arr.shift();
  }
}

function pickBySilence(names, currentTurn) {
  if (!Array.isArray(names) || names.length === 0) return null;
  const weights = names.map(name => {
    const mind = state.unsaid.minds[name];
    if (!mind || !mind.lastTurn) return 24;
    return Math.max(1, Math.min(20, currentTurn - mind.lastTurn));
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < names.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return names[i];
  }
  return names[names.length - 1];
}

function naturalCoreShiftEligible(mind, allowCoreShift) {
  if (!allowCoreShift || !mind) return false;
  const tension = typeof mind.tensionLevel === "number" ? mind.tensionLevel : 0;
  const atThreshold = tension >= TENSION_THRESHOLD;
  const atDrasticTier = tension >= TENSION_THRESHOLD * DRASTIC_TENSION_MULTIPLIER;
  const naturallyEligible = (mind.revealCount || 0) >= REVEALS_BEFORE_SHIFT_ELIGIBLE;
  return atDrasticTier || (atThreshold && naturallyEligible);
}

function compactMindScenarioGuard() {
  return " Keep this psychologically and socially appropriate to the established scenario; do not invent unsupported powers, technology, magic, institutions, ranks, species, or relationships.";
}

function buildCoreCheckInstruction(chosen, mind) {
  const coreNote = mind && mind.core ? ` Their current anchor: "${mind.core}".` : "";
  const tensionNote = mind && typeof mind.tensionLevel === "number"
    ? (mind.tensionLevel >= TENSION_THRESHOLD
      ? " Their feelings have been genuinely unsettled for a while now — this may well be the moment."
      : " Their feelings have been fairly steady lately, for what that's worth.")
    : "";
  const scenarioNote = compactMindScenarioGuard();
  return `\n[Consider whether recent events have genuinely, permanently changed how ${chosen} sees themselves — not just a passing mood.${coreNote}${tensionNote}${scenarioNote} If yes, reveal it (keep the 《 》 characters exactly as shown, they're required, not decorative — no asterisks or other markdown, the 《 》 pair is the only formatting needed) as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" (replace [one-word-emotion] with an actual word, not the literal placeholder) (1–2 concise sentences inside the required 《 》 marker). If nothing that significant has happened, don't force it — continue the story normally with no reveal at all.]\n`;
}

function buildAndFitThoughtInstruction(chosen, active, baseText, allowCoreShift) {
  const mind = state.unsaid.minds[chosen];
  const scenarioNote = compactMindScenarioGuard();

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
    instruction = `\n[${chosen}'s unspoken reaction to ${target} — 1–2 concise sentences inside the required 《 》 marker: how they really feel about ${target} right now, and what they secretly want from this moment. ${target} can't perceive it.${coreNote}${relationNote}${historyNote}${wantNote}${varietyNote} Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally.${scenarioNote} Format (keep the 《 》 characters exactly as shown, they're required, not decorative — no asterisks or other markdown, the 《 》 pair is the only formatting needed): "《${chosen}, [one-word-emotion], about ${target}: thought.》"]\n`;
  } else if (mind && mind.core) {
    const atThreshold = allowCoreShift && typeof mind.tensionLevel === "number" &&
      mind.tensionLevel >= TENSION_THRESHOLD;
    const atDrasticTier = allowCoreShift && typeof mind.tensionLevel === "number" &&
      mind.tensionLevel >= TENSION_THRESHOLD * DRASTIC_TENSION_MULTIPLIER;
    const naturallyEligible = (mind.revealCount || 0) >= REVEALS_BEFORE_SHIFT_ELIGIBLE;
    const shiftEligible = naturalCoreShiftEligible(mind, allowCoreShift);
    const shiftNote = shiftEligible
      ? (atDrasticTier && !naturallyEligible
        ? ` Their feelings have been unraveling for a long time now, unresolved — something this significant would happen regardless. If it's truly earned, you may format this instead as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" to replace their old anchor.`
        : ` Their feelings have been genuinely shifting for a while now, not settling back — if this moment plays into that and something has truly changed how they see themselves, you may format this instead as "《${chosen}, [one-word-emotion], core-shift: new lasting truth.》" to replace their old anchor. Only do this if it's really earned.`)
      : "";
    instruction = `\n[${chosen}'s private thought — 1–2 concise sentences inside the required 《 》 marker: how they really feel right now, and what they secretly want. Consistent with "${mind.core}" and their feeling of ${mind.feeling} unless this scene shifts it.${historyNote}${wantNote}${varietyNote}${shiftNote} Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally.${scenarioNote} Format (keep the 《 》 characters exactly as shown, they're required, not decorative — no asterisks or other markdown, the 《 》 pair is the only formatting needed): "《${chosen}, [one-word-emotion]: thought.》" No one else perceives it.]\n`;
  } else {
    instruction = `\n[This is ${chosen}'s very first private thought — once revealed, it becomes a lasting psychological anchor about who they fundamentally are, not a fleeting reaction and not an excuse to invent unsupported biography. Base it on what the story has actually shown about them so far. Use 1–2 concise sentences inside the required 《 》 marker: what this deep truth is, and what they secretly want because of it. Replace [one-word-emotion] with an actual single word (e.g. wary, hopeful) — do not write the words "feeling" or "emotion" literally.${scenarioNote} Format (keep the 《 》 characters exactly as shown, they're required, not decorative — no asterisks or other markdown, the 《 》 pair is the only formatting needed): "《${chosen}, [one-word-emotion]: thought.》" No one else perceives it.]\n`;
  }

  return fitInstructionToBudget(baseText, instruction);
}

function getLastActionType() {
  if (typeof history !== "undefined" && Array.isArray(history) && history.length > 0) {
    return history[history.length - 1].type || null;
  }
  return null;
}

function isNewStoryTurn(rawText) {
  if (typeof info !== "undefined" && info && Number.isInteger(info.actionCount)) {
    const current = Math.abs(info.actionCount);
    const isNew = state.unsaid.lastActionCount !== current;
    state.unsaid.lastActionCount = current;
    return isNew;
  }

  // Some models/runtimes omit actionCount. In that case, use a lightweight
  // context signature so a retry/regeneration of the same turn does not age
  // UNSAID/Codex twice.
  let source = typeof rawText === "string" ? rawText : "";
  if (!source && typeof history !== "undefined" && Array.isArray(history) && history.length) {
    const last = history[history.length - 1];
    source = last && typeof last.text === "string" ? last.text : "";
  }
  source = source.slice(-6000);
  const historyStamp = (typeof history !== "undefined" && Array.isArray(history)) ? history.length : 0;
  const stampedSource = source + "|h:" + historyStamp;
  let hash = 0;
  for (let i = 0; i < stampedSource.length; i++) hash = (hash * 31 + stampedSource.charCodeAt(i)) | 0;
  const sig = hash + ":" + stampedSource.length;
  const isNew = state.unsaid.lastStorySignature !== sig;
  state.unsaid.lastStorySignature = sig;
  return isNew;
}

var ESTIMATED_CHARS_PER_TURN = 900;
function recentTurnsText(text, turnCount) {
  const n = typeof turnCount === "number" && turnCount > 0 ? Math.min(20, Math.floor(turnCount)) : 3;
  const maxChars = Math.max(ESTIMATED_CHARS_PER_TURN * n, 1200);
  const parts = [];

  if (typeof history !== "undefined" && Array.isArray(history) && history.length > 0) {
    const start = Math.max(0, history.length - n);
    for (let i = start; i < history.length; i++) {
      const item = history[i];
      if (item && typeof item.text === "string" && item.text.trim()) {
        parts.push(item.text.trim());
      }
    }
  }

  if (typeof text === "string" && text.trim()) {
    const current = text.trim();
    if (parts.length === 0 || parts[parts.length - 1] !== current) parts.push(current);
  }

  return parts.join("\n").slice(-maxChars);
}

function syncFrontMemoryHint(subtleHints) {
  setManagedFrontMemorySegment(
    FRONT_MEMORY_MARKER,
    subtleHints
      ? "Let each character's private feelings subtly color their actions and tone right now, without ever stating them outright."
      : ""
  );
}

// Used by the manual /peek command: true if a name has no Story Card yet (can't rule it out, so
// allow by default) or an existing card typed blank/"character" — false
// for anything explicitly typed otherwise (Location, Business, Vehicle...),
// so a stray "/peek <location>" cannot force a private thought onto
// something that was never a person.
function isCharacterLikeCard(name) {
  if (typeof storyCards === "undefined" || !storyCards) return true;
  const existingCard = findStoryCardForEntity(name);
  if (!existingCard) return true;

  const cardType = (existingCard.type || "").trim().toLowerCase();
  if (!cardType) return true;
  if (/^(?:character|npc|person|companion|ally|rival|protagonist|antagonist|crewmate|crew member|student|teacher|agent|officer|doctor|patient|athlete|coach|employee|resident)$/i.test(cardType)) {
    return true;
  }
  if (/^(?:location|place|item|object|vehicle|weapon|faction|organization|organisation|business|restaurant|building|city|country|planet|world|class|event|lore)$/i.test(cardType)) {
    return false;
  }

  // Custom Story Card types are common in scenario-specific packs. If the
  // fields themselves clearly describe a person/sapient character, honor
  // that shape instead of rejecting the card solely because the author
  // called its type "Crew", "Resident", "Detective", etc.
  const entry = String(existingCard.entry || "");
  const signals = (entry.match(/^\s*(?:Race|Species|Nature|Strength Level|Personality|Background|Appearance|Abilities|Weaknesses|Relationships)\s*[:=]/gim) || []).length;
  return signals >= 2;
}

