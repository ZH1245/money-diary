import { Loader2, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InlineError } from "#/components/feedback/inline-error";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useCreateTicketMutation } from "#/features/feedback/hooks/use-tickets";
import { UserTicketsSection } from "#/features/feedback/components/user-tickets-section";
import type { TicketType } from "#/features/feedback/types/ticket";

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
	{ value: "bug", label: "Bug report" },
	{ value: "feature", label: "Feature request" },
	{ value: "support", label: "Support" },
];

/** Settings section letting a user submit a feedback / support ticket. */
export function FeedbackFormSection() {
	const [type, setType] = useState<TicketType>("bug");
	const [subject, setSubject] = useState("");
	const [body, setBody] = useState("");
	const [formError, setFormError] = useState<string | null>(null);

	const createTicket = useCreateTicketMutation();

	const canSubmit = subject.trim().length > 0 && body.trim().length > 0;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setFormError(null);

		if (!canSubmit) return;

		try {
			await createTicket.mutateAsync({
				type,
				subject: subject.trim(),
				body: body.trim(),
			});
			setType("bug");
			setSubject("");
			setBody("");
			toast.success("Feedback submitted. Thank you!");
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : "Unable to submit feedback",
			);
		}
	};

	return (
		<div className="space-y-6">
			<article className="md-panel p-5 md:p-6">
			<h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
				<MessageSquarePlus className="size-4 text-primary" />
				Send feedback
			</h2>
			<p className="mt-1 text-xs text-muted-foreground">
				Report a bug, request a feature, or ask for help. We read every message.
			</p>

			<form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
				<div className="space-y-1">
					<label htmlFor="ticket-type" className="block text-sm font-medium">
						Type
					</label>
					<Select
						value={type}
						onValueChange={(value) => setType(value as TicketType)}
						disabled={createTicket.isPending}
					>
						<SelectTrigger id="ticket-type" className="w-56">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{TYPE_OPTIONS.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-1">
					<label htmlFor="ticket-subject" className="block text-sm font-medium">
						Subject <span className="text-destructive">*</span>
					</label>
					<Input
						id="ticket-subject"
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						placeholder="Short summary"
						maxLength={200}
						disabled={createTicket.isPending}
					/>
				</div>

				<div className="space-y-1">
					<label htmlFor="ticket-body" className="block text-sm font-medium">
						Description <span className="text-destructive">*</span>
					</label>
					<Textarea
						id="ticket-body"
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Tell us what happened or what you'd like to see"
						rows={5}
						maxLength={2000}
						disabled={createTicket.isPending}
					/>
				</div>

				{formError ? <InlineError message={formError} /> : null}

				<Button type="submit" disabled={!canSubmit || createTicket.isPending}>
					{createTicket.isPending ? (
						<Loader2 className="size-4 animate-spin" />
					) : null}
					Submit feedback
				</Button>
			</form>
		</article>

		<UserTicketsSection />
		</div>
	);
}
