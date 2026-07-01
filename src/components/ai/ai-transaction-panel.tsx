import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import {
	AlertTriangle,
	CheckCircle2,
	History,
	MessageSquarePlus,
	SendHorizonal,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { cva } from "class-variance-authority";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { toolbarIconButtonClass } from "#/components/layout/toolbar-control-styles";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "#/components/ui/sheet";
import { Textarea } from "#/components/ui/textarea";
import { useAiChatMutation } from "#/features/ai/hooks/use-ai-chat";
import {
	useAiConversationQuery,
	useAiConversationsQuery,
	useDeleteAiConversationMutation,
} from "#/features/ai/hooks/use-ai-conversations";
import { formatAiProviderError } from "#/features/ai/server/format-ai-provider-error";
import {
	activeAiConversationStore,
	setActiveAiConversationId,
} from "#/features/ai/store/active-ai-conversation-store";
import type {
	AiConversationDetail,
	AiConversationMessage,
} from "#/features/ai/types/ai-conversation";
import {
	AI_CHAT_MESSAGE_LIMIT_BULK,
	getMessageContentCharLimit,
	isBulkPasteContent,
} from "#/features/ai/utils/ai-bulk-paste";
import { queryKeys } from "#/features/query-keys";
import { useIsMobile } from "#/hooks/use-is-mobile";
import { cn } from "#/lib/utils";
import { useAuthSession } from "#/lib/use-auth-session";
import { getPusherClient } from "#/lib/pusher-client";
import type { Channel } from "pusher-js";
import { getAiActionDisplayLabel } from "#/features/ai/utils/ai-progress-message";

interface ThreadMessage {
	id?: number;
	role: "user" | "assistant";
	text: string;
	ok?: boolean;
	isError?: boolean;
	isWarning?: boolean;
	action?: string;
	steps?: Array<{ action: string; success: boolean }>;
	createdAt?: string;
}

interface AiTransactionPanelProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const ACTION_LABELS: Record<string, string> = {
	create_transaction: "Transaction logged",
	update_transaction: "Transaction updated",
	create_transfer: "Transfer recorded",
	create_recurring_rule: "Recurring entry set up",
	update_recurring_rule: "Recurring entry updated",
	create_scheduled_transaction: "Transaction scheduled",
	create_saving: "Saving recorded",
	create_payment_account: "Account added",
	update_payment_account: "Account updated",
	create_goal: "Goal created",
	create_wishlist_item: "Wishlist item added",
	update_wishlist_item: "Wishlist updated",
	delete_wishlist_item: "Wishlist item removed",
	update_goal: "Goal updated",
	delete_goal: "Goal removed",
	get_exchange_rate: "Exchange rate",
	query_user_data: "Data lookup",
	chained: "Multiple actions",
};

const ACTION_ROUTE_MAP: Partial<Record<string, string>> = {
	create_transaction: "/transactions",
	update_transaction: "/transactions",
	create_transfer: "/transactions",
	create_saving: "/savings",
	create_payment_account: "/accounts",
	update_payment_account: "/accounts",
	create_goal: "/goals",
	update_goal: "/goals",
	delete_goal: "/goals",
	create_wishlist_item: "/wishlist",
	update_wishlist_item: "/wishlist",
	delete_wishlist_item: "/wishlist",
};

const ACTION_LINK_LABELS: Partial<Record<string, string>> = {
	create_transaction: "View in Expenses",
	update_transaction: "View in Expenses",
	create_transfer: "View in Transactions",
	create_saving: "View in Savings",
	create_payment_account: "View Accounts",
	update_payment_account: "View Accounts",
	create_goal: "View Goals",
	update_goal: "View Goals",
	delete_goal: "View Goals",
	create_wishlist_item: "View Wishlist",
	update_wishlist_item: "View Wishlist",
	delete_wishlist_item: "View Wishlist",
};

const EXAMPLES = [
	"Paid 4,500 for groceries from my HBL card",
	"Netflix 2,500 charged to JazzCash",
	"Add a goal to save 500k for a laptop by December",
	"Update yesterday's petrol expense to 3,500",
	"How much did I spend on food this month?",
	"Put 15,000 from salary into savings",
];

const chatBubbleVariants = cva(
	"max-w-[84%] px-3 py-1.5 text-sm leading-snug shadow-none rounded-[1.125rem]",
	{
		variants: {
			role: {
				user: "rounded-br-[0.3rem] whitespace-pre-wrap bg-primary text-primary-foreground",
				assistant: "rounded-bl-[0.3rem]",
			},
			variant: {
				default: "",
				error: "",
				warning: "",
				success: "",
			},
		},
		compoundVariants: [
			{
				role: "assistant",
				variant: "default",
				class: "bg-soft-accent text-foreground",
			},
			{
				role: "assistant",
				variant: "error",
				class:
					"border border-destructive/30 bg-destructive/10 text-destructive",
			},
			{
				role: "assistant",
				variant: "warning",
				class: "border border-chart-4/40 bg-chart-4/10 text-chart-4",
			},
			{
				role: "assistant",
				variant: "success",
				class: "border border-income/30 bg-income/10 text-income",
			},
		],
		defaultVariants: {
			role: "assistant",
			variant: "default",
		},
	},
);

/**
 * Renders AI assistant text as full Markdown (GFM) scoped to the chat bubble.
 * Raw HTML is intentionally not rendered (no rehype-raw).
 */
function AiMessageText({ text }: { text: string }) {
	return (
		<div className="prose prose-sm max-w-none text-current prose-headings:my-1 prose-headings:text-current prose-p:my-1 prose-p:text-current prose-li:my-0 prose-ul:my-1 prose-ul:list-disc prose-ul:pl-4 prose-ol:my-1 prose-ol:list-decimal prose-ol:pl-4 prose-strong:text-current prose-blockquote:my-1 prose-blockquote:border-current/30 prose-blockquote:text-current/80 prose-hr:my-2 prose-code:rounded prose-code:bg-current/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none prose-pre:my-1.5 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:rounded-lg prose-pre:p-2 prose-pre:text-xs prose-a:font-medium prose-a:text-current prose-a:underline prose-a:underline-offset-2">
			<Markdown
				remarkPlugins={[remarkGfm]}
				components={{
					a: ({ node: _node, ...props }) => (
						<a {...props} target="_blank" rel="noreferrer" />
					),
					table: ({ node: _node, ...props }) => (
						<div className="max-w-full overflow-x-auto">
							<table {...props} />
						</div>
					),
				}}
			>
				{text}
			</Markdown>
		</div>
	);
}

/**
 * Formats assistant text for display, including legacy raw provider errors.
 */
function formatThreadMessageText(content: string, isError?: boolean): string {
	if (
		isError ||
		/generativelanguage\.googleapis|help\.googleapis|Quota exceeded for metric|google\.rpc/i.test(
			content,
		)
	) {
		return formatAiProviderError(content);
	}
	return content;
}

function formatMessageTime(createdAt: string): string {
	const date = new Date(createdAt);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	if (isToday) {
		return date.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		});
	}
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * Maps persisted conversation messages into renderable thread bubbles.
 */
