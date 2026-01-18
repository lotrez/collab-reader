import { cn } from "../../lib/utils"

export function Loader({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center gap-1", className)}>
			<span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
			<span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
			<span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
		</div>
	)
}
