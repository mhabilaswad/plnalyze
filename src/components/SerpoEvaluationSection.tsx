// FILE: src/components/SerpoEvaluationSection.tsx
"use client";

import React from "react";
import type { InferenceResult } from "@/types";
import SerpoInferenceResults from "./SerpoInferenceResults";

export interface SerpoEvaluationSectionProps {
	inference?: InferenceResult;
}

const SerpoEvaluationSection: React.FC<SerpoEvaluationSectionProps> = ({ inference }) => {
	if (!inference) return null;
	return <SerpoInferenceResults inference={inference} />;
};

export default SerpoEvaluationSection;