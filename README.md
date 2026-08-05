# UNSAID — A Sneak Peek at the Features

Small script for AI Dungeon, been building it up for a long while now. Figured it's worth a fuller post since a lot's changed and a couple people asked me to actually explain how the core truth thing works, so here's that too.

**🌟 Core Truth — what it actually is**
The first time a character has a real, standalone private thought — not a reaction to someone else, just a thought about who they are — that becomes their "core truth." Think of it as the one thing the script decides is fundamentally, lastingly true about that character, underneath whatever they show on the surface. Every later reveal gets nudged to stay consistent with it, which is what stops a character from feeling like a slightly different person every time they think something. **New:** that very first thought now gets a specifically different prompt — it's told outright that this one becomes permanent and should be something real, not a throwaway reaction to whatever's on screen at the time.

By default it's permanent. Set once, never touched again. Their feelings and relationships are free to move around it, but the anchor itself doesn't budge. You can see it plainly on the character's own Story Card, along with how long it's held ("steady for 40 turns").

If you want characters who can genuinely change, there's a config option for that, off by default. Turn it on, and a character's feelings landing somewhere new, over and over without settling, builds real tracked tension shown right on their card. Reaching that point isn't enough on its own — a couple rounds back I gated an ordinary shift behind having used `/peek` on that character at least once, since it felt wrong for a shift to rewrite something the player never had a chance to see. But then it was pointed out to me, fairly, that this meant something was quietly requiring a command to happen — which goes against the whole point of the private-thoughts system being ambient and automatic. So that's fixed now: eligibility opens up entirely on its own, once a character has shown a little more of themselves beyond their founding thought, through ordinary reveals, zero commands involved. Tension also isn't capped at the normal threshold anymore — it can keep climbing, up to double, if it never resolves, and at that point the shift becomes available regardless of how much has come to light about them yet, because something can matter enough to happen either way. Nothing gets thrown away when a shift happens: the old core truth sticks around and shows up right next to the new one ("formerly believed: ..."). `/peek Marcus core` is still there as an optional direct check whenever you want it, but nothing here actually needs it anymore.

**💭 Private Thoughts**
- Two-sentence reveals: how a character really feels, and what they secretly want
- Reveals never show up in your story by default — they go straight to the character's own card notes instead, in a plain layout meant to be skimmed (a denser style is available if you'd rather)
- A hidden feeling can subtly color a character's actual visible behavior — a tight smile, a held breath — without ever stating it outright
- Feelings drift with a short rolling history instead of resetting
- Characters with history react to each other, and it's the most recently relevant relationship that comes up, not a random old one
- Nudged to avoid repeating a character's own last wording
- Less likely to fire during your own Do/Say actions specifically, so it's not competing for attention right when you've taken a deliberate action
- `/peek <name>` forces an immediate reveal on demand — optional, everything above already happens on its own

**📇 Codex**
- Counts mentions, only writes a card once a name clears a threshold you set
- Character / Location / Item / Faction, chosen by context
- Recognizes "Marcus" and "Marcus Cole" as the same person
- Skips your own character, and everyone's in Multiplayer, automatically
- Logs everything it makes, per type
- Delete a card and it'll quietly redo it next time that name comes up
- Its own pace is fully configurable — how often it can trigger, how many times it retries a name before giving up
- Hands the AI a character's already-established core truth when writing their card, so the profile doesn't end up contradicting what's already been shown

**🧠 Long-Term Memory**
Story Cards only reach the AI when triggered, so someone quiet can drop out of context for a long stretch. A short summary — core truth, feeling, top relationships, want — lives in your adventure's real Memory, read every turn no matter how long the story's gone. Built to work with Optimized Context on: everything this sends is checked against your available budget first and shrinks or skips itself rather than crowd your story out.

**🧬 A visibly active brain, not a status bar**
Tried adding a rotating status message last round to make it obvious the script was running. Fair pushback: that's not actually what "obviously active" should mean, and nobody wants a script narrating its own heartbeat at them. Pulled that out entirely. What's there instead: each character's Story Card now shows a real feeling-history trail, their literal last private thought in full, and a running count of private moments they've had, alongside their relationships and want. **New:** relationships show their own trajectory now too, not just a snapshot — noticed while double-checking this round that the data was already being tracked and fed to the AI, just never actually shown on the card. If you want proof the script's doing something, it's sitting right there on the character — an actual visible brain, not a message telling you to trust it.

**⚙️ Config**
Trimmed this down last round, then got told to bring the Codex-specific settings back — fair, since those are the ones people actually want to tune when Codex isn't behaving quite right. So: Codex's card cooldown and retry count are back as real settings. A few of the others stayed simplified (card layout, the tension-tuning number) since nobody'd flagged those specifically. Still organized into sections, still explained in plain language, no code editing.

**🛠️ On reliability**
Built and tested with real multi-turn simulations, not just reading the code over. This round specifically re-verified Codex end to end — all four card types created correctly across a real multi-turn run — and turned up one genuine bug in the process: the word "Time" (as in "Time passes") was slipping through as a name and briefly got its own bogus character card. Fixed the same way earlier false positives were: widened the stopword list.

**🙏 Credit**
Private character thoughts and self-writing cards both started as ideas from LewdLeah's Inner Self and Auto-Cards. Built from scratch, not their code, but the ideas are theirs.

Four files: Library / Input / Context / Output. Paste, play, try /peek on someone. Let me know how it goes.
