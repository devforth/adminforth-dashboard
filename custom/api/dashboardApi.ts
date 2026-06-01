import type {
  DashboardConfig,
  EditableDashboardGroupConfig,
  EditableDashboardWidgetConfig,
  DashboardGroupMoveDirection,
  DashboardWidgetConfig,
  DashboardWidgetConfigValidationError,
  DashboardWidgetMoveDirection,
} from '../model/dashboard.types.js'

export type DashboardResponse = {
  id: string
  slug: string
  label: string
  revision: number
  config: DashboardConfig
}

export type DashboardWidgetDataResponse = {
  widget: DashboardWidgetConfig
  data: unknown
}

export type DashboardWidgetDataRequest = {
  pagination?: {
    page: number
    pageSize: number
  }
}

export class DashboardApiError extends Error {
  validationErrors: DashboardWidgetConfigValidationError[]

  constructor(message: string, validationErrors: DashboardWidgetConfigValidationError[] = []) {
    super(message)
    this.name = 'DashboardApiError'
    this.validationErrors = validationErrors
  }
}

function normalizeValidationErrors(response: any): DashboardWidgetConfigValidationError[] {
  if (Array.isArray(response?.validationErrors)) {
    return response.validationErrors
  }

  if (Array.isArray(response?.details)) {
    return response.details.map((detail: any) => ({
      field: Array.isArray(detail.instancePath)
        ? detail.instancePath.join('.')
        : String(detail.instancePath || detail.path || 'config').replace(/^\//, '').replaceAll('/', '.'),
      message: String(detail.message || 'Invalid value'),
    }))
  }

  return []
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

async function callDashboardApi(path: string, body: Record<string, unknown>): Promise<DashboardResponse> {
  const rawResponse = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept-language': localStorage.getItem('af_lang') || 'en',
    },
    body: JSON.stringify(body),
  })

  const response = await parseDashboardResponse(rawResponse)

  if (!rawResponse.ok) {
    throw new DashboardApiError(
      response?.error || rawResponse.statusText || `Dashboard request failed (${rawResponse.status})`,
      normalizeValidationErrors(response),
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
    config: response.config,
  }
}

async function callDashboardWidgetDataApi(
  path: string,
  body: Record<string, unknown>,
): Promise<DashboardWidgetDataResponse> {
  const rawResponse = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'accept-language': localStorage.getItem('af_lang') || 'en',
    },
    body: JSON.stringify(body),
  })

  const response = await parseDashboardResponse(rawResponse)

  if (!rawResponse.ok) {
    throw new DashboardApiError(
      response?.error || rawResponse.statusText || `Dashboard request failed (${rawResponse.status})`,
      normalizeValidationErrors(response),
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
    return callDashboardApi('/adminapi/v1/dashboard/get-config', { slug })
  },

  async setDashboardConfig(slug: string, config: DashboardConfig): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/set_dashboard_config', { slug, config })
  },

  async addDashboardGroup(slug: string): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/add_dashboard_group', { slug })
  },

  async moveDashboardGroup(
    slug: string,
    groupId: string,
    direction: DashboardGroupMoveDirection,
  ): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/move_dashboard_group', {
      slug,
      groupId,
      direction,
    })
  },

  async removeDashboardGroup(slug: string, groupId: string): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/remove_dashboard_group', {
      slug,
      groupId,
    })
  },

  async setDashboardGroupConfig(slug: string, groupId: string, config: EditableDashboardGroupConfig): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/set_dashboard_group_config', {
      slug,
      groupId,
      config,
    })
  },

  async addDashboardWidget(slug: string, groupId: string): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/add_dashboard_widget', {
      slug,
      groupId,
    })
  },

  async moveDashboardWidget(
    slug: string,
    widgetId: string,
    direction: DashboardWidgetMoveDirection,
  ): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/move_dashboard_widget', {
      slug,
      widgetId,
      direction,
    })
  },

  async removeDashboardWidget(slug: string, widgetId: string): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/remove_dashboard_widget', {
      slug,
      widgetId,
    })
  },

  async setWidgetConfig(slug: string, widgetId: string, config: EditableDashboardWidgetConfig): Promise<DashboardResponse> {
    return callDashboardApi('/adminapi/v1/dashboard/set_widget_config', {
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
    return callDashboardWidgetDataApi('/adminapi/v1/dashboard/get_dashboard_widget_data', {
      slug,
      widgetId,
      ...request,
    })
  },
}
