export const DASHBOARD_CONFIG_UPDATED_TOPIC_PREFIX = '/opentopic/dashboard-config-updated'

export function getDashboardConfigUpdatedTopic(slug: string) {
  return `${DASHBOARD_CONFIG_UPDATED_TOPIC_PREFIX}/${slug}`
}
