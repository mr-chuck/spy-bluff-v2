# Spy Bluff v2 - Code Index

## Quick Navigation

### Core Game Logic (`lib/`)
- **game-logic.ts** (85 lines) - Role assignment, win conditions, round snapshots
  - `pickImpostors()` - Selects 1-2 random impostors (non-host preference)
  - `tallyVotesAndCheckWin()` - Vote counting and game-end detection
  - `saveRoundSnapshot()` - Captures round history
  
- **store.ts** (140 lines) - Database abstraction
  - `getRoom(code)` - Fetch game state
  - `setRoom(code, room)` - Persist game state
  - In-memory for dev, PostgreSQL for prod
  
- **types.ts** (50 lines) - TypeScript interfaces
  - `Player`, `GameRoom`, `GameNotification`, `VoteResult`
  
- **words.ts** (100 lines) - Word categories
  - 15 categories × 15 words each
  - `getRandomWord()` exports

### API Routes (`app/api/`)
**Room Management:**
- `room/create` - New game lobby
- `room/[code]` - Fetch room state (sanitizes impostor info)
- `room/[code]/join` - Add player
- `room/[code]/start` - Initialize game, assign roles

**Game Flow:**
- `room/[code]/clue` - Submit clue (online only)
- `room/[code]/vote` - Cast vote, trigger end-of-round
- `room/[code]/next-round` - Reset for new round
- `room/[code]/continue-round` - Same word, fewer players
- `room/[code]/back-to-lobby` - Reset all state

**Lifecycle:**
- `room/[code]/leave` - Remove player, transfer host
- `room/[code]/end-game` - Force end (host only)

### Frontend Pages (`app/`)
- **page.tsx (Home)** (300 lines) - Name input, join/create, mode toggle, settings
- **layout.tsx** - Root layout, CSS imports, metadata

### Components (`components/`)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `Lobby.tsx` | 120 | Show code, player list, "Begin" button |
| `GamePlay.tsx` | 150 | Clue submission (online), clues list |
| `VotingPhase.tsx` | 140 | Vote on suspects, tally display |
| `ResultsScreen.tsx` | 180 | Rubber stamp verdict, word reveal, badges |
| `OfflinePlay.tsx` | **120** | **Sealed envelope, "HIDE THE WORD" button** |
| `RoundHistoryModal.tsx` | 100 | Stats, past rounds |

### Styling (`app/globals.css`)
- **290+ lines** - Complete editorial design system
- CSS variables for paper/ink/accent colors
- `.ed-card`, `.ed-btn`, `.stamp`, `.mono-label` classes
- Google Fonts: Cormorant Garamond (serif), Inter (sans), JetBrains Mono

### Configuration
- `tsconfig.json` - TypeScript paths, JSX config
- `next.config.ts` - Empty (defaults fine)
- `package.json` - Next.js 16.1.6, React 19.2.3, pg, uuid

## Key Architecture Decisions

| Decision | Reason | File |
|----------|--------|------|
| In-memory dev store | Simplicity, no DB setup needed | `lib/store.ts` |
| Client-side polling (2s) | Real-time feel without WebSockets | `app/room/[code]/page.tsx` |
| Sanitized API responses | Hide impostor from frontend | `app/api/room/[code]/route.ts` |
| Offline sealed envelope | Phone-passing mechanic | `components/OfflinePlay.tsx` |
| Non-host impostor preference | Fairness (host manages game) | `lib/game-logic.ts` |

## Recent Fixes
- ✅ Button text: "HIDE – PASS TO NEXT PLAYER" → "HIDE THE WORD" (line 96, OfflinePlay.tsx)
- ✅ CSS import order: @import fonts before @import tailwindcss
- ✅ Impostor randomization: Working correctly, only 1 per game
