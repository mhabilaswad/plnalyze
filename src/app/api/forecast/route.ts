// FILE: src/app/api/forecast/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_FORECASTING_URL || "http://localhost:8000/forecasting";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const service = searchParams.get("service");
        if (!service) {
            return NextResponse.json({ error: "Missing service parameter" }, { status: 400 });
        }

        const encoded = encodeURIComponent(service);
        const res = await fetch(`${BACKEND_BASE}/forecast/${encoded}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const text = await res.text();
        let payload: any = null;
        try { payload = JSON.parse(text); } catch { payload = text; }
        if (!res.ok) {
            // Normalize structured errors
            const errObj = typeof payload === 'object' ? payload : { message: String(payload) };
            return NextResponse.json({ success: false, error: errObj }, { status: res.status });
        }
        return NextResponse.json({ success: true, data: payload });
    } catch (err: any) {
        return NextResponse.json({ error: "Failed to fetch forecast", detail: err?.message ?? String(err) }, { status: 500 });
    }
}
