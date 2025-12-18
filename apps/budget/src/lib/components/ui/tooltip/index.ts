// Re-export from packages/ui to share the same bits-ui context with sidebar-provider
export {
	Root,
	Trigger,
	Content,
	Provider,
	Portal,
	//
	Root as Tooltip,
	Content as TooltipContent,
	Trigger as TooltipTrigger,
	Provider as TooltipProvider,
	Portal as TooltipPortal,
} from '$ui/lib/components/ui/tooltip/index.js';
