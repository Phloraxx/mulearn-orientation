import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import QrScanner from "qr-scanner";
import { api, compressPhoto, connectEvents, listPending, post, savePending, uploadPending } from "./api";
import type { Participant, PublicSnapshot, TeamProgress } from "./types";
import "./styles.css";

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <main className={wide ? "shell shell-wide" : "shell"}>
    <header className="brand"><span>µ</span>Learn <small>SCET ORIENTATION</small></header>
    {children}
  </main>;
}

function ErrorBox({ error }: { error?: string }) {
  return error ? <div className="error" role="alert">{error}</div> : null;
}

function Loading() {
  return <Shell><div className="center"><div className="loader" /><p>Connecting to the game…</p></div></Shell>;
}

function ParticipantApp() {
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [name, setName] = useState("");
  const [scanToken, setScanToken] = useState(localStorage.getItem("orientation_scan_token") ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const result = await api<{ participant: Participant }>("/api/participant/snapshot");
      setParticipant(result.participant);
      setError("");
    } catch (failure: any) {
      if (failure.error !== "SESSION_REQUIRED" && failure.error !== "SESSION_INVALID") setError(failure.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const recover = new URLSearchParams(location.search).get("recover");
    const recoveredScan = new URLSearchParams(location.search).get("scan");
    if (recover) {
      void post<{ participant: Participant; scanToken?: string }>("/api/participant/restore", {
        sessionToken: recover,
        scanToken: recoveredScan
      })
        .then(result => {
          if (result.scanToken) {
            localStorage.setItem("orientation_scan_token", result.scanToken);
            setScanToken(result.scanToken);
          }
          setParticipant(result.participant);
          history.replaceState(null, "", "/play");
        }).catch(failure => setError(failure.message)).finally(() => setLoading(false));
    } else void refresh();
  }, [refresh]);

  useEffect(() => participant ? connectEvents(refresh) : undefined, [participant, refresh]);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await post<{ participant: Participant; scanToken: string }>("/api/join", { displayName: name });
      localStorage.setItem("orientation_scan_token", result.scanToken);
      setScanToken(result.scanToken);
      setParticipant(result.participant);
      navigate("/play", { replace: true });
    } catch (failure: any) { setError(failure.message); }
  }

  if (loading) return <Loading />;
  if (!participant) return <Shell>
    <section className="hero">
      <div className="eyebrow">TOMORROW STARTS HERE</div>
      <h1>Find your crew.<br /><em>Make some chaos.</em></h1>
      <p>One name. One animal. One very strange mission.</p>
    </section>
    <form className="card join-card" onSubmit={join}>
      <label htmlFor="name">What should we call you?</label>
      <input id="name" autoComplete="name" maxLength={60} value={name} onChange={event => setName(event.target.value)}
        placeholder="Your name" autoFocus />
      <ErrorBox error={error} />
      <button className="primary" type="submit">REVEAL MY ANIMAL →</button>
    </form>
  </Shell>;
  return <ParticipantView participant={participant} scanToken={scanToken} error={error} onRefresh={refresh} />;
}

