// FILE: src/app/api/services/route.ts
import { NextResponse } from "next/server";
import path from "path";
import * as XLSX from "xlsx";

function normalizeHeader(h: string): string {
    return String(h || "")
        .trim()
        .replace(/[.,;]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
}

export async function GET() {
    try {
        // Default to reading the backend dataset in Forecast-PLN
        const excelPath = process.env.BACKEND_DATA_PATH || path.join(process.cwd(), "..", "Forecast-PLN", "data_lengkap.xlsx");
        const wb = XLSX.readFile(excelPath, { cellDates: true });
        let services: string[] = [];
        const lastDateMap: Record<string, string> = {};
        let lastDateGlobal: string | null = null;
        for (const sheetName of wb.SheetNames) {
            const ws = wb.Sheets[sheetName];
            if (!ws) continue;
            const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];
            if (!rows?.length) continue;
            // Find a header that corresponds to Nama Service
            const headers = Object.keys(rows[0] || {}).map((k) => ({ raw: k, norm: normalizeHeader(k) }));
            const serviceKey = headers.find((h) => ["nama_service", "nama_service_"].includes(h.norm) || h.norm === "nama_service" || h.norm === "nama_service_" || h.norm === "nama_service__")?.raw
                || headers.find((h) => h.norm.includes("nama_service"))?.raw
                || headers.find((h) => h.norm.includes("nama") && h.norm.includes("service"))?.raw
                || headers.find((h) => h.norm === "nama_service" || h.norm === "nama service")?.raw
                || "Nama Service";
            // robust date column detection (Tiket Open / Open Tiket / Open Tiken etc.)
            const dateHeader = (() => {
                const exact = headers.find((h) => ["tiket_open", "open_tiket", "open_ticket"].includes(h.norm));
                if (exact) return exact.raw;
                const contains = headers.find((h) => h.norm.includes("open") && (h.norm.includes("tiket") || h.norm.includes("ticket") || h.norm.includes("tiken")));
                if (contains) return contains.raw;
                const openOnly = headers.find((h) => h.norm.includes("open"));
                if (openOnly) return openOnly.raw;
                return "Tiket Open";
            })();
            const col = serviceKey in (rows[0] || {}) ? serviceKey : "Nama Service";
            for (const r of rows) {
                const name = String(r[col] ?? "").trim();
                if (name) services.push(name);
                // Track last data date per service
                if (name && dateHeader in r) {
                    const val = r[dateHeader];
                    // Robust parse: Date object, ISO string, or Excel serial number
                    let d: Date | null = null;
                    if (val instanceof Date) {
                        d = val as Date;
                    } else if (typeof val === 'number') {
                        // Excel serial date (days since 1899-12-30)
                        const epoch = Date.UTC(1899, 11, 30);
                        d = new Date(epoch + val * 86400000);
                    } else if (typeof val === 'string' && val) {
                        const tmp = new Date(val);
                        if (!isNaN(tmp.getTime())) d = tmp;
                    }
                    if (d && !isNaN(d.getTime())) {
                        const iso = d.toISOString().slice(0, 10);
                        if (!lastDateGlobal || iso > lastDateGlobal) lastDateGlobal = iso;
                    }
                }
            }
        }
        services = Array.from(new Set(services)).sort((a, b) => a.localeCompare(b));
        return NextResponse.json({ success: true, services, last_date: lastDateGlobal });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
    }
}
