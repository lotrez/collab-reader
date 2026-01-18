import { useQuery } from "@tanstack/react-query";
import type {
	BooksListResponse,
	ChapterContentResponse,
} from "../../back/shared/dtos";

export const useBooks = () => {
	return useQuery({
		queryKey: ["books"],
		queryFn: async () => {
			const response = await fetch("/api/epub", {
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch books");
			}

			const data = (await response.json()) as BooksListResponse;
			return data;
		},
	});
};

export const useChapter = (bookId: string, chapterIndex: number) => {
	return useQuery({
		queryKey: ["chapter", bookId, chapterIndex],
		queryFn: async () => {
			const response = await fetch(
				`/api/epub/${bookId}/chapters/${chapterIndex}`,
				{
					credentials: "include",
				},
			);

			if (!response.ok) {
				throw new Error("Failed to fetch chapter");
			}

			const data = (await response.json()) as ChapterContentResponse;
			return data;
		},
	});
};
