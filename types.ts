export type PluginOptions = {
	/**
	 * ResourceId of a resource that stores dashboard configs.
	 *
	 * Expected columns: id, slug, label, revision, config (YAML string).
	 */
	dashboardConfigsResourceId: string;
};