function ParticipantView({ participant, scanToken, error, onRefresh }: {
  participant: Participant; scanToken: string; error: string; onRefresh: () => void;
}) {
  const [key, setKey] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [glitch, setGlitch] = useState(false);
  const phase = participant.phase;
  const teamStyle = { "--team": participant.team.color } as React.CSSProperties;

  useEffect(() => {
    if (participant.mystery.paired) {
      void (navigator as any).wakeLock?.request?.("screen").catch(() => {});
      void (screen.orientation as any)?.lock?.("portrait").catch(() => {});
    }
  }, [participant.mystery.paired]);

  async function match(event: React.FormEvent) {
    event.preventDefault();
    setMatching(true);
    setMatchError("");
    try {
      await post("/api/participant/match", { key });
      navigator.vibrate?.([60, 40, 120]);
      setGlitch(true);
      setTimeout(() => { setGlitch(false); onRefresh(); }, 850);
    } catch (failure: any) {
      navigator.vibrate?.(100);
      setMatchError(failure.message);
    } finally { setMatching(false); }
  }

  if (phase === "MYSTERY" && participant.mystery.paired) {
    return <main className={`tile-screen ${glitch ? "glitch" : ""}`}>
      <img src={`${participant.mystery.tileUrl}?v=1`} alt="Your mystery puzzle piece" draggable={false} />
      <div className="tile-hint">PLACE PHONE ON FLOOR · KEEP SCREEN UP</div>
    </main>;
  }

  if (phase === "MYSTERY" && participant.mystery.role === "DETECTIVE") {
    return <Shell><section className="role-screen detective">
      <div className="huge">🕵️</div><div className="eyebrow">NO PAIR · NO CLUE</div>
      <h1>YOU ARE THE<br />DETECTIVE</h1>
      <p>Help arrange the phones on the floor and figure out what is happening in the image.</p>
    </section></Shell>;
  }

  if (phase === "MEME") return <Shell>
    <section className="team-mini" style={teamStyle}><span>{participant.team.emoji}</span>{participant.team.name} TEAM</section>
    {participant.meme ? <section className="meme-view">
      <div className="eyebrow">FIND YOUR GROUP · COPY THE POSE</div>
      <img src={participant.meme.referenceUrl} alt={`${participant.meme.title} reference`} loading="eager" />
      <h1>{participant.meme.title}</h1>
      <div className="pose-instruction">{participant.meme.instruction}</div>
      <div className="people">{participant.meme.group.map(person => <span key={person}>{person}</span>)}</div>
      <p>Find the names above inside your animal zone, recreate this pose, then go to your volunteer for one fast photo.</p>
    </section> : <StatusCard title="No meme group found" text="Stay in your animal zone and tell the host. You should not be left waiting here." emoji="🛠️" />}
  </Shell>;

  if (phase === "MYSTERY") return <Shell>
    <section className="team-mini" style={teamStyle}><span>{participant.team.emoji}</span>{participant.team.name} · MYSTERY</section>
    {participant.mystery.role === "QUESTION" ? <section className="role-screen">
      <div className="eyebrow">YOU HAVE THE QUESTION</div>
      <h2>{participant.mystery.question}</h2>
      <p>Team-il samsarichu matching answer kandupidikku. Answer-holder inte 4-digit key ivide type cheyyu.</p>
      <form onSubmit={match}>
        <input className={matchError ? "key-input shake" : "key-input"} inputMode="numeric" pattern="[0-9]*"
          maxLength={4} value={key} onChange={event => setKey(event.target.value.replace(/\D/g, ""))}
          placeholder="••••" aria-label="Answer holder key" />
        <ErrorBox error={matchError} />
        <button className="primary" disabled={key.length !== 4 || matching}>{matching ? "CHECKING…" : "LOCK THIS MATCH"}</button>
      </form>
    </section> : participant.mystery.role === "ANSWER" ? <section className="role-screen answer">
      <div className="eyebrow">YOU HAVE THE ANSWER</div>
      <h2>{participant.mystery.answer}</h2>
      <p>Matching question ulla aale kandupidikku. Ee key avarkku kodukku:</p>
      <div className="answer-key">{participant.mystery.answerKey}</div>
      <small>Question-holder aanu key enter cheyyendath.</small>
    </section> : <StatusCard title="No mystery role found" text="Tell the host. Every active participant should already have a question, answer, or Detective role." emoji="🛠️" />}
  </Shell>;

  if (phase === "REVEAL") return <Shell>
    <StatusCard title="Eyes on the big screen" text="The theories are about to meet reality." emoji="👀" />
  </Shell>;

  if (phase === "ENDED") return <Shell>
    <StatusCard title="That's a wrap!" text="Thanks for playing. You can put your phone away and stay with your team for the closing." emoji="🎉" />
  </Shell>;

  if (phase === "SETUP") return <Shell>
    <StatusCard title="Event getting ready" text="Registration is currently closed. Keep this page open; the host will open Assembly shortly." emoji="⏳" />
  </Shell>;

  return <Shell>
    <section className="animal-reveal" style={teamStyle}>
      <div className="eyebrow">{participant.checkedIn ? "YOU FOUND YOUR ZONE" : "THIS IS YOUR CREW"}</div>
      <div className="animal">{participant.team.emoji}</div>
      <p>YOU ARE A</p><h1>{participant.team.name.toUpperCase()}</h1>
      <div className="instruction">{participant.checkedIn
        ? `Checked in ✓ Stay with the ${participant.team.name} team.`
        : `Find the ${participant.team.name} zone and ${participant.team.volunteer}. Show this QR.`}</div>
      {scanToken ? <div className="qr"><QRCodeSVG value={scanToken} size={220} level="M" /><small>PERSONAL CHECK-IN QR</small></div>
        : <p className="error">QR token is missing. Ask technical support for device recovery.</p>}
      <ErrorBox error={error} />
    </section>
  </Shell>;
}

