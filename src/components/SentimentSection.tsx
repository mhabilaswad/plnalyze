// FILE: src/components/SentimentSection.tsx
"use client";

import React, { useMemo } from "react";
import type { SentimentData } from "@/types";
import { getMockSentiment } from "@/lib/mockData";
import clsx from "clsx";

export interface SentimentSectionProps {
	sentiment?: SentimentData;
}

function getBadge(overallScore: number) {
	if (overallScore >= 0.6) return { label: "Positive", color: "bg-green-100 text-green-700 ring-green-200" };
	if (overallScore >= 0.4) return { label: "Neutral", color: "bg-yellow-100 text-yellow-700 ring-yellow-200" };
	return { label: "Negative", color: "bg-red-100 text-red-700 ring-red-200" };
}

const SentimentSection: React.FC<SentimentSectionProps> = ({ sentiment }) => {
	const data = sentiment ?? getMockSentiment();
	const badge = useMemo(() => getBadge(data.overallScore), [data.overallScore]);
	const percent = Math.round(data.overallScore * 100);

	return (
		<section className="bg-white rounded-xl shadow-sm p-6">
			<div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2 className="text-lg font-medium text-gray-900">Analisis Sentimen terhadap PLN</h2>
					<p className="text-sm text-gray-500">Rangkuman persepsi dari komentar pelanggan.</p>
				</div>
				<div
					className={clsx(
						"inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ring-1",
						badge.color
					)}
					aria-label={`Overall sentiment ${badge.label} dengan skor ${percent} persen`}
				>
					<span>{badge.label}</span>
					<span className="text-gray-500">({percent}%)</span>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
					<p className="text-sm font-medium text-gray-900 mb-2">Positive</p>
					<ul className="grid gap-2">
						{data.positive.slice(0, 5).map((t, idx) => (
							<li key={idx} className="text-sm text-gray-700">
								“{t}”
							</li>
						))}
					</ul>
				</div>
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
					<p className="text-sm font-medium text-gray-900 mb-2">Negative</p>
					<ul className="grid gap-2">
						{data.negative.slice(0, 5).map((t, idx) => (
							<li key={idx} className="text-sm text-gray-700">
								“{t}”
							</li>
						))}
					</ul>
				</div>
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
					<p className="text-sm font-medium text-gray-900 mb-2">Neutral</p>
					<ul className="grid gap-2">
						{data.neutral.slice(0, 5).map((t, idx) => (
							<li key={idx} className="text-sm text-gray-700">
								“{t}”
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	);
};

export default SentimentSection;