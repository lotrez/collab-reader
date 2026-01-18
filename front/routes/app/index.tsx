import { createFileRoute } from "@tanstack/react-router";
import LibraryItem from "../../components/library/library-item";
import { useBooks, getCoverUrl } from "../../queries/library";

export const Route = createFileRoute("/app/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data, isLoading, error } = useBooks();

	if (isLoading) {
		return (
			<div className="p-6 mx-auto max-w-7xl">
				<h1 className="mb-6 text-3xl font-heading">Library</h1>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="aspect-2/3 bg-muted animate-pulse rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 mx-auto max-w-7xl">
				<h1 className="mb-6 text-3xl font-heading">Library</h1>
				<div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-lg">
					Failed to load books. Please try again later.
				</div>
			</div>
		);
	}

	const books = data?.books ?? [];

	return (
		<div className="p-6 mx-auto max-w-7xl">
			<h1 className="mb-6 text-3xl font-heading">Library</h1>
			{books.length === 0 ? (
				<div className="p-12 text-center bg-muted rounded-lg">
					<p className="text-lg text-muted-foreground">No books in your library yet.</p>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{books.map((book) => (
						<LibraryItem
							key={book.id}
							coverUrl={getCoverUrl(book)}
							name={book.title}
							id={book.id}
						/>
					))}
				</div>
			)}
		</div>
	);
}
