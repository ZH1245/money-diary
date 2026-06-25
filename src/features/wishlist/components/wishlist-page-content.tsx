import { Pencil, Plus, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
	PageContentSkeleton,
	PageEmptyState,
	PageErrorState,
} from "#/components/feedback/page-state";
import { SensitiveAmount } from "#/components/privacy/sensitive-amount";
import { SensitiveText } from "#/components/privacy/sensitive-text";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { parseLedgerAmount } from "#/features/shared/utils/amount";
import {
	useCreateWishlistMutation,
	useDeleteWishlistMutation,
	useUpdateWishlistMutation,
	useWishlistQuery,
} from "#/features/wishlist/hooks/use-wishlist";
import type { WishlistItemDto } from "#/features/wishlist/types/wishlist";
import {
	getDefaultWishlistForm,
	type WishlistFormState,
} from "#/features/wishlist/utils/wishlist-form";
import { cn } from "#/lib/utils";

interface WishlistPageContentProps {
	userCurrency: string;
}

const PRIORITY_BADGE: Record<WishlistItemDto["priority"], string> = {
	high: "bg-expense/15 text-expense",
	medium: "bg-soft-accent text-primary",
	low: "bg-track text-muted-foreground",
};

/** Picks a stable emoji for a wishlist item based on its title. */
function wishlistEmoji(title: string): string {
	const text = title.toLowerCase();
	if (/laptop|macbook|computer|pc/.test(text)) return "💻";
	if (/phone|iphone|android|pixel/.test(text)) return "📱";
	if (/camera|lens/.test(text)) return "📷";
	if (/headphone|earbud|airpod|audio|speaker/.test(text)) return "🎧";
	if (/watch/.test(text)) return "⌚";
	if (/car|vehicle/.test(text)) return "🚗";
	if (/bike|bicycle|cycle/.test(text)) return "🚲";
	if (/console|playstation|xbox|switch|game/.test(text)) return "🎮";
	if (/book|kindle/.test(text)) return "📚";
	if (/travel|trip|holiday|flight/.test(text)) return "✈️";
	if (/shoe|sneaker|trainer/.test(text)) return "👟";
	if (/furniture|sofa|desk|chair/.test(text)) return "🛋️";
	return "🛍️";
}

