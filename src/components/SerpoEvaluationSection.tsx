// FILE: src/components/SerpoEvaluationSection.tsx
"use client";

import React from "react";
import type { SerpoData } from "@/types";
import { getMockSerpoData } from "@/lib/mockData";
import { ArrowTrendingUpIcon, ClockIcon, BoltIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export interface SerpoEvaluationSectionProps {
	serpoData?: SerpoData;
}

const StatCard = ({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
}) => (
	<div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
		<div className="flex items-center gap-3">
			<div className="text-blue-600">{icon}</div>
			<div>
				<p className="text-sm text-gray-500">{label}</p>
				<p className="text-xl font-semibold text-gray-900">{value}</p>
			</div>
		</div>
	</div>
);

const SerpoEvaluationSection: React.FC<SerpoEvaluationSectionProps> = ({ serpoData }) => {
	const data = serpoData ?? getMockSerpoData();

	return (
		<section className="bg-white rounded-xl shadow-sm p-6">
			<div className="mb-4">
				<h2 className="text-lg font-medium text-gray-900">Evaluasi Serpo</h2>
				<p className="text-sm text-gray-500">Ringkasan metrik SERPO dan isu teratas bulan ini.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<StatCard
					icon={<ArrowTrendingUpIcon className="h-6 w-6" aria-hidden="true" />}
					label="SERPO Score"
					value={`${data.score}`}
				/>
				<StatCard
					icon={<ClockIcon className="h-6 w-6" aria-hidden="true" />}
					label="Rata-rata Waktu Perbaikan (jam)"
					value={data.avgRepairHours.toFixed(1)}
				/>
				<StatCard
					icon={<BoltIcon className="h-6 w-6" aria-hidden="true" />}
					label="Jumlah Gangguan Bulanan"
					value={data.monthlyIncidents}
				/>
			</div>

			<div className="mt-6">
				<h3 className="text-sm font-medium text-gray-900">Top 3 Isu</h3>
				<ul className="mt-2 grid gap-2">
					{data.topIssues.slice(0, 3).map((issue, idx) => (
						<li
							key={idx}
							className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
						>
							<div className="flex items-center gap-2">
								<ExclamationTriangleIcon className="h-5 w-5 text-amber-600" aria-hidden="true" />
								<span className="text-sm text-gray-800">{issue.label}</span>
							</div>
							<span className="text-sm font-medium text-gray-900">{issue.count}</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
};

export default SerpoEvaluationSection;