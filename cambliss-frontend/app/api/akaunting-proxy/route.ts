import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		},
	});
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const targetUrl = searchParams.get("url") || "https://akaunting.com";

	try {
		const response = await fetch(targetUrl, {
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
			},
		});

		const contentType = response.headers.get("content-type") || "text/html";
		let body = await response.text();

		// Base URL calculation
		const urlObj = new URL(targetUrl);
		const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

		// Clean up telemetry & third-party chat scripts causing browser CORS errors
		body = body
			.replace(/<script[^>]*cdn-cgi[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<script[^>]*tawk\.to[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<script[^>]*twk-[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(/<script[^>]*beacon[^>]*>[\s\S]*?<\/script>/gi, "");

		// Prevent frame-busting JavaScript from redirecting window.top or causing frame errors
		const frameBusterOverride = `<script>try{Object.defineProperty(window,'top',{get:function(){return window.self;}});Object.defineProperty(window,'parent',{get:function(){return window.self;}});}catch(e){}</script>`;

		if (body.includes("<head>")) {
			body = body.replace("<head>", `<head>${frameBusterOverride}<base href="${baseUrl}/">`);
		} else if (body.includes("<html>")) {
			body = body.replace("<html>", `<html><head>${frameBusterOverride}<base href="${baseUrl}/"></head>`);
		}

		const headers = new Headers();
		headers.set("Content-Type", contentType);
		headers.set("Access-Control-Allow-Origin", "*");
		headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
		headers.set("Access-Control-Allow-Headers", "*");

		// Strip framing security headers
		headers.delete("x-frame-options");
		headers.delete("content-security-policy");
		headers.delete("cross-origin-embedder-policy");
		headers.delete("cross-origin-opener-policy");
		headers.delete("cross-origin-resource-policy");

		return new NextResponse(body, {
			status: response.status,
			headers,
		});
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to proxy target URL", details: String(error) },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest) {
	return GET(req);
}
