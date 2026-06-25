import { Store } from "@tanstack/react-store";

interface QuickAddTransactionState {
	isOpen: boolean;
}

/**
 * Controls the app-wide quick-add transaction sheet so the mobile FAB and the
 * transactions page "Create" button can open the same create form as an overlay
 * on whichever page the user is currently viewing.
 */
export const quickAddTransactionStore = new Store<QuickAddTransactionState>({
	isOpen: false,
});

/**
 * Opens the quick-add transaction sheet.
 */
export function openQuickAddTransaction() {
	quickAddTransactionStore.setState(() => ({ isOpen: true }));
}

/**
 * Sets the quick-add transaction sheet open state explicitly.
 */
export function setQuickAddTransactionOpen(isOpen: boolean) {
	quickAddTransactionStore.setState(() => ({ isOpen }));
}