/** Wishlist page: header, item-card grid, and create/edit sheet. */
export function WishlistPageContent({
	userCurrency,
}: WishlistPageContentProps) {
	const { data: wishlist = [], isPending, isError, error } = useWishlistQuery();
	const createWishlistMutation = useCreateWishlistMutation();
	const updateWishlistMutation = useUpdateWishlistMutation();
	const deleteWishlistMutation = useDeleteWishlistMutation();
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const [editingItemId, setEditingItemId] = useState<number | null>(null);
	const [form, setForm] = useState<WishlistFormState>(getDefaultWishlistForm());

	const isEditing = editingItemId !== null;
	const isSaving =
		createWishlistMutation.isPending || updateWishlistMutation.isPending;

	const totalTargetAmount = wishlist.reduce(
		(accumulator, item) => accumulator + parseLedgerAmount(item.targetAmount),
		0,
	);

	const handleDeleteWishlistItem = useCallback(
		async (id: number, itemTitle: string) => {
			await toast.promise(deleteWishlistMutation.mutateAsync(id), {
				loading: "Deleting wishlist item...",
				success: `Deleted ${itemTitle}`,
				error: (message) =>
					message instanceof Error
						? message.message
						: "Unable to delete wishlist item",
			});
		},
		[deleteWishlistMutation],
	);

	const openCreateSheet = useCallback(() => {
		setEditingItemId(null);
		setForm(getDefaultWishlistForm());
		setIsSheetOpen(true);
	}, []);

	const openEditWishlistItem = useCallback((item: WishlistItemDto) => {
		setEditingItemId(item.id);
		setForm({
			title: item.title,
			targetAmount: item.targetAmount,
			currentAmount: item.currentAmount,
			priority: item.priority,
			status: item.status,
			note: item.note ?? "",
		});
		setIsSheetOpen(true);
	}, []);

	function handleSheetOpenChange(open: boolean) {
		setIsSheetOpen(open);
		if (!open) {
			setEditingItemId(null);
			setForm(getDefaultWishlistForm());
		}
	}

	async function handleSaveWishlistItem(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!form.title.trim() || !form.targetAmount.trim()) {
			toast.error("Title and target amount are required");
			return;
		}

		if (isEditing && editingItemId) {
			await toast.promise(
				updateWishlistMutation.mutateAsync({
					id: editingItemId,
					input: {
						title: form.title.trim(),
						targetAmount: form.targetAmount.trim(),
						currentAmount: form.currentAmount.trim() || "0",
						priority: form.priority,
						status: form.status,
						note: form.note.trim() || null,
					},
				}),
				{
					loading: "Updating wishlist item...",
					success: "Wishlist item updated",
					error: (message) =>
						message instanceof Error
							? message.message
							: "Unable to update wishlist item",
				},
			);
		} else {
			await toast.promise(
				createWishlistMutation.mutateAsync({
					title: form.title.trim(),
					targetAmount: form.targetAmount.trim(),
					priority: form.priority,
				}),
				{
					loading: "Adding wishlist item...",
					success: "Wishlist item added",
					error: (message) =>
						message instanceof Error
							? message.message
							: "Unable to add wishlist item",
				},
			);
		}

		setEditingItemId(null);
		setForm(getDefaultWishlistForm());
		setIsSheetOpen(false);
	}

	return (
		<main className="p-6 md:p-8">
			<div className="mx-auto max-w-5xl">
				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-extrabold tracking-tight text-foreground">
							Wishlist
						</h1>
						<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
							<span>
								{wishlist.length} {wishlist.length === 1 ? "item" : "items"}
							</span>
							<span aria-hidden="true">·</span>
							<span className="font-num tabular-nums">
								<SensitiveAmount
									amount={totalTargetAmount}
									currency={userCurrency}
								/>{" "}
								total
							</span>
						</p>
					</div>
					<Button className="shrink-0 gap-2" onClick={openCreateSheet}>
						<Plus className="size-4" />
						Add item
					</Button>
				</header>

				{isPending ? (
					<div className="mt-6">
						<PageContentSkeleton tableColumns={4} />
					</div>
				) : null}
				{isError ? (
					<div className="mt-6">
						<PageErrorState message={error.message} />
					</div>
				) : null}

				{!isPending && !isError ? (
					wishlist.length ? (
						<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{wishlist.map((item) => (
								<WishlistCard
									key={item.id}
									item={item}
									userCurrency={userCurrency}
									onEdit={() => openEditWishlistItem(item)}
									onDelete={() =>
										void handleDeleteWishlistItem(item.id, item.title)
									}
									isDeletePending={deleteWishlistMutation.isPending}
								/>
							))}
						</div>
					) : (
						<div className="mt-6">
							<PageEmptyState message="No wishlist items yet." />
						</div>
					)
				) : null}

				<Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
					<SheetContent className="w-full sm:max-w-md">
						<SheetHeader>
							<SheetTitle>
								{isEditing ? "Edit wishlist item" : "Add wishlist item"}
							</SheetTitle>
							<SheetDescription>
								{isEditing
									? "Update item details and saved progress."
									: "Add something you want to save toward."}
							</SheetDescription>
						</SheetHeader>
						<form className="grid gap-4 px-4" onSubmit={handleSaveWishlistItem}>
							<div className="grid gap-2">
								<label htmlFor="wishlist-title" className="text-sm font-medium">
									Title
								</label>
								<Input
									id="wishlist-title"
									value={form.title}
									onChange={(event) =>
										setForm((state) => ({
											...state,
											title: event.target.value,
										}))
									}
									placeholder="e.g. New laptop"
								/>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="grid gap-2">
									<label
										htmlFor="wishlist-target-amount"
										className="text-sm font-medium"
									>
										Target amount
									</label>
									<Input
										id="wishlist-target-amount"
										type="number"
										value={form.targetAmount}
										onChange={(event) =>
											setForm((state) => ({
												...state,
												targetAmount: event.target.value,
											}))
										}
										placeholder="0.00"
									/>
								</div>
								{isEditing ? (
									<div className="grid gap-2">
										<label
											htmlFor="wishlist-current-amount"
											className="text-sm font-medium"
										>
											Saved so far
										</label>
										<Input
											id="wishlist-current-amount"
											type="number"
											value={form.currentAmount}
											onChange={(event) =>
												setForm((state) => ({
													...state,
													currentAmount: event.target.value,
												}))
											}
										/>
									</div>
								) : (
									<div className="grid gap-2">
										<label
											htmlFor="wishlist-priority-create"
											className="text-sm font-medium"
										>
											Priority
										</label>
										<Select
											value={form.priority}
											onValueChange={(value) =>
												setForm((state) => ({
													...state,
													priority: value as WishlistFormState["priority"],
												}))
											}
										>
											<SelectTrigger
												id="wishlist-priority-create"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="low">Low</SelectItem>
												<SelectItem value="medium">Medium</SelectItem>
												<SelectItem value="high">High</SelectItem>
											</SelectContent>
										</Select>
									</div>
								)}
							</div>
							{isEditing ? (
								<div className="grid grid-cols-2 gap-3">
									<div className="grid gap-2">
										<label
											htmlFor="wishlist-priority-edit"
											className="text-sm font-medium"
										>
											Priority
										</label>
										<Select
											value={form.priority}
											onValueChange={(value) =>
												setForm((state) => ({
													...state,
													priority: value as WishlistFormState["priority"],
												}))
											}
										>
											<SelectTrigger
												id="wishlist-priority-edit"
												className="w-full"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="low">Low</SelectItem>
												<SelectItem value="medium">Medium</SelectItem>
												<SelectItem value="high">High</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="grid gap-2">
										<label
											htmlFor="wishlist-status"
											className="text-sm font-medium"
										>
											Status
										</label>
										<Select
											value={form.status}
											onValueChange={(value) =>
												setForm((state) => ({
													...state,
													status: value as WishlistFormState["status"],
												}))
											}
										>
											<SelectTrigger id="wishlist-status" className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="active">Active</SelectItem>
												<SelectItem value="paused">Paused</SelectItem>
												<SelectItem value="completed">Completed</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							) : null}
							{isEditing ? (
								<div className="grid gap-2">
									<label
										htmlFor="wishlist-note"
										className="text-sm font-medium"
									>
										Note (optional)
									</label>
									<Input
										id="wishlist-note"
										value={form.note}
										onChange={(event) =>
											setForm((state) => ({
												...state,
												note: event.target.value,
											}))
										}
										placeholder="Any details"
									/>
								</div>
							) : null}
							<SheetFooter className="px-0">
								<Button type="submit" disabled={isSaving} className="w-full">
									{isSaving
										? "Saving..."
										: isEditing
											? "Save changes"
											: "Add item"}
								</Button>
							</SheetFooter>
						</form>
					</SheetContent>
				</Sheet>
			</div>
		</main>
	);
}

