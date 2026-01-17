import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "", 
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? true : false,
    },
  },
  database: drizzleAdapter(db, {
        provider: "pg",
    }),
});