// FILE: src/components/PredictionSection.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ForecastAPIResponse, ForecastPoint, HistoryPoint } from "@/types";
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
import { ArrowPathIcon, PlayIcon, PauseIcon } from "@heroicons/react/24/outline";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export interface PredictionSectionProps {
	// Props are now optional since the component handles its own state
}

const PredictionSection: React.FC<PredictionSectionProps> = () => {
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

	// Auto-cycling state for demo mode
	const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
	const [currentServiceIndex, setCurrentServiceIndex] = useState<number>(0);
	const [autoModeInterval, setAutoModeInterval] = useState<NodeJS.Timeout | null>(null);
	const [fadeClass, setFadeClass] = useState<string>("opacity-100");
	const [nextUpdateTime, setNextUpdateTime] = useState<Date | null>(null);

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
					if (!selectedService && modelNames.length) {
						setSelectedService(modelNames[0]);
						// Auto-load first forecast in demo mode
						if (isAutoMode && modelNames.length > 0) {
							loadForecastForService(modelNames[0]);
						}
					}
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

	// Auto-cycle through services in demo mode
	useEffect(() => {
		if (isAutoMode && modelServices.length > 0) {
			const interval = setInterval(() => {
				// Fade out
				setFadeClass("opacity-0");
				setTimeout(() => {
					setCurrentServiceIndex((prevIndex) => {
						const nextIndex = (prevIndex + 1) % modelServices.length;
						const nextService = modelServices[nextIndex];
						setSelectedService(nextService);
						loadForecastForService(nextService);
						return nextIndex;
					});
					// Fade in
					setTimeout(() => setFadeClass("opacity-100"), 100);
				}, 300);
			}, 600000); // 10 minutes = 600000ms

			// Set next update time
			setNextUpdateTime(new Date(Date.now() + 600000));
			setAutoModeInterval(interval);
			return () => {
				if (interval) clearInterval(interval);
			};
		}
	}, [isAutoMode, modelServices]);

	// Update next update time every minute when in auto mode
	useEffect(() => {
		if (isAutoMode && nextUpdateTime) {
			const timer = setInterval(() => {
				// This will trigger re-render to show countdown
			}, 60000); // Update every minute

			return () => clearInterval(timer);
		}
	}, [isAutoMode, nextUpdateTime]);

	// Auto-load forecast function
	const loadForecastForService = async (service: string) => {
		if (!service) return;
		setIsFetching(true);
		setErrorMsg("");
		try {
			const params = new URLSearchParams({ service });
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
	};

	async function handleForecastClick() {
		if (!selectedService) return;
		// Disable auto mode when user manually requests forecast
		setIsAutoMode(false);
		if (autoModeInterval) {
			clearInterval(autoModeInterval);
			setAutoModeInterval(null);
		}
		await loadForecastForService(selectedService);
	}

	async function handleTrainClick() {
		if (!selectedService) return;
		// Disable auto mode during training
		setIsAutoMode(false);
		if (autoModeInterval) {
			clearInterval(autoModeInterval);
			setAutoModeInterval(null);
		}
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

	const hasData = !!(activeForecast && activeForecast.forecast?.length);

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
		// Remove mock data fallback - show empty state instead
		return null;
	}, [chartFromForecast]);

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
		return { maxValue: 0, maxLabel: "", avg: 0 };
	}, [chartFromForecast]);

	// Toggle auto mode function
	const toggleAutoMode = () => {
		if (isAutoMode) {
			// Turn off auto mode
			setIsAutoMode(false);
			setNextUpdateTime(null);
			if (autoModeInterval) {
				clearInterval(autoModeInterval);
				setAutoModeInterval(null);
			}
		} else {
			// Turn on auto mode
			setIsAutoMode(true);
			setNextUpdateTime(new Date(Date.now() + 600000));
		}
	};

	// Format time remaining until next update
	const getTimeUntilNextUpdate = (): string => {
		if (!nextUpdateTime || !isAutoMode) return "";
		const now = new Date();
		const diff = nextUpdateTime.getTime() - now.getTime();
		if (diff <= 0) return "Updating...";
		const minutes = Math.floor(diff / 60000);
		return `${minutes}m`;
	};

	return (
		<section className="bg-white rounded-xl shadow-sm p-6">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
						PLN Analytics - AI Forecasting System
						{isFetching && (
							<ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
						)}
					</h2>
					<p className="text-sm text-gray-500">
						{activeForecast?.service
							? `ICON: ${activeForecast.service}${activeForecast.tim_serpo ? ` · ${activeForecast.tim_serpo}` : ""}`
							: "Real-time automated forecasting untuk berbagai layanan ICON"}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={toggleAutoMode}
						className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
							isAutoMode
								? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl"
								: "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 hover:from-gray-300 hover:to-gray-400"
						}`}
					>
						{isAutoMode ? (
							<>
								<PauseIcon className="h-4 w-4" />
								<span>Auto Mode</span>
							</>
						) : (
							<>
								<PlayIcon className="h-4 w-4" />
								<span>Manual</span>
							</>
						)}
					</button>
					{isAutoMode && modelServices.length > 0 && (
						<div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
							<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
							<span>{currentServiceIndex + 1}/{modelServices.length}</span>
							{getTimeUntilNextUpdate() && (
								<span className="ml-1 text-gray-500">· {getTimeUntilNextUpdate()}</span>
							)}
						</div>
					)}
				</div>
			</div>

			<div className={`transition-opacity duration-300 ${fadeClass}`}>
				<div className="mb-4 grid grid-cols-1 gap-3">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">ICON Service</label>
						<div className="flex items-center gap-2 mb-2">
							<input
								type="text"
								placeholder="Cari ICON..."
								value={query}
								onChange={(e) => {
									setQuery(e.target.value);
									setIsAutoMode(false);
									setNextUpdateTime(null);
									if (autoModeInterval) {
										clearInterval(autoModeInterval);
										setAutoModeInterval(null);
									}
								}}
								className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
							/>
							<button
								type="button"
								onClick={() => { setQuery(""); setSelectedService(""); }}
								className="px-3 py-2 text-xs rounded-lg border-2 border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
							>
								Clear
							</button>
						</div>
						<select
							className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
							value={selectedService}
							onChange={(e) => {
								setSelectedService(e.target.value);
								setIsAutoMode(false);
								setNextUpdateTime(null);
								if (autoModeInterval) {
									clearInterval(autoModeInterval);
									setAutoModeInterval(null);
								}
							}}
						>
							{(services && services.length ? services : modelServices)
								.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
								.map((s) => (
									<option key={s} value={s}>{s}</option>
								))}
						</select>
					</div>
					<div className="flex gap-3">
						<button
							onClick={handleTrainClick}
							disabled={!selectedService || isTraining}
							className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
						>
							{isTraining ? (
								<>
									<ArrowPathIcon className="h-4 w-4 animate-spin" />
									<span>Training...</span>
								</>
							) : (
								<span>🚀 Train Model</span>
							)}
						</button>
						<button
							onClick={handleForecastClick}
							disabled={!selectedService || isFetching}
							className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
						>
							{isFetching ? (
								<>
									<ArrowPathIcon className="h-4 w-4 animate-spin" />
									<span>Loading...</span>
								</>
							) : (
								<span>📊 Get Forecast</span>
							)}
						</button>
					</div>
				</div>

				{errorMsg && (
					<div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-r-lg">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="w-5 h-5 text-red-400">⚠️</div>
							</div>
							<div className="ml-3">
								<p className="text-sm text-red-700">{errorMsg}</p>
							</div>
						</div>
					</div>
				)}
				{!errorMsg && trainMsg && (
					<div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="w-5 h-5 text-blue-400">ℹ️</div>
							</div>
							<div className="ml-3">
								<p className="text-sm text-blue-700">{trainMsg}</p>
							</div>
						</div>
					</div>
				)}

				{!hasData ? (
					<div className="rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 text-center">
						<div className="mx-auto max-w-md">
							<div className="mb-6">
								<div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
									<ArrowPathIcon className="h-8 w-8 text-white animate-spin" />
								</div>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-3">
								🤖 AI System Initializing
							</h3>
							<p className="text-sm text-gray-600 mb-4">
								Memuat forecasting models dan menganalisis data historis untuk memberikan prediksi terbaik. 
								{modelServices.length > 0 && (
									<span className="block mt-2 text-blue-600 font-medium">
										✅ {modelServices.length} layanan ICON ditemukan
									</span>
								)}
							</p>
							{modelServices.length === 0 && (
								<div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
									<p className="font-medium text-yellow-800 mb-1">System Check:</p>
									<p>• Pastikan backend AI running di port 8000</p>
									<p>• Verify data tersedia di database</p>
								</div>
							)}
						</div>
					</div>
				) : (
					<>
						<div className="bg-white relative rounded-lg border border-gray-200 p-4 shadow-sm">
							{chartData && <Line ref={chartRef} data={chartData} options={options} />}
							{isAutoMode && (
								<div className="absolute top-3 right-3">
									<div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-3 py-1 rounded-full border shadow-lg">
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
											<span>Auto-cycling</span>
										</div>
									</div>
								</div>
							)}
						</div>

						<div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm text-blue-600 font-semibold">📈 Peak Duration</p>
									<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
										<span className="text-white text-xs font-bold">MAX</span>
									</div>
								</div>
								<p className="text-2xl font-bold text-blue-900 mb-1">
									{maxValue.toFixed(1)} menit
								</p>
								<p className="text-sm text-blue-700">pada {maxLabel}</p>
							</div>
							
							<div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm text-green-600 font-semibold">⚡ Average</p>
									<div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
										<span className="text-white text-xs font-bold">AVG</span>
									</div>
								</div>
								<p className="text-2xl font-bold text-green-900 mb-1">
									{avg.toFixed(1)} menit
								</p>
								<p className="text-sm text-green-700">rata-rata prediksi</p>
							</div>
							
							<div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm text-purple-600 font-semibold">🎯 Model Accuracy</p>
									<div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
										<span className="text-white text-xs font-bold">MAE</span>
									</div>
								</div>
								<p className="text-2xl font-bold text-purple-900 mb-1">
									{maeScore != null ? maeScore.toFixed(2) : "-"}
								</p>
								<p className="text-sm text-purple-700">mean absolute error</p>
							</div>
							
							<div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
								<div className="flex items-center justify-between mb-2">
									<p className="text-sm text-orange-600 font-semibold">📅 Latest Data</p>
									<div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
										<span className="text-white text-xs font-bold">📊</span>
									</div>
								</div>
								<p className="text-lg font-bold text-orange-900 mb-1">
									{(lastGlobalDate || lastDataDate) ? new Date((lastGlobalDate || lastDataDate) as string).toLocaleDateString('id-ID', { 
										day: 'numeric', 
										month: 'short', 
										year: 'numeric' 
									}) : "-"}
								</p>
								<p className="text-sm text-orange-700">data terakhir</p>
							</div>
						</div>
					</>
				)}
			</div>
		</section>
	);
};

export default PredictionSection;