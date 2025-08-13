// FILE: src/components/PredictionSection.tsx
"use client";

import React, { useMemo } from "react";
import type { PredictionPoint } from "@/types";
import { getMockPredictions } from "@/lib/mockData";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export interface PredictionSectionProps {
	predictions?: PredictionPoint[];
}

const PredictionSection: React.FC<PredictionSectionProps> = ({ predictions }) => {
	const data = predictions ?? getMockPredictions();

	const hasData = data && data.length > 0;

	const chartData = useMemo(() => {
		return {
			labels: data.map((d) => d.label),
			datasets: [
				{
					label: "Prediksi durasi penanganan (jam)",
					data: data.map((d) => d.value),
					borderColor: "rgb(59,130,246)",
					backgroundColor: "rgba(59,130,246,0.25)",
					pointRadius: 3,
					borderWidth: 2,
					tension: 0.3,
					fill: true,
				},
			],
		};
	}, [data]);

	const options = useMemo(
		() => ({
			responsive: true,
			plugins: {
				legend: { position: "top" as const },
				title: { display: false, text: "" },
				tooltip: { mode: "index" as const, intersect: false },
			},
			interaction: { mode: "index" as const, intersect: false },
			scales: {
				y: { ticks: { precision: 0 } },
			},
		}),
		[]
	);

	const { maxValue, maxLabel, avg } = useMemo(() => {
		if (!hasData) return { maxValue: 0, maxLabel: "", avg: 0 };
		const values = data.map((d) => d.value);
		const maxValue = Math.max(...values);
		const maxIdx = values.indexOf(maxValue);
		const maxLabel = data[maxIdx]?.label ?? "";
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return { maxValue, maxLabel, avg };
	}, [data, hasData]);

	return (
		<section className="bg-white rounded-xl shadow-sm p-6">
			<div className="mb-4">
				<h2 className="text-lg font-medium text-gray-900">Prediksi waktu penanganan</h2>
				<p className="text-sm text-gray-500">Grafik prediksi berbasis placeholder.</p>
			</div>

			{!hasData ? (
				<div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
					<p className="text-sm text-gray-600">
						Belum ada prediksi — upload file untuk jalankan evaluasi AI.
					</p>
				</div>
			) : (
				<>
					<div className="bg-white">
						<Line data={chartData} options={options} />
					</div>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-sm text-gray-500">Prediksi durasi tertinggi</p>
							<p className="text-xl font-semibold text-gray-900">
								{maxValue.toFixed(1)} jam
								<span className="ml-2 text-sm text-gray-600">({maxLabel})</span>
							</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-sm text-gray-500">Rata-rata prediksi</p>
							<p className="text-xl font-semibold text-gray-900">{avg.toFixed(1)} jam</p>
						</div>
					</div>
				</>
			)}
		</section>
	);
};

export default PredictionSection;