"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type ThemeItemRow = {
	theme: string | null;
	name: string;
	image_url: string | null;
};

type Props = {
	value?: string;
	onChange?: (theme: string) => void;
};

// ThemeSelector
// - Loads `theme_items` from Supabase and groups them by `theme`.
// - Presents available theme names as radio options and notifies parent via `onChange`.
export default function ThemeSelector({ value, onChange }: Props) {
	const [groups, setGroups] = useState<Record<string, { name: string; image_url: string | null }[]>>({});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let mounted = true;
		setLoading(true);
		// Fetch items and group by theme client-side for simplicity
		supabase
			.from("theme_items")
			.select("theme,name,image_url")
			.then(({ data, error }) => {
				if (!mounted) return;
				setLoading(false);
				if (error) {
					console.error("Failed to load theme_items", error);
					return;
				}
				const g: Record<string, { name: string; image_url: string | null }[]> = {};
				((data ?? []) as ThemeItemRow[]).forEach((r) => {
					const t = r.theme || "default";
					g[t] = g[t] || [];
					g[t].push({ name: r.name, image_url: r.image_url ?? null });
				});
				setGroups(g);
				// if no value selected, choose the first theme
				if (!value) {
					const first = Object.keys(g)[0];
					if (first && onChange) onChange(first);
				}
			});
		return () => {
			mounted = false;
		};
	}, [onChange, value]);

	const themes = Object.keys(groups);

	return (
		<div>
			<label className="block text-sm font-medium mb-2">Theme</label>
			{loading && <div className="text-xs text-gray-400">Loading themes…</div>}
			{!loading && themes.length === 0 && (
				<div className="text-xs text-gray-400">No themes available yet.</div>
			)}

			<div className="grid gap-2">
				{themes.map((t) => (
					<label key={t} className="flex items-center gap-3 p-2 border rounded-md cursor-pointer">
						<input
							type="radio"
							name="theme"
							checked={value === t}
							onChange={() => onChange && onChange(t)}
						/>
						<div className="flex-1">
							<div className="font-medium">{t}</div>
							<div className="text-xs text-gray-400">{groups[t].length} items</div>
						</div>
					</label>
				))}
			</div>
		</div>
	);
}