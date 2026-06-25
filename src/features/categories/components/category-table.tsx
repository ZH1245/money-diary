import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
	DataTable,
	DataTableColumnHeader,
} from "#/components/data-table/data-table";
import { DeleteRowButton } from "#/components/feedback/delete-row-button";
import { PageEmptyState } from "#/components/feedback/page-state";
import type { CategoryDto } from "#/features/categories/types/category";

interface CategoryTableProps {
	title: string;
	categories: CategoryDto[];
	userId: string;
	emptyMessage: string;
	canDelete?: boolean;
	onDelete?: (id: number, name: string) => void;
	isDeletePending?: boolean;
}

/** Renders a titled category table with optional delete actions. */
export function CategoryTable({
	title,
	categories,
	userId,
	emptyMessage,
	canDelete = false,
	onDelete,
	isDeletePending = false,
}: CategoryTableProps) {
	const columns = useMemo<ColumnDef<CategoryDto>[]>(() => {
		const baseColumns: ColumnDef<CategoryDto>[] = [
			{
				accessorKey: "name",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Name" />
				),
			},
			{
				accessorKey: "kind",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Kind" />
				),
				cell: ({ row }) => (
					<span className="capitalize">{row.original.kind}</span>
				),
			},
			{
				id: "scope",
				accessorFn: (row) => (row.userId === userId ? "Yours" : "Built-in"),
				header: ({ column }) => (
					<DataTableColumnHeader column={column} title="Scope" />
				),
			},
		];

		if (canDelete && onDelete) {
			baseColumns.push({
				id: "actions",
				enableSorting: false,
				enableGlobalFilter: false,
				header: () => <div className="text-right">Actions</div>,
				meta: { cellClassName: "w-[4.5rem]" },
				cell: ({ row }) => (
					<div className="flex justify-end">
						<DeleteRowButton
							label={row.original.name}
							isPending={isDeletePending}
							onConfirm={() => onDelete(row.original.id, row.original.name)}
						/>
					</div>
				),
			});
		}

		return baseColumns;
	}, [canDelete, isDeletePending, onDelete, userId]);

	return (
		<div>
			<h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{title}
			</h2>
			{categories.length ? (
				<div className="mt-3">
					<DataTable
						columns={columns}
						data={categories}
						filterPlaceholder="Filter by name, kind, or scope..."
						emptyMessage={emptyMessage}
					/>
				</div>
			) : (
				<div className="mt-3">
					<PageEmptyState message={emptyMessage} />
				</div>
			)}
		</div>
	);
}
