// FILE: src/types/index.ts
export interface IssueItem {
	label: string;
	count: number;
}

export interface SerpoData {
	score: number;
	avgRepairHours: number;
	monthlyIncidents: number;
	topIssues: IssueItem[];
}

export interface PredictionPoint {
	label: string;
	value: number;
}

export interface SentimentData {
	overallScore: number;
	positive: string[];
	negative: string[];
	neutral: string[];
}

export interface EvaluationSummaryItem {
	label: string;
	value: string | number;
}

export interface EvaluationSummary {
	title: string;
	items: EvaluationSummaryItem[];
	notes?: string;
}

export interface ProcessedPayload {
	serpo?: SerpoData;
	predictions?: PredictionPoint[];
	sentiment?: SentimentData;
	evaluationSummary?: EvaluationSummary;
}

export interface UploadResult {
	success: boolean;
	message?: string;
	data?: ProcessedPayload;
}

// Forecast API types
export interface HistoryPoint {
	ds: string; // date string (e.g., 2024-06-02)
	y: number;  // historical value (hours)
}

export interface ForecastPoint {
	ds: string;          // start date of the week
	yhat: number;        // predicted value
	week_label: string;  // e.g., "2024-08-25 - 2024-08-31"
}

export interface ForecastAPIResponse {
	service: string;
	tim_serpo?: string;
	history?: HistoryPoint[];
	forecast: ForecastPoint[];
	mae?: number | null;
	last_trained_at?: string | null;
	last_data_date?: string | null;
}

// New types for Excel processing
export interface ServiceData {
	nama_service: string;
	sid: string;
	tiket_open: string;
	penyebab: string;
	action: string;
	keterangan2: string;
	durasi_menit: string;
	stop_clock: string;
	durasi_total: string;
}

export interface ServiceGroup {
	nama_service: string;
	sid: string;
	records: ServiceData[];
}

export interface ServiceEvaluation {
	nama_service: string;
	sid: string;
	summary: string;
	evaluation: string;
	isLoading: boolean;
	isExpanded: boolean;
	evalTime?: number | null;
	// Optional UI states for ML actions
	isTraining?: boolean;
	isForecasting?: boolean;
}

export interface ExcelProcessResult {
	services: ServiceGroup[];
	totalRecords: number;
	cleanedColumns: string[];
}

// Serpo Inference types
export interface DetailKasus {
	no_tiket: string;
	nama_service: string;
	sid: string;
	tim_serpo: string;
	durasi_menit: number;
	durasi_jam: number;
	penyebab: string;
	kategori_penyebab: string;
	keterangan: string;
	prediksi_kinerja: string;
	ada_kendala: string;
	status_sla?: string;
}

export interface DaftarTim {
	nama_tim: string;
	jumlah_kasus: number;
	durasi_rata2: number;
	kinerja_mayoritas: string;
	penyebab_mayoritas: string;
	kasus_bermasalah?: number;
	kategori_penyebab_dominan?: string;
	prediksi_label?: string;
}

export interface InferenceResult {
	detail_kasus: DetailKasus[];
	daftar_tim: DaftarTim[];
	overview: {
		total_kasus: number;
		jumlah_tim: number;
		durasi_rata2_all: number;
		tim_terbaik: string;
		tim_terburuk: string;
		penyebab_dominan: string;
		kategori_dominan: string;
		kinerja_mayoritas_global: string;
		distribusi_kinerja?: Record<string, number>;
	};
	ringkasan: {
		jumlah_kasus: number;
		jumlah_tim: number;
		durasi_rata2_global: number;
		tim_terbaik: string;
		tim_terburuk: string;
		penyebab_dominan: string;
		kategori_dominan: string;
		kinerja_mayoritas_global: string;
	};
}
export interface ServiceData {
	nama_service: string;
	sid: string;
	tiket_open: string;
	durasi_menit: string;
	durasi_total: string;
	penyebab: string;
	action: string;
	keterangan: string;
	stop_clock: string;
}

export interface ServiceGroup {
	nama_service: string;
	sid: string;
	records: ServiceData[];
}


export interface ServiceEvaluation {
	nama_service: string;
	sid: string;
	summary: string;
	evaluation: string;
	isLoading: boolean;
	isExpanded: boolean;
	evalTime?: number | null;
	dataContext?: string;
}

export interface ExcelProcessResult {
	services: ServiceGroup[];
	totalRecords: number;
	cleanedColumns: string[];
}