import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tanstackRouter({
			target: "react",
			routesDirectory: "./routes",
			autoCodeSplitting: true,
		}),
		react(),
		tailwindcss(),
		{
			name: "requestLogger",
			configureServer(server) {
				server.middlewares.use((req, _res, next) => {
					console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
					next();
				});
			},
		},
	],
	root: "./front",
	publicDir: "./front/public",
	build: {
		outDir: "../dist/front",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		host: true,
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
			},
		},
	},
});
