"use client";

import { useState } from "react";
import type { ClientGameRoom } from "@/lib/types";

interface LobbyProps {
  room: ClientGameRoom;
  playerId: string;
  onStart: () => Promise<void>;
  onLeave: () => void;
}

export default function Lobby({ room, playerId, onStart, onLeave }: LobbyProps) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const minPlayers = room.impostorCount + 2;
  const canStart = room.players.length >= minPlayers;
  const playersShort = Math.max(0, minPlayers - room.players.length);

  const handleStart = async () => {
    setStarting(true);
    setError("");
    try { await onStart(); } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
      setStarting(false);
    }
  };

  const copyCode = () => { navigator.clipboard.writeText(room.code).catch(() => {}); };
  const copyInviteLink = () => {
    const link = `${window.location.origin}/room/${room.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
        <div className="mono-label" style={{ paddingBottom: 8 }}>THE DRAWING ROOM</div>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 38,
          lineHeight: 0.95, fontWeight: 500, color: 'var(--ink)',
        }}>Waiting Room</div>
        <div className="mono-label" style={{
          paddingTop: 8, borderTop: '0.5px solid var(--rule)', marginTop: 8,
          display: 'flex', justifyContent: 'center', gap: 12,
        }}>
          <span>{room.mode === "offline" ? "OFFLINE" : "ONLINE"}</span>
          <span>&middot;</span>
          <span>{room.impostorCount} IMPOSTOR{room.impostorCount > 1 ? "S" : ""}</span>
        </div>
      </div>

      {/* Room code */}
      <div style={{ paddingTop: 18, textAlign: 'center' }}>
        <span className="mono-label">ROOM CODE &mdash; SHARE THIS</span>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 42, letterSpacing: '0.28em',
          color: 'var(--ink)', fontWeight: 700, padding: '8px 0',
          cursor: 'pointer',
        }} onClick={copyCode}>{room.code}</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <button className="ed-btn ed-btn-outline" style={{ fontSize: 9, padding: '6px 10px' }}
            onClick={copyCode}>COPY CODE</button>
          <button className="ed-btn ed-btn-outline" style={{ fontSize: 9, padding: '6px 10px' }}
            onClick={copyInviteLink}>
            {linkCopied ? "COPIED!" : "COPY LINK"}
          </button>
        </div>
      </div>

      {/* Players */}
      <div style={{ paddingTop: 22 }}>
        <div className="section-head">
          <div>
            <span className="mono-label">
              THE CAST &middot; {room.players.length} / {room.expectedPlayerCount}
            </span>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
              color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
            }}>Tonight&apos;s suspects</div>
          </div>
          <span className="mono-label" style={{ color: playersShort > 0 ? 'var(--accent)' : 'var(--success)' }}>
            {playersShort > 0 ? `NEED ${playersShort} MORE` : 'READY'}
          </span>
        </div>
        <div>
          {room.players.map((p, i) => (
            <div key={p.id} className="player-row">
              <div className="mono-label" style={{ width: 22, textAlign: 'right' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--paper-alt)', border: '1px solid var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink)',
              }}>{p.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--ink)',
                  lineHeight: 1.1, fontWeight: 500, display: 'flex', gap: 6, alignItems: 'baseline',
                }}>
                  {p.name}
                  {p.id === playerId && (
                    <span className="mono-label" style={{ color: 'var(--accent)', fontSize: 9 }}>YOU</span>
                  )}
                </div>
                <span className="mono-label">Ready</span>
              </div>
              {p.isHost && <span className="mono-label">HOST</span>}
              {p.isSpectator && <span className="mono-label" style={{ color: 'var(--accent)' }}>SPECTATOR</span>}
            </div>
          ))}
          {/* Empty seats */}
          {Array.from({ length: Math.max(0, room.expectedPlayerCount - room.players.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="player-row" style={{ opacity: 0.35 }}>
              <div className="mono-label" style={{ width: 22, textAlign: 'right' }}>
                {String(room.players.length + 1 + i).padStart(2, '0')}
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px dashed var(--rule)',
              }} />
              <span className="mono-label">&mdash; empty &mdash;</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start button */}
      <div style={{ paddingTop: 22 }}>
        {error && (
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
            textAlign: 'center', padding: '8px 0', letterSpacing: '0.1em',
          }}>{error}</div>
        )}
        {isHost ? (
          <button
            className="ed-btn ed-btn-accent ed-btn-lg"
            style={{ width: '100%' }}
            onClick={handleStart}
            disabled={!canStart || starting}
          >
            {canStart
              ? starting ? "Starting..." : `Begin · ${room.players.length} players · ${room.impostorCount} impostor${room.impostorCount > 1 ? 's' : ''}`
              : `Need ${playersShort} more to begin`}
          </button>
        ) : (
          <div style={{
            border: '1.5px solid var(--rule)', padding: '14px', textAlign: 'center',
            background: 'var(--card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} className="ed-pulse" />
              <span className="mono-label">WAITING FOR HOST TO START</span>
            </div>
          </div>
        )}
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
          color: 'var(--ink-soft)', textAlign: 'center', paddingTop: 8,
        }}>
          Only the host can start. Everyone else: get comfy.
        </div>
      </div>

      {/* Leave */}
      <div style={{ paddingTop: 16 }}>
        <button className="ed-btn ed-btn-outline" style={{ width: '100%' }} onClick={onLeave}>
          &larr; LEAVE ROOM
        </button>
      </div>
    </div>
  );
}
