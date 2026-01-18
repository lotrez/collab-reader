import { Hono } from "hono";
import { auth } from "./auth/auth";
import epub from "./services/epub";

const app = new Hono();
app.route("/epub", epub);
app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});
export default app;
