// FILE: src/components/HeaderSection.tsx
"use client";

import React from "react";

const HeaderSection: React.FC = () => {
	return (
		<section className="bg-white rounded-xl shadow-sm">
			<div className="flex items-center gap-4 p-6">
				<img
					src="/images/logo.png"
					alt="PLNalyze logo"
					className="w-12 h-12 object-contain"
				/>
				<div>
					<h1 className="text-2xl md:text-3xl font-semibold text-gray-900">PLNalyze</h1>
					<p className="text-sm text-gray-500">Evaluasi Gangguan Bulanan</p>
				</div>
			</div>
		</section>
	);
};

export default HeaderSection;