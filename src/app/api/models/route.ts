// FILE: src/app/api/models/route.ts

import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_FORECASTING_URL || "http://localhost:8000/forecasting";

export async function GET() {
    try {
        const res = await fetch(`${BACKEND_BASE}/models`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const text = await res.text();
        let payload: any = null;
        try { payload = JSON.parse(text); } catch { payload = text; }
        if (!res.ok) {
            const errObj = typeof payload === 'object' ? payload : { message: String(payload) };
            return NextResponse.json({ success: false, error: errObj }, { status: res.status });
        }
        return NextResponse.json({ success: true, ...payload });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: { message: err?.message ?? String(err) } }, { status: 500 });
    }
}