function StatusCard({ title, text, emoji = "⚡" }: { title: string; text: string; emoji?: string }) {
  return <section className="card status-card"><div className="huge">{emoji}</div><h1>{title}</h1><p>{text}</p></section>;
}

function StaffGate({ role, teamSlug, children }: { role: string; teamSlug?: string; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const supplied = new URLSearchParams(location.search).get("t");
    const bootstrap = supplied
      ? post("/api/auth/bootstrap", { role, teamSlug, token: supplied })
      : Promise.resolve();
    void bootstrap.then(() => {
      if (supplied) history.replaceState(null, "", location.pathname);
      setReady(true);
    }).catch(failure => setError(failure.message));
  }, [role, teamSlug]);
  if (error) return <Shell><StatusCard title="Private access required" text={error} emoji="🔐" /></Shell>;
  return ready ? <>{children}</> : <Loading />;
}

type VolunteerSnapshot = {
  event: { phase: string };
  team: { id: string; slug: string; name: string; emoji: string; theory?: string | null };
  progress: { checked: number; total: number };
  assignments: Array<{ id: string; title: string; members: string; captured_media_id?: string; upload_status?: string }>;
  qa: { total: number; matched: number };
};

function VolunteerApp() {
  const { slug = "" } = useParams();
  return <StaffGate role="volunteer" teamSlug={slug}><VolunteerPanel /></StaffGate>;
}

