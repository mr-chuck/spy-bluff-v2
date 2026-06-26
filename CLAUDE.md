# Spy Bluff v2 - Architecture & Guidelines

## Project Summary
**Independent** redesign of the Spy Bluff party game (separate from `imposter_who`).
- **Tech**: Next.js 16.1.6, React 19.2.3, TypeScript, Tailwind CSS
- **Design**: Editorial newspaper aesthetic (Cormorant Garamond serif, JetBrains Mono labels)
- **Modes**: Online (real-time voting) + Offline (sealed envelope, pass-phone mechanic)
- **Status**: Feature-complete, visual design verified, ready for publication

## Game Mechanics

### Online Mode
1. Host creates room, other players join
2. Host starts game → impostors assigned (prefer non-host)
3. Players submit clues in turn order (one per player per round)
4. When all clued: voting phase (vote on suspected impostor)
5. Tally votes → if impostor caught, crew wins; if not, impostor wins
6. Results screen shows verdict + word reveal
7. Host can start new round or end game

### Offline Mode
- All players see sealed envelope ("TOP SECRET" card)
- Tap "REVEAL MY ROLE" to see role/word
- Tap "HIDE THE WORD" to hide before passing phone
- One player is impostor (gets hint instead of word)
- Host taps "END GAME & REVEAL" when ready to see results

## Key File Purposes

### Backend (`lib/` & `app/api/`)
- **lib/types.ts**: Interfaces for Player, GameRoom, Notifications
- **lib/words.ts**: 15 × 15 word matrix, `getRandomWord()` export
- **lib/game-logic.ts**: `pickImpostors()`, `tallyVotesAndCheckWin()`, `saveRoundSnapshot()`
- **lib/store.ts**: `getRoom()`, `setRoom()`, `deleteRoom()` — abstracts DB (in-memory | PostgreSQL)
- **API routes**: RESTful endpoints for room lifecycle, game actions, state fetch

### Frontend (`app/`, `components/`)
- **app/page.tsx**: Home — name input, join/create toggle, mode/settings
- **app/room/[code]/page.tsx**: Main room page — polls every 2s, routes to Lobby/GamePlay/VotingPhase/Results
- **components/Lobby.tsx**: Player list, "Begin" button, room code display
- **components/GamePlay.tsx**: Clue form, past clues, turn order
- **components/VotingPhase.tsx**: Suspect buttons, vote tally
- **components/ResultsScreen.tsx**: Verdict stamp, word reveal, badges
- **components/OfflinePlay.tsx**: Sealed envelope, "HIDE THE WORD" button (FIXED)
- **components/RoundHistoryModal.tsx**: Stats grid, past rounds

### Styling (`app/globals.css`)
- CSS variables: `--paper`, `--ink`, `--accent`, `--serif`, `--sans`, `--mono`
- Component classes: `.ed-card`, `.ed-btn`, `.ed-input`, `.mono-label`, `.stamp`
- Google Fonts imports (Cormorant Garamond, Inter, JetBrains Mono)

## Recent Fixes & Tests
- ✅ **Offline button text** fixed: "HIDE THE WORD" (was "HIDE – PASS TO NEXT PLAYER")
- ✅ **Impostor randomization verified** with 3-4 player tests (only 1 impostor assigned)
- ✅ **Visual design verified** across all game phases (home, lobby, offline, voting, results)
- ✅ **Editorial aesthetic applied** consistently (serif fonts, monospace labels, paper colors)

## Development Notes

### When to Read vs. Summarize
**Read full code if:**
- Fixing a specific bug (line-level changes)
- Refactoring a component (need to see how it's used)
- Adding new API route (need existing pattern)

**Use INDEX.md if:**
- Checking which file handles X
- Understanding game flow
- Finding a specific function

### Token Optimization
- Refer to `.claude/INDEX.md` for file locations/purposes
- Use `lib/` file line counts as guide ("game-logic.ts, 85 lines, handles role assignment")
- For API routes: "check `room/[code]/start` route" instead of reading whole file
- For components: describe by purpose + key props/state

### Database
- **Dev**: In-memory store (no setup)
- **Prod**: PostgreSQL via `getPool()` in `lib/store.ts`
- Room state persists across API calls (same structure in both)

### Styling Convention
- No Tailwind class names in components (all editorial CSS)
- Use `.ed-btn`, `.ed-card`, `.mono-label` — defined in globals.css
- Color palette: paper (#f1e8d2), ink (#1a1612), accent (#a8442a)

## Git & Deployment
- Separate project from `imposter_who` (do not modify original)
- Ready for publication as standalone v2 project
- Next.js builds to standard `.next/` directory
