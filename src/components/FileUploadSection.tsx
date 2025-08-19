// FILE: src/components/FileUploadSection.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  EvaluationSummary,
  UploadResult,
  ServiceEvaluation,
  ExcelProcessResult,
} from "@/types";
import Spinner from "./Spinner";
import {
  DocumentArrowUpIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

type UploadState = "idle" | "selected" | "uploading" | "processed" | "evaluated";

export interface FileUploadSectionProps {
  onFileUpload?: (file: File) => Promise<UploadResult>;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ onFileUpload }) => {
  const [status, setStatus] = useState<UploadState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [excelData, setExcelData] = useState<ExcelProcessResult | null>(null);
  const [serviceEvaluations, setServiceEvaluations] = useState<ServiceEvaluation[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showEvalSpinner, setShowEvalSpinner] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [controllers, setControllers] = useState<(AbortController | null)[]>([]);

  const fileInfo = useMemo(() => {
    if (!file) return null;
    const sizeKB = (file.size / 1024).toFixed(1);
    return `${file.name} — ${sizeKB} KB`;
  }, [file]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setStatus("selected");
      setMessage("");
      setExcelData(null);
      setServiceEvaluations([]);
    }
  }

  async function handleUploadClick() {
    if (!file) return;
    setStatus("uploading");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-excel", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `HTTP ${response.status}`);
      }

      setExcelData(result.data);

      // sort services berdasarkan jumlah records terbanyak
      const sortedServices = [...result.data.services].sort(
        (a: any, b: any) => b.records.length - a.records.length
      );

      const initialEvaluations = sortedServices.map((s: any) => ({
        nama_service: s.nama_service,
        sid: s.sid,
        summary: "",
        evaluation: "",
        isLoading: false,
        isExpanded: false,
        evalTime: null as number | null,
      }));
      setServiceEvaluations(initialEvaluations);

      setMessage("Excel berhasil diproses.");
      setStatus("processed");
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage(`Terjadi kesalahan: ${err.message || "Upload gagal"}`);
      setStatus("selected");
    }
  }

  async function evaluateService(serviceIndex: number) {
    if (!excelData || serviceIndex >= serviceEvaluations.length) return;

    const sortedServices = [...excelData.services].sort(
      (a, b) => b.records.length - a.records.length
    );
    const service = sortedServices[serviceIndex];

    setServiceEvaluations((prev) =>
      prev.map((s, idx) => (idx === serviceIndex ? { ...s, isLoading: true } : s))
    );

    const startTime = performance.now();
    try {
      const header = `${service.nama_service} (${service.sid})`;
      const rows = service.records.map((record) => {
        const tiket = record.tiket_open ?? "";
        const durasi = record["durasi_menit"] ?? "";
        const stopClock = record["stop_clock"] ?? "";
        const durasiTotal = record["durasi_total"] ?? "";
        const penyebab = record.penyebab ?? "";
        const action = record.action ?? "";
        const ket2 = record.keterangan2 ?? "";

        const fields: string[] = [];
        if (tiket) {
          fields.push(
            `Pada ${tiket}, perbaikan selama ${durasi} menit dengan ${stopClock} menit berhenti sehingga ${durasiTotal} menit waktu yang terhitung. Penyebab: ${penyebab}, Action: ${action}, Keterangan: ${ket2}`
          );
        }
        return `- ${fields.join(", ")}`;
      });
      const dataContext = header + "\n" + rows.join("\n");

      const res = await fetch("http://localhost:8000/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "DeepSeek-PLN",
          messages: [
            {
              role: "system",
              content: `KONTEKS UMUM
          Kamu adalah model AI evaluator yang hanya boleh menggunakan DATA yang diberikan berikut (tidak boleh menambahkan fakta eksternal atau asumsi yang tidak ada di data). Output harus hanya dua bagian persis seperti format di bawah. Jika kamu tidak bisa mematuhi format ini, keluarkan HANYA kata: INVALID_OUTPUT
          
          FORMAT OUTPUT (harus persis)
          Rangkuman:
          [paragraf]
          
          Evaluasi:
          [paragraf]
          
          KETENTUAN PENTING UNTUK MEMBUAT OUTPUT
          1. Bahasa: Indonesia. Nada: formal, analitis, kronologis, mudah dibaca.
          2. Panjang: masing-masing bagian harus 1 paragraf dengan minimal 5 kalimat lengkap (bukan daftar poin kosong).
          3. Gunakan hanya informasi yang ada di data input.
          4. Semua angka (durasi, menit, jarak) harus muncul dalam output persis seperti hasil perhitungan dari data. Tampilkan rumus singkat per insiden: mis. Durasi = selesai - mulai = X menit; StopClock = Y menit; Durasi Aktif = X - Y = Z menit.
          5. Jika ada nilai waktu, asumsikan format input waktu sudah dalam bentuk yang bisa dikalkulasi (dalam datetime atau durasi dalam menit).
          6. Definisi yang digunakan:
             - “Berhasil sesuai ketentuan” = Durasi total kurang dari 240 menit.
             - “Perlu justifikasi” = Durasi total lebih dari 240 menit (terima jika keterangan yang valid tercantum seperti force majeure, menunggu material, akses terbatas, kelelahan, atau daftar keterangan lain yang tercantum di input).
          7. Stop clock: bila terdapat stop clock atau waktu berhenti, gunakan nilainya. Jika stop_clock = 0 tetapi keterangan menyatakan ada jeda/menunggu/berhenti, anggap ada inkonsistensi;
          8. tulis Kronologi per gangguan (untuk Rangkuman)
          9. Analisa kuantitatif (untuk Evaluasi): hitung dan sebutkan minimal hal berikut:
             - Jumlah total insiden di dataset.
             - Jumlah dan persentase insiden yang selesai kurang dari 240 menit atau melewati 240 menit.
             - Rata-rata (mean) durasi aktif (menit) dan median durasi aktif (menit).
             - Insiden terpanjang (sebutkan durasi, lokasi, waktu, dan nama jika ada).
             - Sebutkan semua insiden yang memiliki durasi aktif >= 240 menit, dan untuk masing-masing nyatakan apakah keterangan yang ada menerima atau menolak durasi panjang tersebut (berdasarkan apakah keterangan valid tercantum).
             - Temukan pola/ tren: lokasi yang sering bermasalah, jam atau hari yang sering terjadi gangguan, atau tipe penyebab yang dominan — hanya bila data mendukung secara numerik.
          10. Evaluasi kinerja Serpo (tim lapangan):
              - Berikan penilaian apakah tanggapan cepat & tepat untuk setiap insiden (berdasarkan durasi aktif, tindakan, dan keterangan).
              - Jika ada jeda tidak normal (mis. jeda lama antara mulai dan respon/akses), jelaskan dampak spesifiknya pada durasi dan pada kemungkinan pemulihan layanan.
              - Berikan rekomendasi tindakan operasional berbasis data (mis. alokasi sumber daya, prioritas lokasi), tetapi jangan menyarankan perubahan pada cara pencatatan stop clock (sesuai permintaan).
          11. Bukti & Transparansi: setiap klaim analitis yang penting harus disertai referensi langsung ke field data yang mendukung (mis. “Insiden #23 — Durasi Aktif 360 menit; keterangan: menunggu material.”). Gunakan format singkat dalam paragraf (tidak perlu referensi file).
          12. Larangan model: 
              - Jangan menambahkan nama, lokasi, waktu, atau angka yang tidak ada di data.
              - Jangan berspekulasi tentang penyebab selain yang ada di field “penyebab” / “keterangan”.
          13. Prioritas keluaran: jika model gagal mematuhi syarat minimal (mis. kurang dari 5 kalimat per bagian atau menambahkan klaim tanpa data), keluaran harus INVALID_OUTPUT.
          
          CATATAN AKHIR
          - Semua waktu yang ada dalam satuan menit
          - Jawaban harus bersih: hanya dua paragraf yang diberi header Rangkuman: dan Evaluasi: seperti format di atas, tanpa header tambahan, tanpa daftar terpisah, dan tanpa metadata.
          - Jika data yang diberikan tidak memungkinkan memenuhi salah satu ketentuan (mis. tidak ada timestamp sama sekali), keluarkan HANYA: INVALID_OUTPUT`,
            },
            {
              role: "user",
              content: `DATA:\n\`\`\`\n${dataContext}\n\`\`\``,
            },
          ],          
          temperature: 0.0,
          top_p: 0.7,
          top_k: 40,
          repeat_penalty: 1.1,
          max_tokens: -1,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "");

      const summaryMatch = cleaned.match(/Rangkuman:\s*([\s\S]*?)(?=Evaluasi:|$)/i);
      const evaluationMatch = cleaned.match(/Evaluasi:\s*([\s\S]*?)$/i);

      const summary = summaryMatch?.[1]?.trim() || "Tidak ada rangkuman.";
      const evaluation = evaluationMatch?.[1]?.trim() || "Tidak ada evaluasi.";

      const endTime = performance.now();
      const durationSeconds = (endTime - startTime) / 1000;

      setServiceEvaluations((prev) =>
        prev.map((s, idx) =>
          idx === serviceIndex
            ? {
                ...s,
                summary,
                evaluation,
                isLoading: false,
                isExpanded: true,
                evalTime: durationSeconds,
              }
            : s
        )
      );
    } catch (error) {
      console.error("Error evaluating service:", error);
      setServiceEvaluations((prev) =>
        prev.map((s, idx) =>
          idx === serviceIndex
            ? {
                ...s,
                summary: "Error: Gagal mengevaluasi layanan.",
                evaluation: "Error: Gagal mengevaluasi layanan.",
                isLoading: false,
                evalTime: null,
              }
            : s
        )
      );
    }
  }

  function toggleServiceExpansion(serviceIndex: number) {
    setServiceEvaluations((prev) =>
      prev.map((serviceEval, idx) =>
        idx === serviceIndex
          ? { ...serviceEval, isExpanded: !serviceEval.isExpanded }
          : serviceEval
      )
    );
  }

  function handleReset() {
    setStatus("idle");
    setFile(null);
    setMessage("");
    setExcelData(null);
    setServiceEvaluations([]);
    setSearchQuery("");
    if (inputRef.current) inputRef.current.value = "";
  }

  useEffect(() => {
    if (status === "processed") {
      const t = setTimeout(() => setShowEvalSpinner(false), 1200);
      return () => clearTimeout(t);
    }
  }, [status]);

  // filter by search
  const filteredServices = serviceEvaluations.filter((s) =>
    s.nama_service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900">Unggah Data</h2>
      <p className="text-sm text-gray-500 mb-4">
        Pilih file .xlsx / .xls / .csv untuk evaluasi. File akan diproses dan dievaluasi per ICON.
      </p>

      {status !== "processed" && status !== "evaluated" && (
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label htmlFor="datasetFile" className="block text-sm font-medium text-gray-700">
              File Dataset
            </label>
            <input
              ref={inputRef}
              id="datasetFile"
              name="datasetFile"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleFileChange}
            />
            {fileInfo && <p className="mt-2 text-sm text-gray-600">{fileInfo}</p>}
          </div>

          <button
            type="button"
            onClick={handleUploadClick}
            disabled={!file || status === "uploading"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "uploading" ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-5 w-5" />
                Upload
              </>
            )}
          </button>
        </div>
      )}

      {status === "processed" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Hasil Pemrosesan Excel</h3>
            {showEvalSpinner ? (
              <Spinner label="Menyiapkan evaluasi..." />
            ) : (
              <div className="space-y-2 text-sm text-gray-600">
                <p>Total ICON terdeteksi: {excelData?.services.length || 0}</p>
                <p>Total records: {excelData?.totalRecords || 0}</p>
                <p>Kolom yang diproses: {excelData?.cleanedColumns.join(", ")}</p>
                {message && <p className="text-green-600">{message}</p>}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div>
            <input
              type="text"
              placeholder="Cari nama ICON..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {/* Service List */}
          <div className="space-y-3">
            {filteredServices.map((serviceEval, index) => (
              <div key={`${serviceEval.nama_service}-${serviceEval.sid}`} className="border rounded-lg">
                <div className="p-4 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{serviceEval.nama_service}</h4>
                    <p className="text-sm text-gray-500">SID: {serviceEval.sid}</p>
                    <p className="text-sm text-gray-500">
                      {
                        excelData?.services.find((s) => s.sid === serviceEval.sid)?.records.length ||
                        0
                      }{" "}
                      records
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!serviceEval.summary && !serviceEval.isLoading && (
                      <button
                        onClick={() =>
                          evaluateService(serviceEvaluations.indexOf(serviceEval))
                        }
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Evaluasi
                      </button>
                    )}
                    {serviceEval.summary && (
                      <button
                        onClick={() =>
                          toggleServiceExpansion(serviceEvaluations.indexOf(serviceEval))
                        }
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        {serviceEval.isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {serviceEval.isLoading && (
                  <div className="p-4 border-t">
                    <Spinner label="Mengevaluasi ICON..." />
                  </div>
                )}

                {serviceEval.isExpanded && serviceEval.summary && (
                  <div className="p-4 border-t space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Rangkuman:</h5>
                      <p className="text-sm whitespace-pre-wrap">{serviceEval.summary}</p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Evaluasi:</h5>
                      <p className="text-sm whitespace-pre-wrap">{serviceEval.evaluation}</p>
                    </div>
                    {serviceEval.evalTime && (
                      <p className="text-xs text-gray-500">
                        Waktu proses LLM: {serviceEval.evalTime.toFixed(2)} detik
                      </p>
                    )}

                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      onClick={() => evaluateService(serviceEvaluations.indexOf(serviceEval))}
                    >
                      Ulangi Proses LLM
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default FileUploadSection;