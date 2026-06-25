import type { AuthSplitLayoutProps } from "#/components/types/auth-layout";

/**
 * Renders a responsive auth layout: a left brand panel (gradient) and a right
 * form column. On mobile the brand panel is hidden and the form fills the view.
 */
export function AuthSplitLayout({
	featurePanel,
	formPanel,
	reverseOnDesktop = false,
}: AuthSplitLayoutProps) {
	const brandSection = (
		<section className="relative hidden overflow-hidden lg:col-span-7 lg:block">
			{featurePanel}
		</section>
	);

	const formSection = (
		<section className="flex items-center justify-center bg-canvas px-5 py-10 sm:px-8 lg:col-span-5 lg:px-12">
			{formPanel}
		</section>
	);

	return (
		<main className="grid min-h-screen grid-cols-1 bg-canvas lg:grid-cols-12">
			{reverseOnDesktop ? (
				<>
					{formSection}
					{brandSection}
				</>
			) : (
				<>
					{brandSection}
					{formSection}
				</>
			)}
		</main>
	);
}
