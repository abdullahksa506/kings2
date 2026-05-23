"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { coupServices, CoupSignal } from "@/lib/coupServices";

// Mesh WebRTC voice for small rooms (<=4). Signaling goes through Firestore via
// the RPC layer. STUN is free; TURN uses the public OpenRelay project by default
// (overridable via NEXT_PUBLIC_TURN_* env vars for a private/free Metered package).
const ICE_SERVERS: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
        urls: process.env.NEXT_PUBLIC_TURN_URL || "turn:openrelay.metered.ca:80",
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || "openrelayproject",
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "openrelayproject",
    },
    {
        urls: "turn:openrelay.metered.ca:443",
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || "openrelayproject",
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "openrelayproject",
    },
];

interface UseCoupVoiceResult {
    joined: boolean;
    muted: boolean;
    connecting: boolean;
    error: string | null;
    remoteStreams: Record<string, MediaStream>;
    join: () => Promise<void>;
    leave: () => void;
    toggleMute: () => void;
}

export function useCoupVoice(roomId: string | null, myName: string, peerNames: string[]): UseCoupVoiceResult {
    const [joined, setJoined] = useState(false);
    const [muted, setMuted] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Record<string, RTCPeerConnection>>({});
    const processedSignals = useRef<Set<string>>(new Set());
    const peerNamesRef = useRef<string[]>(peerNames);
    const joinedRef = useRef(false);

    useEffect(() => {
        peerNamesRef.current = peerNames;
    }, [peerNames]);

    const closePeer = useCallback((name: string) => {
        const pc = peersRef.current[name];
        if (pc) {
            pc.onicecandidate = null;
            pc.ontrack = null;
            pc.onconnectionstatechange = null;
            try {
                pc.close();
            } catch {
                /* ignore */
            }
            delete peersRef.current[name];
        }
        setRemoteStreams((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const createPeer = useCallback(
        (remoteName: string): RTCPeerConnection => {
            const existing = peersRef.current[remoteName];
            if (existing) return existing;

            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            peersRef.current[remoteName] = pc;

            const local = localStreamRef.current;
            if (local) {
                local.getTracks().forEach((t) => pc.addTrack(t, local));
            }

            pc.onicecandidate = (e) => {
                if (e.candidate && roomId) {
                    void coupServices.voiceSignal(roomId, remoteName, {
                        kind: "candidate",
                        candidate: e.candidate.toJSON(),
                    });
                }
            };

            pc.ontrack = (e) => {
                const [stream] = e.streams;
                if (stream) {
                    setRemoteStreams((prev) => ({ ...prev, [remoteName]: stream }));
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                    closePeer(remoteName);
                }
            };

            return pc;
        },
        [roomId, closePeer],
    );

    // Initiator is the lexicographically smaller name (avoids offer glare).
    const isInitiator = useCallback((other: string) => myName.localeCompare(other) < 0, [myName]);

    const connectToPeers = useCallback(async () => {
        if (!joinedRef.current || !roomId) return;
        for (const other of peerNamesRef.current) {
            if (other === myName || peersRef.current[other]) continue;
            const pc = createPeer(other);
            if (isInitiator(other)) {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await coupServices.voiceSignal(roomId, other, { kind: "offer", sdp: pc.localDescription });
                } catch {
                    /* ignore */
                }
            }
        }
        // Tear down peers no longer present.
        for (const name of Object.keys(peersRef.current)) {
            if (!peerNamesRef.current.includes(name)) closePeer(name);
        }
    }, [roomId, myName, createPeer, isInitiator, closePeer]);

    useEffect(() => {
        if (joined) void connectToPeers();
    }, [joined, peerNames, connectToPeers]);

    // Handle inbound signals.
    useEffect(() => {
        if (!joined || !roomId) return;
        const unsub = coupServices.listenToSignals(roomId, myName, (signals: CoupSignal[]) => {
            const ordered = [...signals].sort((a, b) => a.atMs - b.atMs);
            for (const sig of ordered) {
                if (processedSignals.current.has(sig.id) || !sig.signal) continue;
                processedSignals.current.add(sig.id);
                void handleSignal(sig);
            }
        });
        return unsub;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joined, roomId, myName]);

    const handleSignal = useCallback(
        async (sig: CoupSignal) => {
            if (!roomId) return;
            const from = sig.from;
            const data = sig.signal;
            try {
                if (data.kind === "offer") {
                    const pc = createPeer(from);
                    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    await coupServices.voiceSignal(roomId, from, { kind: "answer", sdp: pc.localDescription });
                } else if (data.kind === "answer") {
                    const pc = peersRef.current[from];
                    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                } else if (data.kind === "candidate") {
                    const pc = peersRef.current[from];
                    if (pc && data.candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                        } catch {
                            /* ignore late candidates */
                        }
                    }
                }
            } catch {
                /* ignore malformed signal */
            }
        },
        [roomId, createPeer],
    );

    const join = useCallback(async () => {
        if (joinedRef.current || !roomId) return;
        setConnecting(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            joinedRef.current = true;
            setJoined(true);
            setMuted(false);
            await coupServices.voiceState(roomId, true, false);
            await connectToPeers();
        } catch (e: any) {
            setError("تعذّر الوصول للميكروفون — تأكد من السماح بالإذن");
            joinedRef.current = false;
            setJoined(false);
        } finally {
            setConnecting(false);
        }
    }, [roomId, connectToPeers]);

    const leave = useCallback(() => {
        joinedRef.current = false;
        setJoined(false);
        for (const name of Object.keys(peersRef.current)) closePeer(name);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        setRemoteStreams({});
        processedSignals.current.clear();
        if (roomId) void coupServices.voiceState(roomId, false, false);
    }, [roomId, closePeer]);

    const toggleMute = useCallback(() => {
        const stream = localStreamRef.current;
        if (!stream) return;
        const next = !muted;
        stream.getAudioTracks().forEach((t) => (t.enabled = !next));
        setMuted(next);
        if (roomId) void coupServices.voiceState(roomId, true, next);
    }, [muted, roomId]);

    // Cleanup on unmount.
    useEffect(() => {
        return () => {
            for (const name of Object.keys(peersRef.current)) {
                const pc = peersRef.current[name];
                try {
                    pc.close();
                } catch {
                    /* ignore */
                }
            }
            peersRef.current = {};
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((t) => t.stop());
                localStreamRef.current = null;
            }
        };
    }, []);

    return { joined, muted, connecting, error, remoteStreams, join, leave, toggleMute };
}
