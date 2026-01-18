import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import LibraryItem from "../../components/library/library-item";
import { Button } from "../../components/ui/button";
import { useBooks } from "../../queries/library";

export const Route = createFileRoute("/app/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { data, isLoading, error } = useBooks();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const uploadMutation = useMutation({
		mutationFn: async (files: File[]) => {
			const uploadPromises = files.map(async (file) => {
				const formData = new FormData();
				formData.append("file", file);

				const response = await fetch("/api/epub", {
					method: "PUT",
					body: formData,
					credentials: "include",
				});

				if (!response.ok) {
					throw new Error(`Failed to upload ${file.name}`);
				}

				return response.json();
			});

			return Promise.allSettled(uploadPromises);
		},
		onSettled: async (results) => {
			console.log("on settled", results);
			if (!results) return;

			const failed = results.filter((r) => r.status === "rejected");
			if (failed.length > 0) {
				toast.error(
					`${failed.length} upload${failed.length > 1 ? "s" : ""} failed`,
				);
			} else if (results.length > 0) {
				toast.success(
					`${results.length} book${results.length > 1 ? "s" : ""} uploaded`,
				);
			}

			await queryClient.invalidateQueries({ queryKey: ["books"] });
		},
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? []);
		if (files.length > 0) {
			uploadMutation.mutate(files);
		}
		e.target.value = "";
	};

	if (isLoading) {
		return (
			<div className="p-6 mx-auto max-w-7xl">
				<h1 className="mb-6 text-3xl font-heading">Library</h1>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							className="aspect-2/3 bg-muted animate-pulse rounded-lg"
						/>
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
			<input
				ref={fileInputRef}
				type="file"
				accept=".epub"
				multiple
				onChange={handleFileChange}
				className="hidden"
			/>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-3xl font-heading">Library</h1>
				<Button
					onClick={() => fileInputRef.current?.click()}
					disabled={uploadMutation.isPending}
				>
					{uploadMutation.isPending ? "Uploading..." : "Add Books"}
				</Button>
			</div>
			{books.length === 0 ? (
				<div className="p-12 text-center bg-muted rounded-lg">
					<p className="text-lg text-muted-foreground">
						No books in your library yet.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{books.map((book) => (
						<LibraryItem key={book.id} name={book.title} id={book.id} />
					))}
				</div>
			)}
		</div>
	);
}
