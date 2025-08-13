// FILE: src/lib/mockData.ts
import type {
	EvaluationSummary,
	PredictionPoint,
	SentimentData,
	SerpoData,
} from "@/types";

export function getMockSerpoData(): SerpoData {
	return {
		score: 78,
		avgRepairHours: 6.4,
		monthlyIncidents: 127,
		topIssues: [
			{ label: "Pemadaman lokal", count: 46 },
			{ label: "Gangguan jaringan", count: 32 },
			{ label: "Gangguan trafo", count: 22 },
			{ label: "Keluhan meteran", count: 18 },
		],
	};
}

export function getMockPredictions(): PredictionPoint[] {
	return [
		{ label: "Minggu 1", value: 5.2 },
		{ label: "Minggu 2", value: 6.8 },
		{ label: "Minggu 3", value: 6.1 },
		{ label: "Minggu 4", value: 7.4 },
	];
}

export function getMockSentiment(): SentimentData {
	return {
		overallScore: 0.62,
		positive: [
			"Respon cepat saat ada laporan.",
			"Petugas ramah dan informatif.",
			"Perbaikan selesai sebelum estimasi.",
		],
		negative: [
			"Pemadaman tanpa pemberitahuan.",
			"Antrian call center cukup lama.",
			"Ada keterlambatan penanganan di daerah saya.",
		],
		neutral: [
			"Petugas datang sesuai jadwal.",
			"Layanan cukup baik.",
			"Tidak ada kendala berarti bulan ini.",
		],
	};
}

export function getMockEvaluationSummary(): EvaluationSummary {
	return {
		title: "Ringkasan Evaluasi (Placeholder)",
		items: [
			{ label: "Kualitas Data", value: "Baik" },
			{ label: "Jumlah Baris", value: 1456 },
			{ label: "Kolom Terbaca", value: 12 },
			{ label: "Deteksi Outlier", value: "Rendah" },
		],
		notes:
			"Ringkasan ini adalah placeholder. Hubungkan dengan modul preprocessing/AI untuk hasil sebenarnya.",
	};
}