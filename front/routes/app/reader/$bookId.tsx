import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useBookDetail } from "../../../queries/library";

export const Route = createFileRoute("/app/reader/$bookId")({
	beforeLoad: async ({ location }) => {
		const matches = location.pathname.match(/\/app\/reader\/([^/]+)$/);

		if (matches) {
			const response = await fetch(`/api/epub/${matches[1]}`, {
				credentials: "include",
			});

			if (!response.ok) {
				throw redirect({ to: "/app" });
			}

			const data = await response.json();

			if (data.chapters && data.chapters.length > 0) {
				const firstChapter = data.chapters[0];
				throw redirect({
					to: "/app/reader/$bookId/$chapterId",
					params: {
						bookId: matches[1],
						chapterId: String(firstChapter.spineIndex),
					},
				});
			}

			throw redirect({ to: "/app" });
		}
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <Outlet />;
}
