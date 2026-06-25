import { useMemo } from "react";
import { SearchableSelect } from "#/components/forms/searchable-select";
import type { GoalDto } from "#/features/goals/types/goal";

interface GoalSelectProps {
	value: string;
	onValueChange: (value: string) => void;
	goals: GoalDto[];
	disabled?: boolean;
	id?: string;
}

/**
 * Optional goal picker for savings entries.
 */
export function GoalSelect({
	value,
	onValueChange,
	goals,
	disabled,
	id,
}: GoalSelectProps) {
	const options = useMemo(
		() => [
			{ value: "none", label: "General savings" },
			...goals.map((goal) => ({
				value: String(goal.id),
				label: goal.title,
			})),
		],
		[goals],
	);

	return (
		<SearchableSelect
			id={id}
			value={value}
			onValueChange={onValueChange}
			options={options}
			placeholder="General savings"
			searchPlaceholder="Search goals..."
			emptyMessage="No goals found."
			disabled={disabled}
		/>
	);
}
