"use client";

import { useState } from "react";
import type { ClientGameRoom } from "@/lib/types";

interface VotingPhaseProps {
  room: ClientGameRoom;
  playerId: string;
  onVote: (targetId: string) => Promise<void>;
  onEndGame: () => Promise<void>;
  onLeave: () => void;
}

export default function VotingPhase({ room, playerId, onVote, onEndGame, onLeave }: VotingPhaseProps) {
  const [voting, setVoting] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const me = room.players.find((p) => p.id === playerId)!;
  const isSpectator = me?.isSpectator ?? false;
  const alivePlayers = room.players.filter((p) => p.isAlive && !p.isSpectator);
  const votedCount = alivePlayers.filter((p) => p.hasVoted).length;
  const alreadyVoted = me?.hasVoted;

  const handleVote = async (targetId: string) => {
    setVoting(true);
    setSelected(targetId);
    setError("");
    try { await onVote(targetId); } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote");
      setVoting(false);
      setSelected(null);
    }
  };

  if (isSpectator) {
    return (
      <div>
        <div className="ed-card" style={{ textAlign: 'center' }}>
          <div className="ed-card-corners" />
          <span className="mono-label" style={{ color: 'var(--accent)' }}>SPECTATOR MODE</span>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17,
            color: 'var(--ink-soft)', paddingTop: 6,
          }}>Voting in progress. You&apos;ll join the next round.</div>
        </div>
        <ClueSummary room={room} />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span className="mono-label ed-pulse">{votedCount}/{alivePlayers.length} VOTES IN</span>
        </div>
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
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderBottom: '1px solid var(--ink)', paddingBottom: 6,
      }}>
        <span className="mono-label">ROUND {String(room.round).padStart(2, '0')} &middot; VOTING</span>
        <span className="mono-label" style={{ color: 'var(--accent)' }}>
          {votedCount}/{alivePlayers.length} IN
        </span>
      </div>

      <div style={{ paddingTop: 18, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 32,
          color: 'var(--ink)', lineHeight: 1.05, letterSpacing: '-0.02em',
        }}>Who&apos;s the imposter?</div>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15,
          color: 'var(--ink-soft)', paddingTop: 10, lineHeight: 1.4,
        }}>
          Most votes gets eliminated. They could be innocent &mdash; choose well.
        </div>
      </div>

      {/* Clue summary */}
      <ClueSummary room={room} />

      {/* Vote buttons */}
      {!alreadyVoted ? (
        <div style={{ paddingTop: 16 }}>
          <div className="section-head">
            <div>
              <span className="mono-label">CAST YOUR VOTE</span>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
                color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
              }}>Pick a suspect</div>
            </div>
          </div>
          {error && (
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
              paddingBottom: 8, letterSpacing: '0.1em',
            }}>{error}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {alivePlayers.map((p) => {
              if (p.id === playerId) {
                return (
                  <div key={p.id} style={{
                    border: '1.5px dashed var(--rule)', padding: 12,
                    textAlign: 'center', opacity: 0.5,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
                      background: 'var(--paper-alt)', border: '1px solid var(--ink)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600,
                    }}>{p.name.charAt(0).toUpperCase()}</div>
                    <div style={{
                      fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic', color: 'var(--ink-faint)',
                    }}>{p.name}</div>
                    <span className="mono-label">YOU</span>
                  </div>
                );
              }
              const isSelected = selected === p.id;
              return (
                <button key={p.id} onClick={() => !voting && handleVote(p.id)} style={{
                  background: isSelected ? 'var(--ink)' : 'var(--card)',
                  color: isSelected ? 'var(--paper)' : 'var(--ink)',
                  border: '1.5px solid var(--ink)', padding: 12, cursor: voting ? 'not-allowed' : 'pointer',
                  textAlign: 'center', boxShadow: isSelected ? '3px 3px 0 var(--accent)' : 'none',
                  transition: 'all 0.12s',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', margin: '0 auto 6px',
                    background: isSelected ? 'var(--accent)' : 'var(--paper-alt)',
                    border: '1px solid currentColor',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600,
                    color: isSelected ? 'var(--paper)' : 'var(--ink)',
                  }}>{p.name.charAt(0).toUpperCase()}</div>
                  <div style={{
                    fontFamily: 'var(--serif)', fontSize: 18, fontStyle: 'italic',
                  }}>{p.name}</div>
                  {p.clue && (
                    <div style={{
                      fontFamily: 'var(--serif)', fontSize: 12, fontStyle: 'italic',
                      opacity: 0.7, paddingTop: 4,
                    }}>&ldquo;{p.clue}&rdquo;</div>
                  )}
                  {isSelected && (
                    <div className="mono-label" style={{ paddingTop: 4, fontSize: 9 }}>
                      &#10003; YOUR PICK
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button
            className="ed-btn ed-btn-outline"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => !voting && handleVote("abstain")}
            disabled={voting}
          >
            ABSTAIN (SKIP VOTE)
          </button>
        </div>
      ) : (
        <div style={{
          marginTop: 16, textAlign: 'center', padding: 16,
          border: '1.5px solid var(--ink)', background: 'var(--card)',
          boxShadow: '3px 3px 0 var(--ink)',
        }}>
          <span className="mono-label" style={{ color: 'var(--success)' }}>&#10003; VOTE CAST</span>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18,
            color: 'var(--ink)', paddingTop: 4,
          }}>
            Tallying... <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
              {votedCount}/{alivePlayers.length}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, paddingTop: 8 }}>
            {alivePlayers.map((p) => (
              <div key={p.id} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: p.hasVoted ? 'var(--success)' : 'var(--rule)',
              }} className={p.hasVoted ? '' : 'ed-pulse'} />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ paddingTop: 16, textAlign: 'center' }}>
        <span className="mono-label">YOU MAY DISCUSS BUT YOU MAY NOT CONSPIRE</span>
      </div>
      <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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

function ClueSummary({ room }: { room: ClientGameRoom }) {
  return (
    <div style={{ paddingTop: 16 }}>
      <div className="section-head">
        <div>
          <span className="mono-label">THE TESTIMONY</span>
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 18,
            color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
          }}>All clues this round</div>
        </div>
      </div>
      {room.turnOrder.map((pid) => {
        const player = room.players.find((p) => p.id === pid)!;
        return (
          <div key={pid} className="player-row">
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--paper-alt)',
              border: '1px solid var(--ink)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600,
            }}>{player.name.charAt(0).toUpperCase()}</div>
            <span style={{
              fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', flex: 1,
            }}>{player.name}</span>
            <span style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)',
            }}>&ldquo;{player.clue ?? "—"}&rdquo;</span>
          </div>
        );
      })}
    </div>
  );
}
