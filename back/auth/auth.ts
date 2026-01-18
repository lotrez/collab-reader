import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
			enabled: !!(
				process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
			),
		},
	},
	trustedOrigins: [
		process.env.FRONTEND_URL || "http://localhost:3000",
		"http://localhost:5173",
	],
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
});
