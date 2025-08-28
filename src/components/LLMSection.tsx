// FILE: src/components/LLMSection.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type {
    ServiceEvaluation,
    ExcelProcessResult,
} from "@/types";
import Spinner from "./Spinner";
import {
    ChevronDownIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";

export interface LLMSectionProps {
    excelData: ExcelProcessResult | null;
}

const LLMSection: React.FC<LLMSectionProps> = ({ excelData }) => {
    const [serviceEvaluations, setServiceEvaluations] = useState<
        ServiceEvaluation[]
    >([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortMode, setSortMode] = useState<'record' | 'durasi'>('record');

    // Initialize service evaluations when excelData changes
    useEffect(() => {
        if (excelData?.services) {
            const sortedServices = [...excelData.services].sort(
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
        }
    }, [excelData]);

    async function evaluateService(serviceIndex: number) {
        if (!excelData || serviceIndex >= serviceEvaluations.length) return;

        const sortedServices = [...excelData.services].sort(
            (a, b) => b.records.length - a.records.length
        );
        const service = sortedServices[serviceIndex];

        setServiceEvaluations((prev) =>
            prev.map((s, idx) =>
                idx === serviceIndex ? { ...s, isLoading: true } : s
            )
        );

        const startTime = performance.now();
        try {
            const header = `${service.nama_service} (${service.sid})`;
            const rows = service.records.map((record) => {
                const tiket = record.tiket_open ?? "";
                const durasi = record.durasi_menit ?? "";
                const durasiTotal = record.durasi_total ?? durasi;
                const penyebab = record.penyebab ?? "";
                const action = record.action ?? "";
                const ket = record.keterangan ?? "";
                const stopClock = record.stop_clock ?? "0";

                const fields: string[] = [];
                if (tiket) {
                    fields.push(
                        `Pada ${tiket}, ${penyebab}, Aksi yang dilakukan yaitu ${action}, perbaikan dilakukan selama ${durasi} menit dengan ${stopClock} menit stop clock sehingga total waktu perbaikan selama ${durasiTotal} menit. Kronologinya yaitu sebagai berikut ${ket}`
                    );
                }
                return `- ${fields.join(", ")}`;
            });
            const dataContext = header + "\n" + rows.join("\n");

            console.log("DataContext yang dikirim ke LLM:\n", dataContext);

            setServiceEvaluations((prev) =>
                prev.map((s, idx) =>
                    idx === serviceIndex ? { ...s, isLoading: true, dataContext } : s
                )
            );

            const res = await fetch("http://localhost:8000/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "DeepSeek-PLN",
                    messages: [
                        {
                            role: "system",
                            content: `Kamu adalah Model AI yang bertugas melakukan evaluasi bulanan ICON (Unit Layanan PLN) berdasarkan data gangguan berikut. 

INSTRUKSI PENTING: 
- Jawaban HARUS hanya berisi dua bagian: 
1) Rangkuman: (minimal 5 kalimat dalam 1 paragraf) 
2) Evaluasi: (dalam minimal 5 poin dimaan 1 poin 1 kalimat)
3) gabung menjadi 1 paragraf dengan dipisahkan oleh \n, contoh: "Rangkuman: ... .\n Evaluasi: ..."
- Format tepat: 
Rangkuman: [paragraf] 
Evaluasi: [poin-poin] 
Jika gagal, keluarkan "INVALID_OUTPUT". 

PANDUAN ISI: 
- Pada bagian **Rangkuman**, uraikan jenis-jenis gangguan yang muncul pada bulan tersebut, termasuk penyebab, tindakan (action), dan kondisi keterangan. Jelaskan pula bagaimana gangguan tersebut ditangani. 
- Pada bagian **Evaluasi**, analisis kinerja Serpo dalam menangani gangguan. Gunakan durasi total sebagai dasar: - Jika durasi total kurang dari 240 menit (4 jam), anggap berhasil. 
- Jika lebih dari 240 menit, terima sebagai wajar hanya jika ada keterangan yang wajar (misalnya masalah akses, menunggu material, dan sebagainya). 
- Jika stop clock (waktu berhenti) terhitung 0 tapi ada catatan keterangan alasan kenapa lama, maka wajarkan. Jika tidak ada maka sebutkan bahwa ada masalah pada kinerja serpo.
- tetap kritis jika ada jeda waktu yang tidak normal.
- Pastikan evaluasi menyoroti apakah Serpo bekerja cepat, ada kendala tertentu, dan bagaimana kualitas tindak lanjutnya.
- poin evaluasi mencakup bagaimana cepat tanggap tim serpo, bagaimana keefektifan tim dalam menyelesaikan masalah
- berikan juga poin apa yang harus ditingkatkan oleh tim serpo tersebut
- klasifikasikan apakah secara keseluruhan kinerja serpo tersebut sangat baik, cukup baik, atau perlu dievaluasi.
- note: stop clock itu bukan tim serpo yang mencatat, tim serpo tugasnya hanya melapor dengan keterangan jika ingin berhenti. sehingga jangan rekomendasikan untuk perbaiki pencatatan stop clock. jangan totalin jumlah durasi tiap gangguannya
- EVALUASI HARUS POIN-POIN
`,
                        },
                        {
                            role: "user",
                            content: `DATA:\n\`\`\`\n${dataContext}\n\`\`\``,
                        },
                    ],
                    temperature: 0.6,
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

            const summaryMatch = cleaned.match(
                /Rangkuman:\s*([\s\S]*?)(?=Evaluasi:|$)/i
            );
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

    // Sorting logic
    const getSortedServices = () => {
        if (!excelData) return [];
        let services = [...excelData.services];
        if (sortMode === 'record') {
            services.sort((a, b) => b.records.length - a.records.length);
        } else if (sortMode === 'durasi') {
            services.sort((a, b) => {
                const maxA = Math.max(...a.records.map((r: any) => Number(r.durasi_total) || 0));
                const maxB = Math.max(...b.records.map((r: any) => Number(r.durasi_total) || 0));
                return maxB - maxA;
            });
        }
        return services;
    };

    // filter by search
    const filteredServices = getSortedServices()
        .filter((s) => s.nama_service.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!excelData) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Evaluasi AI</h2>
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                    <p className="text-sm text-gray-600">
                        Upload file Excel terlebih dahulu untuk memulai evaluasi AI.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Evaluasi AI</h2>

            {/* Search & Sort Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center mb-6">
                <input
                    type="text"
                    placeholder="Cari nama ICON..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                    <button
                        className={`px-3 py-2 rounded border text-sm ${sortMode === 'record' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                            }`}
                        onClick={() => setSortMode('record')}
                    >
                        Record Terbanyak
                    </button>
                    <button
                        className={`px-3 py-2 rounded border text-sm ${sortMode === 'durasi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
                            }`}
                        onClick={() => setSortMode('durasi')}
                    >
                        Durasi Terpanjang
                    </button>
                </div>
            </div>

            {/* Service List */}
            <div className="space-y-4">
                {filteredServices.map((service, idx) => {
                    const evalIdx = serviceEvaluations.findIndex((s) => s.sid === service.sid);
                    const serviceEval = evalIdx >= 0 ? serviceEvaluations[evalIdx] : null;
                    const durasiList = service.records.map((r: any, i: number) => {
                        let val = r.durasi_total ?? r.durasi_menit ?? '-';
                        let displayVal = val;
                        if (val !== '-' && val !== undefined && val !== null && !isNaN(Number(val))) {
                            displayVal = Math.round(Number(val)).toString();
                        }
                        return {
                            value: displayVal,
                            tiket: r.tiket_open ?? `#${i + 1}`
                        };
                    });
                    const maxDurasi = Math.max(...service.records.map((r: any) => Number(r.durasi_total) || 0));
                    const maxDurasiDisplay = isFinite(maxDurasi) ? Math.round(maxDurasi) : '-';

                    return (
                        <div
                            key={`${service.nama_service}-${service.sid}`}
                            className="border rounded-lg bg-white shadow-sm"
                        >
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-800 text-base truncate">{service.nama_service}</span>
                                        <span className="text-xs text-gray-400">SID: {service.sid}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="text-xs text-gray-500">{service.records.length} gangguan</span>
                                        <span className="text-xs text-gray-500">Durasi terpanjang: <span className="font-semibold text-gray-700">{maxDurasiDisplay} mnt</span></span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-[220px] text-xs border-separate border-spacing-y-1">
                                            <thead>
                                                <tr className="text-gray-500">
                                                    <th className="text-left font-normal pr-2">Tiket</th>
                                                    <th className="text-left font-normal">Durasi Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {durasiList.map((d, i) => (
                                                    <tr key={i} className="bg-gray-50 hover:bg-gray-100">
                                                        <td className="pr-2 text-gray-700">{d.tiket}</td>
                                                        <td className="text-gray-900 font-medium">{d.value} mnt</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 items-end min-w-[120px]">
                                    {serviceEval && !serviceEval.summary && !serviceEval.isLoading && (
                                        <button
                                            onClick={() => evaluateService(evalIdx)}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded shadow hover:bg-blue-700 transition"
                                        >
                                            Evaluasi
                                        </button>
                                    )}
                                    {serviceEval && serviceEval.summary && (
                                        <button
                                            onClick={() => toggleServiceExpansion(evalIdx)}
                                            className="p-1 text-gray-400 hover:text-blue-600"
                                            title={serviceEval.isExpanded ? 'Sembunyikan' : 'Lihat hasil'}
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
                            {serviceEval && serviceEval.dataContext && serviceEval.isExpanded && (
                                <div className="px-4 pb-2">
                                    <details className="text-xs text-gray-500 select-text">
                                        <summary className="cursor-pointer">Lihat data context</summary>
                                        <pre className="bg-gray-50 p-2 rounded border overflow-x-auto whitespace-pre-wrap mt-1">{serviceEval.dataContext}</pre>
                                    </details>
                                </div>
                            )}
                            {serviceEval && serviceEval.isLoading && (
                                <div className="p-4 border-t bg-gray-50">
                                    <Spinner label="Mengevaluasi ICON..." />
                                </div>
                            )}
                            {serviceEval && serviceEval.isExpanded && serviceEval.summary && (
                                <div className="p-4 border-t bg-gray-50">
                                    <div className="mb-2">
                                        <span className="block text-xs text-gray-500 font-semibold mb-1">Rangkuman</span>
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap border-l-2 border-blue-200 pl-3">{serviceEval.summary}</div>
                                    </div>
                                    <div className="mb-2">
                                        <span className="block text-xs text-gray-500 font-semibold mb-1">Evaluasi</span>
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap border-l-2 border-blue-200 pl-3">{serviceEval.evaluation}</div>
                                    </div>
                                    {serviceEval.evalTime && (
                                        <div className="text-xs text-gray-400 mb-2">Waktu proses LLM: {serviceEval.evalTime.toFixed(2)} detik</div>
                                    )}
                                    <button
                                        className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs hover:bg-blue-100 transition"
                                        onClick={() => evaluateService(evalIdx)}
                                    >
                                        Ulangi Proses LLM
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LLMSection;
