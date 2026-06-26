import type { GameRoom, RoundSnapshot } from "./types";

export function tallyVotesAndCheckWin(room: GameRoom): void {
  const alivePlayers = room.players.filter((p) => p.isAlive && !p.isSpectator);

  const tally: Record<string, number> = {};
  for (const p of alivePlayers) {
    if (p.vote && p.vote !== "abstain") {
      tally[p.vote] = (tally[p.vote] ?? 0) + 1;
    }
  }

  let eliminated: string | null = null;
  const maxVotes = Math.max(0, ...Object.values(tally));
  if (maxVotes > 0) {
    const topCandidates = Object.entries(tally)
      .filter(([, v]) => v === maxVotes)
      .map(([id]) => id);
    if (topCandidates.length === 1) {
      eliminated = topCandidates[0];
    }
  }

  const votes: Record<string, string> = {};
  for (const p of alivePlayers) {
    if (p.vote) votes[p.id] = p.vote;
  }

  room.voteResult = { votes, eliminated, tally };

  if (eliminated) {
    room.players = room.players.map((p) =>
      p.id === eliminated ? { ...p, isAlive: false } : p
    );
  }

  const stillAlive = room.players.filter((p) => p.isAlive && !p.isSpectator);
  const aliveImpostors = stillAlive.filter((p) => room.impostorIds.includes(p.id));
  const aliveVillagers = stillAlive.filter((p) => !room.impostorIds.includes(p.id));

  if (aliveImpostors.length === 0) {
    const impostorNames = room.players
      .filter((p) => room.impostorIds.includes(p.id))
      .map((p) => p.name)
      .join(", ");
    room.status = "results";
    room.winner = "crew";
    room.winReason = `The villagers found all the impostors: ${impostorNames}!`;
  } else if (aliveImpostors.length >= aliveVillagers.length) {
    const impostorNames = aliveImpostors.map((p) => p.name).join(", ");
    room.status = "results";
    room.winner = "impostor";
    room.winReason = `The impostor(s) (${impostorNames}) survived and outnumber the villagers!`;
  } else {
    room.status = "results";
    room.winner = null;
    room.winReason = eliminated
      ? `${room.players.find((p) => p.id === eliminated)?.name} was eliminated. The game continues.`
      : "No one was eliminated (tie or all abstained).";
  }
}

export function saveRoundSnapshot(room: GameRoom): void {
  if (
    room.round > 0 &&
    room.secretWord &&
    !room.roundHistory.some((s) => s.roundNumber === room.round)
  ) {
    const snapshot: RoundSnapshot = {
      roundNumber: room.round,
      secretWord: room.secretWord,
      wordHint: room.wordHint!,
      wordCategory: room.wordCategory!,
      impostorIds: [...room.impostorIds],
      playerNames: Object.fromEntries(room.players.map((p) => [p.id, p.name])),
      playerClues: Object.fromEntries(
        room.players
          .filter((p) => p.clue)
          .map((p) => [p.id, { name: p.name, clue: p.clue! }])
      ),
      voteResult: room.voteResult,
      winner: room.winner,
      winReason: room.winReason,
    };
    room.roundHistory.push(snapshot);
  }
}

export function reassignHostIfNeeded(room: GameRoom, departingId: string, wasHost: boolean): void {
  if (!wasHost) return;

  const candidates = room.players.filter((p) => p.id !== departingId);
  const next = candidates.find((p) => p.isAlive && !p.isSpectator) ?? candidates[0];
  if (!next) return;

  room.players = room.players.map((p) => {
    if (p.id === departingId) return { ...p, isHost: false };
    if (p.id === next.id) return { ...p, isHost: true };
    return p;
  });
}

export function checkMinPlayers(room: GameRoom): boolean {
  if (room.status !== "playing" && room.status !== "voting") return false;

  const alivePlayers = room.players.filter((p) => p.isAlive && !p.isSpectator);
  const minPlayers = room.impostorCount + 2;

  if (alivePlayers.length < minPlayers) {
    room.status = "results";
    room.winner = null;
    room.winReason = "Game ended because there are not enough players.";
    room.notifications.push({
      message: "Game ended because there are not enough players.",
      timestamp: Date.now(),
    });
    saveRoundSnapshot(room);
    return true;
  }
  return false;
}
