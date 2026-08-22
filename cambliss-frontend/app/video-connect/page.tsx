"use client";

<<<<<<< HEAD
import Link from "next/link";
import { useMemo, useState } from "react";
=======
import React, { useEffect, useRef, useState } from "react";
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
import { useRouter } from "next/navigation";
import WorkspaceShell from "../../components/WorkspaceShell";
import {
	buildGoogleCalendarUrl,
	buildInviteText,
	buildMailtoUrl,
	buildMeetingPath,
	buildMeetingUrl,
	createVideoMeetingId,
	splitEmails,
	toDateTimeLocalValue,
	type VideoMeetingInvite,
} from "../../lib/video-connect";

const defaultStart = () => toDateTimeLocalValue(new Date(Date.now() + 30 * 60 * 1000));

<<<<<<< HEAD
export default function VideoConnectPage() {
	const router = useRouter();
	const [title, setTitle] = useState("Team meeting");
	const [hostName, setHostName] = useState("Office Connect");
	const [scheduledStart, setScheduledStart] = useState(defaultStart());
	const [durationMinutes, setDurationMinutes] = useState(30);
	const [attendees, setAttendees] = useState("team@company.com");
	const [notes, setNotes] = useState("Join from the meeting link. Open Google Calendar to add a reminder.");
	const [createdInvite, setCreatedInvite] = useState<VideoMeetingInvite | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	const meetingUrl = useMemo(() => {
		if (!createdInvite || typeof window === "undefined") {
			return "";
		}

		return buildMeetingUrl(window.location.origin, createdInvite);
	}, [createdInvite]);

	const calendarLink = useMemo(() => {
		if (!createdInvite || !meetingUrl) {
			return "";
		}

		return buildGoogleCalendarUrl(createdInvite, meetingUrl);
	}, [createdInvite, meetingUrl]);

	const buildInviteFromForm = (): VideoMeetingInvite => ({
		meetingId: createVideoMeetingId(),
		title: title.trim() || "Team meeting",
		hostName: hostName.trim() || "Office Connect",
		scheduledStart,
		durationMinutes: Math.max(15, Math.min(480, Number(durationMinutes) || 30)),
		attendeeEmails: splitEmails(attendees),
		notes: notes.trim(),
	});

	const buildInstantInvite = (): VideoMeetingInvite => ({
		meetingId: createVideoMeetingId(),
		title: title.trim() || "Instant meeting",
		hostName: hostName.trim() || "Office Connect",
		scheduledStart: toDateTimeLocalValue(new Date()),
		durationMinutes: Math.max(15, Math.min(480, Number(durationMinutes) || 30)),
		attendeeEmails: splitEmails(attendees),
		notes: notes.trim() || "Instant meeting started from Office Connect.",
	});

	const handleCreateLink = () => {
		const invite = buildInviteFromForm();
		setCreatedInvite(invite);
		setNotice("Meeting link created. Copy it, email it, or add it to Google Calendar.");
		return invite;
	};

	const copyText = async (value: string) => {
		await navigator.clipboard.writeText(value);
		setNotice("Copied to clipboard.");
	};

	const openRoom = () => {
		const invite = createdInvite ?? handleCreateLink();
		router.push(buildMeetingPath(invite));
	};

	const startInstantMeeting = () => {
		const invite = buildInstantInvite();
		setCreatedInvite(invite);
		setNotice("Instant meeting created. You can join or share the room link right away.");
		router.push(buildMeetingPath(invite));
=======
export default function VideoConnectHubPage() {
	const router = useRouter();
	const [customRoomId, setCustomRoomId] = useState("");
	const [cameraActive, setCameraActive] = useState(false);
	const [micActive, setMicActive] = useState(true);
	const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
	const previewStreamRef = useRef<MediaStream | null>(null);

	// Initialize Camera Preview
	useEffect(() => {
		let isMounted = true;
		async function startCameraPreview() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { width: { ideal: 640 }, height: { ideal: 360 } },
					audio: true,
				});

				if (!isMounted) return;
				previewStreamRef.current = stream;

				if (videoPreviewRef.current) {
					videoPreviewRef.current.srcObject = stream;
					videoPreviewRef.current.play().catch(() => {});
				}
				setCameraActive(true);
			} catch (err) {
				console.warn("Camera preview initialization warning:", err);
			}
		}

		startCameraPreview();

		return () => {
			isMounted = false;
			if (previewStreamRef.current) {
				previewStreamRef.current.getTracks().forEach((t) => t.stop());
			}
		};
	}, []);

	const handleCreateInstantMeeting = () => {
		const newMeetingId = `room-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
		router.push(`/video-connect/room/${newMeetingId}`);
	};

	const handleJoinCustomRoom = (e: React.FormEvent) => {
		e.preventDefault();
		if (!customRoomId.trim()) return;
		const cleanId = customRoomId.trim().replace(/[^a-zA-Z0-9_-]/g, "");
		router.push(`/video-connect/room/${cleanId}`);
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
	};

	return (
		<WorkspaceShell>
<<<<<<< HEAD
			<div className="mt-5 rounded-2xl border border-[#dbe3f7] bg-white p-6 shadow-[0_18px_38px_-24px_rgba(29,65,157,0.35)]">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Video Connect</h1>
						<p className="mt-2 text-sm text-[#4b5563]">Create a meeting link, share it by email or copy-paste, and add a Google Calendar reminder.</p>
					</div>
					<Link href="/dashboard" className="rounded-xl border border-[#dbe3f7] bg-[#f6f9ff] px-4 py-2 text-sm font-semibold text-[#35558e] hover:bg-[#edf3ff]">
						Back to dashboard
					</Link>
				</div>

				{notice && <p className="mt-4 rounded-xl border border-[#dbe3f7] bg-[#f6f9ff] px-3 py-2 text-sm text-[#35558e]">{notice}</p>}

				<div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
					<div className="space-y-4 rounded-2xl border border-[#dbe3f7] bg-[#fbfcff] p-5">
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="space-y-1 text-sm font-medium text-[#111827]">
								<span>Meeting title</span>
								<input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d419d]" />
							</label>
							<label className="space-y-1 text-sm font-medium text-[#111827]">
								<span>Host name</span>
								<input value={hostName} onChange={(event) => setHostName(event.target.value)} className="w-full rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d419d]" />
							</label>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<label className="space-y-1 text-sm font-medium text-[#111827]">
								<span>Start time</span>
								<input type="datetime-local" value={scheduledStart} onChange={(event) => setScheduledStart(event.target.value)} className="w-full rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d419d]" />
							</label>
							<label className="space-y-1 text-sm font-medium text-[#111827]">
								<span>Duration (minutes)</span>
								<input type="number" min={15} max={480} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="w-full rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d419d]" />
							</label>
						</div>

						<label className="space-y-1 text-sm font-medium text-[#111827]">
							<span>Invite emails</span>
							<textarea value={attendees} onChange={(event) => setAttendees(event.target.value)} rows={3} className="w-full rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d419d]" placeholder="team@company.com, client@company.com" />
						</label>

						<label className="space-y-1 text-sm font-medium text-[#111827]">
							<span>Notes</span>
							<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-xl border border-[#dbe3f7] bg-white px-3 py-2 text-sm outline-none focus:border-[#1d419d]" />
						</label>

						<div className="flex flex-wrap gap-2">
							<button type="button" onClick={handleCreateLink} className="rounded-xl bg-[#1d419d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173784]">Create meeting link</button>
							<button type="button" onClick={startInstantMeeting} className="rounded-xl border border-[#1d419d] bg-[#edf3ff] px-4 py-2 text-sm font-semibold text-[#1d419d] hover:bg-[#dfe9ff]">Start instant meeting</button>
							<button type="button" onClick={openRoom} className="rounded-xl border border-[#dbe3f7] bg-white px-4 py-2 text-sm font-semibold text-[#35558e] hover:bg-[#edf3ff]">Open room</button>
						</div>
					</div>

					<div className="space-y-4 rounded-2xl border border-[#dbe3f7] bg-[#f6f9ff] p-5">
						<div>
							<p className="text-sm font-semibold text-[#111827]">Invite preview</p>
							<p className="mt-1 text-sm text-[#4b5563]">Generate one link and share it by email, copy-paste, or Google Calendar.</p>
						</div>

						{createdInvite ? (
							<>
								<div className="space-y-3 rounded-2xl border border-[#dbe3f7] bg-white p-4">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f84ad]">Meeting link</p>
										<p className="mt-2 break-all text-sm text-[#111827]">{meetingUrl}</p>
									</div>
									<div className="grid gap-2 text-sm text-[#4b5563]">
										<p><span className="font-semibold text-[#111827]">Title:</span> {createdInvite.title}</p>
										<p><span className="font-semibold text-[#111827]">Host:</span> {createdInvite.hostName}</p>
										<p><span className="font-semibold text-[#111827]">When:</span> {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(createdInvite.scheduledStart))}</p>
										<p><span className="font-semibold text-[#111827]">Attendees:</span> {createdInvite.attendeeEmails.length ? createdInvite.attendeeEmails.join(", ") : "None"}</p>
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									<button type="button" onClick={() => void copyText(meetingUrl)} className="rounded-xl border border-[#dbe3f7] bg-white px-4 py-2 text-sm font-semibold text-[#35558e] hover:bg-[#edf3ff]">Copy link</button>
									<button type="button" onClick={() => void copyText(buildInviteText(createdInvite, meetingUrl))} className="rounded-xl border border-[#dbe3f7] bg-white px-4 py-2 text-sm font-semibold text-[#35558e] hover:bg-[#edf3ff]">Copy invite text</button>
									<a href={buildMailtoUrl(createdInvite, meetingUrl)} className="rounded-xl border border-[#dbe3f7] bg-white px-4 py-2 text-sm font-semibold text-[#35558e] hover:bg-[#edf3ff]">Open email draft</a>
									<a href={calendarLink} target="_blank" rel="noreferrer" className="rounded-xl bg-[#1d419d] px-4 py-2 text-sm font-semibold text-white hover:bg-[#173784]">Add to Google Calendar</a>
								</div>
							</>
						) : (
							<div className="rounded-2xl border border-dashed border-[#b9c9eb] bg-white p-5 text-sm text-[#4b5563]">
								Create a meeting link to reveal the share actions.
							</div>
						)}
=======
			<div className="space-y-6 max-w-5xl mx-auto">
				{/* Hero Header */}
				<div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
					<div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
					<div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
						<div className="space-y-2">
							<div className="flex items-center gap-3">
								<span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 font-extrabold text-white text-lg shadow-lg">
									📹
								</span>
								<h1 className="text-3xl font-bold tracking-tight text-white">Video Connect Hub</h1>
							</div>
							<p className="max-w-2xl text-sm text-slate-300">
								High-scale WebRTC video calling suite. Both party camera video feeds, crystal-clear audio, STUN server connectivity, and live debug logs.
							</p>
						</div>

						<button
							onClick={handleCreateInstantMeeting}
							className="rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-indigo-500 shrink-0"
						>
							🚀 Start Instant Video Call
						</button>
					</div>
				</div>

				{/* Camera Preview & Room Join Card */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					
					{/* Live Camera Preview Box */}
					<div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-base font-bold text-zinc-900">Device Hardware Preview</h2>
							<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
								<span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
								{cameraActive ? "Camera Hardware Active" : "Detecting Camera..."}
							</span>
						</div>

						<div className="relative overflow-hidden rounded-2xl bg-slate-950 h-56 flex items-center justify-center border border-zinc-200">
							<video
								ref={videoPreviewRef}
								autoPlay
								playsInline
								muted
								className="h-full w-full object-cover"
							/>
							{!cameraActive && (
								<div className="flex flex-col items-center gap-2 text-slate-400">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-xl font-bold">
										📷
									</div>
									<p className="text-xs font-semibold">Grant Camera Permissions</p>
								</div>
							)}
						</div>
					</div>

					{/* Join Existing Room Card */}
					<div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
						<div className="space-y-3">
							<h2 className="text-base font-bold text-zinc-900">Join Video Room</h2>
							<p className="text-xs text-zinc-500 leading-relaxed">
								Enter an existing Meeting Room ID or paste an invite link to connect with the second party.
							</p>

							<form onSubmit={handleJoinCustomRoom} className="space-y-3 pt-2">
								<div>
									<label className="block text-xs font-semibold text-zinc-700">Room ID or Meeting Link</label>
									<input
										type="text"
										required
										value={customRoomId}
										onChange={(e) => setCustomRoomId(e.target.value)}
										placeholder="e.g. demo-room or room-xyz"
										className="mt-1 h-10 w-full rounded-xl border border-zinc-300 px-3.5 text-xs outline-none focus:border-indigo-600"
									/>
								</div>
								<button
									type="submit"
									className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow hover:bg-slate-800"
								>
									Join Video Room ↗
								</button>
							</form>
						</div>

						<div className="rounded-2xl bg-slate-50 p-4 border border-zinc-200 space-y-1">
							<p className="text-xs font-bold text-zinc-800">💡 Testing 2-Party Calls locally:</p>
							<p className="text-[11px] text-zinc-600 leading-relaxed">
								Click <span className="font-semibold text-indigo-600">Start Instant Video Call</span>, then copy the meeting link and open it in a second browser window/tab to see both party cameras live simultaneously!
							</p>
						</div>
>>>>>>> aa34278 (feat: Add Akaunting, Mercur multi-vendor engine, and WebRTC Video Connect dual party calling)
					</div>
				</div>
			</div>
		</WorkspaceShell>
	);
}