function VolunteerPanel() {
  const [data, setData] = useState<VolunteerSnapshot | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState("");
  const [theory, setTheory] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const refresh = useCallback(() => api<VolunteerSnapshot>("/api/volunteer/snapshot").then(setData).catch(e => setError(e.message)), []);
  useEffect(() => { void refresh(); return connectEvents(refresh); }, [refresh]);
  useEffect(() => {
    const retry = async () => {
      if (!navigator.onLine) return;
      for (const pending of await listPending().catch(() => [])) {
        await uploadPending(pending.assignmentId, pending.blob).catch(() => {});
      }
      void refresh();
    };
    void retry();
    addEventListener("online", retry);
    return () => removeEventListener("online", retry);
  }, [refresh]);

  async function scan(event: React.FormEvent) {
    event.preventDefault();
    try {
      const token = scanValue.trim().split("/").at(-1)!;
      const result = await post<{ status: string; participant: string; progress: { checked: number; total: number } }>(
        "/api/volunteer/scan", { scanToken: token }
      );
      setScanMessage(`${result.status.replaceAll("_", " ")} · ${result.participant} · ${result.progress.checked}/${result.progress.total}`);
      setError(""); setScanValue(""); navigator.vibrate?.(80); void refresh();
    } catch (failure: any) { setError(failure.message); navigator.vibrate?.([120, 50, 120]); }
  }

  async function scanRaw(raw: string) {
    setScanValue(raw.trim().split("/").at(-1)!);
    try {
      const token = raw.trim().split("/").at(-1)!;
      const result = await post<{ status: string; participant: string; progress: { checked: number; total: number } }>(
        "/api/volunteer/scan", { scanToken: token }
      );
      setScanMessage(`${result.status.replaceAll("_", " ")} · ${result.participant} · ${result.progress.checked}/${result.progress.total}`);
      setError(""); setScanValue(""); setCameraOpen(false); navigator.vibrate?.(80); void refresh();
    } catch (failure: any) { setError(failure.message); navigator.vibrate?.([120, 50, 120]); }
  }

  async function capture(assignmentId: string, file?: File) {
    if (!file) return;
    try {
      const blob = await compressPhoto(file);
      await savePending(assignmentId, blob);
      setScanMessage("Photo saved. Uploading in background…");
      await uploadPending(assignmentId, blob);
      setScanMessage("Uploaded. Call the next group.");
      void refresh();
    } catch (failure: any) {
      setError(`Photo is safely queued on this phone. ${failure.message}`);
    }
  }

  async function submitTheory(event: React.FormEvent) {
    event.preventDefault();
    if (!confirm("Lock this theory? It cannot be edited during the game.")) return;
    try { await post("/api/volunteer/theory", { theory }); void refresh(); }
    catch (failure: any) { setError(failure.message); }
  }

  if (!data) return <Loading />;
  const phase = data.event.phase;
  return <Shell>
    <section className="volunteer-head"><div className="animal small">{data.team.emoji}</div>
      <div><div className="eyebrow">FIXED TEAM VOLUNTEER</div><h1>{data.team.name}</h1></div></section>
    <div className="phase-pill">{phase}</div>
    <ErrorBox error={error} />{scanMessage && <div className="success">{scanMessage}</div>}
    {phase === "SETUP" && <StatusCard title="Waiting for host" text="Registration is closed. Stay in your animal zone; scanning opens with Assembly." emoji="⏳" />}
    {phase === "ASSEMBLY" && <section className="card">
      <div className="big-progress">{data.progress.checked}<span>/{data.progress.total}</span></div>
      <p>Only scan {data.team.name} participants.</p>
      <form onSubmit={scan}>
        <input value={scanValue} onChange={event => setScanValue(event.target.value)} placeholder="Scan or paste participant token" />
        <button className="primary">CHECK IN</button>
      </form>
      <button className="camera-button" onClick={() => setCameraOpen(true)}>OPEN QR CAMERA</button>
      {cameraOpen && <QrCamera onResult={value => void scanRaw(value)} onClose={() => setCameraOpen(false)} />}
      <p className="muted">The camera reads only the opaque participant token. Paste remains available as a fallback.</p>
    </section>}
    {phase === "MEME" && <section>
      <div className="section-title"><h2>READY GROUPS</h2><span>{data.assignments.filter(a => a.captured_media_id).length}/{data.assignments.length}</span></div>
      <div className="assignment-list">{data.assignments.map(assignment => <article className="assignment" key={assignment.id}>
        <div><strong>{assignment.title}</strong><small>{assignment.members}</small></div>
        {assignment.captured_media_id ? <span className="done">UPLOADED ✓</span> : <>
          <input ref={node => { fileInputs.current[assignment.id] = node; }} hidden type="file" accept="image/*" capture="environment"
            onChange={event => void capture(assignment.id, event.target.files?.[0])} />
          <button onClick={() => fileInputs.current[assignment.id]?.click()}>TAKE PHOTO</button>
        </>}
      </article>)}</div>
    </section>}
    {phase === "MYSTERY" && <section className="card">
      <div className="big-progress">{data.qa.matched}<span>/{data.qa.total} pairs</span></div>
      <p>{data.qa.matched * 2} puzzle phones unlocked. Matching can continue after theory lock.</p>
      {data.team.theory ? <div className="theory-lock"><strong>THEORY LOCKED</strong><p>{data.team.theory}</p></div>
        : <form onSubmit={submitTheory}><label>What does your team think is happening?</label>
          <textarea value={theory} onChange={event => setTheory(event.target.value)} maxLength={500} rows={5}
            placeholder="Oru senior record submission avoid cheyth odunnu…" />
          <button className="primary" disabled={!theory.trim()}>LOCK THEORY</button>
          <small>You can submit now. Do not wait for every pair.</small>
        </form>}
    </section>}
    {phase === "REVEAL" && <StatusCard title="Theory locked in" text="Keep your team together and watch the projector for the reveals." emoji="👀" />}
    {phase === "ENDED" && <StatusCard title="Team mission complete" text="Thanks! Keep the zone tidy and help with the closing if needed." emoji="🎉" />}
  </Shell>;
}

