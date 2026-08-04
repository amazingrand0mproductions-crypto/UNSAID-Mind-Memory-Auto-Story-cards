# UNSAID — A Sneak Peek at the Features

> "Of course," Marcus says, nodding.
> *Marcus, uneasy: He doesn't trust this at all. He wants an exit route before anyone finds out.*

Small script for AI Dungeon, been building it up for a while and it's finally in a state I'm happy sharing properly. Two things running together: characters who think one thing and say another, and a world that writes its own lore as it goes.

**💭 Private Thoughts**
- Two-sentence reveals, occasionally: how a character really feels, what they secretly want
- Nobody else in the scene can hear it
- First real thought becomes a character's "core truth" — later ones stay consistent with it instead of feeling made up on the spot
- Mood drifts over time with a short rolling history, instead of resetting every turn
- Characters with history react to each other instead of pulling a feeling out of nowhere
- That relationship history can shift too — resentful sliding into wary, say, not stuck on one word forever
- `/peek <name>` as an action forces an immediate reveal, with a popup confirming it landed
- Every character's current state — core truth, feeling, want, relationships — shows up on their own Story Card, in the notes, so you can check in without it costing the AI any context

**📇 Codex**
- Counts mentions and only writes a card once a name crosses a threshold you set (default 3)
- Figures out the right template on its own: Character, Location, Item, or Faction, from context rather than a guess
- Won't double up on someone who shows up as "Marcus" once and "Marcus Cole" later
- Skips your own character automatically, and everyone's in Multiplayer
- Logs every card it makes on a dedicated tracking card per type
- Delete a card and Codex will quietly redo it next time the name comes up
- New characters get folded straight into the private-thoughts cast

**🧠 Long-Term Memory**
- Story Cards only reach the AI when triggered, so a quiet character can drop out of context for a long stretch even with their card intact
- There's also a short running summary — core truth, current want, top relationship — kept in your adventure's actual Memory
- That gets read every single turn no matter how long you've been playing. Turn 1 stuff can still matter at turn 1000

**⚙️ Config**
- One card, "UNSAID Config," every setting explained in plain language right there
- Private thoughts and Codex toggle independently
- Thought chance, cooldown, mention threshold, memory size — all adjustable from the card, no code editing

**⚡ Optimized Context**
Should work with optimized context on.

**Credit**
The idea for private character thoughts, and for a self-writing card system, both come from LewdLeah's Inner Self and Auto-Cards. Didn't touch their code — this is built from scratch — but the ideas started there.

Four files: Library / Input / Context / Output. Paste them in and start playing — the config card shows up on its own. Let me know how it goes.
