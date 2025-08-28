// FILE: src/app/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import type { InferenceResult } from "@/types";

export default function Page() {
  const [inference, setInference] = useState<InferenceResult | undefined>(undefined);
  const [excelData, setExcelData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string>("prediction");

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      // Process 1: Excel processing untuk LLM section
      const excelFormData = new FormData();
      excelFormData.append("file", file);

      const excelResponse = await fetch("/api/process-excel", {
        method: "POST",
        body: excelFormData,
      });

      const excelResult = await excelResponse.json();
      if (excelResponse.ok && excelResult?.success) {
        setExcelData(excelResult.data);
      }

      // Process 2: SERPO evaluation
      const serpoFormData = new FormData();
      serpoFormData.append("file_gangguan", file);

      const serpoResponse = await fetch("/api/predict-serpo", {
        method: "POST",
        body: serpoFormData,
      });

      const serpoResult = await serpoResponse.json();
      console.log("SERPO API Response:", serpoResult); // Debug log
      console.log("Detail kasus sample:", serpoResult.detail_kasus?.slice(0, 2)); // Debug log untuk sample detail kasus

      if (serpoResponse.ok && serpoResult?.success) {
        // Backend returns data directly with keys: overview, daftar_tim, detail_kasus
        if (serpoResult.overview || serpoResult.daftar_tim || serpoResult.detail_kasus) {
          const inferenceData = {
            overview: serpoResult.overview,
            daftar_tim: serpoResult.daftar_tim,
            detail_kasus: serpoResult.detail_kasus,
            // Also set ringkasan from overview for compatibility
            ringkasan: serpoResult.overview ? {
              jumlah_kasus: serpoResult.overview.total_kasus,
              jumlah_tim: serpoResult.overview.jumlah_tim,
              durasi_rata2_global: serpoResult.overview.durasi_rata2_all,
              tim_terbaik: serpoResult.overview.tim_terbaik || '',
              tim_terburuk: serpoResult.overview.tim_terburuk || '',
              penyebab_dominan: serpoResult.overview.penyebab_dominan || '',
              kategori_dominan: serpoResult.overview.kategori_dominan || '',
              kinerja_mayoritas_global: serpoResult.overview.kinerja_mayoritas_global || ''
            } : undefined
          };
          setInference(inferenceData as InferenceResult);
        }
      }

      // If both processes successful, optionally switch to serpo tab
      if (serpoResponse.ok && serpoResult?.success && (serpoResult.overview || serpoResult.daftar_tim)) {
        setActiveSection("serpo");
      }

    } catch (error) {
      console.error("File upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return (
    <DashboardLayout
      onFileUpload={handleFileUpload}
      excelData={excelData}
      inference={inference}
      isUploading={isUploading}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    />
  );
}
