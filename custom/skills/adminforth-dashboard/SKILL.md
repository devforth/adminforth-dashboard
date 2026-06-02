---
name: adminforth-dashboard
description: Use when the user wants to view, create, update, move, remove, validate, or load data for AdminForth dashboard groups and widgets.
---

# AdminForth Dashboard Plugin

Use this skill for dashboard group/widget mutations and dashboard data loading.

## Core rule

If dashboard tools are callable, use tools. Do not answer mutation requests by only printing config.

## Entity boundaries

Dashboard root, groups, and widgets are different entities.

- Group tools use groupId and only change group config.
- Widget tools use widgetId and change target/query/card/chart/table/pivot.
- Never call dashboard_set_dashboard_group_config to configure a widget.
- Never call dashboard_add_dashboard_group to configure a widget.
- If widget target, label, query, chart, card, table, pivot, variables, formulas, filters, or display fields must change, use dashboard_set_widget_config.

## Tool routing

- Read dashboard: dashboard_get_config
- Add group: dashboard_add_dashboard_group
- Rename group: dashboard_set_dashboard_group_config
- Add widget slot: dashboard_add_dashboard_widget
- Configure widget: dashboard_set_widget_config
- Move/remove widget/group: matching move/remove tool
- Load widget data: dashboard_get_dashboard_widget_data

If a known dashboard tool schema is missing, call fetch_tool_schema for that exact tool.
If fetch_tool_schema returns but the intended tool is still not callable, stop and report a tool-routing error. Do not substitute another mutation tool.

## Group creation guard

Before creating a group, call dashboard_get_config and check existing groups.

- If a requested group label already exists, reuse that groupId.
- If no matching group exists, call dashboard_add_dashboard_group at most once for that requested group.
- After dashboard_add_dashboard_group succeeds, extract the new groupId from the returned dashboard response.
- If the group needs a label, call dashboard_set_dashboard_group_config once with that groupId.
- After that, the next mutation must be dashboard_add_dashboard_widget or dashboard_set_widget_config, not another dashboard_add_dashboard_group.

Never call dashboard_add_dashboard_group repeatedly for the same user request. If you are about to create a second group for the same label/section, stop and report:

Repeated dashboard_add_dashboard_group; expected using the existing/new groupId.

## Create-and-configure workflow

For any request to create KPI/chart/table/pivot/gauge widgets:

1. dashboard_get_config
2. select existing group by label, or create one group once
3. if needed, rename group once
4. for each widget:
   - dashboard_add_dashboard_widget
   - immediately dashboard_set_widget_config for the returned widgetId
   - confirm target is not empty
5. dashboard_get_config
6. validate all requested widgets are configured
7. return short summary

Do not batch-create empty widgets and postpone configuration.
Do not build a full dashboard JSON object for this workflow.

## Empty widget rule

dashboard_add_dashboard_widget creates only:

label: New widget
target: empty

This is incomplete for KPI/chart/table/pivot/gauge/spend/revenue/usage widgets.

## No-op loop guard

If the same mutation tool is about to be called with the same payload twice, stop and reassess.
If dashboard_add_dashboard_group repeats for the same requested group, stop and reuse the groupId from dashboard_get_config.
If dashboard_set_dashboard_group_config repeats while new widgets are target: empty, use dashboard_set_widget_config instead.
After 2 repeated no-op mutations, stop with an explicit error.

## State machine

For create group + widgets tasks, follow this exact state order:

dashboard_get_config
-> maybe dashboard_add_dashboard_group
-> maybe dashboard_set_dashboard_group_config
-> dashboard_add_dashboard_widget
-> dashboard_set_widget_config
-> repeat only the two widget steps for more widgets
-> dashboard_get_config

Allowed repeats:
- dashboard_add_dashboard_widget may repeat once per requested widget.
- dashboard_set_widget_config may repeat once per requested widget.

Forbidden repeats:
- dashboard_add_dashboard_group for the same requested group.
- dashboard_set_dashboard_group_config with the same label/groupId.

Forbidden substitutions:
- dashboard_set_dashboard_group_config instead of set widget config.
- dashboard_add_dashboard_group instead of add widget.

## Widget config keys

Use current keys:
target, label, query, resource, group_by, order_by, page_size, variables.
Use card for kpi_card/gauge_card.
Use chart for chart.
Use table for table.
Use pivot for pivot_table.

Use target, not type.
Use query, not dataSource.
Use resource, not resourceId.

## Query shape rules

Use query.steps only for funnel charts. Do not use query.steps for kpi_card, gauge_card, table, pivot_table, or normal bar/line/stacked/pie charts.

For kpi_card and normal charts, use:
- query.resource
- query.select
- optional query.filters
- optional query.group_by
- optional query.period
- optional query.order_by
- optional query.calcs

Calculations run after selected fields and aggregates are loaded into a row. Therefore:
- aggregate real resource fields first
- then calculate derived fields from those aggregate aliases
- do not aggregate a calc alias such as cost unless cost is an actual resource field

For spend/cost widgets, prefer this pattern:

select raw token totals:
- sum uncached_input_tokens as uncached_input_tokens
- sum cached_input_tokens as cached_input_tokens
- sum output_tokens as output_tokens

then query.calcs:
- calculate total_spend from those aliases and lookup variables

For today vs yesterday KPI, use multiple aggregate select items with filters and distinct aliases, then calcs. Do not use query.steps.

## Calc variables

Use variables for static maps/rates.
Use lookup($variables.some.map, row_field, default_number) in query.calcs.

Minimal example:

variables:
  prices:
    gpt-5.4: 2.5

query:
  calcs:
    - calc: tokens / 1000000 * lookup($variables.prices, model, 0)
      as: cost
