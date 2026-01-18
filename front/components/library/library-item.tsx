import { Card, CardContent } from "../ui/card";

interface LibraryItemProps {
	name: string;
	id: string;
}

export default function LibraryItem({ name, id }: LibraryItemProps) {
	return (
		<Card className="transition-all cursor-pointer hover:shadow-none hover:translate-x-boxShadowX hover:translate-y-boxShadowY">
			<CardContent className="p-4">
				<div className="mb-3 overflow-hidden aspect-2/3 bg-muted">
					<img
						src={`/api/epub/${id}/cover`}
						alt={name}
						className="object-cover w-full h-full"
					/>
				</div>
				<h3 className="font-semibold truncate">{name}</h3>
			</CardContent>
		</Card>
	);
}
