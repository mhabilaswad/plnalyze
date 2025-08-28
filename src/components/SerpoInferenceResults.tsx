// FILE: src/components/SerpoInferenceResults.tsx
import React, { useState } from "react";
import type { InferenceResult } from "@/types";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ClockIcon, ChartBarIcon, UsersIcon, MagnifyingGlassIcon, FunnelIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline";

export interface SerpoInferenceResultsProps {
    inference: InferenceResult;
}

function getBadgeColors(label: string) {
    if (!label) return "bg-gray-100 text-gray-800 ring-gray-200";

    const lower = label.toLowerCase().trim();

    // Cek apakah label adalah "Bagus" (hijau)
    if (lower === "bagus" || lower === "baik" || lower === "good" || lower === "excellent") {
        return "bg-green-100 text-green-800 ring-green-200";
    }

    // Cek apakah label adalah "Buruk" (merah)
    if (lower === "buruk" || lower === "bad" || lower === "poor") {
        return "bg-red-100 text-red-800 ring-red-200";
    }

    // Default jika tidak cocok dengan pattern di atas
    return "bg-gray-100 text-gray-800 ring-gray-200";
}

function getIconColors(label: string) {
    if (!label) return "text-gray-600";

    const lower = label.toLowerCase().trim();

    // Hijau untuk kinerja bagus
    if (lower === "bagus" || lower === "baik" || lower === "good" || lower === "excellent") {
        return "text-green-600";
    }

    // Merah untuk kinerja buruk
    if (lower === "buruk" || lower === "bad" || lower === "poor") {
        return "text-red-600";
    }

    return "text-gray-600";
}

function getArrowIcon(label: string) {
    if (!label) return ArrowTrendingUpIcon;

    const lower = label.toLowerCase().trim();

    // Arrow ke bawah untuk kinerja buruk
    if (lower === "buruk" || lower === "bad" || lower === "poor") {
        return ArrowTrendingDownIcon;
    }

    // Arrow ke atas untuk kinerja bagus atau default
    return ArrowTrendingUpIcon;
}


