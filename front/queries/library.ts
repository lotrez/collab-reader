import { useQuery } from "@tanstack/react-query";
import type { BookResponse, BooksListResponse } from "../../back/shared/dtos";

export const getCoverUrl = (book: BookResponse): string => {
	if (book.coverImagePath) {
		return `http://localhost:3000/assets/${book.coverImagePath}`;
	}
	return `https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=450&fit=crop`;
};

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
