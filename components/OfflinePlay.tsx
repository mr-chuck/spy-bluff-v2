"use client";

import { useState } from "react";
import type { ClientGameRoom } from "@/lib/types";

interface OfflinePlayProps {
  room: ClientGameRoom;
  playerId: string;
  onEndGame: () => Promise<void>;
}

export default function OfflinePlay({ room, playerId, onEndGame }: OfflinePlayProps) {
  const [revealed, setRevealed] = useState(false);
  const me = room.players.find((p) => p.id === playerId)!;
  const isImpostor = room.myRole === "impostor";

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        borderBottom: '1px solid var(--ink)', paddingBottom: 6,
      }}>
        <span className="mono-label">ROUND {String(room.round).padStart(2, '0')} &middot; YOUR ROLE</span>
        <span className="mono-label">OFFLINE MODE</span>
      </div>

      <div style={{ paddingTop: 20, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 28,
          color: 'var(--ink)', lineHeight: 1.15,
        }}>
          {revealed ? (isImpostor ? "Bad news." : "Read this once.") : "A sealed envelope."}
        </div>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15,
          color: 'var(--ink-soft)', paddingTop: 6,
        }}>
          {revealed
            ? (isImpostor ? "You don't know the exact word. Fake the rest." : "Memorize it. Don't say it out loud.")
            : "Tap below to peek at your role."}
        </div>
      </div>

      <div style={{ paddingTop: 24 }}>
        {revealed ? (
          <div className="ed-card" style={{
            textAlign: 'center',
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
              paddingTop: 12, textTransform: isImpostor ? 'uppercase' : 'none',
            }}>
              {isImpostor ? "You are the Impostor" : room.secretWord}
            </div>
            {isImpostor && room.wordHint && (
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14,
                color: 'var(--ink-soft)', paddingTop: 14,
              }}>Your hint: &ldquo;{room.wordHint}&rdquo;</div>
            )}
          </div>
        ) : (
          <div className="ed-card" style={{ textAlign: 'center' }}>
            <div className="ed-card-corners" />
            <span className="mono-label">TOP SECRET</span>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 42,
              color: 'var(--ink)', paddingTop: 12,
            }}>&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;</div>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14,
              color: 'var(--ink-soft)', paddingTop: 14,
            }}>Tap to reveal.</div>
          </div>
        )}
      </div>

      <div style={{ paddingTop: 16 }}>
        {!revealed ? (
          <button className="ed-btn ed-btn-accent ed-btn-lg" style={{ width: '100%' }}
            onClick={() => setRevealed(true)}>
            REVEAL MY ROLE
          </button>
        ) : (
          <button className="ed-btn ed-btn-solid ed-btn-lg" style={{ width: '100%' }}
            onClick={() => setRevealed(false)}>
            HIDE THE WORD
          </button>
        )}
      </div>

      <div style={{
        paddingTop: 16, textAlign: 'center',
        fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-faint)',
        letterSpacing: '0.18em',
      }}>
        {revealed ? 'DO NOT SHOW THE PERSON NEXT TO YOU' : 'PASS THE DEVICE AROUND'}
      </div>

      {me.isHost && (
        <div style={{ paddingTop: 24 }}>
          <button className="ed-btn ed-btn-danger" style={{ width: '100%' }} onClick={onEndGame}>
            HOST: END GAME &amp; REVEAL
          </button>
        </div>
      )}
    </div>
  );
}
