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
import { ArrowPathIcon, PlayIcon, PauseIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

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

	// Get model quality based on MAE score
	function getModelQuality(mae: number | null): { label: string; color: string; bgColor: string; description: string } {
		if (mae === null || mae === undefined) {
			return {
				label: "Belum Tersedia",
				color: "text-gray-600",
				bgColor: "bg-gray-100/50",
				description: "evaluasi belum dilakukan"
			};
		}

		if (mae <= 20) {
			return {
				label: "Sangat Baik",
				color: "text-green-700",
				bgColor: "bg-green-100/50",
				description: "akurasi sangat tinggi"
			};
		} else if (mae <= 40) {
			return {
				label: "Baik",
				color: "text-blue-700",
				bgColor: "bg-blue-100/50",
				description: "akurasi tinggi"
			};
		} else if (mae <= 60) {
			return {
				label: "Cukup Baik",
				color: "text-yellow-700",
				bgColor: "bg-yellow-100/50",
				description: "akurasi memadai"
			};
		} else if (mae <= 80) {
			return {
				label: "Perlu Perbaikan",
				color: "text-orange-700",
				bgColor: "bg-orange-100/50",
				description: "akurasi rendah"
			};
		} else if (mae <= 100) {
			return {
				label: "Kurang Baik",
				color: "text-red-600",
				bgColor: "bg-red-100/50",
				description: "akurasi sangat rendah"
			};
		} else {
			return {
				label: "Sangat Buruk",
				color: "text-red-800",
				bgColor: "bg-red-200/50",
				description: "perlu pelatihan ulang"
			};
		}
	}

	// Auto-cycling state for demo mode
	const [isAutoMode, setIsAutoMode] = useState<boolean>(true);
	const [currentServiceIndex, setCurrentServiceIndex] = useState<number>(0);
	const [autoModeInterval, setAutoModeInterval] = useState<NodeJS.Timeout | null>(null);
	const [fadeClass, setFadeClass] = useState<string>("opacity-100");
	const [nextUpdateTime, setNextUpdateTime] = useState<Date | null>(null);
	const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
	const [showExplanation, setShowExplanation] = useState<boolean>(false);

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
						// Reset next update time for new cycle
						setNextUpdateTime(new Date(Date.now() + 60000));
						setCountdownSeconds(60);
						return nextIndex;
					});
					// Fade in
					setTimeout(() => setFadeClass("opacity-100"), 100);
				}, 300);
			}, 60000); // 1 minute = 60000ms

			// Set initial next update time and countdown
			setNextUpdateTime(new Date(Date.now() + 60000));
			setCountdownSeconds(60);
			setAutoModeInterval(interval);
			return () => {
				if (interval) clearInterval(interval);
			};
		} else {
			// Clear timer when auto mode is disabled
			setNextUpdateTime(null);
			setCountdownSeconds(0);
		}
	}, [isAutoMode, modelServices]);

	// Update countdown every second when in auto mode
	useEffect(() => {
		if (isAutoMode && countdownSeconds > 0) {
			const timer = setInterval(() => {
				setCountdownSeconds(prev => {
					if (prev <= 1) {
						return 0; // Will be reset by the main auto-cycle timer
					}
					return prev - 1;
				});
			}, 1000); // Update every 1 second

			return () => clearInterval(timer);
		}
	}, [isAutoMode, countdownSeconds > 0]);

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
		setCountdownSeconds(0);
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
		setCountdownSeconds(0);
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

	// Get model quality info
	const modelQuality = useMemo(() => getModelQuality(maeScore), [maeScore]);

	// Toggle auto mode function
	const toggleAutoMode = () => {
		if (isAutoMode) {
			// Turn off auto mode
			setIsAutoMode(false);
			setNextUpdateTime(null);
			setCountdownSeconds(0);
			if (autoModeInterval) {
				clearInterval(autoModeInterval);
				setAutoModeInterval(null);
			}
		} else {
			// Turn on auto mode
			setIsAutoMode(true);
			// Timer will be set in the useEffect above
		}
	};

	// Format time remaining until next update
	const getTimeUntilNextUpdate = (): string => {
		if (!isAutoMode || countdownSeconds <= 0) return "";
		if (countdownSeconds <= 1) return "Memperbarui...";
		return `${countdownSeconds}d`;
	};

	return (
		<section className="bg-white rounded-xl shadow-sm p-6">
			{/* Tombol untuk menampilkan/menyembunyikan penjelasan */}
			<div className="mb-4">
				<button
					onClick={() => setShowExplanation(!showExplanation)}
					className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200"
				>
					<InformationCircleIcon className="h-4 w-4" />
					<span>Tentang Forecasting</span>
					{showExplanation ? (
						<ChevronUpIcon className="h-4 w-4" />
					) : (
						<ChevronDownIcon className="h-4 w-4" />
					)}
				</button>
			</div>

			{/* Penjelasan Forecasting - Collapsible */}
			{showExplanation && (
				<div className="mb-6 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl shadow-sm transition-all duration-300">
					<div className="flex items-start">
						<div className="flex-shrink-0">
							<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
								<span className="text-white text-lg">🤖</span>
							</div>
						</div>
						<div className="ml-4">
							<h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
								AI Forecasting System
								<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">ACTIVE</span>
							</h3>
							<p className="text-sm text-gray-700 leading-relaxed mb-4">
								Sistem AI memprediksi <strong className="text-blue-700">durasi rata-rata waktu penanganan gangguan per minggu</strong> untuk setiap layanan ICON 
								berdasarkan data historis. Prediksi membantu tim SERPO dalam perencanaan kapasitas dan alokasi resources 
								untuk memberikan layanan terbaik kepada pelanggan PLN.
							</p>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
								<div className="bg-white/60 backdrop-blur border border-blue-200 px-3 py-2 rounded-lg flex items-center gap-2">
									<span className="text-blue-600">📈</span>
									<span className="text-blue-800 font-medium">Analisis Trend Mingguan</span>
								</div>
								<div className="bg-white/60 backdrop-blur border border-blue-200 px-3 py-2 rounded-lg flex items-center gap-2">
									<span className="text-green-600">🎯</span>
									<span className="text-green-800 font-medium">Akurasi Tinggi (MAE)</span>
								</div>
								<div className="bg-white/60 backdrop-blur border border-blue-200 px-3 py-2 rounded-lg flex items-center gap-2">
									<span className="text-purple-600">⚡</span>
									<span className="text-purple-800 font-medium">Real-time Processing</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="mb-6 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
				<div>
					<h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
						<div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
							<span className="text-white text-sm">🤖</span>
						</div>
						PLN Analytics - AI Forecasting System
						{isFetching && (
							<ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
						)}
					</h2>
					<p className="text-sm text-gray-600 mt-1 ml-11">
						{activeForecast?.service
							? (
								<span className="flex items-center gap-2">
									<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
									<strong className="text-gray-800">ICON:</strong> {activeForecast.service}
									{activeForecast.tim_serpo && (
										<>
											<span className="text-gray-400">•</span>
											<span className="text-blue-600 font-medium">{activeForecast.tim_serpo}</span>
										</>
									)}
								</span>
							)
							: "Real-time automated forecasting untuk berbagai layanan ICON PLN"}
					</p>
				</div>
				<div className="flex items-center gap-3">
					{/* Auto Mode Toggle */}
					<button
						onClick={toggleAutoMode}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${
							isAutoMode
								? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
								: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300"
						}`}
					>
						{isAutoMode ? (
							<>
								<PauseIcon className="h-4 w-4" />
								<span>Mode Otomatis</span>
							</>
						) : (
							<>
								<PlayIcon className="h-4 w-4" />
								<span>Mode Manual</span>
							</>
						)}
					</button>
					
					{/* Auto Mode Status */}
					{isAutoMode && modelServices.length > 0 && (
						<div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-green-200 px-4 py-2 rounded-xl shadow-sm">
							<div className="flex items-center gap-2 text-xs text-gray-700">
								<div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
								<span className="font-medium">Layanan {currentServiceIndex + 1}/{modelServices.length}</span>
							</div>
							{countdownSeconds > 0 && (
								<div className="flex items-center gap-1 text-xs">
									<span className="text-gray-500">Berikutnya:</span>
									<span className="bg-green-100 text-green-700 px-2 py-1 rounded-md font-mono font-bold">
										{getTimeUntilNextUpdate()}
									</span>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<div className={`transition-opacity duration-300 ${fadeClass}`}>
				<div className="mb-6 grid grid-cols-1 gap-4">
					{/* Service Selection Card */}
					<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
						<label className="block text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
							<span className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center">
								<span className="text-white text-xs">🎯</span>
							</span>
							Pilih Layanan ICON
						</label>
						<div className="flex items-center gap-3 mb-3">
							<input
								type="text"
								placeholder="🔍 Cari ICON service..."
								value={query}
								onChange={(e) => {
									setQuery(e.target.value);
									setIsAutoMode(false);
									setNextUpdateTime(null);
									setCountdownSeconds(0);
									if (autoModeInterval) {
										clearInterval(autoModeInterval);
										setAutoModeInterval(null);
									}
								}}
								className="flex-1 rounded-lg border-2 border-blue-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/80 backdrop-blur-sm"
							/>
							<button
								type="button"
								onClick={() => { setQuery(""); setSelectedService(""); }}
								className="px-4 py-2.5 text-xs rounded-lg border-2 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 transition-all duration-200 font-medium"
							>
								Hapus
							</button>
						</div>
						<select
							className="w-full rounded-lg border-2 border-blue-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white/80 backdrop-blur-sm font-medium"
							value={selectedService}
							onChange={(e) => {
								setSelectedService(e.target.value);
								setIsAutoMode(false);
								setNextUpdateTime(null);
								setCountdownSeconds(0);
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

					{/* Action Buttons Card */}
					<div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
						<div className="flex gap-3">
							<button
								onClick={handleTrainClick}
								disabled={!selectedService || isTraining}
								className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
							>
								{isTraining ? (
									<>
										<ArrowPathIcon className="h-4 w-4 animate-spin" />
										<span>Melatih Model...</span>
									</>
								) : (
									<>
										<span className="text-lg">🚀</span>
										<span>Latih Model AI</span>
									</>
								)}
							</button>
							<button
								onClick={handleForecastClick}
								disabled={!selectedService || isFetching}
								className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
							>
								{isFetching ? (
									<>
										<ArrowPathIcon className="h-4 w-4 animate-spin" />
										<span>Memuat Prediksi...</span>
									</>
								) : (
									<>
										<span className="text-lg">📊</span>
										<span>Buat Prediksi</span>
									</>
								)}
							</button>
						</div>
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
					<div className="rounded-2xl border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-12 text-center shadow-inner">
						<div className="mx-auto max-w-lg">
							<div className="mb-8">
								<div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl">
									{modelServices.length > 0 ? (
										<ArrowPathIcon className="h-10 w-10 text-white animate-spin" />
									) : (
										<span className="text-2xl">🤖</span>
									)}
								</div>
							</div>
							<h3 className="text-2xl font-bold text-gray-900 mb-4">
								{modelServices.length > 0 ? (
									<span className="flex items-center justify-center gap-2">
										<span>🔄</span> AI System Loading
									</span>
								) : (
									<span className="flex items-center justify-center gap-2">
										<span>🤖</span> AI System Initializing
									</span>
								)}
							</h3>
							<p className="text-sm text-gray-600 mb-6 leading-relaxed">
								{modelServices.length > 0 ? (
									<>
										Memuat forecasting models dan menganalisis data historis untuk memberikan prediksi terbaik...
										<span className="block mt-3 p-3 bg-green-100 border border-green-300 rounded-lg text-green-800 font-medium">
											✅ {modelServices.length} layanan ICON siap dianalisis
										</span>
									</>
								) : (
									<>
										Sistem sedang mempersiapkan AI models untuk analisis forecasting. 
										Pastikan koneksi ke backend AI server tersedia.
									</>
								)}
							</p>
							{modelServices.length === 0 && (
								<div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-300 rounded-xl p-4 space-y-2">
									<p className="font-semibold text-yellow-800 mb-2">🔧 System Check:</p>
									<div className="grid grid-cols-1 gap-2 text-left">
										<p className="flex items-center gap-2">
											<span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
											Backend AI server running di port 8000
										</p>
										<p className="flex items-center gap-2">
											<span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
											Database models tersedia
										</p>
										<p className="flex items-center gap-2">
											<span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
											Network connectivity check
										</p>
									</div>
								</div>
							)}
						</div>
					</div>
				) : (
					<>
						{/* Chart Container */}
						<div className="bg-white relative rounded-2xl border border-gray-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
							<div className="mb-4 flex items-center justify-between">
								<div>
									<h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
										<span className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
											<span className="text-white text-xs">📈</span>
										</span>
										Grafik Prediksi
									</h3>
									<p className="text-sm text-gray-500 mt-1">Prediksi durasi penanganan gangguan (menit)</p>
								</div>
								{isAutoMode && (
									<div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs px-4 py-2 rounded-full border shadow-lg">
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
											<span className="font-medium">Mode Otomatis Aktif</span>
										</div>
									</div>
								)}
							</div>
							{chartData && <Line ref={chartRef} data={chartData} options={options} />}
						</div>

						{/* Statistics Cards */}
						<div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
							<div className="group bg-white border border-blue-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 ease-out">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
											<span className="text-white text-sm">📈</span>
										</div>
										<div>
											<p className="text-sm font-semibold text-blue-700">Durasi Tertinggi</p>
											<p className="text-xs text-blue-500">Peak Value</p>
										</div>
									</div>
								</div>
								<div className="text-right">
									<p className="text-3xl font-bold text-blue-900 leading-none">
										{maxValue.toFixed(1)}
									</p>
									<p className="text-sm text-blue-600 mb-2">menit</p>
									<p className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded-md inline-block">
										pada {maxLabel}
									</p>
								</div>
							</div>
							
							<div className="group bg-white border border-green-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-green-300 transition-all duration-300 ease-out">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
											<span className="text-white text-sm">⚡</span>
										</div>
										<div>
											<p className="text-sm font-semibold text-green-700">Rata-rata</p>
											<p className="text-xs text-green-500">Average</p>
										</div>
									</div>
								</div>
								<div className="text-right">
									<p className="text-3xl font-bold text-green-900 leading-none">
										{avg.toFixed(1)}
									</p>
									<p className="text-sm text-green-600 mb-2">menit</p>
									<p className="text-xs text-green-500 bg-green-50 px-2 py-1 rounded-md inline-block">
										rata-rata prediksi
									</p>
								</div>
							</div>
							
							<div className="group bg-white border border-purple-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-purple-300 transition-all duration-300 ease-out">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
											<span className="text-white text-sm">🎯</span>
										</div>
										<div>
											<p className="text-sm font-semibold text-purple-700">Akurasi Model</p>
											<p className="text-xs text-purple-500">MAE Score</p>
										</div>
									</div>
								</div>
								<div className="text-right">
									<p className="text-3xl font-bold text-purple-900 leading-none">
										{maeScore != null ? maeScore.toFixed(2) : "-.--"}
									</p>
									<div className="mt-2 space-y-1">
										<span className={`text-xs font-medium px-2 py-1 rounded-md inline-block ${modelQuality.bgColor} ${modelQuality.color}`}>
											{modelQuality.label}
										</span>
										<p className="text-xs text-purple-500">
											{modelQuality.description}
										</p>
									</div>
								</div>
							</div>
							
							<div className="group bg-white border border-orange-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-300 transition-all duration-300 ease-out">
								<div className="flex items-center justify-between mb-4">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
											<span className="text-white text-sm">📅</span>
										</div>
										<div>
											<p className="text-sm font-semibold text-orange-700">Data Terbaru</p>
											<p className="text-xs text-orange-500">Last Update</p>
										</div>
									</div>
								</div>
								<div className="text-right">
									<p className="text-2xl font-bold text-orange-900 leading-tight">
										{(lastGlobalDate || lastDataDate) ? new Date((lastGlobalDate || lastDataDate) as string).toLocaleDateString('id-ID', { 
											day: 'numeric', 
											month: 'short', 
											year: 'numeric' 
										}) : "Data tidak tersedia"}
									</p>
									<p className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-md inline-block mt-2">
										data terakhir
									</p>
								</div>
							</div>
						</div>
					</>
				)}
			</div>
		</section>
	);
};

export default PredictionSection;