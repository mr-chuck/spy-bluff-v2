"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import type { ClientGameRoom } from "@/lib/types";

interface Toast {
  id: number;
  message: string;
}

function formatElapsedTime(startTime: number | null): string {
  if (!startTime) return "";
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

import Lobby from "@/components/Lobby";
import GamePlay from "@/components/GamePlay";
import OfflinePlay from "@/components/OfflinePlay";
import VotingPhase from "@/components/VotingPhase";
import ResultsScreen from "@/components/ResultsScreen";
import RoundHistoryModal from "@/components/RoundHistoryModal";

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const { code } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<ClientGameRoom | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [joiningName, setJoiningName] = useState("");
  const [joiningError, setJoiningError] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenTimestampsRef = useRef<Set<number>>(new Set());
  const toastIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem(`player_${code.toUpperCase()}`);
    if (stored) setPlayerId(stored);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    if (!room?.gameStartedAt) return;
    setElapsedTime(formatElapsedTime(room.gameStartedAt));
    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(room.gameStartedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.gameStartedAt]);

  useEffect(() => {
    if (!room?.notifications) return;
    for (const n of room.notifications) {
      if (!seenTimestampsRef.current.has(n.timestamp)) {
        seenTimestampsRef.current.add(n.timestamp);
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, message: n.message }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
      }
    }
  }, [room?.notifications]);

  const fetchRoom = useCallback(async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/room/${code.toUpperCase()}?playerId=${playerId}`);
      if (res.status === 404) { router.replace("/"); return; }
      if (!res.ok) return;
      const data: ClientGameRoom = await res.json();
      setRoom(data);
      setError("");
    } catch { /* retry */ } finally {
      setLoading(false);
      setInitialFetchDone(true);
    }
  }, [code, router, playerId]);

  useEffect(() => {
    if (!playerId) return;
    fetchRoom();
    const id = setInterval(fetchRoom, 2000);
    return () => clearInterval(id);
  }, [playerId, fetchRoom]);

  const handleStart = async () => {
    const res = await fetch(`/api/room/${code}/start`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to start"); }
    await fetchRoom();
  };

  const handleSubmitClue = async (clue: string) => {
    const res = await fetch(`/api/room/${code}/clue`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, clue }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to submit clue"); }
    await fetchRoom();
  };

  const handleVote = async (targetId: string) => {
    const res = await fetch(`/api/room/${code}/vote`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, targetId }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to vote"); }
    await fetchRoom();
  };

  const handleNextRound = async () => {
    const res = await fetch(`/api/room/${code}/next-round`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    await fetchRoom();
  };

  const handleContinueRound = async () => {
    const res = await fetch(`/api/room/${code}/continue-round`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    await fetchRoom();
  };

  const handleEndGame = async () => {
    const res = await fetch(`/api/room/${code}/end-game`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    await fetchRoom();
  };

  const handleBackToLobby = async () => {
    const res = await fetch(`/api/room/${code}/back-to-lobby`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed"); }
    await fetchRoom();
  };

  const handleLeave = async () => {
    try {
      await fetch(`/api/room/${code.toUpperCase()}/leave`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
    } catch { /* still clear */ }
    localStorage.removeItem(`player_${code.toUpperCase()}`);
    router.replace("/");
  };

  const handleJoinViaLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningName.trim()) { setJoiningError("Please enter your name"); return; }
    try {
      setJoiningError("");
      const res = await fetch(`/api/room/${code.toUpperCase()}/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: joiningName.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Failed to join"); }
      const data = await res.json();
      localStorage.setItem(`player_${code.toUpperCase()}`, data.playerId);
      setLoading(true);
      setPlayerId(data.playerId);
      setJoiningName("");
    } catch (err) {
      setJoiningError(err instanceof Error ? err.message : "Failed to join room");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'radial-gradient(ellipse at top, #2a2520, #14110f 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="ed-page" style={{ textAlign: 'center' }}>
          <div className="mono-label ed-pulse">LOADING ROOM...</div>
        </div>
      </div>
    );
  }

  // Join form
  if (!playerId) {
    return (
      <div style={{
        minHeight: '100vh', background: 'radial-gradient(ellipse at top, #2a2520, #14110f 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
      }}>
        <div className="ed-page paper-texture" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic',
                fontSize: 38, lineHeight: 0.95, fontWeight: 500, color: 'var(--ink)',
              }}>Spy Bluff</div>
              <div className="mono-label" style={{ paddingTop: 8 }}>
                JOIN ROOM {code.toUpperCase()}
              </div>
            </div>
            <form onSubmit={handleJoinViaLink} style={{ paddingTop: 24 }}>
              <div className="section-head">
                <div>
                  <span className="mono-label">YOUR IDENTITY</span>
                  <div style={{
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
                    color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
                  }}>Who are you?</div>
                </div>
              </div>
              <input
                className="ed-input"
                style={{ fontSize: 16, letterSpacing: '0.08em', textTransform: 'none' }}
                placeholder="Your name"
                value={joiningName}
                onChange={(e) => { setJoiningName(e.target.value); setJoiningError(""); }}
                maxLength={20}
                autoFocus
              />
              {joiningError && (
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
                  textAlign: 'center', padding: '8px 0', letterSpacing: '0.1em',
                }}>{joiningError}</div>
              )}
              <button type="submit" className="ed-btn ed-btn-accent ed-btn-lg" style={{ width: '100%', marginTop: 16 }}>
                Join Game
              </button>
            </form>
            <div style={{ textAlign: 'center', paddingTop: 20 }}>
              <button
                onClick={() => router.replace("/")}
                className="ed-btn ed-btn-ghost"
                style={{ color: 'var(--ink-soft)' }}
              >
                &larr; Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    if (!initialFetchDone) {
      return (
        <div style={{
          minHeight: '100vh', background: 'radial-gradient(ellipse at top, #2a2520, #14110f 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="ed-page" style={{ textAlign: 'center' }}>
            <div className="mono-label ed-pulse">LOADING ROOM...</div>
          </div>
        </div>
      );
    }
    return (
      <div style={{
        minHeight: '100vh', background: 'radial-gradient(ellipse at top, #2a2520, #14110f 70%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="ed-page" style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em' }}>
            {error || "ROOM NOT FOUND"}
          </div>
        </div>
      </div>
    );
  }

  const me = room.players.find((p) => p.id === playerId);
  if (!me) { router.replace("/"); return null; }

  const isOffline = room.mode === "offline";

  return (
    <div style={{
      minHeight: '100vh', background: 'radial-gradient(ellipse at top, #2a2520, #14110f 70%)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 20px 40px',
    }}>
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, display: 'flex', flexDirection: 'column', gap: 8,
          width: '100%', maxWidth: 420, padding: '0 16px',
        }}>
          {toasts.map((t) => (
            <div key={t.id} style={{
              background: 'var(--ink)', color: 'var(--paper)',
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '10px 16px', textAlign: 'center',
              border: '1.5px solid var(--accent)', boxShadow: '3px 3px 0 var(--accent)',
            }}>
              {t.message}
            </div>
          ))}
        </div>
      )}

      <div className="ed-page paper-texture" style={{ position: 'relative', overflow: 'hidden', paddingTop: 24 }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingBottom: 12, borderBottom: '1px solid var(--ink)',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24,
                color: 'var(--ink)', fontWeight: 500, lineHeight: 1,
              }}>Spy Bluff</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4 }}>
                <span className="mono-label">{room.code}</span>
                {isOffline && <span className="mono-label" style={{ color: 'var(--accent)' }}>OFFLINE</span>}
                {elapsedTime && <span className="mono-label">{elapsedTime}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {room.roundHistory.length > 0 && (
                <button className="ed-btn ed-btn-outline" style={{ fontSize: 9, padding: '6px 10px' }}
                  onClick={() => setShowHistory(true)}>
                  ARCHIVE ({room.roundHistory.length})
                </button>
              )}
            </div>
          </div>

          {/* Phase content */}
          <div style={{ paddingTop: 16 }}>
            {room.status === "lobby" && (
              <Lobby room={room} playerId={playerId} onStart={handleStart} onLeave={handleLeave} />
            )}
            {room.status === "playing" && !isOffline && (
              <GamePlay room={room} playerId={playerId} onSubmitClue={handleSubmitClue} onEndGame={handleEndGame} onLeave={handleLeave} />
            )}
            {room.status === "playing" && isOffline && (
              <OfflinePlay room={room} playerId={playerId} onEndGame={handleEndGame} />
            )}
            {room.status === "voting" && (
              <VotingPhase room={room} playerId={playerId} onVote={handleVote} onEndGame={handleEndGame} onLeave={handleLeave} />
            )}
            {room.status === "results" && (
              <ResultsScreen
                room={room} playerId={playerId}
                onNextRound={handleNextRound} onContinueRound={handleContinueRound}
                onBackToLobby={handleBackToLobby} onLeave={handleLeave}
              />
            )}
          </div>
        </div>
      </div>

      {showHistory && (
        <RoundHistoryModal history={room.roundHistory} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
