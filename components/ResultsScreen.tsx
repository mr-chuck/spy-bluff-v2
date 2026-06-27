"use client";

import type { ClientGameRoom } from "@/lib/types";

interface ResultsScreenProps {
  room: ClientGameRoom;
  playerId: string;
  onNextRound: () => Promise<void>;
  onContinueRound: () => Promise<void>;
  onBackToLobby: () => Promise<void>;
  onLeave: () => void;
}

export default function ResultsScreen({
  room, playerId, onNextRound, onContinueRound, onBackToLobby, onLeave,
}: ResultsScreenProps) {
  const me = room.players.find((p) => p.id === playerId)!;
  const isHost = me?.isHost ?? false;
  const isImpostor = room.myRole === "impostor";
  const isOffline = room.mode === "offline";
  const isGameOver = room.winner !== null || (room.status === "results" && isOffline);

  const villagersWon = room.winner === "crew";
  const impostorWon = room.winner === "impostor";
  const showImpostorIdentity = isGameOver && room.impostorIds.length > 0;

  return (
    <div>
      {/* Game over header */}
      {isGameOver ? (
        <>
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
            <span className="mono-label">FINAL EDITION</span>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic',
              fontSize: 32, lineHeight: 0.95, fontWeight: 500, color: 'var(--ink)',
              paddingTop: 4,
            }}>
              {villagersWon ? "The Town Prevails" : impostorWon ? "The Impostors Win" : "Game Over"}
            </div>
            <div className="mono-label" style={{
              paddingTop: 8, borderTop: '0.5px solid var(--rule)', marginTop: 8,
            }}>
              {room.round} ROUND{room.round > 1 ? 'S' : ''} PLAYED
            </div>
          </div>

          {/* Stamp */}
          <div style={{ paddingTop: 24, textAlign: 'center' }}>
            <div className="stamp" style={{
              transform: villagersWon ? 'rotate(-5deg)' : 'rotate(5deg)',
              borderColor: villagersWon ? 'var(--success)' : 'var(--accent)',
              color: villagersWon ? 'var(--success)' : 'var(--accent)',
            }}>
              {villagersWon ? "TOWN WINS" : impostorWon ? "IMPOSTORS WIN" : "GAME OVER"}
            </div>
            {room.winReason && (
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15,
                color: 'var(--ink-soft)', paddingTop: 16, lineHeight: 1.45,
              }}>{room.winReason}</div>
            )}
            {isImpostor && (
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 11, paddingTop: 8,
                color: impostorWon ? 'var(--accent)' : 'var(--success)',
                letterSpacing: '0.12em',
              }}>YOU WERE AN IMPOSTOR</div>
            )}
          </div>

          {/* Impostor reveal */}
          {showImpostorIdentity && (
            <div style={{ paddingTop: 22 }}>
              <div className="section-head">
                <div>
                  <span className="mono-label">UNMASKED</span>
                  <div style={{
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
                    color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
                  }}>The impostor{room.impostorIds.length > 1 ? 's' : ''}</div>
                </div>
              </div>
              {room.impostorIds.map((id) => {
                const p = room.players.find((pl) => pl.id === id)!;
                const caught = !p.isAlive;
                return (
                  <div key={id} className="ed-card" style={{
                    marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14,
                    boxShadow: '3px 3px 0 var(--accent)',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: 'var(--paper-alt)',
                      border: '1.5px solid var(--ink)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 600,
                    }}>{p.name.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <span className="mono-label" style={{ color: 'var(--accent)' }}>THE IMPOSTOR</span>
                      <div style={{
                        fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24,
                        color: 'var(--ink)', lineHeight: 1,
                      }}>
                        {p.name}
                        {p.id === playerId && (
                          <span className="mono-label" style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 9 }}>YOU</span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.12em', padding: '4px 8px',
                      border: `1.5px solid ${caught ? 'var(--success)' : 'var(--accent)'}`,
                      color: caught ? 'var(--success)' : 'var(--accent)',
                      transform: 'rotate(-3deg)',
                    }}>
                      {caught ? '✓ CAUGHT' : '✗ SURVIVED'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Word reveal */}
          <div style={{ paddingTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{
              border: '1.5px solid var(--ink)', padding: 12, textAlign: 'center', background: 'var(--card)',
            }}>
              <span className="mono-label">THE REAL WORD</span>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24,
                color: 'var(--ink)', paddingTop: 4,
              }}>{room.secretWord}</div>
            </div>
            <div style={{
              border: '1.5px solid var(--accent)', padding: 12, textAlign: 'center', background: 'var(--card)',
            }}>
              <span className="mono-label" style={{ color: 'var(--accent)' }}>IMPOSTOR HAD</span>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24,
                color: 'var(--accent)', paddingTop: 4,
              }}>{room.wordHint}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Mid-game results */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            borderBottom: '1px solid var(--ink)', paddingBottom: 6,
          }}>
            <span className="mono-label">ROUND {String(room.round).padStart(2, '0')} &middot; THE VERDICT</span>
            <span className="mono-label">
              {room.players.filter((p) => p.isAlive && !p.isSpectator).length} STILL IN
            </span>
          </div>

          {room.voteResult?.eliminated ? (() => {
            const eliminated = room.players.find((p) => p.id === room.voteResult!.eliminated);
            return (
              <div style={{ paddingTop: 20 }}>
                <div style={{ textAlign: 'center', paddingBottom: 16 }}>
                  <div className="stamp" style={{ transform: 'rotate(4deg)' }}>ELIMINATED</div>
                </div>
                <div className="ed-card" style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: '4px 4px 0 var(--accent)',
                }}>
                  <div className="ed-card-corners" />
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', background: 'var(--paper-alt)',
                    border: '1.5px solid var(--ink)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 600,
                    filter: 'grayscale(0.4)',
                  }}>{eliminated?.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <span className="mono-label">THE ROOM VOTED OUT</span>
                    <div style={{
                      fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26,
                      color: 'var(--ink)', lineHeight: 1,
                    }}>{eliminated?.name}</div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div style={{ paddingTop: 20, textAlign: 'center' }}>
              <div className="stamp" style={{ transform: 'rotate(-4deg)' }}>NO ONE ELIMINATED</div>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15,
                color: 'var(--ink-soft)', paddingTop: 12,
              }}>Tie vote or all abstained. The game continues.</div>
            </div>
          )}

          {room.winReason && (
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15,
              color: 'var(--ink-soft)', textAlign: 'center', paddingTop: 14, lineHeight: 1.45,
            }}>{room.winReason}</div>
          )}
        </>
      )}

      {/* Player breakdown */}
      <div style={{ paddingTop: 20 }}>
        <div className="section-head">
          <div>
            <span className="mono-label">THE DOSSIER</span>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18,
              color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
            }}>Player results</div>
          </div>
        </div>
        {room.players.map((p) => {
          const wasImpostor = showImpostorIdentity && room.impostorIds.includes(p.id);
          const eliminated = room.voteResult?.eliminated === p.id;
          const votes = room.voteResult?.tally?.[p.id] ?? 0;
          return (
            <div key={p.id} className="player-row" style={{
              background: wasImpostor ? 'rgba(168,68,42,0.08)' : 'transparent',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: wasImpostor ? 'var(--accent)' : 'var(--paper-alt)',
                border: '1px solid var(--ink)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600,
                color: wasImpostor ? 'var(--paper)' : 'var(--ink)',
              }}>{p.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)',
                  display: 'flex', gap: 6, alignItems: 'baseline',
                }}>
                  {p.name}
                  {p.id === playerId && (
                    <span className="mono-label" style={{ color: 'var(--accent)', fontSize: 9 }}>YOU</span>
                  )}
                </div>
                {p.clue && (
                  <div style={{
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
                    color: 'var(--ink-faint)',
                  }}>&ldquo;{p.clue}&rdquo;</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {wasImpostor && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
                    padding: '2px 6px', border: '1px solid var(--accent)', color: 'var(--accent)',
                  }}>IMPOSTOR</span>
                )}
                {eliminated && (
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.1em',
                    padding: '2px 6px', border: '1px solid var(--ink-faint)', color: 'var(--ink-faint)',
                  }}>OUT</span>
                )}
                {votes > 0 && (
                  <span className="mono-label">{votes} VOTE{votes !== 1 ? 'S' : ''}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isHost && !isGameOver && !isOffline && (
          <button className="ed-btn ed-btn-accent ed-btn-lg" style={{ width: '100%' }} onClick={onContinueRound}>
            CONTINUE GAME
          </button>
        )}
        {isHost && isGameOver && (
          <button className="ed-btn ed-btn-accent ed-btn-lg" style={{ width: '100%' }} onClick={onNextRound}>
            NEW GAME
          </button>
        )}
        {isHost && (isGameOver || isOffline) && (
          <button className="ed-btn ed-btn-outline" style={{ width: '100%' }} onClick={onBackToLobby}>
            BACK TO LOBBY
          </button>
        )}
        {!isHost && (
          <div style={{
            border: '1.5px solid var(--rule)', padding: 14, textAlign: 'center', background: 'var(--card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} className="ed-pulse" />
              <span className="mono-label">WAITING FOR HOST</span>
            </div>
          </div>
        )}
        <button className="ed-btn ed-btn-outline" style={{ width: '100%' }} onClick={onLeave}>
          &larr; LEAVE ROOM
        </button>
      </div>
    </div>
  );
}
