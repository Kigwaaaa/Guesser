"use client";

import React from "react";

type Props = {
	value?: number;
	onChange?: (n: number) => void;
};

export default function PlayerCountSelector({ value = 3, onChange }: Props) {
	const options = [2, 3, 4];
	return (
		<div>
			<label className="block text-sm font-medium mb-2">Player count</label>
			<div className="flex gap-2">
				{options.map((n) => (
					<button
						key={n}
						onClick={() => onChange && onChange(n)}
						className={`px-3 py-2 rounded-md ${value === n ? "bg-[#7C3AED] text-black" : "bg-gray-800 text-gray-200"}`}
					>
						{n}
					</button>
				))}
			</div>
		</div>
	);
}