import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Button } from "../../components/ui/button";
import { authClient } from "../../lib/auth";

export const Route = createFileRoute("/app")({
	component: AppLayout,
	beforeLoad: async ({ location }) => {
		const { data: session } = await authClient.getSession();

		if (!session?.user) {
			throw redirect({
				to: "/login",
				search: { redirect: location.href },
			});
		}

		return { session };
	},
});

function AppLayout() {
	const navigate = useNavigate();
	const handleLogout = async () => {
		await authClient.signOut();
		navigate({
			to: "/",
		});
	};

	return (
		<div className="flex flex-col min-h-screen bg-background">
			<header className="border-b-2 border-border bg-secondary-background">
				<nav className="flex items-center justify-between px-4 py-3 mx-auto max-w-7xl">
					<div className="flex items-center">
						<Link to="/app">
							<Button variant="neutral" size="sm">
								Home
							</Button>
						</Link>
					</div>
					<div className="flex items-center">
						<Button variant="reverse" size="sm" onClick={handleLogout}>
							Log Out
						</Button>
					</div>
				</nav>
			</header>
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	);
}