function QrCamera({ onResult, onClose }: { onResult: (value: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const scanner = useRef<QrScanner | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!video.current) return;
    scanner.current = new QrScanner(video.current, result => {
      scanner.current?.stop();
      onResult(result.data);
    }, {
      returnDetailedScanResult: true,
      preferredCamera: "environment",
      highlightScanRegion: true,
      highlightCodeOutline: true,
      maxScansPerSecond: 8
    });
    void scanner.current.start().catch(failure => setError(`Camera unavailable: ${failure.message}`));
    return () => { scanner.current?.destroy(); scanner.current = null; };
  }, [onResult]);
  return <div className="camera-modal">
    <div className="camera-sheet"><div className="camera-title"><strong>SCAN PARTICIPANT QR</strong><button onClick={onClose}>CLOSE</button></div>
      <video ref={video} playsInline muted />
      <ErrorBox error={error} />
      <p>Hold the personal QR inside the frame.</p>
    </div>
  </div>;
}

function useHostSnapshot() {
  const [data, setData] = useState<(PublicSnapshot & { theories: Array<{ id: string; theory?: string; mystery_description: string }> }) | null>(null);
  const refresh = useCallback(() => api<any>("/api/host/snapshot").then(setData), []);
  useEffect(() => { void refresh(); return connectEvents(refresh); }, [refresh]);
  return { data, refresh };
}

function TeamGrid({ teams, phase }: { teams: TeamProgress[]; phase: string }) {
  return <div className="team-grid">{teams.map(team => <article className={`team-card ${team.theoryLocked ? "locked" : ""} ${phase !== "MYSTERY" && team.participants > 0 && team.checkedIn >= team.participants ? "complete" : ""}`} key={team.id}
    style={{ "--team": team.color } as React.CSSProperties}>
    <div className="team-icon">{team.emoji}</div><strong>{team.name}</strong>
    {phase === "MYSTERY" ? <>
      <div className="meter"><i style={{ width: `${team.totalPairs ? team.matchedPairs / team.totalPairs * 100 : 0}%` }} /></div>
      <small>{team.matchedPairs}/{team.totalPairs} pairs</small>
      <b>{team.theoryLocked ? "THEORY LOCKED" : "WORKING"}</b>
    </> : <>
      <div className="meter"><i style={{ width: `${team.participants ? team.checkedIn / team.participants * 100 : 0}%` }} /></div>
      <small>{team.checkedIn}/{team.participants || team.target}</small>
    </>}
  </article>)}</div>;
}

function Countdown({ endsAt }: { endsAt?: string | null }) {
  const [nowValue, setNowValue] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNowValue(Date.now()), 250); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.ceil((new Date(endsAt ?? 0).getTime() - nowValue) / 1000));
  return <div className={`master-timer ${seconds <= 60 ? "urgent" : ""}`}>
    {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
  </div>;
}

function RevealCountdown() {
  const [value, setValue] = useState(3);
  useEffect(() => {
    const timer = setInterval(() => setValue(current => current > 0 ? current - 1 : current), 900);
    return () => clearInterval(timer);
  }, []);
  return <div className="reveal-countdown" key={value}>{value || "READY!"}</div>;
}

