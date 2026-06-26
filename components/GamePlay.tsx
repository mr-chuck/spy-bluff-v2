"use client";

import { useState } from "react";
import type { ClientGameRoom } from "@/lib/types";

interface GamePlayProps {
  room: ClientGameRoom;
  playerId: string;
  onSubmitClue: (clue: string) => Promise<void>;
  onEndGame: () => Promise<void>;
  onLeave: () => void;
}

export default function GamePlay({ room, playerId, onSubmitClue, onEndGame, onLeave }: GamePlayProps) {
  const [clue, setClue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const me = room.players.find((p) => p.id === playerId)!;
  const isSpectator = me?.isSpectator ?? false;
  const isImpostor = room.myRole === "impostor";
  const currentTurnId = room.turnOrder[room.currentTurnIndex];
  const isMyTurn = currentTurnId === playerId;
  const alreadySubmitted = me?.clue !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clue.trim()) return;
    setSubmitting(true);
    setError("");
    try { await onSubmitClue(clue.trim()); setClue(""); } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally { setSubmitting(false); }
  };

  if (isSpectator) {
    return (
      <div>
        <div className="ed-card" style={{ textAlign: 'center', borderColor: 'var(--ink-faint)' }}>
          <div className="ed-card-corners" />
          <span className="mono-label" style={{ color: 'var(--accent)' }}>SPECTATOR MODE</span>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17,
            color: 'var(--ink-soft)', paddingTop: 6,
          }}>Game in progress. You&apos;ll join the next round.</div>
        </div>
        <ClueList room={room} playerId={playerId} />
        <div style={{ paddingTop: 16 }}>
          <button className="ed-btn ed-btn-outline" style={{ width: '100%' }} onClick={onLeave}>
            &larr; LEAVE ROOM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Role card */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderBottom: '1px solid var(--ink)', paddingBottom: 6,
      }}>
        <span className="mono-label">ROUND {String(room.round).padStart(2, '0')} &middot; YOUR ROLE</span>
        <span className="mono-label">{me.name.toUpperCase()}</span>
      </div>

      <div className="ed-card" style={{
        marginTop: 16, textAlign: 'center',
        boxShadow: isImpostor ? '4px 4px 0 var(--accent)' : '4px 4px 0 var(--ink)',
      }}>
        <div className="ed-card-corners" />
        <span className="mono-label">
          {isImpostor ? 'CLASSIFIED' : `THE WORD · ${room.wordCategory?.toUpperCase() ?? ''}`}
        </span>
        <div style={{
          fontFamily: 'var(--serif)',
          fontStyle: isImpostor ? 'normal' : 'italic',
          fontSize: isImpostor ? 28 : 42,
          lineHeight: 1, fontWeight: isImpostor ? 700 : 500,
          color: isImpostor ? 'var(--accent)' : 'var(--ink)',
          letterSpacing: '-0.02em', paddingTop: 12,
          textTransform: isImpostor ? 'uppercase' : 'none',
        }}>
          {isImpostor ? "You are the Impostor" : room.secretWord}
        </div>
        {isImpostor ? (
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14,
            color: 'var(--ink-soft)', paddingTop: 14, lineHeight: 1.35,
          }}>
            Your hint: &ldquo;{room.wordHint}&rdquo; &mdash; bluff from there.
          </div>
        ) : (
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14,
            color: 'var(--ink-soft)', paddingTop: 14, lineHeight: 1.35,
          }}>
            Don&apos;t say it directly. One of you got something different.
          </div>
        )}
      </div>

      {/* Clue list */}
      <ClueList room={room} playerId={playerId} />

      {/* Input */}
      {isMyTurn && !alreadySubmitted ? (
        <form onSubmit={handleSubmit} style={{ paddingTop: 16 }}>
          <div className="section-head">
            <div>
              <span className="mono-label" style={{ color: 'var(--accent)' }}>YOUR TURN</span>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
                color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
              }}>Give your clue</div>
            </div>
          </div>
          {isImpostor && (
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
              color: 'var(--ink-soft)', paddingBottom: 8, lineHeight: 1.4,
            }}>
              You don&apos;t know the word &mdash; bluff something that fits the hint.
            </div>
          )}
          {error && (
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
              paddingBottom: 6, letterSpacing: '0.1em',
            }}>{error}</div>
          )}
          <input
            className="ed-input"
            style={{ fontSize: 16, letterSpacing: '0.08em', textTransform: 'none', textAlign: 'left' }}
            placeholder="Type your association clue..."
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            maxLength={50}
            autoFocus
            disabled={submitting}
          />
          <button
            type="submit" className="ed-btn ed-btn-accent ed-btn-lg"
            style={{ width: '100%', marginTop: 10 }}
            disabled={!clue.trim() || submitting}
          >
            {submitting ? "Submitting..." : "Submit Clue"}
          </button>
        </form>
      ) : alreadySubmitted ? (
        <div style={{
          marginTop: 16, border: '1.5px solid var(--ink)', padding: 14,
          textAlign: 'center', background: 'var(--card)',
        }}>
          <span className="mono-label" style={{ color: 'var(--success)' }}>
            &#10003; SUBMITTED: &ldquo;{me.clue}&rdquo;
          </span>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
            color: 'var(--ink-soft)', paddingTop: 6,
          }}>Waiting for others...</div>
        </div>
      ) : (
        <div style={{
          marginTop: 16, border: '1.5px solid var(--rule)', padding: 14,
          textAlign: 'center', background: 'var(--card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} className="ed-pulse" />
            <span className="mono-label">
              WAITING FOR {room.players.find((p) => p.id === currentTurnId)?.name.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Host & Leave */}
      <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {me.isHost && (
          <button className="ed-btn ed-btn-danger" style={{ width: '100%' }} onClick={onEndGame}>
            HOST: END GAME
          </button>
        )}
        <button className="ed-btn ed-btn-outline" style={{ width: '100%' }} onClick={onLeave}>
          &larr; LEAVE ROOM
        </button>
      </div>
    </div>
  );
}

function ClueList({ room, playerId }: { room: ClientGameRoom; playerId: string }) {
  return (
    <div style={{ paddingTop: 20 }}>
      <div className="section-head">
        <div>
          <span className="mono-label">THE TESTIMONY</span>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
            color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
          }}>Clues so far</div>
        </div>
        <span className="mono-label">{room.currentTurnIndex}/{room.turnOrder.length}</span>
      </div>
      <div>
        {room.turnOrder.map((pid, idx) => {
          const player = room.players.find((p) => p.id === pid)!;
          const isCurrent = idx === room.currentTurnIndex;
          const hasDone = idx < room.currentTurnIndex;
          const isYou = pid === playerId;

          return (
            <div key={pid} className="player-row" style={{
              background: isCurrent ? 'rgba(168,68,42,0.08)' : 'transparent',
              opacity: !hasDone && !isCurrent ? 0.4 : 1,
            }}>
              <div className="mono-label" style={{ width: 22, textAlign: 'right' }}>
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isCurrent ? 'var(--accent)' : 'var(--paper-alt)',
                border: '1px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600,
                color: isCurrent ? 'var(--paper)' : 'var(--ink)',
              }}>{player.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)',
                  lineHeight: 1.1, fontWeight: 500, display: 'flex', gap: 6, alignItems: 'baseline',
                }}>
                  {player.name}
                  {isYou && <span className="mono-label" style={{ color: 'var(--accent)', fontSize: 9 }}>YOU</span>}
                </div>
                {hasDone && player.clue && (
                  <div style={{
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14,
                    color: 'var(--ink-soft)', paddingTop: 2,
                  }}>&ldquo;{player.clue}&rdquo;</div>
                )}
              </div>
              {isCurrent && <span className="mono-label ed-pulse" style={{ color: 'var(--accent)' }}>SPEAKING</span>}
              {hasDone && <span style={{ color: 'var(--success)', fontSize: 14 }}>&#10003;</span>}
            </div>
          );
        })}
      </div>
      {/* Progress bar */}
      <div className="ed-progress-track" style={{ marginTop: 6 }}>
        <div className="ed-progress-fill" style={{
          width: `${(room.currentTurnIndex / room.turnOrder.length) * 100}%`,
        }} />
      </div>
    </div>
  );
}
