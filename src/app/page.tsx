// FILE: src/app/page.tsx
"use client";

import React, { useCallback, useState } from "react";
import HeaderSection from "@/components/HeaderSection";
import FileUploadSection from "@/components/FileUploadSection";
import SerpoEvaluationSection from "@/components/SerpoEvaluationSection";
import PredictionSection from "@/components/PredictionSection";
import SentimentSection from "@/components/SentimentSection";
import type {
  PredictionPoint,
  SentimentData,
  SerpoData,
  UploadResult,
} from "@/types";
import {
  getMockEvaluationSummary,
  getMockPredictions,
  getMockSentiment,
  getMockSerpoData,
} from "@/lib/mockData";

export default function Page() {
  const [serpo, setSerpo] = useState<SerpoData | undefined>(getMockSerpoData());
  const [predictions, setPredictions] = useState<PredictionPoint[] | undefined>(
    getMockPredictions()
  );
  const [sentiment, setSentiment] = useState<SentimentData | undefined>(
    getMockSentiment()
  );

  // Example handler to connect your real preprocessing pipeline.
  // TODO: Replace simulation with real parsing of .xlsx/.xls/.csv using `xlsx` in a client-safe manner or via an API route.
  const handleUpload = useCallback(
    async (file: File): Promise<UploadResult> => {
      console.info("Received file:", file.name, file.size, file.type);
      // Simulate async preprocessing & AI evaluation
      await new Promise((r) => setTimeout(r, 800));

      // Simulate processed output
      const processedSerpo = getMockSerpoData();
      const processedPred = getMockPredictions();
      const processedSent = getMockSentiment();
      const evaluationSummary = getMockEvaluationSummary();

      // Wire into page state so other sections update
      setSerpo(processedSerpo);
      setPredictions(processedPred);
      setSentiment(processedSent);

      return {
        success: true,
        message: "Upload dan evaluasi berhasil",
        data: {
          serpo: processedSerpo,
          predictions: processedPred,
          sentiment: processedSent,
          evaluationSummary,
        },
      };
    },
    []
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <HeaderSection />
        <FileUploadSection onFileUpload={handleUpload} />
        <SerpoEvaluationSection serpoData={serpo} />
        <PredictionSection predictions={predictions} />
        <SentimentSection sentiment={sentiment} />
      </div>
    </main>
  );
}