function ProjectorApp() {
  return <StaffGate role="projector"><ProjectorPanel /></StaffGate>;
}

function ProjectorPanel() {
  const { data } = useHostSnapshot();
  const [slide, setSlide] = useState<any>(null);
  useEffect(() => {
    if (data?.event.phase !== "MEME") { setSlide(null); return; }
    let timer = 0;
    let cancelled = false;
    const advance = async () => {
      const result = await api<any>("/api/projector/next-slide").catch(() => ({ durationMs: 2000, slide: null }));
      if (cancelled) return;
      if (result.slide) setSlide(result.slide);
      timer = window.setTimeout(advance, result.durationMs);
    };
    void advance();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [data?.event.phase]);
  if (!data) return <Loading />;

  const phase = data.event.phase;
  const revealTeam = data.teams.find(team => team.id === data.event.revealTeamId);
  const theory = data.theories.find(item => item.id === data.event.revealTeamId);

  if (phase === "SETUP") return <main className="projector idle-projector">
    <div className="reveal-animal">⚡</div>
    <div className="eyebrow">µLEARN SCET ORIENTATION</div>
    <h1>READY WHEN YOU ARE</h1>
    <p>Registration is closed until the host opens Assembly.</p>
  </main>;

  if (phase === "MEME") return <main className="projector meme-projector">
    {slide ? <><img src={slide.url} alt="Captured meme recreation" /><div className="slide-label">{slide.emoji} {slide.name}</div></>
      : <div className="projector-wait">MEME CHAOS INCOMING…</div>}
  </main>;

  if (phase === "MYSTERY") return <main className="projector grid-projector">
    <div className="projector-title"><div><span>µLEARN SCET</span><h1>MYSTERY MODE</h1></div>
      <Countdown endsAt={data.event.mysteryEndsAt} /></div>
    <TeamGrid teams={data.teams} phase={phase} />
  </main>;

  if (phase === "REVEAL") {
    if (!revealTeam) return <main className="projector idle-projector">
      <div className="reveal-animal">🎬</div><div className="eyebrow">FINAL REVEALS</div>
      <h1>HOST — PICK A TEAM</h1><p>The first theory is ready when you are.</p>
    </main>;
    return <main className="projector reveal-projector">
      <div className="reveal-animal">{revealTeam.emoji}</div><div className="eyebrow">{revealTeam.name} TEAM BELIEVES…</div>
      {data.event.revealStep === "THEORY" && <h1>{theory?.theory ?? "No theory submitted"}</h1>}
      {data.event.revealStep === "COUNTDOWN" && <RevealCountdown />}
      {data.event.revealStep === "ACTUAL_IMAGE" && <img src={`/api/reveal/mystery/${revealTeam.id}`} alt="Actual mystery source" />}
    </main>;
  }

  if (phase === "ENDED") return <main className="projector idle-projector ended-projector">
    <div className="reveal-animal">🎉</div><div className="eyebrow">µLEARN SCET</div>
    <h1>THAT'S A WRAP!</h1><p>Thanks for playing. See you around campus ✨</p>
  </main>;

  // ASSEMBLY is the only phase that advertises the public join QR.
  return <main className="projector grid-projector assembly-projector">
    <div className="projector-title assembly-title"><div><span>µLEARN SCET</span><h1>FIND YOUR ANIMAL</h1><p>Scan → enter your name → find your animal zone.</p></div>
      <div className="join-qr"><QRCodeSVG value={location.origin} size={310} level="M" /><span>SCAN TO JOIN</span></div></div>
    <TeamGrid teams={data.teams} phase={phase} />
  </main>;
}
function HostApp() {
  return <StaffGate role="host"><HostPanel /></StaffGate>;
}

function HostPanel() {
  const { data, refresh } = useHostSnapshot();
  const [error, setError] = useState("");
  const [minutes, setMinutes] = useState(12);
  if (!data) return <Loading />;

  const totalParticipants = data.teams.reduce((sum, team) => sum + team.participants, 0);
  const checkedIn = data.teams.reduce((sum, team) => sum + team.checkedIn, 0);
  const nextAction: Record<string, { phase: string; label: string; note: string }> = {
    SETUP: { phase: "ASSEMBLY", label: "OPEN REGISTRATION", note: "Shows the big join QR and allows students to enter." },
    ASSEMBLY: { phase: "MEME", label: "START MEME ROUND", note: "Locks new joins and creates every active student's meme group." },
    MEME: { phase: "MYSTERY", label: "START MYSTERY ROUND", note: "Creates Q/A roles, Detectives and starts the timer." },
    MYSTERY: { phase: "REVEAL", label: "START FINAL REVEALS", note: "Stops matching/theory submissions and opens reveal control." },
    REVEAL: { phase: "ENDED", label: "END EVENT", note: "Shows the closing screen on every device." }
  };
  const action = nextAction[data.event.phase];

  async function phase(next: string) {
    if (!confirm(`${action?.label ?? "Move event"}?\n\n${action?.note ?? ""}`)) return;
    try { await post("/api/host/phase", { phase: next, mysteryMinutes: minutes }); setError(""); await refresh(); }
    catch (failure: any) { setError(failure.message); }
  }
  async function reveal(teamId: string, step: string) {
    try { await post("/api/host/reveal", { teamId, step }); setError(""); await refresh(); }
    catch (failure: any) { setError(failure.message); }
  }
  async function resetEvent() {
    const confirmation = prompt("This deletes ALL participants, uploads, assignments and theories. Type RESET to continue.");
    if (confirmation !== "RESET") return;
    try { await post("/api/host/reset", { confirm: confirmation }); setError(""); await refresh(); }
    catch (failure: any) { setError(failure.message); }
  }

  return <Shell wide>
    <div className="console-head"><div><div className="eyebrow">ONE HOST · MASTER CONTROL</div><h1>{data.event.phase}</h1>
      <p>{totalParticipants} participants · {checkedIn} volunteer-scanned</p></div>
      {data.event.phase === "MYSTERY" && <Countdown endsAt={data.event.mysteryEndsAt} />}</div>
    <ErrorBox error={error} />

    <div className="phase-steps">{["SETUP", "ASSEMBLY", "MEME", "MYSTERY", "REVEAL", "ENDED"].map(item =>
      <span key={item} className={data.event.phase === item ? "current" : ""}>{item}</span>)}</div>

    {action && <section className="next-phase card">
      <div><div className="eyebrow">NEXT</div><h2>{action.label}</h2><p>{action.note}</p></div>
      {action.phase === "MYSTERY" && <label>Timer <input type="number" min={1} max={30} value={minutes} onChange={event => setMinutes(Number(event.target.value))} /> min</label>}
      <button className="primary" onClick={() => void phase(action.phase)}>{action.label} →</button>
    </section>}

    {data.event.phase === "ASSEMBLY" && checkedIn < totalParticipants && <div className="host-note">
      {totalParticipants - checkedIn} joined student(s) have not been volunteer-scanned yet. They will still receive later activities, so one missed scan cannot exclude anyone.
    </div>}

    {data.event.phase === "ENDED" && <section className="card status-card compact"><div className="huge">✅</div><h2>Event ended cleanly</h2><p>Projector and participant phones are showing the closing screen.</p></section>}

    <TeamGrid teams={data.teams} phase={data.event.phase} />

    {data.event.phase === "REVEAL" && <section className="reveal-controls">
      <h2>Reveal teams</h2>
      {data.teams.map(team => <article key={team.id}><strong>{team.emoji} {team.name}</strong>
        <div><button onClick={() => void reveal(team.id, "THEORY")}>THEORY</button>
          <button onClick={() => void reveal(team.id, "COUNTDOWN")}>3–2–1</button>
          <button onClick={() => void reveal(team.id, "ACTUAL_IMAGE")}>IMAGE</button></div>
      </article>)}
    </section>}

    <details className="host-tools">
      <summary>TECHNICAL / RECOVERY TOOLS</summary>
      <HostRecoveryTools />
      <div className="danger-zone"><h3>Full rehearsal reset</h3><p>Use only before the real event or after a rehearsal.</p>
        <button onClick={() => void resetEvent()}>RESET ALL EVENT DATA</button></div>
    </details>
  </Shell>;
}
function HostRecoveryTools() {
  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [overview, setOverview] = useState<{ teams: any[]; media: any[]; event: any } | null>(null);
  const search = useCallback(async () => {
    const result = await api<{ participants: any[] }>(`/api/host/participants?q=${encodeURIComponent(query)}`);
    setParticipants(result.participants);
    setOverview(await api("/api/host/overview"));
  }, [query]);
  useEffect(() => { void search(); }, []);
  async function active(id: string, value: boolean) { await post(`/api/host/participants/${id}/active`, { active: value }); void search(); }
  async function checkIn(id: string, value: boolean) { await post(`/api/host/participants/${id}/check-in`, { checkedIn: value }); void search(); }
  async function recover(id: string) {
    const result = await post<{ recoveryUrl: string }>(`/api/host/participants/${id}/recovery`, {});
    await navigator.clipboard.writeText(result.recoveryUrl).catch(() => {});
    setNotice(`Recovery link copied: ${result.recoveryUrl}`);
  }
  async function reassign(id: string, teamId: string) {
    if (!teamId || !confirm("Move this participant and clear their check-in?")) return;
    await post(`/api/host/participants/${id}/reassign`, { teamId }); void search();
  }
  return <section className="host-recovery">
    <div className="eyebrow">PARTICIPANT RECOVERY</div><h2>Fix a phone or roster issue</h2>
    {notice && <div className="success">{notice}</div>}
    <div className="recovery-search"><input value={query} onChange={event => setQuery(event.target.value)}
      placeholder="Search name, team, or participant ID" /><button onClick={() => void search()}>SEARCH</button></div>
    <div className="recovery-table">{participants.map(person => <article key={person.id}>
      <div><strong>{person.emoji} {person.display_name}</strong><small>{person.team_name} · {person.qa_role} · {person.id}</small></div>
      <div className="recovery-actions">
        <button onClick={() => void checkIn(person.id, !person.checked_in_at)}>{person.checked_in_at ? "UNCHECK" : "CHECK IN"}</button>
        <button onClick={() => void active(person.id, !person.active)}>{person.active ? "MARK ABSENT" : "RESTORE"}</button>
        <button onClick={() => void recover(person.id)}>NEW DEVICE</button>
        <select aria-label="Reassign team" defaultValue="" onChange={event => void reassign(person.id, event.target.value)}>
          <option value="">MOVE…</option>{overview?.teams.map(team => <option value={team.id} key={team.id}>{team.emoji} {team.name}</option>)}
        </select>
      </div>
    </article>)}</div>
    <section className="recovery-tools card"><h3>Round recovery</h3>
      <button onClick={async () => { await post("/api/host/qa/regenerate", {}); setNotice("Q&A assignments regenerated."); }}>REGENERATE Q&A BEFORE MYSTERY</button>
      <h3>Recent meme captures</h3>
      {overview?.media.length ? overview.media.map(media => <div className="media-row" key={media.id}><span>{media.team_name} · {media.title} · {media.status}</span>
        <button onClick={async () => { await post(`/api/host/media/${media.id}/reset`, {}); void search(); }}>RESET CAPTURE</button></div>) : <p className="muted">No captures yet.</p>}
    </section>
  </section>;
}
function App() {
  return <Routes>
    <Route path="/" element={<ParticipantApp />} />
    <Route path="/play" element={<ParticipantApp />} />
    <Route path="/volunteer/:slug" element={<VolunteerApp />} />
    <Route path="/projector" element={<ProjectorApp />} />
    <Route path="/host" element={<HostApp />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);
