// FILE: app/api/predict-serpo/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();

        // Support both "file_gangguan" and "files" parameter names for compatibility
        let files: File[] = [];

        // Check for multiple files first
        const multipleFiles = form.getAll("files") as File[];
        if (multipleFiles.length > 0) {
            files = multipleFiles;
        } else {
            // Check for single file
            const singleFile = form.get("file_gangguan") as File | null;
            if (singleFile) {
                files = [singleFile];
            }
        }

        if (files.length === 0) {
            return NextResponse.json(
                { error: "Tidak ada file yang diunggah. Unggah file_gangguan atau files." },
                { status: 400 }
            );
        }

        // Validate file formats
        const validName = (f: File) => /\.(xlsx|xls|csv)$/i.test(f.name);
        const invalidFiles = files.filter(f => !validName(f));
        if (invalidFiles.length > 0) {
            return NextResponse.json(
                { error: `Format file tidak valid: ${invalidFiles.map(f => f.name).join(', ')}. Unggah Excel/CSV.` },
                { status: 400 }
            );
        }

        // Prepare form data for backend
        const fd = new FormData();

        // For single file, use "file_gangguan" parameter name that backend expects
        if (files.length === 1) {
            const fileBuf = Buffer.from(await files[0].arrayBuffer());
            fd.append("file_gangguan", new Blob([fileBuf]), files[0].name);
        } else {
            // For multiple files, use "files" parameter name
            for (const file of files) {
                const fileBuf = Buffer.from(await file.arrayBuffer());
                fd.append("files", new Blob([fileBuf]), file.name);
            }
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_SERPO_URL ? `${process.env.NEXT_PUBLIC_BACKEND_SERPO_URL}/predict-serpo` : "http://localhost:8000/serpo/predict-serpo";
        console.log(`Forwarding ${files.length} file(s) to backend: ${backendUrl}`);

        const resp = await fetch(backendUrl, {
            method: "POST",
            body: fd
        });

        const text = await resp.text();
        let json: any = {};
        try {
            json = JSON.parse(text);
        } catch (parseError) {
            console.error("Failed to parse backend response:", parseError);
        }

        if (!resp.ok) {
            const message = json?.detail || json?.error || text || `Gagal proxy: HTTP ${resp.status}`;
            console.error("Backend error:", message);
            return NextResponse.json({ error: message }, { status: resp.status });
        }

        const okPayload = json && Object.keys(json).length ? json : { raw: text };
        console.log("Success - returning payload with keys:", Object.keys(okPayload));

        return NextResponse.json({
            success: true,
            ...okPayload
        });

    } catch (err) {
        console.error("/api/predict-serpo error:", err);
        return NextResponse.json({
            error: "Internal server error",
            details: err instanceof Error ? err.message : "Unknown error"
        }, { status: 500 });
    }
}
