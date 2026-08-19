import type {
  DashboardConfig,
  EditableDashboardConfig,
  EditableDashboardGroupConfig,
  DashboardGroupMoveDirection,
  ChartDashboardWidgetConfig,
  DashboardWidgetConfig,
  DashboardWidgetConfigValidationError,
  DashboardWidgetMoveDirection,
  GaugeCardWidgetConfig,
  KpiCardWidgetConfig,
  PivotTableWidgetConfig,
  TableWidgetConfig,
} from '../model/dashboard.types.js'

export type DashboardResponse = {
  id: string
  slug: string
  label: string
  revision: number
  canEdit: boolean
  config: DashboardConfig
}

export type DashboardWidgetDataResponse = {
  widget: DashboardWidgetConfig
  data: unknown
}

export type DashboardMutationResponse = {
  ok: boolean
  error?: string
  groupId?: string
  widgetId?: string
}

export type DashboardWidgetDataRequest = {
  pagination?: {
    page: number
    pageSize: number
  }
}

export type ConfigurableTableWidgetConfig = Omit<TableWidgetConfig, 'id' | 'group_id' | 'order'>
export type ConfigurableKpiCardWidgetConfig = Omit<KpiCardWidgetConfig, 'id' | 'group_id' | 'order'>
export type ConfigurableGaugeCardWidgetConfig = Omit<GaugeCardWidgetConfig, 'id' | 'group_id' | 'order'>
export type ConfigurableChartWidgetConfig = Omit<ChartDashboardWidgetConfig, 'id' | 'group_id' | 'order'>
export type ConfigurableLineChartWidgetConfig = ConfigurableChartWidgetConfig & { chart: { type: 'line' } }
export type ConfigurableBarChartWidgetConfig = ConfigurableChartWidgetConfig & { chart: { type: 'bar' } }
export type ConfigurableStackedBarChartWidgetConfig = ConfigurableChartWidgetConfig & { chart: { type: 'stacked_bar' } }
export type ConfigurablePieChartWidgetConfig = ConfigurableChartWidgetConfig & { chart: { type: 'pie' } }
export type ConfigurableHistogramChartWidgetConfig = ConfigurableChartWidgetConfig & { chart: { type: 'histogram' } }
export type ConfigurableFunnelChartWidgetConfig = ConfigurableChartWidgetConfig & { chart: { type: 'funnel' } }
export type ConfigurablePivotTableWidgetConfig = Omit<PivotTableWidgetConfig, 'id' | 'group_id' | 'order'>

export class DashboardApiError extends Error {
  validationErrors: DashboardWidgetConfigValidationError[]
  status?: number

  constructor(message: string, validationErrors: DashboardWidgetConfigValidationError[] = [], status?: number) {
    super(message)
    this.name = 'DashboardApiError'
    this.validationErrors = validationErrors
    this.status = status
  }
}

function normalizeValidationErrors(response: any): DashboardWidgetConfigValidationError[] {
  const errors = Array.isArray(response?.validationErrors)
    ? response.validationErrors
    : Array.isArray(response?.details)
      ? response.details.map((detail: any) => ({
        field: getValidationErrorField(detail),
        message: String(detail.message || 'Invalid value'),
      }))
      : []

  return simplifyValidationErrors(errors)
}

function getValidationErrorField(detail: any) {
  return Array.isArray(detail.instancePath)
    ? detail.instancePath.join('.')
    : String(detail.instancePath || detail.path || 'config').replace(/^\//, '').replaceAll('/', '.')
}

function simplifyValidationErrors(errors: DashboardWidgetConfigValidationError[]) {
  const collapsed = new Map<string, DashboardWidgetConfigValidationError>()

  for (const error of errors) {
    const selectItemMatch = error.field.match(/^config\.query\.select\.(\d+)$/)

    if (selectItemMatch) {
      const field = error.field
      collapsed.set(field, {
        field,
        message: 'must be a valid select item: field, aggregate, or calc',
      })
      continue
    }

    if (isUnionBranchNoise(error)) {
      continue
    }

    const key = `${error.field}:${error.message}`
    collapsed.set(key, error)
  }

  const simplifiedErrors = Array.from(collapsed.values())

  if (simplifiedErrors.length) {
    return simplifiedErrors
  }

  return dedupeValidationErrors(errors).filter((error) => error.message !== 'must match a schema in anyOf').slice(0, 5)
}

function dedupeValidationErrors(errors: DashboardWidgetConfigValidationError[]) {
  const deduped = new Map<string, DashboardWidgetConfigValidationError>()

  for (const error of errors) {
    deduped.set(`${error.field}:${error.message}`, error)
  }

  return Array.from(deduped.values())
}

function isUnionBranchNoise(error: DashboardWidgetConfigValidationError) {
  if (error.field !== 'config') {
    return false
  }

  return error.message === 'must NOT have additional properties'
    || error.message === 'must match a schema in anyOf'
    || error.message === 'must match exactly one schema in oneOf'
    || error.message === 'must have required property \'chart\''
    || error.message === 'must have required property "chart"'
    || error.message === 'must have required property \'card\''
    || error.message === 'must have required property "card"'
    || error.message === 'must have required property \'table\''
    || error.message === 'must have required property "table"'
    || error.message === 'must have required property \'pivot\''
    || error.message === 'must have required property "pivot"'
}

function getAdminForthPublicPath() {
  const publicPath = ((import.meta as ImportMeta & { env?: { VITE_ADMINFORTH_PUBLIC_PATH?: string } }).env?.VITE_ADMINFORTH_PUBLIC_PATH || '').replace(/\/$/, '')

  return publicPath === '/' ? '' : publicPath
}

async function parseDashboardResponse(rawResponse: Response) {
  const responseText = await rawResponse.text()

  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return {
      error: responseText,
    }
  }
}

