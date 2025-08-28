// FILE: src/components/DashboardLayout.tsx
"use client";

import React, { useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import PredictionSection from "./PredictionSection";
import SerpoEvaluationSection from "./SerpoEvaluationSection";
import LLMSection from "./LLMSection";
import SentimentSection from "./SentimentSection";
import type {
    PredictionPoint,
    SentimentData,
    SerpoData,
    ExcelProcessResult,
} from "@/types";
import {
    getMockPredictions,
    getMockSentiment,
    getMockSerpoData,
} from "@/lib/mockData";

const DashboardLayout: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>("prediction");
    const [excelData, setExcelData] = useState<ExcelProcessResult | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    // Mock data states for demo
    const [serpo] = useState<SerpoData | undefined>(getMockSerpoData());
    const [predictions] = useState<PredictionPoint[] | undefined>(getMockPredictions());
    const [sentiment] = useState<SentimentData | undefined>(getMockSentiment());

    const handleFileUpload = useCallback(async (file: File) => {
        setIsUploading(true);
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
        } catch (error) {
            console.error("Upload error:", error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    }, []);

    const renderContent = () => {
        switch (activeSection) {
            case "prediction":
                return <PredictionSection predictions={predictions} />;
            case "serpo":
                return <SerpoEvaluationSection serpoData={serpo} />;
            case "llm":
                return <LLMSection excelData={excelData} />;
            case "sentiment":
                return <SentimentSection sentiment={sentiment} />;
            default:
                return <PredictionSection predictions={predictions} />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                onFileUpload={handleFileUpload}
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
