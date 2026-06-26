export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  isSpectator: boolean;
  clue: string | null;
  hasVoted: boolean;
  vote: string | null;
  joinedAt: number;
  lastSeenAt: number;
}

export interface GameNotification {
  message: string;
  timestamp: number;
}

export type GameStatus = 'lobby' | 'playing' | 'voting' | 'results';
export type GameMode = 'online' | 'offline';

export interface VoteResult {
  votes: Record<string, string>;
  eliminated: string | null;
  tally: Record<string, number>;
}

export interface RoundSnapshot {
  roundNumber: number;
  secretWord: string;
  wordHint: string;
  wordCategory: string;
  impostorIds: string[];
  playerNames: Record<string, string>;
  playerClues: Record<string, { name: string; clue: string }>;
  voteResult: VoteResult | null;
  winner: 'crew' | 'impostor' | null;
  winReason: string | null;
}

export interface GameRoom {
  code: string;
  players: Player[];
  status: GameStatus;
  mode: GameMode;
  round: number;
  expectedPlayerCount: number;
  impostorCount: number;
  impostorIds: string[];
  secretWord: string | null;
  wordHint: string | null;
  wordCategory: string | null;
  currentTurnIndex: number;
  turnOrder: string[];
  voteResult: VoteResult | null;
  winner: 'crew' | 'impostor' | null;
  winReason: string | null;
  roundHistory: RoundSnapshot[];
  createdAt: number;
  gameStartedAt: number | null;
  lastActivity: number;
  notifications: GameNotification[];
}

export interface ClientGameRoom extends Omit<GameRoom, 'impostorIds' | 'secretWord' | 'wordHint'> {
  myRole: 'impostor' | 'villager' | null;
  impostorIds: string[];
  secretWord: string | null;
  wordHint: string | null;
}

export interface CreateRoomResponse {
  code: string;
  playerId: string;
}

export interface JoinRoomResponse {
  playerId: string;
  room: GameRoom;
}

export interface ApiError {
  error: string;
}