interface WishlistCardProps {
	item: WishlistItemDto;
	userCurrency: string;
	onEdit: () => void;
	onDelete: () => void;
	isDeletePending: boolean;
}

/** A wishlist item rendered as a panel card with an emoji banner. */
function WishlistCard({
	item,
	userCurrency,
	onEdit,
	onDelete,
	isDeletePending,
}: WishlistCardProps) {
	const current = parseLedgerAmount(item.currentAmount);
	const target = parseLedgerAmount(item.targetAmount);
	const percent =
		target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
	const isComplete = target > 0 && current >= target;

	return (
		<article className="flex flex-col overflow-hidden rounded-panel border border-border bg-panel shadow-sm">
			<div className="relative flex h-24 items-center justify-center bg-soft-accent">
				<span className="text-4xl" aria-hidden="true">
					{wishlistEmoji(item.title)}
				</span>
				<span
					className={cn(
						"absolute left-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
						PRIORITY_BADGE[item.priority],
					)}
				>
					{item.priority}
				</span>
				<div className="absolute right-2 top-2 flex items-center gap-1">
					<button
						type="button"
						onClick={onEdit}
						aria-label={`Edit ${item.title}`}
						className="rounded-md bg-panel/70 p-1.5 text-muted-foreground hover:text-foreground"
					>
						<Pencil className="size-4" />
					</button>
					<button
						type="button"
						onClick={onDelete}
						disabled={isDeletePending}
						aria-label={`Delete ${item.title}`}
						className="rounded-md bg-panel/70 p-1.5 text-muted-foreground hover:text-expense disabled:opacity-50"
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</div>

			<div className="flex flex-1 flex-col p-[22px] pt-4">
				<h2 className="truncate font-semibold text-foreground">
					<SensitiveText text={item.title} />
				</h2>

				<div className="mt-3 flex items-end justify-between gap-2">
					<p className="font-num text-lg font-extrabold tracking-tight tabular-nums text-foreground">
						<SensitiveAmount
							amount={item.currentAmount}
							currency={userCurrency}
						/>
					</p>
					<p className="font-num text-sm tabular-nums text-muted-foreground">
						/{" "}
						<SensitiveAmount
							amount={item.targetAmount}
							currency={userCurrency}
						/>
					</p>
				</div>

				<div className="mt-2 h-2 overflow-hidden rounded-full bg-track">
					<div
						className={cn(
							"h-full rounded-full transition-all",
							isComplete ? "bg-income" : "bg-primary",
						)}
						style={{ width: `${percent}%` }}
					/>
				</div>

				<div className="mt-2 flex items-center justify-between text-xs">
					<span
						className={cn(
							"font-num font-semibold tabular-nums",
							isComplete ? "text-income" : "text-primary",
						)}
					>
						{percent}%
					</span>
					<span className="capitalize text-muted-foreground">
						{item.status}
					</span>
				</div>
			</div>
		</article>
	);
}
