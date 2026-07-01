import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataTableColumnHeader } from "#/components/data-table/data-table-column-header";
import { PrivacyModeToggle } from "#/components/privacy/privacy-mode-toggle";
import { Checkbox } from "#/components/ui/checkbox";
import { Input } from "#/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils.ts";

interface DataTableBulkActionsContext<TData> {
	selectedRows: TData[];
	clearSelection: () => void;
}

interface DataTableProps<TData> {
	columns: ColumnDef<TData, unknown>[];
	data: TData[];
	filterPlaceholder?: string;
	emptyMessage?: string;
	showToolbar?: boolean;
	showPrivacyToggle?: boolean;
	initialSorting?: SortingState;
	maxBodyHeight?: number;
	rowHeightEstimate?: number;
	fillWidth?: boolean;
	toolbarStart?: ReactNode;
	belowToolbar?: ReactNode;
	enableRowSelection?: boolean;
	getRowId?: (row: TData) => string;
	bulkActions?: (context: DataTableBulkActionsContext<TData>) => ReactNode;
}

/**
 * Reusable TanStack Table with sorting and global text filter.
 */
export function DataTable<TData>({
	columns,
	data,
	filterPlaceholder = "Filter rows...",
	emptyMessage = "No rows found.",
	showToolbar = true,
	showPrivacyToggle = false,
	initialSorting = [],
	maxBodyHeight = 460,
	rowHeightEstimate = 56,
	fillWidth = false,
	toolbarStart,
	belowToolbar,
	enableRowSelection = false,
	getRowId,
	bulkActions,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

	const selectionColumn = useMemo<ColumnDef<TData>>(
		() => ({
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected()
							? true
							: table.getIsSomePageRowsSelected()
								? "indeterminate"
								: false
					}
					onCheckedChange={(value) =>
						table.toggleAllPageRowsSelected(value === true)
					}
					aria-label="Select all rows"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(value === true)}
					aria-label={`Select row ${row.index + 1}`}
				/>
			),
			enableSorting: false,
			enableGlobalFilter: false,
			meta: { cellClassName: "w-10 pr-0" },
		}),
		[],
	);

	const tableColumns = useMemo(
		() => (enableRowSelection ? [selectionColumn, ...columns] : columns),
		[columns, enableRowSelection, selectionColumn],
	);

	const table = useReactTable({
		data,
		columns: tableColumns,
		state: {
			sorting,
			globalFilter,
			rowSelection,
		},
		enableRowSelection,
		getRowId,
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		globalFilterFn: "includesString",
	});

	const rows = table.getRowModel().rows;
	const selectedRows = table
		.getSelectedRowModel()
		.rows.map((row) => row.original);

	useEffect(() => {
		setRowSelection({});
	}, [data]);

	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => scrollContainerRef.current,
		estimateSize: () => rowHeightEstimate,
		overscan: 8,
	});
	const virtualRows = rowVirtualizer.getVirtualItems();
	const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
	const paddingBottom =
		virtualRows.length > 0
			? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
			: 0;

	return (
		<div className="space-y-3">
			{showToolbar ? (
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						{toolbarStart}
						{enableRowSelection && bulkActions
							? bulkActions({
									selectedRows,
									clearSelection: () => setRowSelection({}),
								})
							: null}
						<div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
							{showPrivacyToggle ? <PrivacyModeToggle compact /> : null}
							<Input
								value={globalFilter}
								onChange={(event) => setGlobalFilter(event.target.value)}
								placeholder={filterPlaceholder}
								className={cn(
									"h-8 min-w-0 flex-1 sm:flex-none",
									fillWidth ? "w-full" : "sm:w-60",
								)}
								aria-label="Filter table rows"
							/>
						</div>
					</div>
					{belowToolbar}
				</div>
			) : null}

			<div className="rounded-xl border border-border w-full">
				<div
					ref={scrollContainerRef}
					className={cn(
						maxBodyHeight != null ? "overflow-auto" : "overflow-x-auto",
						maxBodyHeight != null && "scrollbar-gutter-stable",
					)}
					style={
						maxBodyHeight != null
							? { maxHeight: `${maxBodyHeight}px` }
							: undefined
					}
				>
					<Table
						className={cn(
							"w-full",
							fillWidth || maxBodyHeight != null
								? "table-fixed"
								: "min-w-[720px]",
						)}
					>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className={cn(
												"sticky top-0 z-10 bg-background px-3 shadow-[inset_0_-1px_0_var(--border)]",
												(
													header.column.columnDef.meta as
														| { headerClassName?: string }
														| undefined
												)?.headerClassName,
											)}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{rows.length ? (
								<>
									{paddingTop > 0 ? (
										<TableRow aria-hidden="true">
											<TableCell
												colSpan={tableColumns.length}
												className="p-0"
												style={{ height: paddingTop }}
											/>
										</TableRow>
									) : null}
									{virtualRows.map((virtualRow) => {
										const row = rows[virtualRow.index];
										return (
											<TableRow
												key={row.id}
												data-state={row.getIsSelected() ? "selected" : undefined}
											>
												{row.getVisibleCells().map((cell) => (
													<TableCell
														key={cell.id}
														className={cn(
															"px-3 py-2 align-top whitespace-normal",
															(
																cell.column.columnDef.meta as
																	| { cellClassName?: string }
																	| undefined
															)?.cellClassName,
														)}
													>
														{flexRender(
															cell.column.columnDef.cell,
															cell.getContext(),
														)}
													</TableCell>
												))}
											</TableRow>
										);
									})}
									{paddingBottom > 0 ? (
										<TableRow aria-hidden="true">
											<TableCell
												colSpan={tableColumns.length}
												className="p-0"
												style={{ height: paddingBottom }}
											/>
										</TableRow>
									) : null}
								</>
							) : (
								<TableRow>
									<TableCell
										colSpan={tableColumns.length}
										className="h-24 text-center text-sm opacity-70"
									>
										{data.length ? "No rows match your filter." : emptyMessage}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}

export { DataTableColumnHeader };
