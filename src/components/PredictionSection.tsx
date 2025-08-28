// FILE: src/components/PredictionSection.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ForecastAPIResponse, ForecastPoint, HistoryPoint, PredictionPoint } from "@/types";
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
import { ArrowPathIcon } from "@heroicons/react/24/outline";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export interface PredictionSectionProps {
	// Props are now optional since the component handles its own state
}

const PredictionSection: React.FC<PredictionSectionProps> = () => {
	const data = getMockPredictions();

	// selection and local forecast state
	const [selectedService, setSelectedService] = useState<string>("");
	const [isFetching, setIsFetching] = useState<boolean>(false);
	const [isTraining, setIsTraining] = useState<boolean>(false);
	const [errorMsg, setErrorMsg] = useState<string>("");
	const [trainMsg, setTrainMsg] = useState<string>("");
	const [lastTrainedAt, setLastTrainedAt] = useState<string | null>(null);
	const [lastDataDate, setLastDataDate] = useState<string | null>(null);
	const [lastGlobalDate, setLastGlobalDate] = useState<string | null>(null);
	const [maeScore, setMaeScore] = useState<number | null>(null);
	const [localForecastData, setLocalForecastData] = useState<ForecastAPIResponse | null>(null);
	const [modelServices, setModelServices] = useState<string[]>([]);
	const [modelsMeta, setModelsMeta] = useState<Record<string, { mae?: number | null; last_trained_at?: string | null; last_data_date?: string | null }>>({});
	const [query, setQuery] = useState<string>("");
	const [historyVisible, setHistoryVisible] = useState<boolean>(true);
	const chartRef = useRef<any>(null);

	// Internal state for services and forecast data
	const [services, setServices] = useState<string[]>([]);
	const [forecastData, setForecastData] = useState<ForecastAPIResponse | null>(null);

	function formatISO(dateInput: string | Date | null | undefined): string {
		if (!dateInput) return "-";
		const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
		if (!d || isNaN(d.getTime())) return "-";
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	// default to first detected service from uploaded data; else fetch from backend Excel
	useEffect(() => {
		(async () => {
			if (services && services.length > 0) {
				if (!selectedService) setSelectedService(services[0]);
				return;
			}
			try {
				// Fetch models to get service list and metadata
				const resModels = await fetch("/api/models");
				const modelsJson = await resModels.json();

				if (modelsJson?.success) {
					// Sort service names alphabetically
					const modelNames = (modelsJson.models || [])
						.map((m: any) => String(m.service))
						.sort((a: string, b: string) => a.localeCompare(b));

					const metaMap: Record<string, { mae?: number | null; last_trained_at?: string | null; last_data_date?: string | null }> = {};

					// Get metadata and find latest data date
					let latestDate: string | null = null;
					(modelsJson.models || []).forEach((m: any) => {
						metaMap[String(m.service)] = {
							mae: m.mae ?? null,
							last_trained_at: m.last_trained_at ?? null,
							last_data_date: m.last_data_date ?? null,
						};
						// Track the latest date across all models
						if (m.last_data_date && (!latestDate || m.last_data_date > latestDate)) {
							latestDate = m.last_data_date;
						}
					});

					setModelsMeta(metaMap);
					setModelServices(modelNames);
					if (!selectedService && modelNames.length) setSelectedService(modelNames[0]);
					if (latestDate) setLastGlobalDate(latestDate);
				}
			} catch (error) {
				console.error('Failed to fetch models:', error);
			}
		})();
	}, [services, selectedService]);

	useEffect(() => {
		if (forecastData && !localForecastData) {
			setLocalForecastData(forecastData);
			if (forecastData.service) setSelectedService(forecastData.service);
		}
	}, [forecastData, localForecastData]);

	useEffect(() => {
		if (selectedService && modelsMeta[selectedService]) {
			setMaeScore(modelsMeta[selectedService].mae ?? null);
			setLastTrainedAt(modelsMeta[selectedService].last_trained_at ?? null);
			setLastDataDate(modelsMeta[selectedService].last_data_date ?? null);
		}
	}, [selectedService, modelsMeta]);

	async function handleForecastClick() {
		if (!selectedService) return;
		setIsFetching(true);
		setErrorMsg("");
		try {
			const params = new URLSearchParams({ service: selectedService });
			const res = await fetch(`/api/forecast?${params.toString()}`);
			const json = await res.json();
			if (!res.ok || json?.success === false) {
				const msg = json?.error?.detail?.message || json?.error?.message || json?.error || `HTTP ${res.status}`;
				throw new Error(String(msg));
			}
			setLocalForecastData(json?.data ?? null);
			setMaeScore(json?.data?.mae ?? null);
			setLastTrainedAt(json?.data?.last_trained_at ?? null);
			setLastDataDate(json?.data?.last_data_date ?? null);
		} catch (e: any) {
			setErrorMsg(e?.message || "Gagal mengambil forecast");
		} finally {
			setIsFetching(false);
		}
	}

	async function handleTrainClick() {
		if (!selectedService) return;
		setIsTraining(true);
		setErrorMsg("");
		setTrainMsg("");
		try {
			// Step 1: let user upload new excel files (optional)
			const fileInput = document.createElement('input');
			fileInput.type = 'file';
			fileInput.multiple = true;
			fileInput.accept = '.xlsx';
			const choose = await new Promise<FileList | null>((resolve) => {
				fileInput.onchange = () => resolve(fileInput.files);
				fileInput.click();
				setTimeout(() => resolve(null), 30000); // safety timeout
			});
			if (choose && choose.length > 0) {
				const fd = new FormData();
				Array.from(choose).forEach((f) => fd.append('files', f, f.name));
				const upRes = await fetch(`/api/dataset/upload`, { method: 'POST', body: fd });
				const upJson = await upRes.json().catch(() => ({} as any));
				if (upRes.ok && upJson?.success && upJson?.data) {
					const d = upJson.data;
					if (d.updated) {
						setTrainMsg(`Dataset diperbarui: +${d.added_rows ?? 0} baris · Tanggal terakhir: ${formatISO(d.last_date)}`);
						if (d.last_date) setLastGlobalDate(String(d.last_date));
					} else {
						setTrainMsg(`Dataset tidak diperbarui (data tidak lebih baru). Tanggal terakhir: ${formatISO(d.last_date)}`);
					}
				} else if (!upRes.ok) {
					const msg = upJson?.error?.message || 'Gagal mengunggah dataset';
					setTrainMsg(msg);
				}
			}
			// Step 2: trigger training for selected service
			const res = await fetch(`/api/forecast/train`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ service: selectedService }),
			});
			const json = await res.json();
			if (!res.ok || json?.success === false) {
				const msg = json?.error?.detail?.message || json?.error?.message || json?.error || `HTTP ${res.status}`;
				throw new Error(String(msg));
			}
			setMaeScore(json?.data?.mae ?? null);
			setLastTrainedAt(json?.data?.last_trained_at ?? null);
			setLastDataDate(json?.data?.last_data_date ?? null);
			setTrainMsg((prev) => prev ? `${prev} · Pelatihan selesai` : 'Pelatihan selesai');
		} catch (e: any) {
			setErrorMsg(e?.message || "Gagal melatih model");
		} finally {
			setIsTraining(false);
		}
	}

	const activeForecast = localForecastData ?? forecastData ?? null;

	useEffect(() => {
		if (activeForecast) {
			setMaeScore(activeForecast.mae ?? null);
			setLastTrainedAt(activeForecast.last_trained_at ?? null);
			setLastDataDate(activeForecast.last_data_date ?? null);
		}
	}, [activeForecast]);

	const hasData = (data && data.length > 0) || !!(activeForecast && activeForecast.forecast?.length);

	// Sync historyVisible with actual history presence
	useEffect(() => {
		const hasHistory = !!(activeForecast && activeForecast.history && activeForecast.history.length > 0);
		setHistoryVisible(hasHistory);
	}, [activeForecast]);

	const chartFromForecast = useMemo(() => {
		if (!activeForecast?.forecast?.length) return null;

		const forecast = activeForecast.forecast as ForecastPoint[];
		const history = (activeForecast.history || []) as HistoryPoint[];

		const historyLabels = history.map((h) => h.ds);
		const historyValues = history.map((h) => h.y);
		const forecastLabels = forecast.map((f) => f.week_label || f.ds);
		const forecastValues = forecast.map((f) => f.yhat);

		const showHistory = historyVisible && history.length > 0;
		const labels = showHistory ? [...historyLabels, ...forecastLabels] : forecastLabels;
		const historySeries = showHistory ? historyValues : new Array(labels.length).fill(null);
		const forecastSeries = showHistory
			? [...(history.length ? new Array(history.length).fill(null) : []), ...forecastValues]
			: forecastValues;

		return {
			labels,
			datasets: [
				{
					label: "History (menit)",
					data: historySeries,
					borderColor: "rgb(107,114,128)",
					backgroundColor: "rgba(107,114,128,0.25)",
					pointRadius: 2,
					borderWidth: 2,
					tension: 0.2,
					fill: false,
					hidden: !showHistory,
				},
				{
					label: `Forecast ${activeForecast.service ? `– ${activeForecast.service}` : ""}`.trim(),
					data: forecastSeries,
					borderColor: "rgb(59,130,246)",
					backgroundColor: "rgba(59,130,246,0.25)",
					pointRadius: historyVisible ? 3 : 4,
					borderWidth: historyVisible ? 2 : 3,
					tension: 0.3,
					fill: true,
					spanGaps: true,
				},
			],
		};
	}, [activeForecast, historyVisible]);

	const chartData = useMemo(() => {
		if (chartFromForecast) return chartFromForecast;
		return {
			labels: data.map((d) => d.label),
			datasets: [
				{
					label: "Prediksi durasi penanganan (menit)",
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
	}, [data, chartFromForecast]);

	const options = useMemo(
		() => ({
			responsive: true,
			plugins: {
				legend: {
					position: "top" as const,
					onClick: (_e: any, legendItem: any) => {
						const label: string = legendItem?.text || "";
						if (label.toLowerCase().startsWith("history")) {
							setHistoryVisible((prev) => !prev);
						}
					},
				},
				title: { display: false, text: "" },
				tooltip: { mode: "index" as const, intersect: false },
			},
			interaction: { mode: "index" as const, intersect: false },
			layout: { padding: { bottom: 10 } },
			scales: {
				x: { ticks: { autoSkip: false, minRotation: 45, maxRotation: 60 } },
				y: { ticks: { precision: 0 } },
			},
		}),
		[]
	);

	const { maxValue, maxLabel, avg } = useMemo(() => {
		if (chartFromForecast) {
			// Get forecast dataset (last dataset)
			const forecastDataset = chartFromForecast.datasets?.[chartFromForecast.datasets.length - 1];
			if (!forecastDataset?.data) return { maxValue: 0, maxLabel: "", avg: 0 };

			// Filter out null values and get only forecast values
			const forecastValues = (forecastDataset.data as any[]).filter((v) => typeof v === "number");
			if (!forecastValues?.length) return { maxValue: 0, maxLabel: "", avg: 0 };

			const maxValue = Math.max(...(forecastValues as number[]));

			// Find the index of max value in the original dataset array
			const maxIdx = (forecastDataset.data as any[]).findIndex((v) => v === maxValue);

			// Get the corresponding label from the labels array
			const maxLabel = chartFromForecast.labels?.[maxIdx] || "";
			const avg = (forecastValues as number[]).reduce((a, b) => a + b, 0) / (forecastValues as number[]).length;
			return { maxValue, maxLabel, avg };
		}
		if (!hasData) return { maxValue: 0, maxLabel: "", avg: 0 };
		const values = data.map((d) => d.value);
		const maxValue = Math.max(...values);
		const maxIdx = values.indexOf(maxValue);
		const maxLabel = data[maxIdx]?.label ?? "";
		const avg = values.reduce((a, b) => a + b, 0) / values.length;
		return { maxValue, maxLabel, avg };
	}, [data, hasData, chartFromForecast]);

	return (
		<section className="bg-white rounded-xl shadow-sm p-6">
			<div className="mb-4">
				<h2 className="text-lg font-medium text-gray-900">Prediksi rata-rata waktu penanganan mingguan</h2>
				<p className="text-sm text-gray-500">
					{activeForecast?.service
						? `ICON: ${activeForecast.service}${activeForecast.tim_serpo ? ` · ${activeForecast.tim_serpo}` : ""}`
						: "Grafik prediksi berbasis placeholder."}
				</p>
			</div>

			<div className="mb-4 grid grid-cols-1 gap-3">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">ICON</label>
					<div className="flex items-center gap-2 mb-2">
						<input
							type="text"
							placeholder="Cari ICON..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="w-full rounded-md border px-3 py-2 text-sm"
						/>
						<button
							type="button"
							onClick={() => { setQuery(""); setSelectedService(""); }}
							className="px-2 py-2 text-xs rounded border text-gray-600 hover:bg-gray-50"
						>
							Clear
						</button>
					</div>
					<select
						className="w-full rounded-md border px-3 py-2 text-sm"
						value={selectedService}
						onChange={(e) => setSelectedService(e.target.value)}
					>
						{(services && services.length ? services : modelServices)
							.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
							.map((s) => (
								<option key={s} value={s}>{s}</option>
							))}
					</select>
				</div>
				<div className="flex gap-2">
					<button
						onClick={handleTrainClick}
						disabled={!selectedService || isTraining}
						className="px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50"
					>
						{isTraining ? (
							<span className="inline-flex items-center gap-1"><ArrowPathIcon className="h-4 w-4 animate-spin" /> Latih...</span>
						) : (
							"Latih"
						)}
					</button>
					<button
						onClick={handleForecastClick}
						disabled={!selectedService || isFetching}
						className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
					>
						{isFetching ? (
							<span className="inline-flex items-center gap-1"><ArrowPathIcon className="h-4 w-4 animate-spin" /> Forecast...</span>
						) : (
							"Forecast"
						)}
					</button>
				</div>
			</div>

			{errorMsg && (
				<p className="text-sm text-red-600 mb-3">{errorMsg}</p>
			)}
			{!errorMsg && trainMsg && (
				<p className="text-sm text-gray-700 mb-3">{trainMsg}</p>
			)}

			{!hasData ? (
				<div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
					<p className="text-sm text-gray-600">
						Belum ada prediksi — upload file untuk jalankan evaluasi AI.
					</p>
				</div>
			) : (
				<>
					<div className="bg-white">
						<Line ref={chartRef} data={chartData} options={options} />
					</div>

					<div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-sm text-gray-500">Prediksi durasi tertinggi</p>
							<p className="text-xl font-semibold text-gray-900">
								{maxValue.toFixed(1)} menit
								<span className="ml-2 text-sm text-gray-600">({maxLabel})</span>
							</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-sm text-gray-500">Rata-rata prediksi</p>
							<p className="text-xl font-semibold text-gray-900">{avg.toFixed(1)} menit</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-sm text-gray-500">MAE model</p>
							<p className="text-xl font-semibold text-gray-900">{maeScore != null ? maeScore.toFixed(2) : "-"}</p>
						</div>
						<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
							<p className="text-sm text-gray-500">Tanggal data terakhir</p>
							<p className="text-sm font-medium text-gray-900">{(lastGlobalDate || lastDataDate) ? new Date((lastGlobalDate || lastDataDate) as string).toLocaleDateString() : "-"}</p>
						</div>
					</div>
				</>
			)}
		</section>
	);
};

export default PredictionSection;