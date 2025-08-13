// FILE: src/types/index.ts
export interface IssueItem {
	label: string;
	count: number;
}

export interface SerpoData {
	score: number; // 0-100
	avgRepairHours: number; // average hours to repair
	monthlyIncidents: number; // count of monthly incidents
	topIssues: IssueItem[]; // sorted desc by count
}

export interface PredictionPoint {
	label: string;
	value: number; // hours or a normalized metric
}

export interface SentimentData {
	overallScore: number; // 0..1
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