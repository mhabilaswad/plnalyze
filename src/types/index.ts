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

// FILE: src/types/index.ts
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