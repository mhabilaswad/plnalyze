import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_FORECASTING_URL || "http://localhost:8000/forecasting";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files');
        if (!files || files.length === 0) {
            return NextResponse.json({ success: false, error: { message: 'No files uploaded' } }, { status: 400 });
        }
        const upstream = new FormData();
        files.forEach((f: any) => {
            upstream.append('files', f as Blob, (f as File).name || 'file.xlsx');
        });
        const res = await fetch(`${BACKEND_BASE}/update_dataset_files`, { method: 'POST', body: upstream as any });
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
