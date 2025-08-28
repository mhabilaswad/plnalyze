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
        const matchesSearch = t.nama_tim.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.penyebab_mayoritas.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesKinerja = filterKinerja === "all" || t.kinerja_mayoritas === filterKinerja;
        return matchesSearch && matchesKinerja;
    });

    // Get unique kinerja labels for filter
    const kinerjaLabels = [...new Set(inference.daftar_tim.map(t => t.kinerja_mayoritas))];

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
        <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Hasil Prediksi Kinerja SERPO</h3>
                <button
                    onClick={handleDownloadExcel}
                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Download Excel
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="text-blue-600"><UsersIcon className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm text-gray-500">Total kasus</p>
                            <p className="text-xl font-semibold text-gray-900">{inference.overview.total_kasus}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="text-emerald-600"><ClockIcon className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm text-gray-500">Durasi rata-rata (jam)</p>
                            <p className="text-xl font-semibold text-gray-900">{inference.overview.durasi_rata2_all.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="text-violet-600"><ChartBarIcon className="h-6 w-6" /></div>
                        <div>
                            <p className="text-sm text-gray-500">Label kinerja dominan</p>
                            <p className="text-xl font-semibold text-gray-900">
                                {distEntries.length ? distEntries.slice().sort((a, b) => b[1] - a[1])[0][0] : "-"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Distribution */}
            <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Distribusi Kinerja</h4>
                <div className="space-y-3">
                    {distEntries.length === 0 && (
                        <p className="text-sm text-gray-500">Tidak ada data distribusi.</p>
                    )}
                    {distEntries.map(([label, val], idx) => {
                        const percent = Math.max(0, Math.min(100, Number(val) * 100));
                        const color = palette[idx % palette.length];
                        return (
                            <div key={label}>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span className="font-medium text-gray-800">{label}</span>
                                    <span>{percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                                    <div className="h-2" style={{ width: `${percent}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Teams */}
            <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Ringkasan per Tim</h4>

                {/* Search and Filter */}
                <div className="mb-4 space-y-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cari tim atau penyebab..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <FunnelIcon className="h-4 w-4 text-gray-500" />
                            <select
                                value={filterKinerja}
                                onChange={(e) => setFilterKinerja(e.target.value)}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">Semua Kinerja</option>
                                {kinerjaLabels.map(label => (
                                    <option key={label} value={label}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {searchQuery || filterKinerja !== "all" ? (
                        <div className="text-sm text-gray-600">
                            Menampilkan {filteredTeams.length} dari {inference.daftar_tim.length} tim
                        </div>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTeams.map((t) => (
                        <div key={t.nama_tim} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Tim</p>
                                    <p className="text-base font-semibold text-gray-900">{t.nama_tim}</p>
                                </div>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 ${getBadgeColors(t.kinerja_mayoritas)}`}>
                                    {(() => {
                                        const ArrowIcon = getArrowIcon(t.kinerja_mayoritas);
                                        return <ArrowIcon className={`h-4 w-4 ${getIconColors(t.kinerja_mayoritas)}`} />;
                                    })()}
                                    {t.kinerja_mayoritas}
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-3">
                                <div className="rounded-md bg-gray-50 p-3 text-center">
                                    <p className="text-[11px] text-gray-500">Kasus</p>
                                    <p className="text-sm font-semibold text-gray-900">{t.jumlah_kasus}</p>
                                </div>
                                <div className="rounded-md bg-gray-50 p-3 text-center">
                                    <p className="text-[11px] text-gray-500">Rata-rata (jam)</p>
                                    <p className="text-sm font-semibold text-gray-900">{t.durasi_rata2}</p>
                                </div>
                                <div className="rounded-md bg-gray-50 p-3 text-left col-span-3 md:col-span-1">
                                    <p className="text-[11px] text-gray-500">Penyebab</p>
                                    <div className={`mt-1 text-sm font-semibold text-gray-900 whitespace-pre-line break-words ${expanded[t.nama_tim] ? "" : "max-h-16 overflow-hidden relative"}`}>
                                        <span>{t.penyebab_mayoritas}</span>
                                        {!expanded[t.nama_tim] && (
                                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-50 to-transparent" />
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center gap-3">
                                        <button
                                            onClick={() => setExpanded((prev) => ({ ...prev, [t.nama_tim]: !prev[t.nama_tim] }))}
                                            className="text-xs text-blue-600 hover:underline"
                                            type="button"
                                        >
                                            {expanded[t.nama_tim] ? "Tutup" : "Lihat selengkapnya"}
                                        </button>
                                        <button
                                            onClick={() => navigator.clipboard?.writeText(String(t.penyebab_mayoritas || ""))}
                                            className="text-xs text-gray-500 hover:underline"
                                            type="button"
                                        >
                                            Salin
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Drill-down button */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => setSelectedTim(selectedTim === t.nama_tim ? null : t.nama_tim)}
                                    className="w-full text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                >
                                    {selectedTim === t.nama_tim ? "Tutup detail" : "Lihat detail tim"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Team Detail Panel - Drill-down */}
                {selectedTim && (
                    <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h5 className="text-lg font-semibold text-gray-900">Detail Tim: {selectedTim}</h5>
                            <button
                                onClick={() => setSelectedTim(null)}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                                <h6 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <UsersIcon className="h-5 w-5 text-blue-600" />
                                    Statistik Tim
                                </h6>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Total kasus:</span>
                                        <span className="font-semibold text-gray-900">
                                            {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.jumlah_kasus}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Durasi rata-rata:</span>
                                        <span className="font-semibold text-gray-900">
                                            {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.durasi_rata2} jam
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <span className="text-gray-600">Kinerja mayoritas:</span>
                                        <span className="font-semibold text-gray-900">
                                            {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.kinerja_mayoritas}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-600">Penyebab dominan:</span>
                                        <span className="font-semibold text-gray-900 max-w-xs text-right">
                                            {inference.daftar_tim.find(t => t.nama_tim === selectedTim)?.penyebab_mayoritas}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                                <h6 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <ChartBarIcon className="h-5 w-5 text-purple-600" />
                                    Frekuensi Penyebab
                                </h6>
                                <div className="space-y-2 text-sm">
                                    {(() => {
                                        const tim = inference.daftar_tim.find(t => t.nama_tim === selectedTim);
                                        const frekuensiPenyebab = tim?.frekuensi_penyebab || {};
                                        const sortedPenyebab = Object.entries(frekuensiPenyebab)
                                            .sort(([, a], [, b]) => (b as number) - (a as number));

                                        return sortedPenyebab.length > 0 ? (
                                            sortedPenyebab.map(([penyebab, count], index) => {
                                                const isTop = index === 0;
                                                const percentage = tim ? ((count as number) / tim.jumlah_kasus * 100).toFixed(1) : '0';
                                                const isLong = penyebab.length > 30;
                                                const shortText = isLong ? penyebab.substring(0, 30) + '...' : penyebab;
                                                const expandKey = `penyebab_${selectedTim}_${index}`;
                                                const isExpanded = expanded[expandKey];

                                                return (
                                                    <div key={penyebab} className={`py-3 px-4 rounded-lg ${isTop ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-100'}`}>
                                                        <div className="flex justify-between items-start gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="group relative">
                                                                    <div className={`text-xs leading-relaxed ${isTop ? 'font-medium text-purple-700' : 'text-gray-700'}`}>
                                                                        {isTop && (
                                                                            <span className="inline-flex items-center gap-1 text-purple-600 mb-1">
                                                                                <span className="text-sm">👑</span>
                                                                                <span className="font-semibold">Penyebab Utama</span>
                                                                            </span>
                                                                        )}
                                                                        <div className="break-words">
                                                                            {isLong ? (
                                                                                <span className={isExpanded ? 'whitespace-pre-wrap' : ''}>
                                                                                    {isExpanded ? penyebab : shortText}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="whitespace-pre-wrap">{penyebab}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Tooltip untuk hover pada teks pendek */}
                                                                    {isLong && !isExpanded && (
                                                                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20">
                                                                            <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-sm break-words shadow-xl border border-gray-700">
                                                                                <div className="whitespace-pre-wrap">{penyebab}</div>
                                                                                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Tombol expand/collapse untuk teks panjang */}
                                                                {isLong && (
                                                                    <button
                                                                        onClick={() => setExpanded(prev => ({
                                                                            ...prev,
                                                                            [expandKey]: !prev[expandKey]
                                                                        }))}
                                                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded mt-2 transition-colors"
                                                                    >
                                                                        <span>{isExpanded ? '🔼' : '🔽'}</span>
                                                                        <span>{isExpanded ? 'Sembunyikan' : 'Lihat Lengkap'}</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="text-right flex-shrink-0 ml-3">
                                                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isTop ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                    <span className="font-bold">{count as number}</span>
                                                                    <span>kasus</span>
                                                                </div>
                                                                <div className={`text-xs mt-1 ${isTop ? 'text-purple-600' : 'text-gray-500'}`}>
                                                                    ({percentage}% dari total)
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                                                <ChartBarIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                                <p>Tidak ada data frekuensi penyebab</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg border shadow-sm">
                                <h6 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <ClockIcon className="h-5 w-5 text-emerald-600" />
                                    Status SLA
                                </h6>
                                <div className="space-y-3">
                                    {(() => {
                                        const tim = inference.daftar_tim.find(t => t.nama_tim === selectedTim);
                                        const isCompliant = tim && tim.durasi_rata2 < 4; // 4 jam threshold
                                        return (
                                            <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${isCompliant
                                                ? "bg-green-100 text-green-800 border border-green-200"
                                                : "bg-amber-100 text-amber-800 border border-amber-200"
                                                }`}>
                                                <div className={`w-3 h-3 rounded-full ${isCompliant ? "bg-green-500" : "bg-amber-500"
                                                    }`}></div>
                                                {isCompliant ? "Patuh SLA (<4 jam)" : "Perlu Perbaikan (≥4 jam)"}
                                            </div>
                                        );
                                    })()}

                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-xs text-blue-800">
                                            <strong>Catatan:</strong> Tim dengan durasi rata-rata ≥4 jam perlu evaluasi lebih lanjut untuk memastikan kepatuhan SLA.
                                        </p>
                                    </div>
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