function mapConversationMessage(message: AiConversationMessage): ThreadMessage {
	const isError = message.metadata?.action === "provider_error";
	return {
		id: message.id,
		role: message.role,
		text: formatThreadMessageText(message.content, isError),
		ok: isError ? false : message.metadata?.ok,
		isError,
		action: message.metadata?.action,
		steps: message.metadata?.steps,
		createdAt: message.createdAt,
	};
}

/**
 * Builds an optimistic assistant row for the chat thread.
 */
function buildAssistantThreadMessage(
	content: string,
	options: {
		isError?: boolean;
		isWarning?: boolean;
		ok?: boolean;
		action?: string;
		steps?: Array<{ action: string; success: boolean }>;
	} = {},
): ThreadMessage {
	return {
		id: -(Date.now() + 1),
		role: "assistant",
		text: formatThreadMessageText(content, options.isError),
		isError: options.isError,
		isWarning: options.isWarning,
		ok: options.ok,
		action: options.action,
		steps: options.steps,
		createdAt: new Date().toISOString(),
	};
}

/**
 * Side panel AI assistant with persisted conversations across navigation.
 */
interface AiProgressEvent {
	phase: "thinking" | "step" | "done";
	message?: string;
	index?: number;
	total?: number;
}

export function AiTransactionPanel({
	open,
	onOpenChange,
}: AiTransactionPanelProps) {
	const [prompt, setPrompt] = useState("");
	const [pendingMessages, setPendingMessages] = useState<ThreadMessage[]>([]);
	const [historyFeedback, setHistoryFeedback] = useState<string | null>(null);
	const [aiProgress, setAiProgress] = useState<AiProgressEvent | null>(null);
	const activeConversationId = useStore(
		activeAiConversationStore,
		(state) => state.conversationId,
	);
	const mutation = useAiChatMutation();
	const isBulkPasteDraft = useMemo(() => isBulkPasteContent(prompt), [prompt]);
	const promptCharLimit = useMemo(
		() => getMessageContentCharLimit(prompt),
		[prompt],
	);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const deleteConversationMutation = useDeleteAiConversationMutation();
	const conversationsQuery = useAiConversationsQuery(open);
	const conversationQuery = useAiConversationQuery(activeConversationId);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const panelOpenRef = useRef(open);
	const isMobile = useIsMobile();
	const { data: session } = useAuthSession();
	const currentUserId = session?.user?.id ?? null;

	useEffect(() => {
		panelOpenRef.current = open;
	}, [open]);

	/** Scrolls the chat container to the very bottom. */
	function scrollToBottom(behavior: ScrollBehavior = "smooth") {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const el = scrollContainerRef.current;
				if (!el) return;
				el.scrollTo({ top: el.scrollHeight, behavior });
			});
		});
	}

	/** Sonner only when the chat panel is closed — inline bubbles handle feedback while open. */
	function shouldUseToast() {
		return !panelOpenRef.current;
	}

	function appendAssistantMessageToThread(
		conversationId: number | null,
		assistantMessage: ThreadMessage,
	) {
		if (conversationId == null) {
			setPendingMessages((current) => [...current, assistantMessage]);
			return;
		}

		queryClient.setQueryData<AiConversationDetail | undefined>(
			queryKeys.ai.conversation(conversationId),
			(current) => {
				if (!current) return current;
				return {
					...current,
					messages: [
						...current.messages,
						{
							id: assistantMessage.id ?? -(Date.now() + 1),
							role: "assistant" as const,
							content: assistantMessage.text,
							metadata: {
								action: assistantMessage.isError
									? "provider_error"
									: assistantMessage.action,
								ok: assistantMessage.ok,
								steps: assistantMessage.steps,
							},
							createdAt: new Date().toISOString(),
						},
					],
				};
			},
		);
	}

	const persistedThread = useMemo(
		() => (conversationQuery.data?.messages ?? []).map(mapConversationMessage),
		[conversationQuery.data?.messages],
	);

	const thread =
		activeConversationId == null && pendingMessages.length > 0
			? pendingMessages
			: persistedThread;

	const chatClosed = conversationQuery.data?.isClosed ?? false;
	const savedChats = conversationsQuery.data ?? [];
	const historyLabel =
		activeConversationId == null
			? pendingMessages.length > 0
				? "Sending..."
				: "Start typing below"
			: (conversationQuery.data?.title ?? "Loading...");

	// Snap to bottom when panel opens or conversation switches
	useEffect(() => {
		if (!open) return;
		scrollToBottom("instant");
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, thread]);

	// Smooth scroll when a new send starts or progress arrives
	useEffect(() => {
		if (!open) return;
		scrollToBottom("smooth");
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [mutation.isPending, aiProgress]);

	// Subscribe to per-user Pusher progress events while panel is open
	useEffect(() => {
		if (!open || !currentUserId) return;

		let cancelled = false;
		let channel: Channel | null = null;

		void getPusherClient().then((pusher) => {
			if (!pusher || cancelled) return;
			const channelName = `private-user-${currentUserId}`;
			channel = pusher.subscribe(channelName);
			channel.bind("ai_progress", (data: AiProgressEvent) => {
				if (cancelled) return;
				if (data.phase === "done") {
					setAiProgress(null);
				} else {
					setAiProgress(data);
				}
			});
		});

		return () => {
			cancelled = true;
			setAiProgress(null);
			if (channel) {
				channel.unbind("ai_progress");
				channel.unsubscribe();
			}
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, currentUserId]);

	function handleNewChat() {
		setActiveAiConversationId(null);
		setPendingMessages([]);
		setPrompt("");
	}

	function handleSelectConversation(conversationId: number) {
		setActiveAiConversationId(conversationId);
		setPrompt("");
	}

	async function handleDeleteConversation(conversationId: number) {
		setHistoryFeedback(null);
		try {
			await deleteConversationMutation.mutateAsync(conversationId);
			if (activeConversationId === conversationId) {
				const fallback = savedChats.find(
					(entry) => entry.id !== conversationId,
				);
				setActiveAiConversationId(fallback?.id ?? null);
			}
			if (shouldUseToast()) {
				toast.success("Chat deleted");
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Unable to delete chat";
			if (shouldUseToast()) {
				toast.error(message);
			} else {
				setHistoryFeedback(message);
			}
		}
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (chatClosed) return;

		const text = prompt.trim();
		if (!text) return;

		const charLimit = getMessageContentCharLimit(text);
		if (text.length > charLimit) {
			toast.error(
				charLimit > 1200
					? `Pasted list is too long (${text.length.toLocaleString()} chars). Split into smaller chunks (max ${charLimit.toLocaleString()}).`
					: "Message is too long.",
			);
			return;
		}

		setPrompt("");

		if (activeConversationId == null) {
			setPendingMessages((current) => [
				...current,
				{ role: "user", text, createdAt: new Date().toISOString() },
			]);
		} else {
			queryClient.setQueryData<AiConversationDetail | undefined>(
				queryKeys.ai.conversation(activeConversationId),
				(current) => {
					if (!current) return current;
					return {
						...current,
						messages: [
							...current.messages,
							{
								id: -Date.now(),
								role: "user" as const,
								content: text,
								metadata: null,
								createdAt: new Date().toISOString(),
							},
						],
					};
				},
			);
		}

		try {
			const result = await mutation.mutateAsync({
				conversationId: activeConversationId ?? undefined,
				message: text,
			});

			setPendingMessages([]);
			setAiProgress(null);

			if (result.conversationId) {
				queryClient.setQueryData<AiConversationDetail>(
					queryKeys.ai.conversation(result.conversationId),
					(current) => {
						const title = text.trim().slice(0, 80) || "New chat";
						const userMessage = {
							id: -Date.now(),
							role: "user" as const,
							content: text,
							metadata: null,
							createdAt: new Date().toISOString(),
						};
						const assistantText = result.message ?? result.error;
						const assistantMessage =
							assistantText != null
								? {
										id: -(Date.now() + 1),
										role: "assistant" as const,
										content: assistantText,
										metadata: {
											action:
												result.action === "provider_error"
													? "provider_error"
													: result.action,
											ok:
												result.action !== "provider_error" &&
												result.action !== "clarification" &&
												(result.steps?.length
													? result.steps.every((step) => step.success)
													: result.success),
											steps: result.steps?.map((step) => ({
												action: step.action,
												success: step.success,
											})),
										},
										createdAt: new Date().toISOString(),
									}
								: null;

						if (!current) {
							return {
								id: result.conversationId!,
								title,
								isClosed: Boolean(result.closeChat),
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
								messages: assistantMessage
									? [userMessage, assistantMessage]
									: [userMessage],
							};
						}

						return {
							...current,
							title: current.title === "New chat" ? title : current.title,
							messages: assistantMessage
								? [...current.messages, assistantMessage]
								: current.messages,
						};
					},
				);
			}

			if (result.closeChat) {
				if (shouldUseToast()) {
					toast.error("AI chat closed for security reasons.");
				}
				return;
			}

			if (!result.success && result.error) {
				if (shouldUseToast()) {
					toast.error(result.error);
				}
				return;
			}

			if (result.warning) {
				if (shouldUseToast()) {
					toast.warning(result.warning);
				} else if (result.conversationId) {
					appendAssistantMessageToThread(
						result.conversationId,
						buildAssistantThreadMessage(result.warning, { isWarning: true }),
					);
				}
			}

			if (result.action === "clarification") {
				return;
			}

			if (result.steps?.length) {
				const allOk = result.steps.every((step) => step.success);
				if (shouldUseToast()) {
					if (allOk) {
						const label =
							result.action === "chained"
								? `${result.steps.length} entries created`
								: (ACTION_LABELS[result.action ?? ""] ?? "Entry created");
						toast.success(label);
					} else {
						toast.error("Some actions could not be completed.");
					}
				}
				if (allOk && result.navigateTo && shouldUseToast()) {
					void navigate({ to: result.navigateTo });
				}
				return;
			}

			if (
				result.success &&
				result.message &&
				result.action &&
				result.action !== "chained"
			) {
				if (shouldUseToast()) {
					toast.success(ACTION_LABELS[result.action] ?? "Entry created");
					if (result.navigateTo) {
						void navigate({ to: result.navigateTo });
					}
				}
			}
		} catch (error) {
			setAiProgress(null);
			const message =
				error instanceof Error ? error.message : "Request failed.";
			const errorMessage = buildAssistantThreadMessage(message, {
				isError: true,
				action: "provider_error",
			});
			const conversationId =
				activeConversationId ?? mutation.data?.conversationId ?? null;

			if (conversationId == null) {
				setPendingMessages((current) => [...current, errorMessage]);
			} else {
				appendAssistantMessageToThread(conversationId, errorMessage);
			}

			if (shouldUseToast()) {
				toast.error(message);
			}
		}
	}

	function handlePromptKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (event.key !== "Enter" || event.shiftKey || isMobile) {
			return;
		}

		event.preventDefault();
		event.currentTarget.form?.requestSubmit();
	}

	function handleExampleClick(example: string) {
		setPrompt(example);
	}

	const isLoadingConversation =
		activeConversationId != null && conversationQuery.isLoading;
	const showEmptyState =
		!isLoadingConversation &&
		thread.length === 0 &&
		!chatClosed &&
		pendingMessages.length === 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side={isMobile ? "bottom" : "right"}
				showCloseButton={false}
				className={
					isMobile
						? "flex h-[80vh] w-full flex-col gap-0 rounded-t-[1.5rem] border-t border-border bg-panel p-0"
						: "flex w-full flex-col gap-0 border-l border-border bg-panel p-0 sm:max-w-md"
				}
			>
				<SheetTitle className="sr-only">AI Assistant</SheetTitle>
				<header className="space-y-0 border-b border-border px-4 py-3.5">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2.5">
							<span className="grid size-9 place-items-center rounded-xl bg-soft-accent text-primary">
								<Sparkles className="size-[18px]" />
							</span>
							<div className="flex flex-col">
								<span className="text-sm font-bold leading-tight text-foreground">
									AI Assistant
								</span>
								<span className="flex items-center gap-1.5 text-[11px] font-medium text-income">
									<span
										className="size-1.5 rounded-full bg-income"
										aria-hidden
									/>
									Online
								</span>
							</div>
						</div>
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							aria-label="Close AI assistant"
							className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-soft-accent hover:text-foreground"
						>
							<X className="size-4" />
						</button>
					</div>

					<div className="mt-3 flex items-center gap-1.5">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="outline"
									className="min-w-0 flex-1 justify-start gap-2 px-4 py-2 font-normal"
								>
									<History className="size-3.5 shrink-0 opacity-70" />
									<span className="truncate">{historyLabel}</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								className="w-[min(20rem,calc(100vw-2rem))]"
							>
								<DropdownMenuLabel>Saved chats</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleNewChat}>
									<MessageSquarePlus className="size-4" />
									<span>New chat</span>
								</DropdownMenuItem>
								{savedChats.length > 0 ? <DropdownMenuSeparator /> : null}
								{savedChats.length === 0 ? (
									<DropdownMenuItem disabled>
										No saved chats yet
									</DropdownMenuItem>
								) : (
									savedChats.map((conversation) => (
										<DropdownMenuItem
											key={conversation.id}
											className="flex items-center justify-between gap-2"
											onClick={() => handleSelectConversation(conversation.id)}
										>
											<span className="truncate">{conversation.title}</span>
											<button
												type="button"
												className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
												aria-label={`Delete ${conversation.title}`}
												onClick={(event) => {
													event.stopPropagation();
													void handleDeleteConversation(conversation.id);
												}}
											>
												<Trash2 className="size-3.5" />
											</button>
										</DropdownMenuItem>
									))
								)}
							</DropdownMenuContent>
						</DropdownMenu>

						<Button
							type="button"
							variant="outline"
							className={toolbarIconButtonClass}
							onClick={handleNewChat}
							aria-label="New chat"
							title="New chat"
						>
							<MessageSquarePlus className="size-4" />
						</Button>
					</div>

					{historyFeedback ? (
						<p className="mt-2 text-xs text-destructive">{historyFeedback}</p>
					) : null}
				</header>

				<div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-canvas px-4 py-4 space-y-3">
					{chatClosed ? (
						<div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm text-destructive">
							<AlertTriangle className="mt-0.5 size-4 shrink-0" />
							<p>
								Chat closed after repeated unsafe requests. Start a new chat to
								continue.
							</p>
						</div>
					) : null}

					{isLoadingConversation ? (
						<div
							className={cn(
								chatBubbleVariants({ role: "assistant", variant: "default" }),
								"animate-pulse",
							)}
						>
							Loading chat...
						</div>
					) : null}

					{showEmptyState ? (
						<div className="space-y-4 pt-2">
							<div className="flex flex-col items-center gap-2 pt-4 text-center">
								<span className="grid size-12 place-items-center rounded-2xl bg-soft-accent text-primary">
									<Sparkles className="size-6" />
								</span>
								<p className="text-sm font-semibold text-foreground">
									How can I help?
								</p>
								<p className="text-xs text-muted-foreground">
									Log transactions, savings, goals, or wishlist items. You can
									also ask about our{" "}
									<Link
										to="/privacy"
										className="underline underline-offset-2"
										onClick={() => onOpenChange(false)}
									>
										Privacy Policy
									</Link>{" "}
									or{" "}
									<Link
										to="/terms"
										className="underline underline-offset-2"
										onClick={() => onOpenChange(false)}
									>
										Terms
									</Link>
									.
								</p>
							</div>
							<div className="flex flex-wrap gap-2">
								{EXAMPLES.map((example) => (
									<button
										key={example}
										type="button"
										onClick={() => handleExampleClick(example)}
										className="rounded-full border border-border bg-soft-accent px-3.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
									>
										{example}
									</button>
								))}
							</div>
						</div>
					) : null}

					{thread.map((message, index) => (
						<div
							key={message.id ?? index}
							className={`flex flex-col gap-0.5 ${message.role === "user" ? "items-end" : "items-start"}`}
						>
							<div
								className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
							>
								{message.role === "assistant" && message.isError ? (
									<AlertTriangle className="mt-1 size-4 shrink-0 text-destructive" />
								) : message.role === "assistant" && message.ok ? (
									<CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
								) : null}
								<div
									className={cn(
										chatBubbleVariants({
											role: message.role,
											variant:
												message.role === "assistant"
													? message.isError
														? "error"
														: message.isWarning
															? "warning"
															: message.ok
																? "success"
																: "default"
													: undefined,
										}),
									)}
								>
									{message.role === "user" ? (
										message.text
									) : (
										<AiMessageText text={message.text} />
									)}
									{message.steps?.length ? (
										<div className="mt-2 space-y-1 border-t border-emerald-200/60 pt-2 dark:border-emerald-800/60">
											{message.steps.map((step, stepIndex) => (
												<span
													key={stepIndex}
													className="block text-[10px] font-medium uppercase tracking-wide opacity-70"
												>
													{step.success ? "✓" : "✗"}{" "}
													{ACTION_LABELS[step.action] ?? step.action}
												</span>
											))}
										</div>
									) : message.ok && message.action ? (
										<div className="mt-1 flex items-center justify-between gap-2 border-t border-emerald-200/60 pt-1.5 dark:border-emerald-800/60">
											<span className="text-[10px] font-medium uppercase tracking-wide opacity-60">
												{ACTION_LABELS[message.action] ??
													getAiActionDisplayLabel(message.action)}
											</span>
											{ACTION_ROUTE_MAP[message.action] ? (
												<Link
													to={ACTION_ROUTE_MAP[message.action]!}
													className="text-[11px] font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-300"
													onClick={() => onOpenChange(false)}
												>
													{ACTION_LINK_LABELS[message.action] ?? "View"}
												</Link>
											) : null}
										</div>
									) : null}
								</div>
							</div>
							{message.createdAt ? (
								<span className="px-1 text-[10px] text-foreground/55 dark:text-muted-foreground/75">
									{formatMessageTime(message.createdAt)}
								</span>
							) : null}
						</div>
					))}

					{mutation.isPending ? (
						<div className="flex justify-start">
							<div
								className={cn(
									chatBubbleVariants({
										role: "assistant",
										variant: "default",
									}),
									"flex items-center gap-1.5 text-muted-foreground",
								)}
							>
								{aiProgress?.phase === "step" ? (
									<span className="text-xs">
										{aiProgress.message ?? "Working on it"}
										{aiProgress.total && aiProgress.total > 1
											? ` (${aiProgress.index ?? 1} of ${aiProgress.total})`
											: null}
										{"…"}
									</span>
								) : aiProgress?.phase === "thinking" ? (
									<span className="text-xs">Thinking…</span>
								) : (
									<>
										<span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
										<span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
										<span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
									</>
								)}
							</div>
						</div>
					) : null}
				</div>

				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-2 border-t border-border bg-panel px-4 py-3"
				>
					<div className="flex items-end gap-2 rounded-2xl border border-border bg-input-bg p-1.5 pl-3 focus-within:border-primary/50">
						<Textarea
							value={prompt}
							onChange={(event) => setPrompt(event.target.value)}
							onKeyDown={handlePromptKeyDown}
							enterKeyHint={isMobile ? "enter" : "send"}
							placeholder={
								chatClosed ? "Chat closed" : "Ask about your finances..."
							}
							disabled={
								chatClosed || mutation.isPending || isLoadingConversation
							}
							className="min-h-[40px] max-h-32 flex-1 resize-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
							rows={isMobile ? 3 : 2}
						/>
						<Button
							type="submit"
							size="icon"
							disabled={
								chatClosed ||
								mutation.isPending ||
								isLoadingConversation ||
								!prompt.trim()
							}
							className="size-9 shrink-0 rounded-xl"
							aria-label="Send message"
						>
							<SendHorizonal className="size-4" />
						</Button>
					</div>
					<p className="text-[11px] text-muted-foreground">
						{isMobile
							? "Enter for a new line · Tap send to submit"
							: "Shift+Enter for a new line · Enter to send"}
						{isBulkPasteDraft
							? ` · Bulk paste mode (up to ${AI_CHAT_MESSAGE_LIMIT_BULK.toLocaleString()} chars)`
							: null}
						{prompt.length > 900
							? ` · ${prompt.length.toLocaleString()}/${promptCharLimit.toLocaleString()}`
							: null}
					</p>
					<p className="text-[11px] text-muted-foreground">
						<Link
							to="/privacy"
							className="underline underline-offset-2"
							onClick={() => onOpenChange(false)}
						>
							Privacy Policy
						</Link>
						{" · "}
						<Link
							to="/terms"
							className="underline underline-offset-2"
							onClick={() => onOpenChange(false)}
						>
							Terms of Service
						</Link>
					</p>
				</form>
			</SheetContent>
		</Sheet>
	);
}
