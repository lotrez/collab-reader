import { Hono } from "hono";
import { showRoutes } from "hono/dev";
import { logger } from "hono/logger";
import { auth } from "./auth/auth";
import epub from "./services/epub";

export type AppContext = {
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null;
	};
};

const app = new Hono<AppContext>();
app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });

	if (!session) {
		c.set("user", null);
		c.set("session", null);
		await next();
		return;
	}

	c.set("user", session.user);
	c.set("session", session.session);
	await next();
});

app.route("/api/epub", epub);
app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

app.use(logger());

showRoutes(app, {
	verbose: true,
});

export default app;

const port = process.env.PORT || 3000;

console.log(`Starting server on port ${port}`);
Bun.serve({
	fetch: app.fetch,
	port,
});
console.log(`Server running on http://localhost:${port}`);
