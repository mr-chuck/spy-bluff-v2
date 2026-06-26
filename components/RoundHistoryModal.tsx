"use client";

import type { RoundSnapshot } from "@/lib/types";

interface RoundHistoryModalProps {
  history: RoundSnapshot[];
  onClose: () => void;
}

export default function RoundHistoryModal({ history, onClose }: RoundHistoryModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,17,15,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--paper)', border: '2px solid var(--ink)',
        maxWidth: 440, width: '100%', maxHeight: '80vh', overflow: 'auto',
        padding: 24, position: 'relative',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '2px solid var(--ink)', paddingBottom: 8, marginBottom: 16,
        }}>
          <div>
            <span className="mono-label">THE ARCHIVE</span>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 28,
              color: 'var(--ink)', fontWeight: 500,
            }}>Past Rounds</div>
          </div>
          <button className="ed-btn ed-btn-outline" style={{ fontSize: 9, padding: '6px 10px' }}
            onClick={onClose}>CLOSE</button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          border: '1.5px solid var(--ink)', marginBottom: 16,
        }}>
          {[
            { k: 'Rounds', v: history.length },
            { k: 'Town Wins', v: history.filter((h) => h.winner === 'crew').length },
            { k: 'Imp. Wins', v: history.filter((h) => h.winner === 'impostor').length },
          ].map((s, i) => (
            <div key={s.k} style={{
              padding: '12px 8px', textAlign: 'center',
              borderLeft: i > 0 ? '1px solid var(--ink)' : 'none', background: 'var(--card)',
            }}>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 28,
                color: 'var(--ink)', lineHeight: 1,
              }}>{s.v}</div>
              <span className="mono-label">{s.k}</span>
            </div>
          ))}
        </div>

        {/* Rounds */}
        {[...history].reverse().map((round) => (
          <div key={round.roundNumber} style={{
            padding: '14px 0', borderBottom: '0.5px solid var(--rule)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <div>
                <span className="mono-label">R-{String(round.roundNumber).padStart(3, '0')}</span>
                <div style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20,
                  color: 'var(--ink)', lineHeight: 1.1,
                }}>{round.secretWord}</div>
              </div>
              {round.winner && (
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.12em', padding: '3px 6px',
                  border: `1.5px solid ${round.winner === 'crew' ? 'var(--success)' : 'var(--accent)'}`,
                  color: round.winner === 'crew' ? 'var(--success)' : 'var(--accent)',
                  transform: 'rotate(-3deg)', display: 'inline-block',
                }}>
                  {round.winner === 'crew' ? 'TOWN' : 'IMPOSTOR'}
                </span>
              )}
            </div>

            {/* Clues */}
            {Object.values(round.playerClues).length > 0 && (
              <div style={{ paddingTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Object.values(round.playerClues).map((c, i) => (
                  <span key={i} style={{
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
                    color: 'var(--ink-soft)',
                  }}>{c.name}: &ldquo;{c.clue}&rdquo;</span>
                ))}
              </div>
            )}

            {/* Impostors */}
            {round.impostorIds.length > 0 && (
              <div style={{ paddingTop: 4 }}>
                <span className="mono-label" style={{ color: 'var(--accent)' }}>
                  IMPOSTOR: {round.impostorIds.map((id) => round.playerNames[id]).join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
