"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { GameMode } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [showRules, setShowRules] = useState(false);

  const [mode, setMode] = useState<GameMode>("online");
  const [expectedPlayers, setExpectedPlayers] = useState(6);
  const [impostorCount, setImpostorCount] = useState(1);
  const maxImpostors = Math.floor(expectedPlayers / 3);
  const adjustedImpostorCount = Math.min(impostorCount, maxImpostors);

  useEffect(() => {
    if (adjustedImpostorCount !== impostorCount) {
      setImpostorCount(adjustedImpostorCount);
    }
  }, [adjustedImpostorCount, impostorCount]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter your name first"); return; }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), mode,
          expectedPlayerCount: expectedPlayers,
          impostorCount: adjustedImpostorCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create room"); return; }
      localStorage.setItem(`player_${data.code}`, data.playerId);
      router.push(`/room/${data.code}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Enter your name first"); return; }
    if (!joinCode.trim()) { setError("Enter a room code"); return; }
    setJoining(true);
    setError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const res = await fetch(`/api/room/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to join room"); return; }
      localStorage.setItem(`player_${code}`, data.playerId);
      router.push(`/room/${code}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      background: 'radial-gradient(ellipse at top, #2a2520, #14110f 70%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div className="ed-page paper-texture" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Masthead */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
            <div className="mono-label" style={{ paddingBottom: 8 }}>
              VOL. I &middot; THE DAILY BLUFF
            </div>
            <div style={{
              fontFamily: 'var(--serif)', fontStyle: 'italic',
              fontSize: 56, lineHeight: 0.95, fontWeight: 500,
              color: 'var(--ink)', letterSpacing: '-0.02em',
            }}>
              Spy Bluff
            </div>
            <div className="mono-label" style={{
              paddingTop: 8, borderTop: '0.5px solid var(--rule)', marginTop: 8,
            }}>
              BLUFF IT TILL YOU MAKE IT
            </div>
          </div>

          {/* Tagline */}
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 17,
            color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.4,
            borderBottom: '0.5px solid var(--rule)', padding: '16px 0',
          }}>
            A party game where one of you is lying through their teeth,
            and the rest are about to find out.
          </div>

          {/* Name */}
          <div style={{ paddingTop: 20 }}>
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* Join section */}
          <div style={{ paddingTop: 24 }}>
            <div className="section-head">
              <div>
                <span className="mono-label">JOIN &mdash; 6 DIGITS</span>
                <div style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
                  color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
                }}>Got a code?</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                className="ed-input"
                style={{ flex: 1, minWidth: 0 }}
                placeholder="AG4K2N"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              />
              <button
                className="ed-btn ed-btn-solid"
                onClick={handleJoin}
                disabled={!joinCode.trim() || joining || creating}
              >
                {joining ? "..." : "Join"}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ paddingTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            <span className="mono-label">OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>

          {/* Create game */}
          <div style={{ paddingTop: 18 }}>
            <div className="section-head">
              <div>
                <span className="mono-label">HOST A GAME</span>
                <div style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
                  color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
                }}>New game settings</div>
              </div>
            </div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--ink)', marginBottom: 14 }}>
              {(["online", "offline"] as const).map((m, i) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 10px',
                  letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                  borderLeft: i > 0 ? '1px solid var(--ink)' : 'none',
                  background: mode === m ? 'var(--ink)' : 'transparent',
                  color: mode === m ? 'var(--paper)' : 'var(--ink)', fontWeight: 600,
                }}>{m}</button>
              ))}
            </div>

            {/* Players stepper */}
            <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>
                  Players (max)
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch', border: '1.5px solid var(--ink)' }}>
                  <button onClick={() => setExpectedPlayers(Math.max(3, expectedPlayers - 1))} style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    width: 36, fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', padding: 0,
                  }}>&#8722;</button>
                  <div style={{
                    minWidth: 48, padding: '8px 6px', borderLeft: '1px solid var(--ink)',
                    borderRight: '1px solid var(--ink)', background: 'var(--card)',
                    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: 'var(--ink)',
                    textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{expectedPlayers}</div>
                  <button onClick={() => setExpectedPlayers(Math.min(20, expectedPlayers + 1))} style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    width: 36, fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', padding: 0,
                  }}>+</button>
                </div>
              </div>
            </div>

            {/* Impostors stepper */}
            <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--rule)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)' }}>
                    Impostors
                  </div>
                  <div style={{
                    fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12,
                    color: 'var(--ink-soft)', paddingTop: 2,
                  }}>
                    {maxImpostors <= 1 ? 'Bigger rooms unlock more.' : `Up to ${maxImpostors} allowed.`}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch', border: '1.5px solid var(--ink)' }}>
                  <button onClick={() => setImpostorCount(Math.max(1, impostorCount - 1))} style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    width: 36, fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', padding: 0,
                  }}>&#8722;</button>
                  <div style={{
                    minWidth: 48, padding: '8px 6px', borderLeft: '1px solid var(--ink)',
                    borderRight: '1px solid var(--ink)', background: 'var(--card)',
                    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18, color: 'var(--ink)',
                    textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{adjustedImpostorCount}</div>
                  <button onClick={() => setImpostorCount(Math.min(maxImpostors, impostorCount + 1))} style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    width: 36, fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', padding: 0,
                  }}>+</button>
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
                textAlign: 'center', padding: '10px 0', letterSpacing: '0.1em',
              }}>{error}</div>
            )}

            <div style={{ paddingTop: 16 }}>
              <button
                className="ed-btn ed-btn-accent ed-btn-lg"
                style={{ width: '100%' }}
                onClick={handleCreate}
                disabled={creating || joining}
              >
                {creating ? "Creating..." : "Host a new game"}
              </button>
              <div style={{
                fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13,
                color: 'var(--ink-soft)', paddingTop: 8, textAlign: 'center',
              }}>
                You&apos;ll get a room code to share. 3&ndash;20 players.
              </div>
            </div>
          </div>

          {/* Rules */}
          <div style={{ paddingTop: 28 }}>
            <div className="section-head" style={{ cursor: 'pointer' }} onClick={() => setShowRules(!showRules)}>
              <div>
                <span className="mono-label">00 &middot; A PRIMER</span>
                <div style={{
                  fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22,
                  color: 'var(--ink)', lineHeight: 1.1, fontWeight: 500,
                }}>The Rules</div>
              </div>
              <span className="mono-label">{showRules ? '&#9650;' : '1 MIN READ'}</span>
            </div>
            {showRules && (
              <ol style={{
                fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink)',
                lineHeight: 1.45, paddingLeft: 22, margin: 0, listStyleType: 'decimal',
              }}>
                <li>Everyone gets the <em>same secret word</em>.</li>
                <li>Everyone except the <span style={{ color: 'var(--accent)', fontStyle: 'italic', fontWeight: 600 }}>imposter(s)</span> hiding among you.</li>
                <li>Take turns giving one-word clues &mdash; vaguely enough not to give the word away, specifically enough not to look suspicious.</li>
                <li>Vote someone out each round. Keep going until the imposters are caught &mdash; or they outlast everyone.</li>
              </ol>
            )}
          </div>

          {/* Footer */}
          <div style={{ paddingTop: 28, textAlign: 'center' }}>
            <span className="mono-label">NO ACCOUNT &middot; NO ADS &middot; NO MERCY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
