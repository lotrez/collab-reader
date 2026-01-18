import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "../ui/card";

interface LibraryItemProps {
	name: string;
	id: string;
}

export default function LibraryItem({ name, id }: LibraryItemProps) {
	const [imageError, setImageError] = useState(false);

	return (
		<Link to="/app/reader/$bookId" params={{ bookId: id }} preload="intent">
			<Card className="transition-all cursor-pointer hover:shadow-none hover:translate-x-boxShadowX hover:translate-y-boxShadowY !p-0">
				<CardContent className="p-0">
					<div className="overflow-hidden aspect-2/3 bg-muted">
						{imageError ? (
							<div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-400">
								<span className="text-4xl">📖</span>
							</div>
						) : (
							<img
								src={`/api/epub/${id}/cover`}
								alt={name}
								className="object-cover w-full h-full"
								onError={() => setImageError(true)}
							/>
						)}
					</div>
					<div className="p-4">
						<h3 className="font-semibold line-clamp-3">{name}</h3>
					</div>
				</CardContent>
			</Card>
		</Link>
	);
}
