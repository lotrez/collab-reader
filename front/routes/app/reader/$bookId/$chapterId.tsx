import { createFileRoute } from "@tanstack/react-router";
import { useChapter } from "../../../../queries/library";

export const Route = createFileRoute("/app/reader/$bookId/$chapterId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { bookId, chapterId } = Route.useParams();
	const chapterIndex = parseInt(chapterId, 10);
	const { data, isLoading, error } = useChapter(bookId, chapterIndex);

	if (isLoading) {
		return (
			<div className="p-6 mx-auto max-w-7xl">
				<div className="flex justify-center items-center min-h-64">
					<div className="w-12 h-12 border-4 border-foreground border-t-transparent rounded-full animate-spin" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 mx-auto max-w-7xl">
				<div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-lg">
					Failed to load chapter. Please try again later.
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 mx-auto max-w-5xl">
			{data && (
				<div className="space-y-6">
					<h1 className="text-3xl font-heading">{data.title}</h1>
					<div
						className="prose prose-sm md:prose-base max-w-none"
						dangerouslySetInnerHTML={{ __html: data.htmlContent }}
					/>
				</div>
			)}
		</div>
	);
}
