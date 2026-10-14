export type PluginOptions = {
	/**
	 * ResourceId of a resource that stores dashboard configs.
	 *
	 * Expected columns: id, slug, label, revision, config (JSON).
	 */
	dashboardConfigsResourceId: string;
	/**
	 * Roles allowed to edit dashboards, groups, and widgets.
	 * Defaults to ['superadmin'].
	 */
	editRoles?: string[];
	/**
	 * Whether the AI agent asks the user for approval before it changes dashboards, groups, or widgets.
	 * When false, MCP clients also stop receiving the destructive hint for these tools.
	 * Defaults to true.
	 */
	agentEditsRequireApproval?: boolean;
};
