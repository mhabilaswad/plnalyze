// FILE: src/components/FileUploadSection.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { EvaluationSummary, UploadResult } from "@/types";
import Spinner from "./Spinner";
import { DocumentArrowUpIcon, ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { getMockEvaluationSummary } from "@/lib/mockData";

type UploadState = "idle" | "selected" | "uploading" | "evaluated";

export interface FileUploadSectionProps {
	// Callback to integrate real preprocessing/AI. Should return UploadResult with optional processed data.
	onFileUpload?: (file: File) => Promise<UploadResult>;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({ onFileUpload }) => {
	const [status, setStatus] = useState<UploadState>("idle");
	const [file, setFile] = useState<File | null>(null);
	const [message, setMessage] = useState<string>("");
	const [evalSummary, setEvalSummary] = useState<EvaluationSummary | null>(null);
	const [showEvalSpinner, setShowEvalSpinner] = useState<boolean>(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const fileInfo = useMemo(() => {
		if (!file) return null;
		const sizeKB = (file.size / 1024).toFixed(1);
		return `${file.name} — ${sizeKB} KB`;
	}, [file]);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const selected = e.target.files?.[0];
		if (selected) {
			setFile(selected);
			setStatus("selected");
			setMessage("");
			setEvalSummary(null);
		}
	}

	async function handleUploadClick() {
		if (!file) return;
		setStatus("uploading");
		setMessage("");
		setEvalSummary(null);

		try {
			if (onFileUpload) {
				const result = await onFileUpload(file);
				if (result.success) {
					setMessage(result.message || "Upload sukses.");
					if (result.data?.evaluationSummary) {
						setEvalSummary(result.data.evaluationSummary);
					}
				} else {
					setMessage(result.message || "Upload gagal.");
				}
			} else {
				// TODO: Replace with real preprocessing/AI call.
				await new Promise((r) => setTimeout(r, 1000));
				setEvalSummary(getMockEvaluationSummary());
				setMessage("Upload sukses (simulasi).");
			}
		} catch (err) {
			setMessage("Terjadi kesalahan saat upload.");
		} finally {
			setStatus("evaluated");
			setShowEvalSpinner(true);
		}
	}

	function handleReset() {
		setStatus("idle");
		setFile(null);
		setMessage("");
		setEvalSummary(null);
		if (inputRef.current) inputRef.current.value = "";
	}

	useEffect(() => {
		if (status === "evaluated") {
			const t = setTimeout(() => setShowEvalSpinner(false), 1200);
			return () => clearTimeout(t);
		}
	}, [status]);

	return (
		<section className="bg-white rounded-xl shadow-sm p-6">
			<h2 className="text-lg font-medium text-gray-900">Unggah Data</h2>
			<p className="text-sm text-gray-500 mb-4">
				Pilih file .xlsx / .xls / .csv untuk evaluasi. File Anda tidak akan dikirim ke server pada contoh ini.
			</p>

			{status !== "evaluated" && (
				<div className="flex flex-col md:flex-row md:items-end gap-4">
					<div className="flex-1">
						<label htmlFor="datasetFile" className="block text-sm font-medium text-gray-700">
							File Dataset
						</label>
						<input
							ref={inputRef}
							id="datasetFile"
							name="datasetFile"
							type="file"
							accept=".xlsx,.xls,.csv"
							className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							onChange={handleFileChange}
							aria-describedby="fileHelp"
						/>
						<p id="fileHelp" className="mt-1 text-xs text-gray-500">
							Maksimal beberapa MB sesuai batas browser Anda.
						</p>
						{fileInfo && (
							<p className="mt-2 text-sm text-gray-600" aria-live="polite">
								{fileInfo}
							</p>
						)}
					</div>

					<button
						type="button"
						onClick={handleUploadClick}
						disabled={!file || status === "uploading"}
						aria-disabled={!file || status === "uploading"}
						className={`inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
						aria-label="Upload file untuk evaluasi"
					>
						{status === "uploading" ? (
							<>
								<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
								Mengunggah...
							</>
						) : (
							<>
								<DocumentArrowUpIcon className="h-5 w-5" aria-hidden="true" />
								Upload
							</>
						)}
					</button>
				</div>
			)}

			{status === "uploading" && (
				<div className="mt-6">
					<Spinner label="Mengunggah dan memulai evaluasi..." />
				</div>
			)}

			{status === "evaluated" && (
				<div className="mt-4">
					<div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
						<h3 className="text-sm font-semibold text-gray-800">AI Evaluation</h3>
						{showEvalSpinner ? (
							<div className="mt-2">
								<Spinner label="AI Evaluation in progress..." />
							</div>
						) : (
							<div className="mt-3 grid gap-3">
								<div className="flex items-center gap-2 text-green-700">
									<CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
									<span className="text-sm font-medium">Evaluation result ready (placeholder)</span>
								</div>
								{evalSummary && (
									<div className="rounded-md bg-white border border-gray-200 p-3">
										<p className="text-sm font-medium text-gray-900">{evalSummary.title}</p>
										<ul className="mt-2 grid gap-1">
											{evalSummary.items.map((it, idx) => (
												<li key={idx} className="flex justify-between text-sm text-gray-700">
													<span>{it.label}</span>
													<span className="font-medium text-gray-900">{it.value}</span>
												</li>
											))}
										</ul>
										{evalSummary.notes && (
											<p className="mt-2 text-xs text-gray-500">{evalSummary.notes}</p>
										)}
									</div>
								)}
								{message && <p className="text-sm text-gray-600">{message}</p>}
								<div>
									<button
										type="button"
										onClick={handleReset}
										className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
										aria-label="Reset unggahan"
									>
										Reset
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</section>
	);
};

export default FileUploadSection;