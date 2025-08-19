// FILE: app/api/process-excel/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

type RowObj = Record<string, any>;

const CANONICAL_KEYS = [
  "nama_service",
  "sid",
  "tiket_open",
  "penyebab",
  "action",
  "keterangan1",
  "keterangan2",
  "durasi_(menit)",
  "stop_clock_(icon)",
  "durasi_total",
];

// normalisasi nama kolom → lower_snake, hilangkan simbol dan spasi
function normalizeHeader(h: string): string {
  return String(h || "")
    .trim()
    .replace(/[.,;]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
}

function excelDateToString(serial: number): string {
  if (typeof serial !== "number" || isNaN(serial)) return String(serial);

  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  const dd = String(date_info.getDate()).padStart(2, "0");
  const mm = String(date_info.getMonth() + 1).padStart(2, "0");
  const yyyy = date_info.getFullYear();
  const hh = String(hours).padStart(2, "0");
  const min = String(minutes).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// deteksi baris header dengan mencari baris yang punya ≥2 kandidat header bermakna
function detectHeaderRow(ws: XLSX.WorkSheet, maxScan = 15): number {
  const ref = ws["!ref"] || "A1";
  const range = XLSX.utils.decode_range(ref);
  let bestRow = range.s.r;
  let bestScore = -1;

  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + maxScan); r++) {
    let score = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      const v = cell?.v;
      if (typeof v === "string" && v.trim()) {
        const norm = normalizeHeader(v);
        if (norm && norm.length >= 3) score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  return bestRow;
}

// parse 1 sheet → array of row objects dengan header sudah dibersihkan
function parseSheet(ws: XLSX.WorkSheet): RowObj[] {
  const headerRow = detectHeaderRow(ws);
  const sheetRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
  sheetRange.s.r = headerRow;

  const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    range: sheetRange,
    raw: true,
    defval: "",
    blankrows: false,
  }) as any[][];

  if (!rows.length) return [];

  // baris pertama → header mentah
  const rawHeaders = (rows[0] as any[]).map((h) => String(h ?? ""));
  
  // buat nama kunci unik tapi lebih rapi
  const keyCount: Record<string, number> = {};
  const headers = rawHeaders.map((h) => {
    let key = normalizeHeader(h);
    if (!key) key = "col";
    
    // jika key sudah ada "keterangan", urutkan dari 1,2, dst
    if (/^keterangan/.test(key)) {
      keyCount[key] = (keyCount[key] || 0) + 1;
      key = `keterangan${keyCount[key]}`; // jadi keterangan1, keterangan2
    } else {
      if (keyCount[key]) {
        keyCount[key]++;
        key = `${key}_${keyCount[key]}`;
      } else {
        keyCount[key] = 1;
      }
    }
    return key;
  });

  let out: RowObj[] = [];
  for (let i = 1; i < rows.length; i++) {
    const arr = rows[i] as any[];
    const obj: RowObj = {};
    headers.forEach((h, idx) => {
      let val = arr?.[idx];
      if (typeof val === "string") val = val.trim();
    
      // 🔹 khusus tiket_open: konversi jika angka
      if (h === "tiket_open" && typeof val === "number") {
        val = excelDateToString(val);
      }
    
      obj[h] = val ?? "";
    });
    

    // SID dan nama_service wajib ada → skip jika kosong
    if (!obj.sid || String(obj.sid).trim() === "" || !obj.nama_service || String(obj.nama_service).trim() === "") {
      continue;
    }
    obj.sid = String(obj.sid).replace(/\.0$/, "").trim();
    out.push(obj);
  }

  // buang baris yang seluruh kolomnya kosong
  out = out.filter((row) =>
    Object.values(row).some((v) => v !== "" && v !== null && v !== undefined)
  );

  return out;
}

// sesuaikan urutan kunci agar konsisten (canonical keys dulu, lalu sisanya alfabet)
function orderKeys(row: RowObj): RowObj {
  const rest = Object.keys(row).filter((k) => !CANONICAL_KEYS.includes(k)).sort();
  const ordered: RowObj = {};
  [...CANONICAL_KEYS, ...rest].forEach((k) => {
    if (row.hasOwnProperty(k)) ordered[k] = row[k];
  });
  return ordered;
}

// buat narasi
function buildNarrative(record: RowObj): string {
  return `${record.nama_service} (${record.sid}), - pada ${record.tiket_open}, perbaikan selama ${record["durasi_(menit)"]} menit dengan ${record["stop_clock_(icon)"]} menit berhenti sehingga ${record["durasi_total"]} menit waktu yang terhitung. Penyebab: ${record.penyebab}, Action: ${record.action}, Keterangan: ${record.keterangan1}${record.keterangan2 ? ", " + record.keterangan2 : ""}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      return NextResponse.json({ error: "Invalid file type. Please upload Excel or CSV file." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });

    let allRows: RowObj[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const parsed = parseSheet(ws);
      if (parsed.length) allRows.push(...parsed);
    }

    if (!allRows.length) return NextResponse.json({ error: "Tidak ada data yang dapat dibaca dari file." }, { status: 400 });

    const normalized = allRows.map(orderKeys);

    normalized.sort((a, b) => {
      const sidA = String(a.sid ?? "");
      const sidB = String(b.sid ?? "");
      const sidCmp = sidA.localeCompare(sidB);
      if (sidCmp !== 0) return sidCmp;
      return String(a.nama_service ?? "").localeCompare(String(b.nama_service ?? ""));
    });

    // grup per service
    const grouped = new Map<string, RowObj[]>();
    for (const r of normalized) {
      const nama = String(r.nama_service ?? "");
      const sid = String(r.sid ?? "");
      const key = `${nama}|${sid}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    const services = Array.from(grouped.entries()).map(([key, records]) => {
      const [nama_service, sid] = key.split("|");
      return {
        nama_service,
        sid,
        records,
        narratives: records.map(buildNarrative), // buat narasi langsung
      };
    });

    const cleanedColumns = Object.keys(orderKeys(normalized[0]));

    return NextResponse.json({
      success: true,
      data: { services, totalRecords: normalized.length, cleanedColumns },
      message: "Excel file processed successfully",
    });
  } catch (err) {
    console.error("Error processing Excel file:", err);
    return NextResponse.json({ error: "Failed to process Excel file" }, { status: 500 });
  }
}
