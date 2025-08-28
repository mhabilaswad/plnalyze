// FILE: src/components/SerpoEvaluationSection.tsx
"use client";

import React from "react";
import type { InferenceResult } from "@/types";
import SerpoInferenceResults from "./SerpoInferenceResults";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";

export interface SerpoEvaluationSectionProps {
	inference?: InferenceResult;
}

const SerpoEvaluationSection: React.FC<SerpoEvaluationSectionProps> = ({ inference }) => {
	if (!inference) {
		return (
			<div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
				<DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
				<h3 className="text-lg font-semibold text-gray-900 mb-2">Evaluasi SERPO</h3>
				<p className="text-gray-600 mb-4">
					Upload file data gangguan untuk mendapatkan evaluasi kinerja SERPO dari AI.
				</p>
				<p className="text-sm text-gray-500">
					Gunakan tombol <strong>"Evaluasi Serpo"</strong> pada sidebar untuk mengupload file Excel (.xlsx, .xls) atau CSV (.csv) yang berisi data gangguan.
				</p>
			</div>
		);
	}

	return <SerpoInferenceResults inference={inference} />;
};

export default SerpoEvaluationSection;