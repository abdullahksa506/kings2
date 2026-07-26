"use client";

/*
 * 🤖 نكتة الذكاء الاصطناعي:
 * سألوا كلود: "تسمع الفويس؟"
 * قال: "أسمعكم كلكم... بس ما أعلّق لأن صوتي داتا مو ذبذبات 😂🎙️"
 *
 * فويس تشات mesh (WebRTC) للقنوات الصغيرة. الإشارات عبر Firestore/RPC.
 * STUN مجاني + TURN عام (OpenRelay) — يمكن تغييره بمتغيّرات NEXT_PUBLIC_TURN_*.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { services, VoiceSignal } from "@/lib/services";

const TURN_USER = process.env.NEXT_PUBLIC_TURN_USERNAME || "openrelayproject";
const TURN_CRED = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "openrelayproject";

const ICE_SERVERS: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    ...(process.env.NEXT_PUBLIC_TURN_URL
        ? [{ urls: process.env.NEXT_PUBLIC_TURN_URL, username: TURN_USER, credential: TURN_CRED }]
        : [
              { urls: "turn:openrelay.metered.ca:80", username: TURN_USER, credential: TURN_CRED },
              { urls: "turn:openrelay.metered.ca:80?transport=tcp", username: TURN_USER, credential: TURN_CRED },
              { urls: "turn:openrelay.metered.ca:443", username: TURN_USER, credential: TURN_CRED },
              { urls: "turns:openrelay.metered.ca:443?transport=tcp", username: TURN_USER, credential: TURN_CRED },
          ]),
];

// High-quality mono voice from the mic: cancel echo, suppress noise, auto-gain,
// full 48kHz — the browser's best audio-processing chain.
const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
    } as MediaTrackConstraints,
    video: false,
};

// Tune the Opus codec in the SDP for voice quality: higher bitrate + in-band FEC
// (recovers lost packets → less choppiness) + no DTX (steadier audio).
function tuneOpus(sdp: string): string {
    const m = sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
    if (!m) return sdp;
    const pt = m[1];
    const want: Record<string, string> = {
        maxaveragebitrate: "64000", maxplaybackrate: "48000", stereo: "0", useinbandfec: "1", usedtx: "0",
    };
    const fmtpRe = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
    if (fmtpRe.test(sdp)) {
        return sdp.replace(fmtpRe, (_full, existing: string) => {
            const map: Record<string, string> = {};
            existing.split(";").forEach((kv) => { const [k, v] = kv.split("="); if (k?.trim()) map[k.trim()] = v; });
            Object.assign(map, want);
            const merged = Object.entries(map).map(([k, v]) => (v === undefined ? k : `${k}=${v}`)).join(";");
            return `a=fmtp:${pt} ${merged}`;
        });
    }
    return sdp.replace(m[0], `${m[0]}\r\na=fmtp:${pt} ${Object.entries(want).map(([k, v]) => `${k}=${v}`).join(";")}`);
}

// Raise the audio sender's target bitrate (default WebRTC caps voice low).
function bumpAudioBitrate(pc: RTCPeerConnection) {
    pc.getSenders().forEach(async (s) => {
        if (s.track?.kind !== "audio") return;
        try {
            const p = s.getParameters();
            if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
            p.encodings[0].maxBitrate = 64000;
            await s.setParameters(p);
        } catch { /* not supported */ }
    });
}

export interface UseVoiceChatResult {
    joined: boolean;
    muted: boolean;
    connecting: boolean;
    error: string | null;
    remoteStreams: Record<string, MediaStream>;
    join: () => Promise<void>;
    leave: () => void;
    toggleMute: () => void;
}

/**
 * @param channel   voice room id (the text channel id)
 * @param myName    my user name
 * @param peerNames names of everyone currently JOINED to this voice channel (excl. me)
 */