const SerpoInferenceResults: React.FC<SerpoInferenceResultsProps> = ({ inference }) => {
    const distEntries = Object.entries(inference.overview.distribusi_kinerja || {});
    const palette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]; // blue, green, amber, red, violet, cyan
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [selectedTim, setSelectedTim] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterKinerja, setFilterKinerja] = useState<string>("all");

    // Filter teams based on search and performance
    const filteredTeams = inference.daftar_tim.filter(t => {
        const matchesSearch = (t.nama_tim || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.penyebab_mayoritas || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesKinerja = filterKinerja === "all" || (t.kinerja_mayoritas || '') === filterKinerja;
        return matchesSearch && matchesKinerja;
    });

    // Get unique kinerja labels for filter
    const kinerjaLabels = [...new Set(inference.daftar_tim.map(t => t.kinerja_mayoritas || 'Tidak Diketahui').filter(Boolean))];

    // Debug logging
    console.log('Total tim SERPO:', inference.daftar_tim.length);
    console.log('Daftar tim SERPO:', inference.daftar_tim.map(t => t.nama_tim));
    console.log('Kinerja labels:', kinerjaLabels);
    console.log('Filtered tim count:', filteredTeams.length);
    console.log('Search query:', searchQuery);
    console.log('Filter kinerja:', filterKinerja);

    // Download Excel function
    const handleDownloadExcel = async () => {
        try {
            console.log('Starting Excel download...'); // Debug log
            console.log('Inference data:', inference); // Debug log

            const response = await fetch('/api/download-excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inference }),
            });

            console.log('Response status:', response.status); // Debug log
            console.log('Response headers:', Object.fromEntries(response.headers.entries())); // Debug log

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            // Check if response is actually a blob (Excel file)
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType); // Debug log

            if (contentType && contentType.includes('application/json')) {
                // If we get JSON, it's probably an error
                const errorData = await response.json();
                console.error('API returned JSON error:', errorData);
                throw new Error(errorData.error || 'Unknown error from API');
            }

            // Get the blob from response
            const blob = await response.blob();
            console.log('Blob size:', blob.size); // Debug log

            if (blob.size === 0) {
                throw new Error('Received empty file');
            }

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Get filename from response headers or use default
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
                : `Rekap_Kinerja_SERPO_${new Date().toISOString().slice(0, 10)}.xlsx`;

            console.log('Downloading file:', filename); // Debug log

            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log('Download completed successfully'); // Debug log

        } catch (error) {
            console.error('Download error:', error);
            alert(`Gagal mengunduh file Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Hasil Prediksi Kinerja SERPO</h3>
                    <p className="text-sm text-gray-600">Analisis AI untuk evaluasi performa tim SERPO</p>
                </div>
                <button
                    onClick={handleDownloadExcel}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 hover:shadow-xl"
                >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    Download Excel
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                            <UsersIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-600 mb-1">Total Kasus</p>
                            <p className="text-2xl font-bold text-blue-900 truncate">{inference.overview.total_kasus?.toLocaleString()}</p>
                            <p className="text-xs text-blue-700 mt-1">kasus dianalisis</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                            <ClockIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-emerald-600 mb-1">Durasi Rata-rata</p>
                            <p className="text-2xl font-bold text-emerald-900 truncate">{inference.overview.durasi_rata2_all?.toFixed(2)}</p>
                            <p className="text-xs text-emerald-700 mt-1">jam per kasus</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center">
                            <ChartBarIcon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-violet-600 mb-1">Kinerja Dominan</p>
                            <p className="text-lg font-bold text-violet-900 truncate" title={distEntries.length ? distEntries.slice().sort((a, b) => b[1] - a[1])[0][0] : "-"}>
                                {distEntries.length ? distEntries.slice().sort((a, b) => b[1] - a[1])[0][0] : "-"}
                            </p>
                            <p className="text-xs text-violet-700 mt-1">label mayoritas</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribution */}
            <div className="mb-8">
                <div className="mb-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">📊 Distribusi Kinerja</h4>
                    <p className="text-sm text-gray-600">Persentase distribusi label kinerja tim SERPO</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    {distEntries.length === 0 ? (
                        <div className="text-center py-8">
                            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-sm text-gray-500">Tidak ada data distribusi tersedia</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {distEntries.map(([label, val], idx) => {
                                const percent = Math.max(0, Math.min(100, Number(val) * 100));
                                const color = palette[idx % palette.length];
                                return (
                                    <div key={label} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-4 h-4 rounded-full flex-shrink-0" 
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="font-semibold text-gray-900 truncate">{label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900 min-w-0">{percent.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <div 
                                                className="h-3 rounded-full transition-all duration-500 ease-out" 
                                                style={{ 
                                                    width: `${percent}%`, 
                                                    backgroundColor: color,
                                                    boxShadow: `0 0 8px ${color}40`
                                                }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Teams */}
            <div>
                <div className="mb-6">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">👥 Ringkasan per Tim</h4>
                    <p className="text-sm text-gray-600">Analisis detail performa setiap tim SERPO</p>
                </div>

                {/* Search and Filter */}
                <div className="mb-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari nama tim atau penyebab masalah..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200"
                            />
                        </div>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center gap-2">
                                <FunnelIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                <span className="text-sm text-gray-700 font-medium whitespace-nowrap">Filter:</span>
                            </div>
                            <select
                                value={filterKinerja}
                                onChange={(e) => setFilterKinerja(e.target.value)}
                                className="rounded-lg border-2 border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm min-w-0 flex-shrink-0"
                            >
                                <option value="all">Semua Kinerja</option>
                                {kinerjaLabels.map(label => (
                                    <option key={label} value={label}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {(searchQuery || filterKinerja !== "all") && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200">
                            <span className="text-blue-600 font-semibold">{filteredTeams.length}</span>
                            <span>dari</span>
                            <span className="font-semibold">{inference.daftar_tim.length}</span>
                            <span>tim ditemukan</span>
                            {(searchQuery || filterKinerja !== "all") && (
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setFilterKinerja("all");
                                    }}
                                    className="ml-auto text-xs text-gray-500 hover:text-gray-700 hover:underline"
                                >
                                    Reset filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTeams.map((t) => (
                        <div key={t.nama_tim} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-gray-300">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tim SERPO</p>
                                    <h5 className="text-lg font-bold text-gray-900 truncate" title={t.nama_tim}>
                                        {t.nama_tim}
                                    </h5>
                                </div>
                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ring-1 flex-shrink-0 ${getBadgeColors(t.kinerja_mayoritas)}`}>
                                    {(() => {
                                        const ArrowIcon = getArrowIcon(t.kinerja_mayoritas);
                                        return <ArrowIcon className={`h-3.5 w-3.5 ${getIconColors(t.kinerja_mayoritas)}`} />;
                                    })()}
                                    <span className="truncate">{t.kinerja_mayoritas}</span>
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4 border border-blue-200">
                                    <p className="text-xs text-blue-600 font-medium mb-1">Total Kasus</p>
                                    <p className="text-xl font-bold text-blue-900">{t.jumlah_kasus?.toLocaleString()}</p>
                                </div>
                                <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200">
                                    <p className="text-xs text-emerald-600 font-medium mb-1">Rata-rata</p>
                                    <p className="text-xl font-bold text-emerald-900">{t.durasi_rata2}</p>
                                    <p className="text-xs text-emerald-700 mt-0.5">jam</p>
                                </div>
                            </div>

                            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                                <p className="text-xs text-gray-600 font-medium mb-2">Penyebab Dominan</p>
                                <div className={`text-sm text-gray-900 leading-relaxed ${expanded[t.nama_tim] ? "" : "max-h-16 overflow-hidden relative"}`}>
                                    <span className="break-words">{t.penyebab_mayoritas}</span>
                                    {!expanded[t.nama_tim] && (
                                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 to-transparent" />
                                    )}
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <button
                                        onClick={() => setExpanded((prev) => ({ ...prev, [t.nama_tim]: !prev[t.nama_tim] }))}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                                        type="button"
                                    >
                                        {expanded[t.nama_tim] ? "🔼 Sembunyikan" : "🔽 Lihat lengkap"}
                                    </button>
                                    <button
                                        onClick={() => navigator.clipboard?.writeText(String(t.penyebab_mayoritas || ""))}
                                        className="text-xs text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                                        type="button"
                                    >
                                        📋 Salin
                                    </button>
                                </div>
                            </div>

                            {/* Drill-down button */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => setSelectedTim(selectedTim === t.nama_tim ? null : t.nama_tim)}
                                    className="w-full text-center text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-medium py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-blue-200"
                                >
                                    {selectedTim === t.nama_tim ? "🔼 Tutup detail" : "🔍 Lihat detail tim"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Team Detail Panel - Drill-down */}
                {selectedTim && (
                    <div className="mt-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-gray-200 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h5 className="text-2xl font-bold text-gray-900 mb-2">📋 Detail Tim: {selectedTim}</h5>
                                <p className="text-sm text-gray-600">Analisis mendalam performa dan karakteristik tim</p>
                            </div>
                            <button
                                onClick={() => setSelectedTim(null)}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-200 transition-all duration-200"
                                title="Tutup detail"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                            <div className="bg-white p-6 rounded-xl border-2 border-blue-200 shadow-sm hover:shadow-md transition-all duration-300">
                                <h6 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                        <UsersIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <span>Statistik Tim</span>
                                </h6>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                        <span className="text-gray-600 font-medium">Total kasus:</span>
                                        <span className="font-bold text-gray-900 text-lg">
                                            {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.jumlah_kasus?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                        <span className="text-gray-600 font-medium">Durasi rata-rata:</span>
                                        <div className="text-right">
                                            <span className="font-bold text-gray-900 text-lg">
                                                {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.durasi_rata2}
                                            </span>
                                            <span className="text-gray-600 text-sm ml-1">jam</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                        <span className="text-gray-600 font-medium">Kinerja mayoritas:</span>
                                        <span className={`font-bold text-lg px-3 py-1 rounded-full ${getBadgeColors(inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.kinerja_mayoritas || '')}`}>
                                            {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.kinerja_mayoritas}
                                        </span>
                                    </div>
                                    <div className="py-3">
                                        <span className="text-gray-600 font-medium mb-2 block">Penyebab dominan:</span>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                                            <span className="text-gray-900 text-sm leading-relaxed break-words">
                                                {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.penyebab_mayoritas}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border-2 border-purple-200 shadow-sm hover:shadow-md transition-all duration-300">
                                <h6 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                        <ChartBarIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <span>Frekuensi Penyebab</span>
                                </h6>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {(() => {
                                        const tim = inference.daftar_tim.find(t => t.nama_tim === selectedTim);
                                        const frekuensiPenyebab = tim?.frekuensi_penyebab || {};
                                        const sortedPenyebab = Object.entries(frekuensiPenyebab)
                                            .sort(([, a], [, b]) => (b as number) - (a as number));

                                        return sortedPenyebab.length > 0 ? (
                                            sortedPenyebab.map(([penyebab, count], index) => {
                                                const isTop = index === 0;
                                                const percentage = tim ? ((count as number) / tim.jumlah_kasus * 100).toFixed(1) : '0';
                                                const expandKey = `penyebab_${selectedTim}_${index}`;
                                                const isExpanded = expanded[expandKey];

                                                return (
                                                    <div key={`${penyebab}_${index}`} className={`p-4 rounded-lg border-2 transition-all duration-200 ${isTop ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 shadow-md' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex-1 min-w-0">
                                                                {isTop && (
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className="text-lg">👑</span>
                                                                        <span className="text-xs font-bold text-purple-700 bg-purple-200 px-2 py-1 rounded-full">
                                                                            PENYEBAB UTAMA
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className={`text-sm leading-relaxed ${isTop ? 'font-medium text-purple-800' : 'text-gray-700'} ${isExpanded ? 'whitespace-pre-wrap' : 'max-h-16 overflow-hidden relative'}`}>
                                                                    <span className="break-words">{penyebab}</span>
                                                                    {!isExpanded && penyebab.length > 100 && (
                                                                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 to-transparent" />
                                                                    )}
                                                                </div>

                                                                {penyebab.length > 100 && (
                                                                    <button
                                                                        onClick={() => setExpanded(prev => ({
                                                                            ...prev,
                                                                            [expandKey]: !prev[expandKey]
                                                                        }))}
                                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded mt-2 transition-all duration-200"
                                                                    >
                                                                        <span>{isExpanded ? '🔼' : '🔽'}</span>
                                                                        <span>{isExpanded ? 'Sembunyikan' : 'Lihat Lengkap'}</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="text-right flex-shrink-0">
                                                                <div className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold ${isTop ? 'bg-purple-200 text-purple-900' : 'bg-gray-200 text-gray-800'}`}>
                                                                    <span className="text-lg font-black">{count as number}</span>
                                                                    <span className="text-xs">kasus</span>
                                                                </div>
                                                                <div className={`text-xs mt-1 font-medium ${isTop ? 'text-purple-700' : 'text-gray-600'}`}>
                                                                    {percentage}% total
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-gray-500 text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                                <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                                <p className="font-medium text-gray-700">Tidak ada data frekuensi penyebab</p>
                                                <p className="text-sm text-gray-500 mt-1">Data belum tersedia untuk tim ini</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border-2 border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300">
                                <h6 className="font-bold text-gray-900 mb-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <ClockIcon className="h-5 w-5 text-white" />
                                    </div>
                                    <span>Status SLA</span>
                                </h6>
                                <div className="space-y-4">
                                    {(() => {
                                        const tim = inference.daftar_tim.find(t => t.nama_tim === selectedTim);
                                        const durasi = tim?.durasi_rata2 || 0;
                                        const isCompliant = durasi < 4; // 4 jam threshold
                                        const durasiFinal = typeof durasi === 'string' ? parseFloat(durasi) : durasi;
                                        
                                        return (
                                            <>
                                                <div className={`p-4 rounded-xl border-2 transition-all duration-200 ${isCompliant
                                                    ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-sm"
                                                    : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-sm"
                                                }`}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                                            isCompliant ? "bg-green-500" : "bg-amber-500"
                                                        }`}>
                                                            <span className="text-white text-xs font-bold">
                                                                {isCompliant ? "✓" : "!"}
                                                            </span>
                                                        </div>
                                                        <span className={`text-lg font-bold ${
                                                            isCompliant ? "text-green-800" : "text-amber-800"
                                                        }`}>
                                                            {isCompliant ? "Patuh SLA" : "Perlu Perbaikan"}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-700 mb-2">
                                                        <span className="font-medium">Durasi rata-rata: </span>
                                                        <span className={`font-bold ${isCompliant ? 'text-green-700' : 'text-amber-700'}`}>
                                                            {durasiFinal.toFixed(2)} jam
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        Target SLA: &lt; 4 jam per kasus
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            <span className="text-white text-xs font-bold">i</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-blue-800 mb-1">
                                                                📋 Catatan Evaluasi
                                                            </p>
                                                            <p className="text-xs text-blue-700 leading-relaxed">
                                                                Tim dengan durasi rata-rata ≥4 jam memerlukan evaluasi lebih lanjut untuk mengidentifikasi bottleneck dan meningkatkan efisiensi penanganan kasus.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default SerpoInferenceResults;