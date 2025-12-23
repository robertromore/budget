/**
 * Slash Command Parser
 *
 * Parses user input to detect and extract slash commands.
 */

import { SLASH_COMMANDS, getCommand } from "./registry";

export interface ParsedCommand {
	/** The command name (without the slash) */
	command: string;
	/** The raw arguments string after the command */
	args: string;
	/** Whether the command is valid */
	isValid: boolean;
	/** Error message if invalid */
	error?: string;
	/** Parsed arguments ready for tool execution */
	parsedArgs?: Record<string, unknown>;
}

/**
 * Parse a slash command from user input
 *
 * Returns null if the input is not a slash command.
 * Returns a ParsedCommand object if it starts with `/`.
 */
export function parseSlashCommand(input: string): ParsedCommand | null {
	const trimmed = input.trim();

	// Not a slash command if it doesn't start with /
	if (!trimmed.startsWith("/")) {
		return null;
	}

	// Parse the command format: /command [args]
	const match = trimmed.match(/^\/(\w+)(?:\s+(.*))?$/);

	if (!match) {
		return {
			command: "",
			args: "",
			isValid: false,
			error: "Invalid command format. Commands should be in the format: /command [args]",
		};
	}

	const [, commandName = "", args = ""] = match;
	const lowerCommand = commandName.toLowerCase();

	// Check if command exists
	const cmd = getCommand(lowerCommand);
	if (!cmd) {
		// Suggest similar commands
		const suggestions = getSimilarCommands(lowerCommand);
		const suggestionText = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}?` : "";

		return {
			command: lowerCommand,
			args: args.trim(),
			isValid: false,
			error: `Unknown command: /${lowerCommand}.${suggestionText} Type /help for a list of commands.`,
		};
	}

	// Parse arguments using the command's parser
	const parsedArgs = cmd.parseArgs(args.trim());

	return {
		command: lowerCommand,
		args: args.trim(),
		isValid: true,
		parsedArgs,
	};
}

/**
 * Get similar command names for suggestions
 */
function getSimilarCommands(input: string): string[] {
	const commands = Object.keys(SLASH_COMMANDS);

	// Find commands that start with the same letter or contain the input
	return commands
		.filter((cmd) => cmd.startsWith(input.charAt(0)) || cmd.includes(input) || input.includes(cmd))
		.slice(0, 3)
		.map((cmd) => `/${cmd}`);
}

/**
 * Check if input is a slash command (without full parsing)
 */
export function isSlashCommand(input: string): boolean {
	return input.trim().startsWith("/");
}

/**
 * Get command suggestions for autocomplete
 */
export function getCommandSuggestions(partial: string): string[] {
	const input = partial.replace(/^\//, "").toLowerCase();

	return Object.keys(SLASH_COMMANDS)
		.filter((cmd) => cmd.startsWith(input) || cmd.includes(input))
		.map((cmd) => `/${cmd}`)
		.slice(0, 5);
}
