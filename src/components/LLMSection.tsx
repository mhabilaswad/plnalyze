// FILE: src/components/LLMSection.tsx
"use client";

import React, { useMemo } from "react";
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
    serviceEvaluations: ServiceEvaluation[];
    onEvaluateService: (serviceIndex: number) => Promise<void>;
    onToggleServiceExpansion: (serviceIndex: number) => void;
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    sortMode: 'record' | 'durasi';
    onSortModeChange: (mode: 'record' | 'durasi') => void;
}

const LLMSection: React.FC<LLMSectionProps> = ({
    excelData,
    serviceEvaluations,
    onEvaluateService,
    onToggleServiceExpansion,
    searchQuery,
    onSearchQueryChange,
    sortMode,
    onSortModeChange
}) => {
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
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Evaluasi AI</h2>
                <div className="text-xs text-gray-500">
                    {filteredServices.length} ICON dari {excelData?.services.length || 0} total
                </div>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                <input
                    type="text"
                    placeholder="Cari nama ICON..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    className="flex-1 rounded-md border-0 px-3 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${sortMode === 'record'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        onClick={() => onSortModeChange('record')}
                    >
                        Terbanyak
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${sortMode === 'durasi'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                        onClick={() => onSortModeChange('durasi')}
                    >
                        Terlama
                    </button>
                </div>
            </div>

            {/* Service List */}
            <div className="space-y-3">
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
                            tiket: r.tiket_open ?? `#${i + 1}`,
                            rawValue: Number(val) || 0
                        };
                    });
                    
                    // Gunakan nilai maksimal dari durasiList untuk konsistensi
                    const maxDurasi = Math.max(...durasiList.map(d => d.rawValue));
                    const maxDurasiDisplay = isFinite(maxDurasi) && maxDurasi > 0 ? Math.round(maxDurasi) : 0;

                    // Debug log untuk memeriksa data
                    console.log(`Service: ${service.nama_service}`, {
                        durasiList: durasiList.map(d => ({ tiket: d.tiket, value: d.value, raw: d.rawValue })),
                        maxDurasi,
                        maxDurasiDisplay
                    });

                    return (
                        <div
                            key={`${service.nama_service}-${service.sid}`}
                            className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
                        >
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900 text-sm truncate">{service.nama_service}</h3>
                                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                                SID: {service.sid}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-6 text-xs text-gray-600 mb-3">
                                            <span className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                {service.records.length} gangguan
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                Terlama: {maxDurasiDisplay} menit
                                            </span>
                                        </div>

                                        {/* Compact Duration Table */}
                                        <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                                                {durasiList.slice(0, 12).map((d, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white rounded px-2 py-1">
                                                        <span className="text-gray-600 truncate">{d.tiket}</span>
                                                        <span className="font-medium text-gray-900 ml-1">{d.value}m</span>
                                                    </div>
                                                ))}
                                                {durasiList.length > 12 && (
                                                    <div className="flex items-center justify-center text-gray-400 text-xs col-span-full py-1">
                                                        +{durasiList.length - 12} lainnya
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 items-end">
                                        {serviceEval && !serviceEval.summary && !serviceEval.isLoading && (
                                            <button
                                                onClick={() => onEvaluateService(evalIdx)}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md shadow-sm hover:bg-blue-700 transition-colors font-medium"
                                            >
                                                Evaluasi
                                            </button>
                                        )}
                                        {serviceEval && serviceEval.summary && (
                                            <button
                                                onClick={() => onToggleServiceExpansion(evalIdx)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
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
                            </div>
                            {serviceEval && serviceEval.dataContext && serviceEval.isExpanded && (
                                <div className="px-4 pb-3 border-t border-gray-100">
                                    <details className="text-xs text-gray-500">
                                        <summary className="cursor-pointer py-2 hover:text-gray-700">Lihat data context</summary>
                                        <pre className="bg-gray-50 p-3 rounded-md border overflow-x-auto whitespace-pre-wrap mt-2 text-xs">{serviceEval.dataContext}</pre>
                                    </details>
                                </div>
                            )}
                            {serviceEval && serviceEval.isLoading && (
                                <div className="p-4 border-t border-gray-100 bg-gray-50">
                                    <Spinner label="Mengevaluasi ICON..." />
                                </div>
                            )}
                            {serviceEval && serviceEval.isExpanded && serviceEval.summary && (
                                <div className="p-4 border-t border-gray-100 bg-gray-50">
                                    <div className="grid lg:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                                                <span className="text-sm font-medium text-gray-900">Rangkuman</span>
                                            </div>
                                            <div className="text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto bg-white p-3 rounded-md border">
                                                {serviceEval.summary}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                                                <span className="text-sm font-medium text-gray-900">Evaluasi</span>
                                            </div>
                                            <div className="text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto bg-white p-3 rounded-md border">
                                                {serviceEval.evaluation}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                                        {serviceEval.evalTime && (
                                            <span className="text-xs text-gray-500">
                                                Diproses dalam {serviceEval.evalTime.toFixed(1)}s
                                            </span>
                                        )}
                                        <button
                                            className="px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-md text-sm hover:bg-blue-50 transition-colors font-medium"
                                            onClick={() => onEvaluateService(evalIdx)}
                                        >
                                            Evaluasi Ulang
                                        </button>
                                    </div>
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
