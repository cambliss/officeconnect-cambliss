"use client";

<<<<<<< HEAD
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import WorkspaceShell from "../../../../components/WorkspaceShell";
import {
	buildGoogleCalendarUrl,
	buildInviteText,
	buildMailtoUrl,
	buildMeetingPath,
	buildMeetingUrl,
	formatDateTime,
	type VideoMeetingInvite,
} from "../../../../lib/video-connect";

const parseAttendees = (value: string | null) =>
	value
		? value
			.split(/[\n,;]+/)
			.map((email) => email.trim())
			.filter(Boolean)
		: [];

export default function VideoMeetingRoomPage() {
	const params = useParams<{ meetingId: string }>();
	const searchParams = useSearchParams();
	const meetingId = params.meetingId;
	const previewRef = useRef<HTMLVideoElement | null>(null);
	const [displayName, setDisplayName] = useState("Guest");
	const [joined, setJoined] = useState(false);
	const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
	const [mediaState, setMediaState] = useState<"idle" | "loading" | "ready" | "blocked">("idle");
	const [mediaError, setMediaError] = useState<string | null>(null);
	const [audioEnabled, setAudioEnabled] = useState(true);
	const [videoEnabled, setVideoEnabled] = useState(true);

	const invite = useMemo<VideoMeetingInvite>(
		() => ({
			meetingId,
			title: searchParams.get("title") || "Office Connect Meeting",
			hostName: searchParams.get("host") || "Office Connect",
			scheduledStart: searchParams.get("start") || new Date().toISOString(),
			durationMinutes: Number(searchParams.get("duration") || 30),
			attendeeEmails: parseAttendees(searchParams.get("attendees")),
			notes: searchParams.get("notes") || "",
		}),
		[meetingId, searchParams],
	);

	const meetingUrl = useMemo(() => {
		if (typeof window === "undefined") {
			return "";
		}

		return buildMeetingUrl(window.location.origin, invite);
	}, [invite]);

	const copyLink = async () => {
		if (!meetingUrl) return;
		await navigator.clipboard.writeText(meetingUrl);
	};

	useEffect(() => {
		if (!previewRef.current) {
			return;
		}

		previewRef.current.srcObject = mediaStream;
		if (mediaStream) {
			void previewRef.current.play();
		}

		return () => {
			if (previewRef.current) {
				previewRef.current.srcObject = null;
			}
		};
	}, [mediaStream]);

	useEffect(() => {
		return () => {
			mediaStream?.getTracks().forEach((track) => track.stop());
		};
	}, [mediaStream]);

	const enableDevices = async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			setMediaState("blocked");
			setMediaError("Your browser does not support camera or microphone access.");
			return;
		}

		setMediaState("loading");
		setMediaError(null);

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
			setMediaStream(stream);
			setJoined(true);
			setMediaState("ready");
			setAudioEnabled(true);
			setVideoEnabled(true);
		} catch {
			setMediaState("blocked");
			setMediaError("Camera and microphone access was blocked. Allow permissions and try again.");
		}
	};

	const toggleAudio = () => {
		if (!mediaStream) return;
		const nextState = !audioEnabled;
		mediaStream.getAudioTracks().forEach((track) => {
			track.enabled = nextState;
		});
		setAudioEnabled(nextState);
	};

	const toggleVideo = () => {
		if (!mediaStream) return;
		const nextState = !videoEnabled;
		mediaStream.getVideoTracks().forEach((track) => {
			track.enabled = nextState;
		});
		setVideoEnabled(nextState);
	};

	const leaveRoom = () => {
		mediaStream?.getTracks().forEach((track) => track.stop());
		setMediaStream(null);
		setJoined(false);
		setMediaState("idle");
		setMediaError(null);
=======
import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import WorkspaceShell from "../../../../components/WorkspaceShell";

interface ChatMessage {
	id: string;
	sender: string;
	text: string;
	timestamp: string;
}

interface DebugLog {
	id: string;
	timestamp: string;
	type: "info" | "success" | "warn" | "error";
	message: string;
}

const STUN_SERVERS: RTCConfiguration = {
	iceServers: [
		{ urls: "stun:stun.l.google.com:19302" },
		{ urls: "stun:stun1.l.google.com:19302" },
		{ urls: "stun:stun2.l.google.com:19302" },
		{ urls: "stun:stun3.l.google.com:19302" },
		{ urls: "stun:stun4.l.google.com:19302" },
	],
};

export default function VideoRoomPage() {
	const params = useParams();
	const router = useRouter();
	const meetingId = (params?.meetingId as string) || "demo-room";

	// Video Element Refs
	const localVideoRef = useRef<HTMLVideoElement | null>(null);
	const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

	// WebRTC State Refs
	const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
	const localStreamRef = useRef<MediaStream | null>(null);
	const signalingChannelRef = useRef<BroadcastChannel | null>(null);

	// User Interface State
	const [isVideoMuted, setIsVideoMuted] = useState(false);
	const [isAudioMuted, setIsAudioMuted] = useState(false);
	const [isScreenSharing, setIsScreenSharing] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [peerStatus, setPeerStatus] = useState<string>("Waiting for second party to join...");
	const [copied, setCopied] = useState(false);
	const [showDebugDrawer, setShowDebugDrawer] = useState(true);

	// Chat & Logs
	const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [newChatText, setNewChatText] = useState("");
	const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

	const logDebug = (type: "info" | "success" | "warn" | "error", message: string) => {
		const entry: DebugLog = {
			id: `log-${Date.now()}-${Math.random()}`,
			timestamp: new Date().toLocaleTimeString(),
			type,
			message,
		};
		console.log(`[WebRTC Debug ${type.toUpperCase()}]`, message);
		setDebugLogs((prev) => [entry, ...prev.slice(0, 99)]);
	};

	// 1️⃣ INITIALIZE MEDIA & WEBRTC SIGNALING
	useEffect(() => {
		let isMounted = true;

		async function initVideoRoom() {
			logDebug("info", `Initializing Video Connect Room: "${meetingId}"`);

			// Setup Signaling BroadcastChannel for local/multi-tab/cross-window party testing
			const channelName = `video-connect-signaling-${meetingId}`;
			const signaling = new BroadcastChannel(channelName);
			signalingChannelRef.current = signaling;
			logDebug("info", `Signaling channel established: [${channelName}]`);

			// Request Camera & Microphone access
			try {
				logDebug("info", "Requesting Camera & Microphone permissions (getUserMedia)...");
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
					audio: { echoCancellation: true, noiseSuppression: true },
				});

				if (!isMounted) return;
				localStreamRef.current = stream;

				// Attach Local Camera Feed
				if (localVideoRef.current) {
					localVideoRef.current.srcObject = stream;
					localVideoRef.current.play().catch((err) => logDebug("warn", `Local video play error: ${err.message}`));
				}

				const videoTracks = stream.getVideoTracks();
				const audioTracks = stream.getAudioTracks();
				logDebug(
					"success",
					`Camera feed active: ${videoTracks.length} video track (${videoTracks[0]?.label || "Camera"}), ${audioTracks.length} audio track.`
				);

				// Initialize RTCPeerConnection
				setupPeerConnection(stream, signaling);

				// Notify other parties in room that a new peer joined
				signaling.postMessage({ type: "PEER_JOINED", senderId: getClientId() });
				logDebug("info", "Announced PEER_JOINED to room signaling channel.");
			} catch (err: any) {
				logDebug("error", `Camera / Microphone access failed: ${err.name} - ${err.message}`);
				setPeerStatus(`Camera Error: ${err.message}`);
			}

			// Handle Signaling Messages
			signaling.onmessage = async (event) => {
				const { type, payload, senderId } = event.data;
				if (senderId === getClientId()) return; // Ignore own messages

				logDebug("info", `Received Signaling Event: [${type}] from Peer [${senderId?.slice(0, 6)}]`);

				const pc = peerConnectionRef.current;

				if (type === "PEER_JOINED") {
					setPeerStatus("Second party joined! Initiating WebRTC Offer...");
					logDebug("info", "Second party detected. Creating RTCPeerConnection Offer...");
					if (pc && localStreamRef.current) {
						try {
							const offer = await pc.createOffer();
							await pc.setLocalDescription(offer);
							signaling.postMessage({ type: "OFFER", payload: offer, senderId: getClientId() });
							logDebug("success", "Sent WebRTC SDP Offer to remote party.");
						} catch (err: any) {
							logDebug("error", `Failed to create offer: ${err.message}`);
						}
					}
				} else if (type === "OFFER") {
					setPeerStatus("Received Offer from second party. Generating Answer...");
					if (pc) {
						try {
							await pc.setRemoteDescription(new RTCSessionDescription(payload));
							logDebug("success", "Remote SDP Offer set successfully.");

							const answer = await pc.createAnswer();
							await pc.setLocalDescription(answer);
							signaling.postMessage({ type: "ANSWER", payload: answer, senderId: getClientId() });
							logDebug("success", "Sent WebRTC SDP Answer back to initiating party.");
						} catch (err: any) {
							logDebug("error", `Failed to handle SDP Offer: ${err.message}`);
						}
					}
				} else if (type === "ANSWER") {
					setPeerStatus("Received Answer! Completing PeerConnection handshake...");
					if (pc) {
						try {
							await pc.setRemoteDescription(new RTCSessionDescription(payload));
							logDebug("success", "Remote SDP Answer set. WebRTC Handshake Complete!");
						} catch (err: any) {
							logDebug("error", `Failed to handle SDP Answer: ${err.message}`);
						}
					}
				} else if (type === "ICE_CANDIDATE") {
					if (pc && payload) {
						try {
							await pc.addIceCandidate(new RTCIceCandidate(payload));
							logDebug("info", `Added ICE Candidate: ${payload.candidate?.slice(0, 30)}...`);
						} catch (err: any) {
							logDebug("warn", `ICE Candidate error: ${err.message}`);
						}
					}
				} else if (type === "CHAT_MESSAGE") {
					setChatMessages((prev) => [...prev, payload]);
				} else if (type === "PEER_LEFT") {
					setPeerStatus("Second party left the call.");
					logDebug("warn", "Remote party disconnected.");
					if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
					setIsConnected(false);
				}
			};
		}

		initVideoRoom();

		return () => {
			isMounted = false;
			cleanupRoom();
		};
	}, [meetingId]);

	// Unique Client Identifier for Signaling Filtering
	function getClientId() {
		if (typeof window === "undefined") return "server";
		let id = sessionStorage.getItem("video_connect_client_id");
		if (!id) {
			id = `client-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
			sessionStorage.setItem("video_connect_client_id", id);
		}
		return id;
	}

	// 2️⃣ SETUP RTC PEER CONNECTION
	function setupPeerConnection(stream: MediaStream, signaling: BroadcastChannel) {
		logDebug("info", "Creating RTCPeerConnection with STUN servers...");
		const pc = new RTCPeerConnection(STUN_SERVERS);
		peerConnectionRef.current = pc;

		// Add Local Camera & Mic Tracks to PeerConnection
		stream.getTracks().forEach((track) => {
			pc.addTrack(track, stream);
			logDebug("info", `Added local track to PeerConnection: [${track.kind}] (${track.label})`);
		});

		// Listen for Remote Camera & Audio Stream
		pc.ontrack = (event) => {
			logDebug("success", `Received REMOTE Track: [${event.track.kind}] (${event.track.label})`);
			const [remoteStream] = event.streams;
			if (remoteVideoRef.current && remoteStream) {
				remoteVideoRef.current.srcObject = remoteStream;
				remoteVideoRef.current.play().catch((e) => logDebug("warn", `Remote video autoplay error: ${e.message}`));
				logDebug("success", "Attached remote party video stream to Remote Video Feed Element!");
				setIsConnected(true);
				setPeerStatus("Connected & Streaming Video Live!");
			}
		};

		// Gather & Disseminate ICE Candidates
		pc.onicecandidate = (event) => {
			if (event.candidate) {
				logDebug("info", `Generated ICE Candidate: ${event.candidate.candidate.slice(0, 40)}...`);
				signaling.postMessage({
					type: "ICE_CANDIDATE",
					payload: event.candidate,
					senderId: getClientId(),
				});
			}
		};

		// Track PeerConnection Connection States
		pc.onconnectionstatechange = () => {
			logDebug("info", `PeerConnection State Changed: [${pc.connectionState}]`);
			if (pc.connectionState === "connected") {
				setIsConnected(true);
				setPeerStatus("Peer Connection Established (Video Active)");
				logDebug("success", "🎉 DUAL PARTY WEBRTC VIDEO CONNECT IS FULLY CONNECTED & WORKING!");
			} else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
				setIsConnected(false);
				setPeerStatus("Connection lost or party disconnected.");
				logDebug("warn", `PeerConnection state degradation: ${pc.connectionState}`);
			}
		};

		pc.oniceconnectionstatechange = () => {
			logDebug("info", `ICE Connection State: [${pc.iceConnectionState}]`);
		};
	}

	// 3️⃣ CONTROLS: CAMERA, MIC, SCREEN SHARE, CHAT
	const toggleCamera = () => {
		if (localStreamRef.current) {
			const videoTracks = localStreamRef.current.getVideoTracks();
			if (videoTracks.length > 0) {
				const nextState = !videoTracks[0].enabled;
				videoTracks[0].enabled = nextState;
				setIsVideoMuted(!nextState);
				logDebug(nextState ? "success" : "warn", `Camera ${nextState ? "Enabled (Unmuted)" : "Disabled (Muted)"}`);
			}
		}
	};

	const toggleMicrophone = () => {
		if (localStreamRef.current) {
			const audioTracks = localStreamRef.current.getAudioTracks();
			if (audioTracks.length > 0) {
				const nextState = !audioTracks[0].enabled;
				audioTracks[0].enabled = nextState;
				setIsAudioMuted(!nextState);
				logDebug(nextState ? "success" : "warn", `Microphone ${nextState ? "Enabled (Unmuted)" : "Disabled (Muted)"}`);
			}
		}
	};

	const toggleScreenShare = async () => {
		const pc = peerConnectionRef.current;
		if (!pc) return;

		if (!isScreenSharing) {
			try {
				logDebug("info", "Requesting Screen Sharing Stream...");
				const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
				const screenTrack = screenStream.getVideoTracks()[0];

				const senders = pc.getSenders();
				const videoSender = senders.find((s) => s.track?.kind === "video");
				if (videoSender) {
					await videoSender.replaceTrack(screenTrack);
					logDebug("success", "Replaced camera track with Screen Share track on RTCPeerConnection.");
				}

				if (localVideoRef.current) {
					localVideoRef.current.srcObject = screenStream;
				}

				screenTrack.onended = () => {
					stopScreenShare();
				};

				setIsScreenSharing(true);
			} catch (err: any) {
				logDebug("error", `Screen Share failed: ${err.message}`);
			}
		} else {
			stopScreenShare();
		}
	};

	const stopScreenShare = async () => {
		const pc = peerConnectionRef.current;
		if (pc && localStreamRef.current) {
			const cameraTrack = localStreamRef.current.getVideoTracks()[0];
			const senders = pc.getSenders();
			const videoSender = senders.find((s) => s.track?.kind === "video");
			if (videoSender && cameraTrack) {
				await videoSender.replaceTrack(cameraTrack);
				logDebug("info", "Restored local Camera track on RTCPeerConnection.");
			}
			if (localVideoRef.current) {
				localVideoRef.current.srcObject = localStreamRef.current;
			}
		}
		setIsScreenSharing(false);
	};

	const handleSendChat = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newChatText.trim()) return;

		const msg: ChatMessage = {
			id: `msg-${Date.now()}`,
			sender: "You",
			text: newChatText.trim(),
			timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
		};

		setChatMessages((prev) => [...prev, msg]);
		if (signalingChannelRef.current) {
			signalingChannelRef.current.postMessage({
				type: "CHAT_MESSAGE",
				payload: { ...msg, sender: "Remote Party" },
				senderId: getClientId(),
			});
		}

		setNewChatText("");
	};

	const copyMeetingLink = () => {
		const url = window.location.href;
		navigator.clipboard.writeText(url);
		setCopied(true);
		logDebug("info", `Copied meeting URL to clipboard: ${url}`);
		setTimeout(() => setCopied(false), 3000);
	};

	const cleanupRoom = () => {
		logDebug("warn", "Cleaning up video room media streams and WebRTC connections...");
		if (signalingChannelRef.current) {
			signalingChannelRef.current.postMessage({ type: "PEER_LEFT", senderId: getClientId() });
			signalingChannelRef.current.close();
		}
		if (peerConnectionRef.current) {
			peerConnectionRef.current.close();
			peerConnectionRef.current = null;
		}
		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((t) => t.stop());
			localStreamRef.current = null;
		}
	};

	const handleEndCall = () => {
		cleanupRoom();
		router.push("/video-connect");
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
	};

	return (
		<WorkspaceShell>
<<<<<<< HEAD
			<div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
				<div className="rounded-2xl border border-[#dbe3f7] bg-white p-6 shadow-[0_18px_38px_-24px_rgba(29,65,157,0.35)]">
					<Link href="/video-connect" className="inline-flex items-center gap-2 rounded-xl border border-[#dbe3f7] bg-[#f6f9ff] px-3 py-1.5 text-xs font-semibold text-[#35558e] hover:bg-[#edf3ff]">
						<span aria-hidden>←</span>
						Back to scheduler
					</Link>
					<h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#111827]">{invite.title}</h1>
					<p className="mt-2 text-sm text-[#4b5563]">Hosted by {invite.hostName}</p>

					<div className="mt-5 grid gap-3 rounded-2xl border border-[#dbe3f7] bg-[#f6f9ff] p-4 text-sm text-[#4b5563] sm:grid-cols-2">
						<p><span className="font-semibold text-[#111827]">Meeting ID:</span> {meetingId}</p>
						<p><span className="font-semibold text-[#111827]">When:</span> {formatDateTime(invite.scheduledStart)}</p>
						<p><span className="font-semibold text-[#111827]">Duration:</span> {invite.durationMinutes} minutes</p>
						<p><span className="font-semibold text-[#111827]">Guests:</span> {invite.attendeeEmails.length ? invite.attendeeEmails.join(", ") : "No attendees yet"}</p>
					</div>

					{invite.notes && (
						<div className="mt-4 rounded-2xl border border-[#dbe3f7] bg-[#fbfcff] p-4 text-sm text-[#4b5563]">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f84ad]">Notes</p>
							<p className="mt-2 whitespace-pre-wrap">{invite.notes}</p>
						</div>
					)}

					<div className="mt-5 rounded-2xl border border-dashed border-[#b9c9eb] bg-[#f6f9ff] p-5">
						<p className="text-sm font-semibold text-[#111827]">Join flow</p>
						<p className="mt-1 text-sm text-[#4b5563]">This basic release gives every participant a shareable room link and a browser-based join step with camera and mic preview.</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="min-w-56 rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d419d]" placeholder="Your name" />
							<button type="button" onClick={() => void enableDevices()} className="rounded-xl bg-[#1d419d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173784]">Enable camera and mic</button>
							<button type="button" onClick={() => void copyLink()} className="rounded-xl border border-[#dbe3f7] bg-white px-4 py-2 text-sm font-semibold text-[#35558e] hover:bg-[#edf3ff]">Copy link</button>
						</div>
						{mediaError && <p className="mt-3 text-sm text-[#b42318]">{mediaError}</p>}
					</div>

					<div className="mt-5 flex flex-wrap gap-2">
						<a href={buildMailtoUrl(invite, meetingUrl)} className="rounded-xl border border-[#dbe3f7] bg-white px-4 py-2 text-sm font-semibold text-[#35558e] hover:bg-[#edf3ff]">Open email draft</a>
						<a href={buildGoogleCalendarUrl(invite, meetingUrl)} target="_blank" rel="noreferrer" className="rounded-xl bg-[#1d419d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173784]">Google Calendar reminder</a>
					</div>
				</div>

				<div className="rounded-2xl border border-[#dbe3f7] bg-white p-6 shadow-[0_18px_38px_-24px_rgba(29,65,157,0.35)]">
					<p className="text-sm font-semibold text-[#111827]">Meeting room</p>
					<p className="mt-1 text-sm text-[#4b5563]">{joined ? `${displayName} is in the room.` : "Click Enable camera and mic to enter the room."}</p>

					<div className="mt-5 grid gap-3 sm:grid-cols-2">
						<div className="rounded-2xl border border-[#dbe3f7] bg-[#0f172a] p-4 text-white shadow-[0_20px_40px_-28px_rgba(15,23,42,0.8)]">
							<p className="text-xs uppercase tracking-[0.24em] text-[#c7d2fe]">Your tile</p>
							<div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-black">
								<video ref={previewRef} autoPlay muted playsInline className="h-44 w-full object-cover" />
								{!mediaStream && (
									<div className="flex h-44 items-center justify-center bg-white/5 text-sm text-white/80">
										{mediaState === "loading" ? "Starting devices..." : "Waiting to join"}
									</div>
								)}
							</div>
							<div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
								<span className="rounded-full bg-white/10 px-3 py-1 text-white/85">{audioEnabled ? "Mic on" : "Mic off"}</span>
								<span className="rounded-full bg-white/10 px-3 py-1 text-white/85">{videoEnabled ? "Camera on" : "Camera off"}</span>
							</div>
						</div>

						<div className="rounded-2xl border border-[#dbe3f7] bg-[#f6f9ff] p-4">
							<p className="text-xs uppercase tracking-[0.24em] text-[#6f84ad]">Invite summary</p>
							<div className="mt-3 space-y-2 text-sm text-[#4b5563]">
								<p><span className="font-semibold text-[#111827]">Link:</span> share the room URL with attendees.</p>
								<p><span className="font-semibold text-[#111827]">Email:</span> use the email draft button to open your mail app.</p>
								<p><span className="font-semibold text-[#111827]">Calendar:</span> add the Google Calendar reminder so the meeting shows up on time.</p>
							</div>
							<div className="mt-4 rounded-xl border border-dashed border-[#b9c9eb] bg-white p-4 text-xs text-[#4b5563]">
								{buildInviteText(invite, meetingUrl || buildMeetingPath(invite))}
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								<button type="button" onClick={toggleAudio} disabled={!mediaStream} className="rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm font-semibold text-[#35558e] disabled:cursor-not-allowed disabled:opacity-50">{audioEnabled ? "Mute mic" : "Unmute mic"}</button>
								<button type="button" onClick={toggleVideo} disabled={!mediaStream} className="rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm font-semibold text-[#35558e] disabled:cursor-not-allowed disabled:opacity-50">{videoEnabled ? "Turn camera off" : "Turn camera on"}</button>
								<button type="button" onClick={leaveRoom} disabled={!mediaStream} className="rounded-xl bg-[#1d419d] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[#173784]">Leave room</button>
							</div>
						</div>
					</div>
=======
			<div className="space-y-6">
				{/* Meeting Header */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-zinc-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
					<div className="space-y-1">
						<div className="flex items-center gap-3">
							<span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 font-extrabold text-white text-base shadow">
								📹
							</span>
							<h1 className="text-2xl font-bold tracking-tight">Video Connect Room</h1>
							<span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-400/30">
								ID: {meetingId}
							</span>
						</div>
						<p className="text-xs text-slate-300">
							Status: <span className="font-semibold text-emerald-400">{peerStatus}</span>
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<button
							onClick={copyMeetingLink}
							className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 shadow-sm"
						>
							{copied ? "✓ Meeting Link Copied!" : "📋 Copy Meeting Invite Link"}
						</button>
						<button
							onClick={() => setShowDebugDrawer(!showDebugDrawer)}
							className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 shadow-sm"
						>
							{showDebugDrawer ? "Hide Debug Logs" : "Show Debug Logs"}
						</button>
					</div>
				</div>

				{/* Dual Party Video Feed Grid */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					
					{/* 🎥 LOCAL PARTY VIDEO (YOUR CAMERA FEED) */}
					<div className="relative overflow-hidden rounded-3xl border border-zinc-300 bg-slate-950 shadow-2xl min-h-[380px] flex flex-col justify-between p-4">
						<div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
							<video
								ref={localVideoRef}
								autoPlay
								playsInline
								muted
								className={`h-full w-full object-cover transition duration-300 ${isVideoMuted ? "hidden" : "block"}`}
							/>
							{isVideoMuted && (
								<div className="flex flex-col items-center gap-2 text-slate-400">
									<div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-2xl font-bold">
										📷
									</div>
									<p className="text-xs font-semibold">Your Camera is Muted</p>
								</div>
							)}
						</div>

						{/* Overlay Badges */}
						<div className="relative z-10 flex items-center justify-between">
							<span className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-white border border-slate-700">
								<span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
								Local Party (You)
							</span>
							<span className="rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-slate-300 border border-slate-700">
								{isScreenSharing ? "Screen Sharing" : isVideoMuted ? "Camera Off" : "720p HD Active"}
							</span>
						</div>

						<div className="relative z-10 flex justify-end">
							{isAudioMuted && (
								<span className="rounded-full bg-rose-600/90 px-3 py-1 text-[10px] font-bold text-white shadow">
									Microphone Muted
								</span>
							)}
						</div>
					</div>

					{/* 🎥 REMOTE PARTY VIDEO (OTHER PARTY CAMERA FEED) */}
					<div className="relative overflow-hidden rounded-3xl border border-zinc-300 bg-slate-950 shadow-2xl min-h-[380px] flex flex-col justify-between p-4">
						<div className="absolute inset-0 z-0 bg-slate-900 flex items-center justify-center">
							<video
								ref={remoteVideoRef}
								autoPlay
								playsInline
								className={`h-full w-full object-cover transition duration-300 ${isConnected ? "block" : "hidden"}`}
							/>
							{!isConnected && (
								<div className="flex flex-col items-center gap-3 p-6 text-center text-slate-400 space-y-2">
									<div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-3xl font-bold animate-pulse">
										👥
									</div>
									<p className="text-sm font-bold text-white">Waiting for Second Party Video Feed...</p>
									<p className="max-w-xs text-xs text-slate-400">
										Open this meeting link in a second browser window or share the link with another user.
									</p>
									<button
										onClick={copyMeetingLink}
										className="mt-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500"
									>
										Copy Second Party Invite Link 📋
									</button>
								</div>
							)}
						</div>

						{/* Overlay Badges */}
						<div className="relative z-10 flex items-center justify-between">
							<span className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-white border border-slate-700">
								<span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
								Remote Party (Second User)
							</span>
							<span className="rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-slate-300 border border-slate-700">
								{isConnected ? "Live Video Stream" : "Connecting..."}
							</span>
						</div>
					</div>
				</div>

				{/* Interactive Call Toolbar */}
				<div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-lg flex flex-wrap items-center justify-center gap-4">
					<button
						onClick={toggleCamera}
						className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold shadow-md transition ${
							isVideoMuted ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-slate-900 text-white hover:bg-slate-800"
						}`}
					>
						<span>{isVideoMuted ? "📷 Turn Camera On" : "🎥 Mute Camera"}</span>
					</button>

					<button
						onClick={toggleMicrophone}
						className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold shadow-md transition ${
							isAudioMuted ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-slate-900 text-white hover:bg-slate-800"
						}`}
					>
						<span>{isAudioMuted ? "🎙️ Unmute Mic" : "🎤 Mute Microphone"}</span>
					</button>

					<button
						onClick={toggleScreenShare}
						className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold shadow-md transition ${
							isScreenSharing ? "bg-amber-600 text-white hover:bg-amber-500" : "bg-indigo-600 text-white hover:bg-indigo-500"
						}`}
					>
						<span>{isScreenSharing ? "🖥️ Stop Screen Share" : "🖥️ Share Screen"}</span>
					</button>

					<button
						onClick={handleEndCall}
						className="flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-rose-700"
					>
						<span>🔴 End Call</span>
					</button>
				</div>

				{/* Lower Section: In-Call Chat & WebRTC Debug Drawer */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					
					{/* 💬 IN-CALL TEXT CHAT */}
					<div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between h-[360px]">
						<div>
							<div className="flex items-center justify-between border-b border-zinc-100 pb-3">
								<h3 className="font-bold text-zinc-900 text-sm">In-Call Text Chat</h3>
								<span className="text-[11px] font-semibold text-zinc-400">{chatMessages.length} Messages</span>
							</div>

							<div className="mt-4 space-y-3 overflow-y-auto max-h-[210px] pr-2 text-xs">
								{chatMessages.length === 0 ? (
									<p className="text-center text-zinc-400 py-6">No chat messages yet. Send a message to the room!</p>
								) : (
									chatMessages.map((msg) => (
										<div
											key={msg.id}
											className={`flex flex-col space-y-1 ${msg.sender === "You" ? "items-end" : "items-start"}`}
										>
											<div
												className={`rounded-2xl px-4 py-2.5 max-w-xs ${
													msg.sender === "You" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-900"
												}`}
											>
												<p className="font-semibold text-[10px] opacity-80">{msg.sender}</p>
												<p className="mt-0.5">{msg.text}</p>
											</div>
											<span className="text-[10px] text-zinc-400">{msg.timestamp}</span>
										</div>
									))
								)}
							</div>
						</div>

						<form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
							<input
								type="text"
								value={newChatText}
								onChange={(e) => setNewChatText(e.target.value)}
								placeholder="Type a message to the meeting..."
								className="h-10 flex-1 rounded-xl border border-zinc-300 px-3.5 text-xs outline-none focus:border-indigo-600"
							/>
							<button
								type="submit"
								className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow hover:bg-indigo-500"
							>
								Send
							</button>
						</form>
					</div>

					{/* 🔍 WEBRTC HIGH-SCALE DEBUG LOG DRAWER */}
					{showDebugDrawer && (
						<div className="rounded-3xl border border-zinc-900 bg-slate-950 p-6 text-white shadow-xl flex flex-col justify-between h-[360px]">
							<div className="flex items-center justify-between border-b border-slate-800 pb-3">
								<div className="flex items-center gap-2">
									<span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
									<h3 className="font-bold text-sm text-white">WebRTC High-Scale Debug Console</h3>
								</div>
								<button
									onClick={() => setDebugLogs([])}
									className="text-[11px] font-semibold text-slate-400 hover:text-white"
								>
									Clear Logs
								</button>
							</div>

							<div className="mt-3 space-y-1.5 overflow-y-auto max-h-[260px] font-mono text-[11px] pr-2">
								{debugLogs.length === 0 ? (
									<p className="text-slate-500 italic">Initializing debug logger...</p>
								) : (
									debugLogs.map((log) => (
										<div key={log.id} className="flex items-start gap-2 leading-relaxed">
											<span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
											<span
												className={`font-bold shrink-0 ${
													log.type === "success"
														? "text-emerald-400"
														: log.type === "warn"
														? "text-amber-400"
														: log.type === "error"
														? "text-rose-400"
														: "text-indigo-400"
												}`}
											>
												[{log.type.toUpperCase()}]
											</span>
											<span className="text-slate-200 break-all">{log.message}</span>
										</div>
									))
								)}
							</div>
						</div>
					)}
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
				</div>
			</div>
		</WorkspaceShell>
	);
<<<<<<< HEAD
}
=======
}
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