async function postDashboardEndpoint(path: string, body: Record<string, unknown>) {
  const rawResponse = await fetch(`${getAdminForthPublicPath()}/adminapi/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept-language': localStorage.getItem('af_lang') || 'en',
    },
    body: JSON.stringify(body),
  })

  return {
    rawResponse,
    response: await parseDashboardResponse(rawResponse),
  }
}

async function callDashboardApi(path: string, body: Record<string, unknown>): Promise<DashboardResponse> {
  const { rawResponse, response } = await postDashboardEndpoint(path, body)

  if (!rawResponse.ok) {
    throw new DashboardApiError(
      response?.error || rawResponse.statusText || `Dashboard request failed (${rawResponse.status})`,
      normalizeValidationErrors(response),
      rawResponse.status,
    )
  }

  if (!response || response.error) {
    throw new DashboardApiError(response?.error || 'Dashboard request failed', normalizeValidationErrors(response))
  }

  return {
    id: response.id,
    slug: response.slug,
    label: response.label,
    revision: response.revision,
    canEdit: response.canEdit === true,
    config: response.config,
  }
}

async function callDashboardMutationApi(path: string, body: Record<string, unknown>): Promise<DashboardMutationResponse> {
  const { rawResponse, response } = await postDashboardEndpoint(path, body)

  if (!rawResponse.ok) {
    throw new DashboardApiError(
      response?.error || rawResponse.statusText || `Dashboard request failed (${rawResponse.status})`,
      normalizeValidationErrors(response),
      rawResponse.status,
    )
  }

  if (!response || response.error || response.ok === false) {
    throw new DashboardApiError(response?.error || 'Dashboard request failed', normalizeValidationErrors(response))
  }

  return {
    ok: true,
    groupId: response.groupId,
    widgetId: response.widgetId,
  }
}

async function callDashboardWidgetDataApi(
  path: string,
  body: Record<string, unknown>,
): Promise<DashboardWidgetDataResponse> {
  const { rawResponse, response } = await postDashboardEndpoint(path, body)

  if (!rawResponse.ok) {
    throw new DashboardApiError(
      response?.error || rawResponse.statusText || `Dashboard request failed (${rawResponse.status})`,
      normalizeValidationErrors(response),
      rawResponse.status,
    )
  }

  if (!response || response.error) {
    throw new DashboardApiError(response?.error || 'Dashboard request failed', normalizeValidationErrors(response))
  }

  return {
    widget: response.widget,
    data: response.data,
  }
}

export const dashboardApi = {
  async getDashboardConfig(slug: string): Promise<DashboardResponse> {
    return callDashboardApi('/dashboard/get-config', { slug })
  },

  async setDashboardConfig(slug: string, config: EditableDashboardConfig): Promise<DashboardResponse> {
    return callDashboardApi('/dashboard/set_dashboard_config', { slug, config })
  },

  async addDashboardGroup(slug: string): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/add_dashboard_group', { slug })
  },

  async moveDashboardGroup(
    slug: string,
    groupId: string,
    direction: DashboardGroupMoveDirection,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/move_dashboard_group', {
      slug,
      groupId,
      direction,
    })
  },

  async removeDashboardGroup(slug: string, groupId: string): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/remove_dashboard_group', {
      slug,
      groupId,
    })
  },

  async setDashboardGroupConfig(slug: string, groupId: string, config: EditableDashboardGroupConfig): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/set_dashboard_group_config', {
      slug,
      groupId,
      config,
    })
  },

  async addDashboardWidget(slug: string, groupId: string): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/add_dashboard_widget', {
      slug,
      groupId,
    })
  },

  async moveDashboardWidget(
    slug: string,
    widgetId: string,
    direction: DashboardWidgetMoveDirection,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/move_dashboard_widget', {
      slug,
      widgetId,
      direction,
    })
  },

  async removeDashboardWidget(slug: string, widgetId: string): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/remove_dashboard_widget', {
      slug,
      widgetId,
    })
  },

  async setWidgetConfig(slug: string, widgetId: string, config: unknown): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/set_widget_config', {
      slug,
      widgetId,
      config,
    })
  },

  async configureTableWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableTableWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_table_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configureKpiCardWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableKpiCardWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_kpi_card_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configureGaugeCardWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableGaugeCardWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_gauge_card_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configureLineChartWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableLineChartWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_line_chart_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configureBarChartWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableBarChartWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_bar_chart_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configureStackedBarChartWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableStackedBarChartWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_stacked_bar_chart_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configurePieChartWidget(
    slug: string,
    widgetId: string,
    config: ConfigurablePieChartWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_pie_chart_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configureHistogramChartWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableHistogramChartWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_histogram_chart_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configureFunnelChartWidget(
    slug: string,
    widgetId: string,
    config: ConfigurableFunnelChartWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_funnel_chart_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async configurePivotTableWidget(
    slug: string,
    widgetId: string,
    config: ConfigurablePivotTableWidgetConfig,
  ): Promise<DashboardMutationResponse> {
    return callDashboardMutationApi('/dashboard/configure_pivot_table_widget', {
      slug,
      widgetId,
      config,
    })
  },

  async getDashboardWidgetData(
    slug: string,
    widgetId: string,
    request: DashboardWidgetDataRequest = {},
  ): Promise<DashboardWidgetDataResponse> {
    return callDashboardWidgetDataApi('/dashboard/get_dashboard_widget_data', {
      slug,
      widgetId,
      ...request,
    })
  },
}
