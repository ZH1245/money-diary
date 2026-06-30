import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	formatOpenRouterModelPricing,
	getOpenRouterModelRecommendation,
	OPENROUTER_DAILY_LIFE_MODEL_CHAIN,
	OPENROUTER_RECOMMENDED_MODELS,
} from "#/features/settings/constants/openrouter-models";
import { OPENROUTER_DEFAULT_BASE_URL } from "#/features/settings/constants/openrouter-defaults";

interface CatalogModel {
	id: string;
	name: string;
	inputPerMillion: number | null;
	outputPerMillion: number | null;
}

interface OpenRouterModelsEditorProps {
	models: string[];
	onChange: (models: string[]) => void;
	baseUrl: string;
	apiKey: string;
	savedApiKeyMask: string | null;
	isDisabled?: boolean;
}

/** Admin editor for ordered OpenRouter model failover chain. */
export function OpenRouterModelsEditor({
	models,
	onChange,
	baseUrl,
	apiKey,
	savedApiKeyMask,
	isDisabled = false,
}: OpenRouterModelsEditorProps) {
	const [catalog, setCatalog] = useState<CatalogModel[]>([]);
	const [catalogError, setCatalogError] = useState<string | null>(null);
	const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
	const [pickerValue, setPickerValue] = useState("");

	const addOptions = useMemo(() => {
		const seen = new Set(models);
		const recommended = OPENROUTER_RECOMMENDED_MODELS.filter(
			(entry) => !seen.has(entry.id),
		).map((entry) => ({
			id: entry.id,
			label: entry.label,
			pricing: formatOpenRouterModelPricing(
				entry.inputPerMillion,
				entry.outputPerMillion,
			),
		}));

		const fromCatalog = catalog
			.filter((entry) => !seen.has(entry.id))
			.filter(
				(entry) =>
					!OPENROUTER_RECOMMENDED_MODELS.some(
						(recommended) => recommended.id === entry.id,
					),
			)
			.slice(0, 40)
			.map((entry) => ({
				id: entry.id,
				label: entry.name,
				pricing: formatOpenRouterModelPricing(
					entry.inputPerMillion,
					entry.outputPerMillion,
				),
			}));

		return [...recommended, ...fromCatalog];
	}, [catalog, models]);

	useEffect(() => {
		if (!savedApiKeyMask && !apiKey.trim()) {
			setCatalog([]);
			return;
		}

		const timer = window.setTimeout(async () => {
			setIsLoadingCatalog(true);
			setCatalogError(null);
			try {
				const payload = apiKey.trim()
					? {
							baseUrl: baseUrl.trim() || OPENROUTER_DEFAULT_BASE_URL,
							apiKey: apiKey.trim(),
						}
					: {
							baseUrl: baseUrl.trim() || OPENROUTER_DEFAULT_BASE_URL,
							useStoredKey: true as const,
						};

				const response = await fetch("/api/admin/global-ai/openrouter-models", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload),
				});

				const json = (await response.json().catch(() => null)) as {
					success?: boolean;
					error?: string;
					data?: CatalogModel[];
				} | null;

				if (!response.ok || !json?.success || !json.data) {
					throw new Error(json?.error ?? "Unable to load OpenRouter models");
				}

				setCatalog(json.data);
			} catch (error) {
				setCatalog([]);
				setCatalogError(
					error instanceof Error
						? error.message
						: "Unable to load OpenRouter models",
				);
			} finally {
				setIsLoadingCatalog(false);
			}
		}, 500);

		return () => window.clearTimeout(timer);
	}, [apiKey, baseUrl, savedApiKeyMask]);

	function moveModel(index: number, direction: -1 | 1) {
		const nextIndex = index + direction;
		if (nextIndex < 0 || nextIndex >= models.length) {
			return;
		}
		const next = [...models];
		const [entry] = next.splice(index, 1);
		next.splice(nextIndex, 0, entry);
		onChange(next);
	}

	function removeModel(index: number) {
		onChange(models.filter((_, modelIndex) => modelIndex !== index));
	}

	function addModel(modelId: string) {
		const trimmed = modelId.trim();
		if (!trimmed || models.includes(trimmed)) {
			return;
		}
		onChange([...models, trimmed]);
		setPickerValue("");
	}

	return (
		<div className="space-y-3">
			<div>
				<p className="text-sm font-medium">Model failover chain</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Paid models only by default — avoids free-tier rate limits and keeps a
					consistent privacy posture. Add or reorder models; primary is tried
					first, then fallbacks.
				</p>
			</div>

			{models.length === 0 ? (
				<p className="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
					Add at least one model. DeepSeek V4 Flash (~$0.18/M output) is a good
					default for finance chat.
				</p>
			) : (
				<ul className="space-y-2">
					{models.map((modelId, index) => {
						const recommendation = getOpenRouterModelRecommendation(modelId);
						const catalogEntry = catalog.find((entry) => entry.id === modelId);
						const pricing = recommendation
							? formatOpenRouterModelPricing(
									recommendation.inputPerMillion,
									recommendation.outputPerMillion,
								)
							: catalogEntry
								? formatOpenRouterModelPricing(
										catalogEntry.inputPerMillion,
										catalogEntry.outputPerMillion,
									)
								: "Custom slug";

						return (
							<li
								key={`${modelId}-${index}`}
								className="flex items-start gap-2 rounded-md border border-border bg-panel px-3 py-2"
							>
								<div className="min-w-0 flex-1">
									<p className="text-xs font-medium text-muted-foreground">
										{index === 0 ? "Primary" : `Fallback ${index}`}
									</p>
									<p className="truncate text-sm font-medium text-foreground">
										{recommendation?.label ?? modelId}
									</p>
									<p className="truncate text-xs text-muted-foreground">
										{modelId} · {pricing}
									</p>
									{recommendation?.notes ? (
										<p className="mt-1 text-xs text-muted-foreground">
											{recommendation.notes}
										</p>
									) : null}
								</div>
								<div className="flex shrink-0 items-center gap-1">
									<button
										type="button"
										className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground disabled:opacity-40"
										onClick={() => moveModel(index, -1)}
										disabled={isDisabled || index === 0}
										aria-label="Move model up"
									>
										<ArrowUp className="size-4" />
									</button>
									<button
										type="button"
										className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground disabled:opacity-40"
										onClick={() => moveModel(index, 1)}
										disabled={isDisabled || index === models.length - 1}
										aria-label="Move model down"
									>
										<ArrowDown className="size-4" />
									</button>
									<button
										type="button"
										className="inline-flex size-8 items-center justify-center rounded-md border border-border text-destructive disabled:opacity-40"
										onClick={() => removeModel(index)}
										disabled={isDisabled}
										aria-label="Remove model"
									>
										<Trash2 className="size-4" />
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<div className="flex flex-col gap-2 sm:flex-row">
				<Select
					value={pickerValue}
					onValueChange={(value) => {
						setPickerValue(value);
						addModel(value);
					}}
					disabled={isDisabled || addOptions.length === 0}
				>
					<SelectTrigger className="h-10 w-full">
						<SelectValue
							placeholder={
								isLoadingCatalog
									? "Loading OpenRouter models..."
									: "Add a model to the chain"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{addOptions.map((option) => (
							<SelectItem key={option.id} value={option.id}>
								{option.label} · {option.pricing}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<button
					type="button"
					className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium disabled:opacity-60"
					disabled={isDisabled}
					onClick={() => {
						const merged = [...models];
						for (const modelId of OPENROUTER_DAILY_LIFE_MODEL_CHAIN) {
							if (!merged.includes(modelId)) {
								merged.push(modelId);
							}
						}
						onChange(merged);
					}}
				>
					<Plus className="size-4" />
					Add recommended set
				</button>
			</div>

			{catalogError ? (
				<p className="text-xs text-amber-700">{catalogError}</p>
			) : null}
		</div>
	);
}
