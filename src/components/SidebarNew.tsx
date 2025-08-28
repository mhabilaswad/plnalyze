// FILE: src/components/Sidebar.tsx
"use client";

import React, { useMemo, useRef } from "react";
import {
    DocumentArrowUpIcon,
    ArrowPathIcon,
    ChartBarIcon,
    CpuChipIcon,
    SparklesIcon,
    ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import type { ExcelProcessResult } from "@/types";

export interface SidebarProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
    onFileUpload: (file: File) => Promise<void>;
    excelData: ExcelProcessResult | null;
    isUploading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    activeSection,
    onSectionChange,
    onFileUpload,
    excelData,
    isUploading,
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const menuItems = [
        {
            id: "prediction",
            label: "Prediksi",
            icon: <ChartBarIcon className="h-5 w-5" />,
        },
        {
            id: "serpo",
            label: "Evaluasi Serpo",
            icon: <CpuChipIcon className="h-5 w-5" />,
        },
        {
            id: "llm",
            label: "Evaluasi AI",
            icon: <SparklesIcon className="h-5 w-5" />,
        },
        {
            id: "sentiment",
            label: "Analisis Sentimen",
            icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />,
        },
    ];

    const fileInfo = useMemo(() => {
        if (!excelData) return null;
        return `${excelData.totalRecords} records dari ${excelData.services.length} ICON`;
    }, [excelData]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            try {
                await onFileUpload(selected);
            } catch (error) {
                console.error("Upload error:", error);
            }
        }
        // Reset input to allow re-selecting the same file
        e.target.value = "";
    };

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
            {/* Logo & Header */}
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                            src="/images/logo.png"
                            alt="PLN Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <h1 className="text-lg font-semibold text-gray-900">PLN Analyze</h1>
                </div>
                <p className="text-xs text-gray-500">Dashboard Evaluasi PLN</p>
            </div>

            {/* File Upload Section */}
            <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Upload Data</h3>
                <div className="space-y-2">
                    {/* Excel Processing Upload */}
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? (
                            <>
                                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            <>
                                <DocumentArrowUpIcon className="h-4 w-4" />
                                Pilih File Excel
                            </>
                        )}
                    </button>

                    {fileInfo && (
                        <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                            <div className="font-medium">Data dimuat:</div>
                            <div>{fileInfo}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Navigasi</h3>
                <nav className="space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSectionChange(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeSection === item.id
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                    © 2025 PLN Dashboard
                </p>
            </div>
        </div>
    );
};

export default Sidebar;