export function useVoiceChat(channel: string | null, myName: string, peerNames: string[]): UseVoiceChatResult {
    const [joined, setJoined] = useState(false);
    const [muted, setMuted] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Record<string, RTCPeerConnection>>({});
    const processedSignals = useRef<Set<string>>(new Set());
    const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
    const peerNamesRef = useRef<string[]>(peerNames);
    const joinedRef = useRef(false);

    useEffect(() => { peerNamesRef.current = peerNames; }, [peerNames]);

    const closePeer = useCallback((name: string) => {
        const pc = peersRef.current[name];
        if (pc) {
            pc.onicecandidate = null; pc.ontrack = null; pc.onconnectionstatechange = null;
            try { pc.close(); } catch { /* ignore */ }
            delete peersRef.current[name];
        }
        delete pendingCandidatesRef.current[name];
        setRemoteStreams((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev }; delete next[name]; return next;
        });
    }, []);

    const createPeer = useCallback((remoteName: string): RTCPeerConnection => {
        const existing = peersRef.current[remoteName];
        if (existing) return existing;
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current[remoteName] = pc;
        const local = localStreamRef.current;
        if (local) { local.getTracks().forEach((t) => pc.addTrack(t, local)); bumpAudioBitrate(pc); }

        pc.onicecandidate = (e) => {
            if (e.candidate && channel) {
                void services.sendVoiceSignal(channel, remoteName, { kind: "candidate", candidate: e.candidate.toJSON() });
            }
        };
        pc.ontrack = (e) => {
            let stream = e.streams && e.streams[0];
            if (!stream) { stream = new MediaStream(); stream.addTrack(e.track); }
            setRemoteStreams((prev) => ({ ...prev, [remoteName]: stream as MediaStream }));
        };
        pc.onconnectionstatechange = () => { if (pc.connectionState === "closed") closePeer(remoteName); };
        pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === "failed") { try { pc.restartIce(); } catch { /* */ } } };
        return pc;
    }, [channel, closePeer]);

    // Initiator is the lexicographically smaller name (avoids offer glare).
    const isInitiator = useCallback((other: string) => myName.localeCompare(other) < 0, [myName]);

    const connectToPeers = useCallback(async () => {
        if (!joinedRef.current || !channel) return;
        for (const other of peerNamesRef.current) {
            if (other === myName || peersRef.current[other]) continue;
            const pc = createPeer(other);
            if (isInitiator(other)) {
                try {
                    const offer = await pc.createOffer();
                    offer.sdp = tuneOpus(offer.sdp || "");
                    await pc.setLocalDescription(offer);
                    await services.sendVoiceSignal(channel, other, { kind: "offer", sdp: pc.localDescription });
                } catch { /* ignore */ }
            }
        }
        for (const name of Object.keys(peersRef.current)) {
            if (!peerNamesRef.current.includes(name)) closePeer(name);
        }
    }, [channel, myName, createPeer, isInitiator, closePeer]);

    useEffect(() => { if (joined) void connectToPeers(); }, [joined, peerNames, connectToPeers]);

    const flushCandidates = useCallback(async (from: string, pc: RTCPeerConnection) => {
        const queued = pendingCandidatesRef.current[from];
        if (!queued) return;
        delete pendingCandidatesRef.current[from];
        for (const c of queued) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* */ } }
    }, []);

    const handleSignal = useCallback(async (sig: VoiceSignal) => {
        if (!channel) return;
        const from = sig.from; const data = sig.signal;
        try {
            if (data.kind === "offer") {
                const pc = createPeer(from);
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                await flushCandidates(from, pc);
                const answer = await pc.createAnswer();
                answer.sdp = tuneOpus(answer.sdp || "");
                await pc.setLocalDescription(answer);
                await services.sendVoiceSignal(channel, from, { kind: "answer", sdp: pc.localDescription });
            } else if (data.kind === "answer") {
                const pc = peersRef.current[from];
                if (pc) { await pc.setRemoteDescription(new RTCSessionDescription(data.sdp)); await flushCandidates(from, pc); }
            } else if (data.kind === "candidate") {
                const pc = peersRef.current[from];
                if (data.candidate) {
                    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* */ }
                    } else {
                        (pendingCandidatesRef.current[from] ||= []).push(data.candidate);
                    }
                }
            }
        } catch { /* ignore malformed */ }
    }, [channel, createPeer, flushCandidates]);

    // Inbound signals.
    useEffect(() => {
        if (!joined || !channel) return;
        const unsub = services.listenToVoiceSignals(channel, myName, (signals) => {
            const ordered = [...signals].sort((a, b) => a.atMs - b.atMs);
            for (const sig of ordered) {
                if (processedSignals.current.has(sig.id) || !sig.signal) continue;
                processedSignals.current.add(sig.id);
                void handleSignal(sig);
            }
        });
        return unsub;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joined, channel, myName]);

    const join = useCallback(async () => {
        if (joinedRef.current || !channel) return;
        setConnecting(true); setError(null);
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
            }
            const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
            localStreamRef.current = stream;
            joinedRef.current = true;
            setJoined(true); setMuted(false);
            await services.setVoiceState(channel, true, false);
            await connectToPeers();
        } catch (e: any) {
            const name = e?.name || "";
            let msg = "تعذّر الوصول للميكروفون — تأكد من الإذن، وجرّب Chrome على الكمبيوتر";
            if (name === "NotSupportedError") msg = "متصفحك ما يدعم الميكروفون هنا — على الآيفون افتح الموقع في Safari (مو كتطبيق مثبّت) أو جرّب Chrome على الكمبيوتر";
            else if (name === "NotAllowedError" || name === "SecurityError") msg = "رفضت إذن الميكروفون — اسمح به من إعدادات الموقع ثم أعد المحاولة 🎙️";
            else if (name === "NotFoundError") msg = "ما لقينا ميكروفون في جهازك";
            setError(msg);
            joinedRef.current = false; setJoined(false);
        } finally {
            setConnecting(false);
        }
    }, [channel, connectToPeers]);

    const leave = useCallback(() => {
        joinedRef.current = false; setJoined(false);
        for (const name of Object.keys(peersRef.current)) closePeer(name);
        if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
        setRemoteStreams({});
        processedSignals.current.clear();
        if (channel) void services.setVoiceState(channel, false, false);
    }, [channel, closePeer]);

    const toggleMute = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const next = !muted;
        stream.getAudioTracks().forEach((t) => (t.enabled = !next));
        setMuted(next);
        if (channel) void services.setVoiceState(channel, true, next);
    }, [muted, channel]);

    // Leave when the channel changes or on unmount.
    useEffect(() => {
        return () => {
            for (const name of Object.keys(peersRef.current)) { try { peersRef.current[name].close(); } catch { /* */ } }
            peersRef.current = {};
            if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
            joinedRef.current = false;
        };
    }, [channel]);

    return { joined, muted, connecting, error, remoteStreams, join, leave, toggleMute };
}
