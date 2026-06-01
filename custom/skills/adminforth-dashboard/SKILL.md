---
name: adminforth-dashboard
description: Use when the user wants to view, create, update, move, remove, validate, or load data for AdminForth dashboard groups and widgets.
---

# AdminForth Dashboard Plugin

This skill is action-oriented. When the user asks to create, add, edit, update, move, remove, or configure dashboard entities, complete the request by calling the dashboard tools. Do not satisfy dashboard mutation requests by only showing JSON, YAML, JavaScript, TypeScript, Zod schemas, or example config snippets.

## Primary Rule

If callable dashboard tools are available, use them.

A response that only shows a config object, schema, or code snippet is incomplete unless the user explicitly asked for a schema, code example, or explanation.

For dashboard mutation requests, the expected flow is:

1. Load dashboard state when needed.
2. Choose or create the target group/widget.
3. Call the appropriate dashboard mutation tool. (WITHOUT USER CONFIRMATION)
4. Return a short result summary.

Do not print the widget config as the main answer instead of calling tools.

## User Intent Mapping

Use dashboard tools for these intents:

- "add/create/write/make a widget" → create and configure a widget.
- "change/update/edit this widget" → update widget config.
- "move this widget/group" → call the move tool.
- "remove/delete this widget/group" → call the remove tool.
- "show/load dashboard" → call the dashboard config tool.
- "load/check widget data" → call the widget data tool.
- "validate this widget config" → call validation logic/tool if available.

If the user asks how the schema works, how to implement the API, or how to change backend code, then answer as a developer/code task instead of mutating the dashboard.

## Callable Dashboard Tools

Use these tools whenever available:

- `dashboard_get_config`
- `dashboard_add_dashboard_group`
- `dashboard_set_dashboard_group_config`
- `dashboard_move_dashboard_group`
- `dashboard_remove_dashboard_group`
- `dashboard_add_dashboard_widget`
- `dashboard_move_dashboard_widget`
- `dashboard_remove_dashboard_widget`
- `dashboard_set_widget_config`
- `dashboard_get_dashboard_widget_data`

If a dashboard tool is known by name but its argument schema is not loaded, call `fetch_tool_schema` for that tool first. After the schema is loaded, call the dashboard tool. Do not guess arguments if `fetch_tool_schema` is available.

## Tool Argument Rules

Do not pass fields between dashboard tools by analogy. Use each tool's schema.

- `dashboard_add_dashboard_group` creates a new group. It accepts the dashboard slug only. Never pass `groupId` to this tool.
- `dashboard_add_dashboard_widget` creates a widget inside an existing group. Use it when you already have a `groupId`.
- `dashboard_set_dashboard_group_config`, `dashboard_move_dashboard_group`, and `dashboard_remove_dashboard_group` operate on an existing group and need `groupId`.
- `dashboard_set_widget_config`, `dashboard_move_dashboard_widget`, `dashboard_remove_dashboard_widget`, and `dashboard_get_dashboard_widget_data` operate on an existing widget and need `widgetId`.
- If a tool call fails with "input did not match expected schema", call `fetch_tool_schema` for that exact tool, remove unsupported arguments, and retry the correct tool.

## Widget Creation Workflow

For requests like:

- "add a table widget"
- "create a chart"
- "write a widget showing top 5 orders"
- "make a widget for revenue by product"

do this:

1. Call `dashboard_get_config` with the requested slug, or `default` if slug is not specified.
2. Select the requested group. If the group is not specified, use the first existing group.
3. If there are no groups, call `dashboard_add_dashboard_group`.
4. Call `dashboard_add_dashboard_widget` with the selected group id.
5. Call `dashboard_set_widget_config` with the returned widget id and schema-valid config.
6. Return a short summary with dashboard slug, group id, widget id, target, label, resource, selected fields, order, and limit.

Do not stop after generating config text.

## Widget Update Workflow

For requests like:

- "change this widget"
- "make the chart use another field"
- "update the widget config"
- "turn this widget into a table"

do this:

1. Call `dashboard_get_config`.
2. Find the widget by id, label, or clear context.
3. Build the new config while preserving server-owned fields handled by the API.
4. Call `dashboard_set_widget_config`.
5. Return a short summary of what changed.

If the widget cannot be identified, ask only for the missing widget id or label.

## Group Workflow

For group requests:

- Add group → `dashboard_add_dashboard_group`
- Rename/change group config → `dashboard_set_dashboard_group_config`
- Move group → `dashboard_move_dashboard_group`
- Remove group → `dashboard_remove_dashboard_group`

If slug is missing, use `default`.

## Widget Config Rules

Use the current schema keys exactly:

- Use `target`, not `type`.
- Use `label`, not `title`.
- Use `query`, not `data_source`.
- Use `resource`, not `resource_id`.
- Use `group_by`, not `groupBy`.
- Use `order_by`, not `orderBy`.
- Use `page_size`, not `pageSize`.
- For funnel charts, use `query.steps` as an ordered array of `{ name, resource, metric, filters }` steps.
- Use `card` for KPI and gauge widget view config.
- Use `pivot` for pivot table view config.
