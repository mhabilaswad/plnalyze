// FILE: src/components/DashboardLayout.tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import Sidebar from "./Sidebar";
import PredictionSection from "./PredictionSection";
import SerpoEvaluationSection from "./SerpoEvaluationSection";
import LLMSection from "./LLMSection";
import SentimentSection from "./SentimentSection";
import type {
    ExcelProcessResult,
    ServiceEvaluation,
    InferenceResult,
} from "@/types";

export interface DashboardLayoutProps {
    onFileUpload?: (file: File) => Promise<void>;
    excelData?: any;
    inference?: InferenceResult;
    isUploading?: boolean;
    activeSection?: string;
    onSectionChange?: (section: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    onFileUpload,
    excelData: externalExcelData,
    inference,
    isUploading: externalIsUploading = false,
    activeSection: externalActiveSection,
    onSectionChange: externalOnSectionChange
}) => {
    const [internalActiveSection, setInternalActiveSection] = useState<string>("prediction");
    const [internalExcelData, setInternalExcelData] = useState<ExcelProcessResult | null>(null);
    const [internalIsUploading, setInternalIsUploading] = useState<boolean>(false);

    // Use external state if provided, otherwise use internal
    const activeSection = externalActiveSection ?? internalActiveSection;
    const setActiveSection = externalOnSectionChange ?? setInternalActiveSection;
    const excelData = externalExcelData ?? internalExcelData;
    const isUploading = externalIsUploading || internalIsUploading;

    // LLM Section state only
    const [serviceEvaluations, setServiceEvaluations] = useState<ServiceEvaluation[]>([]);
    const [llmSearchQuery, setLlmSearchQuery] = useState<string>("");
    const [llmSortMode, setLlmSortMode] = useState<'record' | 'durasi'>('record');

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

    // Internal file upload handler (fallback jika tidak ada external handler)
    const handleInternalFileUpload = useCallback(async (file: File) => {
        setInternalIsUploading(true);
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

            setInternalExcelData(result.data);
        } catch (error) {
            console.error("Upload error:", error);
            throw error;
        } finally {
            setInternalIsUploading(false);
        }
    }, []); const handleEvaluateService = useCallback(async (serviceIndex: number) => {
        if (!excelData || serviceIndex >= serviceEvaluations.length) return;

        // Cari service berdasarkan SID dari serviceEvaluations, bukan dari sorted services
        const targetServiceEval = serviceEvaluations[serviceIndex];
        const service = excelData.services.find((s: any) => s.sid === targetServiceEval.sid);

        if (!service) {
            console.error('Service not found for SID:', targetServiceEval.sid);
            return;
        }

        setServiceEvaluations((prev) =>
            prev.map((s, idx) =>
                idx === serviceIndex ? { ...s, isLoading: true } : s
            )
        );

        const startTime = performance.now();
        try {
            const header = `${service.nama_service} (${service.sid})`;
            const rows = service.records.map((record: any) => {
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

            const res = await fetch("http://localhost:8001/v1/chat/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "DeepSeek-PLN",
                    messages: [
                        {
                            role: "system",
                            content: `Anda adalah evaluator kinerja tim Serpo (Service Point Officer) PLN. Analisis data gangguan HANYA berdasarkan informasi yang tersedia dalam data.

FORMAT WAJIB:
Rangkuman: [paragraf tunggal 3-5 kalimat]

Evaluasi:
- [poin kinerja 1]
- [poin kinerja 2] 
- [poin kinerja 3]
- [poin kinerja 4]
- [poin kinerja 5]

PANDUAN RANGKUMAN:
- Sebutkan HANYA jenis gangguan, penyebab, dan tindakan yang tercantum dalam data
- Jangan menambahkan informasi yang tidak ada dalam data
- Fokus pada fakta: berapa gangguan, durasi rata-rata, jenis masalah utama

PANDUAN EVALUASI (5 POIN KINERJA):
- Kecepatan Penanganan: Analisis durasi_total vs standar 240 menit (4 jam)
- Efektivitas Tindakan: Apakah action yang dilakukan sesuai dengan penyebab
- Kualitas Pelaporan: Kelengkapan keterangan dan dokumentasi
- Pengelolaan Waktu: Penggunaan stop_clock dan justifikasi waktu
- Kesimpulan Kinerja: Klasifikasi "Sangat Baik", "Baik", atau "Perlu Perbaikan"

ATURAN PENTING:
- GUNAKAN format poin dengan tanda "-" bukan angka "1. 2. 3."
- JANGAN menambah informasi di luar data yang diberikan
- JANGAN menyebutkan hal yang tidak tercantum dalam data
- Durasi > 240 menit wajar HANYA jika ada keterangan yang jelas
- Stop clock bukan tanggung jawab Serpo untuk mencatat
- Setiap poin evaluasi maksimal 1 kalimat
- Fokus pada fakta dalam data, bukan asumsi

Jika data tidak lengkap, sebutkan "Data tidak tersedia" daripada membuat asumsi.`,
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
    }, [excelData, serviceEvaluations]);

    const handleToggleServiceExpansion = useCallback((serviceIndex: number) => {
        setServiceEvaluations((prev) =>
            prev.map((serviceEval, idx) =>
                idx === serviceIndex
                    ? { ...serviceEval, isExpanded: !serviceEval.isExpanded }
                    : serviceEval
            )
        );
    }, []);

    const renderContent = () => {
        switch (activeSection) {
            case "prediction":
                return <PredictionSection />;
            case "serpo":
                return <SerpoEvaluationSection inference={inference} />;
            case "llm":
                return (
                    <LLMSection
                        excelData={excelData}
                        serviceEvaluations={serviceEvaluations}
                        onEvaluateService={handleEvaluateService}
                        onToggleServiceExpansion={handleToggleServiceExpansion}
                        searchQuery={llmSearchQuery}
                        onSearchQueryChange={setLlmSearchQuery}
                        sortMode={llmSortMode}
                        onSortModeChange={setLlmSortMode}
                    />
                );
            case "sentiment":
                return <SentimentSection />;
            default:
                return <PredictionSection />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onFileUpload={onFileUpload || handleInternalFileUpload}
                excelData={excelData}
                isUploading={isUploading}
            />

            <main className="flex-1 overflow-auto">
                <div className="p-6">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
