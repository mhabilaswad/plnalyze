import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_BASE_URL || "http://127.0.0.1:8000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const folder_path = body?.folder_path as string | undefined;
        if (!folder_path) {
            return NextResponse.json({ success: false, error: { message: "Missing folder_path" } }, { status: 400 });
        }
        const res = await fetch(`${BACKEND_BASE}/update_dataset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folder_path }),
        });
        const text = await res.text();
        let payload: any = null;
        try { payload = JSON.parse(text); } catch { payload = text; }
        if (!res.ok) {
            const errObj = typeof payload === 'object' ? payload : { message: String(payload) };
            return NextResponse.json({ success: false, error: errObj }, { status: res.status });
        }
        return NextResponse.json({ success: true, data: payload });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: { message: err?.message ?? String(err) } }, { status: 500 });
    }
}
