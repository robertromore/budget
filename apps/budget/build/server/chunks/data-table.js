import "clsx";
import { p as push, a as page, b as store_mutate, c as store_get, e as copy_payload, f as assign_payload, u as unsubscribe_stores, h as pop, i as push_element, j as attr, k as pop_element, l as prevent_snippet_stringification, v as validate_snippet_args, m as spread_props, F as FILENAME, n as ensure_array_like, o as escape_html, q as stringify, S as SvelteMap, r as bind_props, t as attr_class, w as clsx, x as tick, y as inspect, z as goto, L as Legend, A as Axis, G as Grid, B as Labels, D as Circle, E as Group, H as Calendar, I as Arc, P as Pie, R as Rule, J as Hull, K as Points, M as Spline, N as Bars, O as Area, Q as Chart, T as Svg, U as TooltipHeader, V as TooltipList, W as TooltipItem, X as Tooltip, Y as html, Z as TooltipSeparator, _ as attr_style, $ as spread_attributes, a0 as browser, a1 as SvelteSet } from "./vendor-misc.js";
import { A as AccountsState, c as cn, d as dateFormatter, a as currencyFormatter, R as RepeatingDateInput, w as weekdayOptions, b as weekOptions, S as SchedulesState, m as managingAccountId, n as newAccountDialog, e as deleteAccountDialog, f as deleteAccountId, g as managingScheduleId, h as newScheduleDialog, p as parseDateValue, i as currentDate, j as currentViews, k as dateValueToJSDate, C as CurrentAccountState, P as PayeesState, l as CategoriesState, T as TransactionStatuses, D as DateFiltersState, o as compareAlphanumeric } from "./app-state.js";
import { F as Form_field, a as Form_label, I as Input, b as Form_field_errors, C as Control, T as Textarea, c as Form_button, d as Toggle_group, e as Toggle_group_item, f as Calendar_1, B as Button, L as Label, R as Root, P as Popover_trigger, g as Popover_content, h as Command, i as Command_input, j as Command_list, k as Command_empty, l as Command_group, m as Command_item, n as Checkbox, o as Card, p as Card_header, q as Card_title, r as Card_description, s as Card_content, t as Tabs, u as Tabs_list, v as Tabs_trigger, w as Tabs_content, S as Switch, x as Radio_group, y as Radio_group_item, z as Separator, A as Calendar_day, D as Root$1, E as Dialog_content, G as Dialog_header, H as Dialog_title, J as Dialog_description, K as Root$2, M as Alert_dialog_content, N as Alert_dialog_header, O as Alert_dialog_title, Q as Alert_dialog_description, U as Alert_dialog_footer, V as Alert_dialog_cancel, W as Alert_dialog_action, X as buttonVariants, Y as Root$3, Z as Sheet_content, _ as Sheet_header, $ as Sheet_title, a0 as Sheet_description, a1 as Root$4, a2 as Select_trigger, a3 as Select_content, a4 as Select_item, a5 as Select_label, a6 as Root$5, a7 as Dropdown_menu_trigger, a8 as Dropdown_menu_content, a9 as Dropdown_menu_item, aa as Dropdown_menu_separator, ab as Badge, ac as Command_separator, ad as Select_group, ae as Dialog_footer, af as Table, ag as Table_header, ah as Table_row, ai as Table_head, aj as Table_body, ak as Table_cell, al as Dropdown_menu_group, am as renderComponent, an as Expand_toggle } from "./ui-components.js";
import "trpc-sveltekit";
import "@layerstack/utils";
import "@layerstack/tailwind";
import "d3-interpolate-path";
import "@dagrejs/dagre";
import "@layerstack/utils/object";
import "d3-tile";
import "d3-sankey";
import "ts-deepmerge";
import "memoize-weak";
import "zod-to-json-schema";
import { s as superForm } from "./vendor-forms.js";
import "@sveltejs/kit";
import { C as Calendar_days, P as Plus, a as Check, b as Pencil, M as Move_left, D as Delete, R as Repeat, c as Circle_alert, H as Hand_coins, d as Chart_line, T as Trending_up, e as Chart_bar, f as Chart_pie, Z as Zap, g as Target, h as Calendar$1, A as Arrow_down, i as Arrow_up, j as Arrow_up_down, E as Eye_off, X, S as Search, k as Sliders_horizontal, l as Rotate_ccw, m as Chevrons_left, n as Chevron_left, o as Chevron_right, p as Chevrons_right, q as Activity, r as Square_pen, s as Ellipsis, t as Square_check, u as Square, v as Calendar_clock, w as Circle_user_round, U as Users_round, x as Square_mouse_pointer, y as Dollar_sign } from "./vendor-ui.js";
import { a as $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3, $ as $14e0f24ef4ac5c92$export$aa8b41735afcabd2, c as $fb18d541ea1ad717$export$ad991b66133851cf, b as $35ea8db9cb2ccb90$export$99faa760c7908e4f } from "./vendor-date.js";
import Fuse from "fuse.js";
import { z } from "zod";
import validator from "validator";
import { z as zodClient } from "./vendor-trpc.js";
import { scaleBand, scaleOrdinal } from "d3-scale";
import { curveLinear, curveStep, curveBasis, curveNatural, curveCatmullRom, curveCardinal, curveMonotoneX } from "d3-shape";
import { extent } from "d3-array";
const superformInsertAccountSchema = z.object({
  id: z.number().optional(),
  cuid: z.string().optional(),
  name: z.string().min(1, "Account name is required").min(2, "Account name must be at least 2 characters").max(50, "Account name must be less than 50 characters").regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").max(30, "Slug must be less than 30 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
  closed: z.boolean().optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional().nullable(),
  dateOpened: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable()
});
z.object({
  id: z.number().positive(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(2, "Account name must be at least 2 characters").max(50, "Account name must be less than 50 characters").regex(/^[a-zA-Z0-9\s\-_.'&()]+$/, "Account name contains invalid characters")
  ).optional(),
  slug: z.string().transform((val) => val?.trim()?.toLowerCase()).pipe(
    z.string().min(2, "Slug must be at least 2 characters").max(30, "Slug must be less than 30 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
  ).optional(),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters")
  ).optional().nullable(),
  closed: z.boolean().optional()
});
const superformInsertCategorySchema = z.object({
  id: z.number().optional(),
  parentId: z.number().optional().nullable(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(1, "Category name is required").max(50, "Category name must be less than 50 characters").refine((val) => {
      if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
      if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
      if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
      if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
      return true;
    }, "Category name contains invalid characters")
  ),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters").refine((val) => {
      if (!val) return true;
      if (validator.contains(val, "<") || validator.contains(val, ">")) {
        return false;
      }
      return true;
    }, "Notes cannot contain HTML tags")
  ).optional().nullable(),
  dateCreated: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable()
});
z.object({
  id: z.number().positive(),
  parentId: z.number().optional().nullable(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(1, "Category name is required").max(50, "Category name must be less than 50 characters").refine((val) => {
      if (validator.contains(val, "<") || validator.contains(val, ">")) return false;
      if (validator.contains(val, "{") || validator.contains(val, "}")) return false;
      if (validator.contains(val, "[") || validator.contains(val, "]")) return false;
      if (validator.contains(val, "\\") || validator.contains(val, "|")) return false;
      return true;
    }, "Category name contains invalid characters")
  ).optional(),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters").refine((val) => {
      if (!val) return true;
      if (validator.contains(val, "<") || validator.contains(val, ">")) {
        return false;
      }
      return true;
    }, "Notes cannot contain HTML tags")
  ).optional().nullable()
});
const superformInsertPayeeSchema = z.object({
  id: z.number().optional(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(1, "Payee name is required").max(50, "Payee name must be less than 50 characters").regex(/^[a-zA-Z0-9\s\-_&']+$/, "Payee name contains invalid characters")
  ),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters")
  ).optional().nullable(),
  dateCreated: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable()
});
z.object({
  id: z.number().positive(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(1, "Payee name is required").max(50, "Payee name must be less than 50 characters").regex(/^[a-zA-Z0-9\s\-_&']+$/, "Payee name contains invalid characters")
  ).optional(),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters")
  ).optional().nullable()
});
const superformInsertTransactionSchema = z.object({
  id: z.number().optional(),
  accountId: z.number().positive("Account is required"),
  parentId: z.number().optional().nullable(),
  status: z.enum(["cleared", "pending", "scheduled"]).default("pending"),
  payeeId: z.number().optional().nullable(),
  amount: z.number().refine((val) => val !== 0, "Amount cannot be zero").refine((val) => Math.abs(val) <= 999999.99, "Amount cannot exceed $999,999.99"),
  categoryId: z.number().optional().nullable(),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters").refine((val) => {
      if (!val) return true;
      if (validator.contains(val, "<") || validator.contains(val, ">")) {
        return false;
      }
      return true;
    }, "Notes cannot contain HTML tags")
  ).optional().nullable(),
  date: z.string().optional(),
  scheduleId: z.number().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable()
});
z.object({
  id: z.number().positive(),
  accountId: z.number().positive("Account is required").optional(),
  parentId: z.number().optional().nullable(),
  status: z.enum(["cleared", "pending", "scheduled"]).optional(),
  payeeId: z.number().optional().nullable(),
  amount: z.number().refine((val) => val !== 0, "Amount cannot be zero").refine((val) => Math.abs(val) <= 999999.99, "Amount cannot exceed $999,999.99").optional(),
  categoryId: z.number().optional().nullable(),
  notes: z.string().transform((val) => val?.trim()).pipe(
    z.string().max(500, "Notes must be less than 500 characters").refine((val) => {
      if (!val) return true;
      if (validator.contains(val, "<") || validator.contains(val, ">")) {
        return false;
      }
      return true;
    }, "Notes cannot contain HTML tags")
  ).optional().nullable(),
  date: z.string().optional(),
  scheduleId: z.number().optional().nullable()
});
const superformInsertViewSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, "Name must contain at least 2 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional().nullable(),
  icon: z.string().optional().nullable(),
  filters: z.optional(
    z.array(
      z.object({
        column: z.string(),
        filter: z.string(),
        value: z.array(z.unknown())
      })
    ).or(z.null())
  ),
  display: z.optional(
    z.object({
      grouping: z.optional(z.array(z.string())),
      sort: z.optional(
        z.array(
          z.object({
            desc: z.boolean(),
            id: z.string()
          })
        )
      ),
      expanded: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
      visibility: z.literal(true).default(true).or(z.record(z.string(), z.boolean()))
    }).or(z.null())
  ),
  dirty: z.boolean().optional()
});
z.object({
  id: z.number().positive(),
  name: z.string().min(2, "Name must contain at least 2 characters").optional(),
  description: z.string().max(500, "Description must be less than 500 characters").optional().nullable(),
  icon: z.string().optional().nullable(),
  filters: z.optional(
    z.array(
      z.object({
        column: z.string(),
        filter: z.string(),
        value: z.array(z.unknown())
      })
    ).or(z.null())
  ),
  display: z.optional(
    z.object({
      grouping: z.optional(z.array(z.string())),
      sort: z.optional(
        z.array(
          z.object({
            desc: z.boolean(),
            id: z.string()
          })
        )
      ),
      expanded: z.literal(true).default(true).or(z.record(z.string(), z.boolean())),
      visibility: z.literal(true).default(true).or(z.record(z.string(), z.boolean()))
    }).or(z.null())
  ),
  dirty: z.boolean().optional()
});
const superformInsertScheduleSchema = z.object({
  id: z.number().optional(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(2, "Schedule name must be at least 2 characters").max(30, "Schedule name must be less than 30 characters")
  ),
  slug: z.string().transform((val) => val?.trim()?.toLowerCase()).pipe(
    z.string().min(2, "Slug must be at least 2 characters").max(30, "Slug must be less than 30 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
  ),
  status: z.enum(["active", "inactive"]).default("active"),
  amount: z.number().default(0),
  amount_2: z.number().default(0),
  amount_type: z.enum(["exact", "approximate", "range"]).default("exact"),
  recurring: z.boolean().default(false),
  auto_add: z.boolean().default(false),
  dateId: z.number().optional().nullable(),
  payeeId: z.number().positive("Payee is required"),
  accountId: z.number().positive("Account is required"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
z.object({
  id: z.number().positive(),
  name: z.string().transform((val) => val?.trim()).pipe(
    z.string().min(2, "Schedule name must be at least 2 characters").max(30, "Schedule name must be less than 30 characters")
  ).optional(),
  slug: z.string().transform((val) => val?.trim()?.toLowerCase()).pipe(
    z.string().min(2, "Slug must be at least 2 characters").max(30, "Slug must be less than 30 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
  ).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  amount: z.number().optional(),
  amount_2: z.number().optional(),
  amount_type: z.enum(["exact", "approximate", "range"]).optional(),
  recurring: z.boolean().optional(),
  auto_add: z.boolean().optional(),
  dateId: z.number().optional().nullable(),
  payeeId: z.number().positive("Payee is required").optional(),
  accountId: z.number().positive("Account is required").optional()
});
Manage_account_form[FILENAME] = "src/lib/components/forms/manage-account-form.svelte";
function Manage_account_form($$payload, $$props) {
  push(Manage_account_form);
  var $$store_subs;
  let { accountId, onSave } = $$props;
  const { data: { manageAccountForm } } = page;
  const accounts = AccountsState.get();
  const form = superForm(manageAccountForm, {
    id: "account-form",
    validators: zodClient(superformInsertAccountSchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          if (accountId && accountId > 0) {
            accounts.updateAccount(result.data["entity"]);
          } else {
            accounts.addAccount(result.data["entity"]);
          }
          onSave(result.data["entity"]);
        }
      }
    }
  });
  const { form: formData, enhance } = form;
  if (accountId && accountId > 0) {
    const account = accounts.getById(accountId);
    if (account) {
      store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).id = accountId);
      store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = account.name);
      store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).notes = account.notes);
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<form method="post" action="/accounts?/add-account" class="grid grid-cols-2 gap-2">`);
    push_element($$payload2, "form", 58, 0);
    $$payload2.out.push(`<input hidden${attr("value", store_get($$store_subs ??= {}, "$formData", formData).id)} name="id"/>`);
    push_element($$payload2, "input", 59, 2);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Form_field($$payload2, {
      form,
      name: "name",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Name`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Input($$payload4, spread_props([
              props,
              {
                get value() {
                  return store_get($$store_subs ??= {}, "$formData", formData).name;
                },
                set value($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!---->`);
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "notes",
      class: "col-span-full",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Notes`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Textarea($$payload4, spread_props([
              props,
              {
                get value() {
                  return store_get($$store_subs ??= {}, "$formData", formData).notes;
                },
                set value($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).notes = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!---->`);
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_button($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->save`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></form>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
Manage_account_form.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Advanced_date_input[FILENAME] = "src/lib/components/input/advanced-date-input.svelte";
function Advanced_date_input($$payload, $$props) {
  push(Advanced_date_input);
  let {
    onSubmit,
    disabled = false,
    ariaLabel = "Advanced date input"
  } = $$props;
  let dateType = "day";
  let value = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
  const MONTHS_PER_QUARTER = 3;
  const MONTHS_PER_HALF_YEAR = 6;
  const YEARS_TO_SHOW = 6;
  const currentDate2 = $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
  const userLocale = "en-US";
  const monthFmt = new $fb18d541ea1ad717$export$ad991b66133851cf(userLocale, { month: "long" });
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = currentDate2.set({ month: i + 1 });
    return {
      value: month.month,
      label: monthFmt.format(month.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2()))
    };
  });
  const quarterOptions = Array.from({ length: 4 }, (_, i) => {
    const month = currentDate2.set({ month: i * MONTHS_PER_QUARTER + 1 });
    return { value: month.month, label: `Q${i + 1}` };
  });
  const halfYearOptions = Array.from({ length: 2 }, (_, i) => {
    const month = currentDate2.set({ month: i * MONTHS_PER_HALF_YEAR + 1 });
    return { value: month.month, label: `H${i + 1}` };
  });
  const yearOptions = Array.from({ length: YEARS_TO_SHOW }, (_, i) => ({
    label: String((/* @__PURE__ */ new Date()).getFullYear() - i),
    value: (/* @__PURE__ */ new Date()).getFullYear() - i
  }));
  let selectedMonth = "";
  let selectedQuarter = "";
  let selectedHalfYear = "";
  let selectedYear = "";
  const getDateCache = /* @__PURE__ */ (() => {
    let cache = null;
    return () => {
      if (!cache) {
        cache = {
          "month": new SvelteMap(),
          "quarter": new SvelteMap(),
          "halfYear": new SvelteMap()
        };
        yearOptions.forEach((yearOption) => {
          monthOptions.forEach((monthOption) => {
            cache.month.set(`${yearOption.value}${monthOption.value}`, new $35ea8db9cb2ccb90$export$99faa760c7908e4f(yearOption.value, monthOption.value, 1));
          });
          quarterOptions.forEach((quarterOption) => {
            cache.quarter.set(`${yearOption.value}${quarterOption.value}`, new $35ea8db9cb2ccb90$export$99faa760c7908e4f(yearOption.value, quarterOption.value, 1));
          });
          halfYearOptions.forEach((halfYearOption) => {
            cache.halfYear.set(`${yearOption.value}${halfYearOption.value}`, new $35ea8db9cb2ccb90$export$99faa760c7908e4f(yearOption.value, halfYearOption.value, 1));
          });
        });
      }
      return cache;
    };
  })();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div role="region"${attr("aria-label", ariaLabel)}>`);
    push_element($$payload2, "div", 157, 0);
    $$payload2.out.push(`<form>`);
    push_element($$payload2, "form", 158, 0);
    $$payload2.out.push(`<fieldset>`);
    push_element($$payload2, "fieldset", 159, 2);
    $$payload2.out.push(`<legend class="sr-only">`);
    push_element($$payload2, "legend", 160, 4);
    $$payload2.out.push(`Select date range type</legend>`);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Toggle_group($$payload2, {
      type: "single",
      variant: "outline",
      size: "default",
      role: "radiogroup",
      "aria-labelledby": "date-type-label",
      get value() {
        return dateType;
      },
      set value($$value) {
        dateType = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Toggle_group_item($$payload3, {
          value: "day",
          "aria-label": "Select specific day",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->Day`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Toggle_group_item($$payload3, {
          value: "month",
          "aria-label": "Select entire month",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->Month`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Toggle_group_item($$payload3, {
          value: "quarter",
          "aria-label": "Select quarter (3 months)",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->Quarter`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Toggle_group_item($$payload3, {
          value: "half-year",
          "aria-label": "Select half year (6 months)",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->Half Year`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Toggle_group_item($$payload3, {
          value: "year",
          "aria-label": "Select entire year",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->Year`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></fieldset>`);
    pop_element();
    $$payload2.out.push(` `);
    if (dateType === "day") {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div role="group" aria-labelledby="day-picker-label">`);
      push_element($$payload2, "div", 188, 4);
      $$payload2.out.push(`<span id="day-picker-label" class="sr-only">`);
      push_element($$payload2, "span", 189, 6);
      $$payload2.out.push(`Select specific day</span>`);
      pop_element();
      $$payload2.out.push(` `);
      Calendar_1($$payload2, {
        type: "single",
        numberOfMonths: 2,
        class: "p-0",
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        }
      });
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
      if (dateType === "month") {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div role="group" aria-labelledby="month-picker-label">`);
        push_element($$payload2, "div", 193, 4);
        $$payload2.out.push(`<span id="month-picker-label" class="sr-only">`);
        push_element($$payload2, "span", 194, 6);
        $$payload2.out.push(`Select month and year</span>`);
        pop_element();
        $$payload2.out.push(` <!---->`);
        Toggle_group($$payload2, {
          type: "single",
          variant: "outline",
          onValueChange: (new_value) => {
            if (new_value) {
              const cached = getDateCache().month.get(new_value);
              if (cached) {
                value = cached;
              }
            } else {
              selectedMonth = "";
            }
          },
          class: "items-start justify-start grid h-[360px] overflow-auto",
          get value() {
            return selectedMonth;
          },
          set value($$value) {
            selectedMonth = $$value;
            $$settled = false;
          },
          children: prevent_snippet_stringification(($$payload3) => {
            const each_array = ensure_array_like(yearOptions);
            $$payload3.out.push(`<!--[-->`);
            for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
              let year = each_array[$$index_1];
              const each_array_1 = ensure_array_like(monthOptions);
              Label($$payload3, {
                class: "my-2",
                children: prevent_snippet_stringification(($$payload4) => {
                  $$payload4.out.push(`<!---->${escape_html(year.label)}`);
                }),
                $$slots: { default: true }
              });
              $$payload3.out.push(`<!----> <div class="grid w-full grid-cols-4">`);
              push_element($$payload3, "div", 198, 6);
              $$payload3.out.push(`<!--[-->`);
              for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                let month = each_array_1[$$index];
                $$payload3.out.push(`<!---->`);
                Toggle_group_item($$payload3, {
                  value: year.value + (month.value + ""),
                  "aria-label": month.label,
                  children: prevent_snippet_stringification(($$payload4) => {
                    $$payload4.out.push(`<!---->${escape_html(month.label)}`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!---->`);
              }
              $$payload3.out.push(`<!--]--></div>`);
              pop_element();
            }
            $$payload3.out.push(`<!--]-->`);
          }),
          $$slots: { default: true }
        });
        $$payload2.out.push(`<!----></div>`);
        pop_element();
      } else {
        $$payload2.out.push("<!--[!-->");
        if (dateType === "quarter") {
          $$payload2.out.push("<!--[-->");
          $$payload2.out.push(`<div role="group" aria-labelledby="quarter-picker-label">`);
          push_element($$payload2, "div", 209, 4);
          $$payload2.out.push(`<span id="quarter-picker-label" class="sr-only">`);
          push_element($$payload2, "span", 210, 6);
          $$payload2.out.push(`Select quarter and year</span>`);
          pop_element();
          $$payload2.out.push(` <!---->`);
          Toggle_group($$payload2, {
            type: "single",
            variant: "outline",
            onValueChange: (new_value) => {
              if (new_value) {
                const cached = getDateCache().quarter.get(new_value);
                if (cached) {
                  value = cached;
                }
              } else {
                selectedQuarter = "";
              }
            },
            class: "items-stretch justify-start grid grid-cols-2 h-[360px] overflow-auto",
            get value() {
              return selectedQuarter;
            },
            set value($$value) {
              selectedQuarter = $$value;
              $$settled = false;
            },
            children: prevent_snippet_stringification(($$payload3) => {
              const each_array_2 = ensure_array_like(yearOptions);
              $$payload3.out.push(`<!--[-->`);
              for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
                let year = each_array_2[$$index_3];
                const each_array_3 = ensure_array_like(quarterOptions);
                $$payload3.out.push(`<div>`);
                push_element($$payload3, "div", 213, 6);
                Label($$payload3, {
                  class: "my-2",
                  children: prevent_snippet_stringification(($$payload4) => {
                    $$payload4.out.push(`<!---->${escape_html(year.label)}`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!----> <div class="grid grid-cols-4 gap-0">`);
                push_element($$payload3, "div", 215, 8);
                $$payload3.out.push(`<!--[-->`);
                for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
                  let quarter = each_array_3[$$index_2];
                  $$payload3.out.push(`<!---->`);
                  Toggle_group_item($$payload3, {
                    value: year.value + (quarter.value + ""),
                    "aria-label": quarter.label,
                    children: prevent_snippet_stringification(($$payload4) => {
                      $$payload4.out.push(`<!---->${escape_html(quarter.label)}`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload3.out.push(`<!---->`);
                }
                $$payload3.out.push(`<!--]--></div>`);
                pop_element();
                $$payload3.out.push(`</div>`);
                pop_element();
              }
              $$payload3.out.push(`<!--]-->`);
            }),
            $$slots: { default: true }
          });
          $$payload2.out.push(`<!----></div>`);
          pop_element();
        } else {
          $$payload2.out.push("<!--[!-->");
          if (dateType === "half-year") {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<div role="group" aria-labelledby="half-year-picker-label">`);
            push_element($$payload2, "div", 227, 4);
            $$payload2.out.push(`<span id="half-year-picker-label" class="sr-only">`);
            push_element($$payload2, "span", 228, 6);
            $$payload2.out.push(`Select half year and year</span>`);
            pop_element();
            $$payload2.out.push(` <!---->`);
            Toggle_group($$payload2, {
              type: "single",
              variant: "outline",
              onValueChange: (new_value) => {
                if (new_value) {
                  const cached = getDateCache().halfYear.get(new_value);
                  if (cached) {
                    value = cached;
                  }
                } else {
                  selectedHalfYear = "";
                }
              },
              class: "items-start justify-start grid grid-cols-3 gap-2 h-[360px] overflow-auto",
              get value() {
                return selectedHalfYear;
              },
              set value($$value) {
                selectedHalfYear = $$value;
                $$settled = false;
              },
              children: prevent_snippet_stringification(($$payload3) => {
                const each_array_4 = ensure_array_like(yearOptions);
                $$payload3.out.push(`<!--[-->`);
                for (let $$index_5 = 0, $$length = each_array_4.length; $$index_5 < $$length; $$index_5++) {
                  let year = each_array_4[$$index_5];
                  const each_array_5 = ensure_array_like(halfYearOptions);
                  $$payload3.out.push(`<div>`);
                  push_element($$payload3, "div", 231, 6);
                  Label($$payload3, {
                    class: "my-2 text-center block",
                    children: prevent_snippet_stringification(($$payload4) => {
                      $$payload4.out.push(`<!---->${escape_html(year.label)}`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload3.out.push(`<!----> <div class="grid grid-cols-2">`);
                  push_element($$payload3, "div", 233, 8);
                  $$payload3.out.push(`<!--[-->`);
                  for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
                    let halfYear = each_array_5[$$index_4];
                    $$payload3.out.push(`<!---->`);
                    Toggle_group_item($$payload3, {
                      value: `${year.value}${halfYear.value}`,
                      "aria-label": `${stringify(halfYear.label)} ${stringify(year.label)}`,
                      children: prevent_snippet_stringification(($$payload4) => {
                        $$payload4.out.push(`<!---->${escape_html(halfYear.label)}`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload3.out.push(`<!---->`);
                  }
                  $$payload3.out.push(`<!--]--></div>`);
                  pop_element();
                  $$payload3.out.push(`</div>`);
                  pop_element();
                }
                $$payload3.out.push(`<!--]-->`);
              }),
              $$slots: { default: true }
            });
            $$payload2.out.push(`<!----></div>`);
            pop_element();
          } else {
            $$payload2.out.push("<!--[!-->");
            if (dateType === "year") {
              $$payload2.out.push("<!--[-->");
              $$payload2.out.push(`<div role="group" aria-labelledby="year-picker-label">`);
              push_element($$payload2, "div", 245, 4);
              $$payload2.out.push(`<span id="year-picker-label" class="sr-only">`);
              push_element($$payload2, "span", 246, 6);
              $$payload2.out.push(`Select year</span>`);
              pop_element();
              $$payload2.out.push(` <!---->`);
              Toggle_group($$payload2, {
                type: "single",
                variant: "outline",
                onValueChange: (new_value) => {
                  if (new_value) {
                    value = new $35ea8db9cb2ccb90$export$99faa760c7908e4f(parseInt(new_value), 1, 1);
                  } else {
                    selectedYear = "";
                  }
                },
                class: "items-start justify-start grid grid-cols-3 h-[360px] overflow-auto",
                get value() {
                  return selectedYear;
                },
                set value($$value) {
                  selectedYear = $$value;
                  $$settled = false;
                },
                children: prevent_snippet_stringification(($$payload3) => {
                  const each_array_6 = ensure_array_like(yearOptions);
                  $$payload3.out.push(`<!--[-->`);
                  for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
                    let year = each_array_6[$$index_6];
                    $$payload3.out.push(`<!---->`);
                    Toggle_group_item($$payload3, {
                      value: `${year.value}`,
                      "aria-label": year.label,
                      children: prevent_snippet_stringification(($$payload4) => {
                        $$payload4.out.push(`<!---->${escape_html(year.label)}`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload3.out.push(`<!---->`);
                  }
                  $$payload3.out.push(`<!--]-->`);
                }),
                $$slots: { default: true }
              });
              $$payload2.out.push(`<!----></div>`);
              pop_element();
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]-->`);
          }
          $$payload2.out.push(`<!--]-->`);
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
    $$payload2.out.push(`<!--]--> `);
    Button($$payload2, {
      type: "submit",
      disabled,
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->Apply`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></form>`);
    pop_element();
    $$payload2.out.push(`</div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Advanced_date_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Date_input[FILENAME] = "src/lib/components/input/date-input.svelte";
function Date_input($$payload, $$props) {
  push(Date_input);
  let { value = void 0, handleSubmit, buttonClass } = $$props;
  $$payload.out.push(`<!---->`);
  Root($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->`);
      {
        let child = function($$payload3, { props }) {
          validate_snippet_args($$payload3);
          Button($$payload3, spread_props([
            props,
            {
              variant: "outline",
              class: cn("w-full justify-start text-left font-normal", buttonClass),
              children: prevent_snippet_stringification(($$payload4) => {
                Calendar_days($$payload4, { class: "-mt-1 mr-1 inline-block size-4" });
                $$payload4.out.push(`<!----> ${escape_html(dateFormatter.format(value ? value.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2()) : $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2()).toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2())))}`);
              }),
              $$slots: { default: true }
            }
          ]));
        };
        prevent_snippet_stringification(child);
        Popover_trigger($$payload2, { child, $$slots: { child: true } });
      }
      $$payload2.out.push(`<!----> <!---->`);
      Popover_content($$payload2, {
        class: "w-auto p-0",
        align: "start",
        children: prevent_snippet_stringification(($$payload3) => {
          Calendar_1($$payload3, {
            type: "single",
            value: value ?? $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2()),
            onValueChange: (newValue) => {
              value = newValue;
              if (handleSubmit) handleSubmit(newValue);
            },
            initialFocus: true
          });
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!---->`);
  bind_props($$props, { value });
  pop();
}
Date_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Entity_input[FILENAME] = "src/lib/components/input/entity-input.svelte";
function Entity_input($$payload, $$props) {
  push(Entity_input);
  let {
    entityLabel = void 0,
    entities = void 0,
    defaultValue,
    value = void 0,
    handleSubmit,
    class: className,
    buttonClass,
    management,
    icon: Icon
  } = $$props;
  const findCurrentEntity = () => entities.find((entity) => entity.id == value?.id);
  let label = value?.name;
  let selected = findCurrentEntity();
  let open = false;
  let manage = false;
  let managingId = 0;
  if (defaultValue) {
    const defaultEntity = entities.find((entity) => entity.id === defaultValue);
    if (defaultEntity) {
      value = defaultEntity;
    }
  }
  const toggleManageScreen = (event) => {
    manage = !manage;
    if (!manage) {
      managingId = 0;
    }
  };
  const onSave = (new_entity, is_new) => {
    management?.onSave(new_entity, is_new);
    managingId = 0;
    manage = false;
    if (handleSubmit) handleSubmit(new_entity);
  };
  const onDelete = (id) => {
    management?.onDelete(id);
    managingId = 0;
    manage = false;
    if (handleSubmit) handleSubmit(void 0);
  };
  const addNew = () => {
    managingId = 0;
    manage = true;
  };
  let searchValue = "";
  new Fuse(entities, { keys: ["name"], includeScore: true });
  let visibleEntities = entities;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div${attr_class(clsx(cn("flex items-center space-x-4", className)))}>`);
    push_element($$payload2, "div", 98, 0);
    $$payload2.out.push(`<!---->`);
    Root($$payload2, {
      onOpenChange: (open2) => {
        if (!open2) {
          manage = false;
        }
      },
      get open() {
        return open;
      },
      set open($$value) {
        open = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let child = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Button($$payload4, spread_props([
              props,
              {
                variant: "outline",
                class: cn("block justify-start overflow-hidden text-ellipsis whitespace-nowrap text-left font-normal", !value && "text-muted-foreground", buttonClass || "w-48"),
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->`);
                  Icon($$payload5, { class: "-mt-1 mr-1 inline-block size-4" });
                  $$payload5.out.push(`<!----> ${escape_html(label)}`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Popover_trigger($$payload3, { child, $$slots: { child: true } });
        }
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "p-0",
          align: "start",
          children: prevent_snippet_stringification(($$payload4) => {
            if (!manage) {
              $$payload4.out.push("<!--[-->");
              $$payload4.out.push(`<!---->`);
              Command($$payload4, {
                shouldFilter: false,
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<div class="flex">`);
                  push_element($$payload5, "div", 126, 10);
                  $$payload5.out.push(`<!---->`);
                  Command_input($$payload5, {
                    placeholder: `Search ${stringify(entityLabel)}...`,
                    get value() {
                      return searchValue;
                    },
                    set value($$value) {
                      searchValue = $$value;
                      $$settled = false;
                    }
                  });
                  $$payload5.out.push(`<!----> `);
                  if (management?.enable) {
                    $$payload5.out.push("<!--[-->");
                    Button($$payload5, {
                      size: "icon",
                      class: "h-11 w-12 rounded-none border-b shadow-none",
                      onclick: addNew,
                      children: prevent_snippet_stringification(($$payload6) => {
                        Plus($$payload6, {});
                      }),
                      $$slots: { default: true }
                    });
                  } else {
                    $$payload5.out.push("<!--[!-->");
                  }
                  $$payload5.out.push(`<!--]--></div>`);
                  pop_element();
                  $$payload5.out.push(` <!---->`);
                  Command_list($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->`);
                      Command_empty($$payload6, {
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->No results found.`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!----> <!---->`);
                      Command_group($$payload6, {
                        children: prevent_snippet_stringification(($$payload7) => {
                          const each_array = ensure_array_like(visibleEntities);
                          $$payload7.out.push(`<!--[-->`);
                          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                            let entity = each_array[$$index];
                            $$payload7.out.push(`<!---->`);
                            Command_item($$payload7, {
                              value: entity.id + "",
                              class: cn(value?.id == entity.id && "bg-muted"),
                              onSelect: () => {
                                value = entity;
                                if (handleSubmit) {
                                  handleSubmit(entity);
                                }
                              },
                              children: prevent_snippet_stringification(($$payload8) => {
                                Check($$payload8, { class: cn(selected?.id != entity.id && "text-transparent") });
                                $$payload8.out.push(`<!----> <div class="flex-grow">`);
                                push_element($$payload8, "div", 153, 18);
                                $$payload8.out.push(`${escape_html(entity.name)}</div>`);
                                pop_element();
                                $$payload8.out.push(` `);
                                if (management?.enable) {
                                  $$payload8.out.push("<!--[-->");
                                  Button($$payload8, {
                                    variant: "outline",
                                    size: "icon",
                                    class: "mr-1 p-1 text-xs",
                                    onclick: (e) => {
                                      managingId = entity.id;
                                      toggleManageScreen();
                                    },
                                    children: prevent_snippet_stringification(($$payload9) => {
                                      Pencil($$payload9, {});
                                    }),
                                    $$slots: { default: true }
                                  });
                                } else {
                                  $$payload8.out.push("<!--[!-->");
                                }
                                $$payload8.out.push(`<!--]-->`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload7.out.push(`<!---->`);
                          }
                          $$payload7.out.push(`<!--]-->`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!---->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!---->`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!---->`);
            } else {
              $$payload4.out.push("<!--[!-->");
              $$payload4.out.push(`<div class="p-2">`);
              push_element($$payload4, "div", 175, 8);
              Button($$payload4, {
                variant: "outline",
                size: "icon",
                onclick: toggleManageScreen,
                children: prevent_snippet_stringification(($$payload5) => {
                  Move_left($$payload5, { class: "size-4" });
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> `);
              if (managingId > 0 && management) {
                $$payload4.out.push("<!--[-->");
                $$payload4.out.push(`<!---->`);
                management.component($$payload4, { id: managingId, onSave, onDelete });
                $$payload4.out.push(`<!---->`);
              } else {
                $$payload4.out.push("<!--[!-->");
                if (management) {
                  $$payload4.out.push("<!--[-->");
                  $$payload4.out.push(`<!---->`);
                  management.component($$payload4, { onSave });
                  $$payload4.out.push(`<!---->`);
                } else {
                  $$payload4.out.push("<!--[!-->");
                }
                $$payload4.out.push(`<!--]-->`);
              }
              $$payload4.out.push(`<!--]--></div>`);
              pop_element();
            }
            $$payload4.out.push(`<!--]-->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { entityLabel, entities, value });
  pop();
}
Entity_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Numeric_input[FILENAME] = "src/lib/components/input/numeric-input.svelte";
function Numeric_input($$payload, $$props) {
  push(Numeric_input);
  let { value = void 0, onSubmit, open = void 0, buttonClass } = $$props;
  let dialogOpen = open || false;
  let new_amount = (value || 0).toFixed(2);
  let input = null;
  const select = (num) => () => {
    new_amount += num;
  };
  const backspace = () => {
    new_amount = new_amount?.substring(0, new_amount.length - 1);
  };
  const clear = () => {
    new_amount = "";
    input?.focus();
  };
  const submit = () => {
    value = parseFloat(new_amount);
    dialogOpen = false;
    onSubmit?.();
  };
  const valueWellFormatted = () => new_amount?.match(/\-?\d+?\.\d{2}/) !== null && new_amount !== "0.00";
  const changeSign = () => {
    if (new_amount && new_amount !== "0.00" && new_amount !== "-") {
      new_amount = (parseFloat(new_amount) * -1).toString();
    } else if (new_amount === "-") {
      new_amount = "";
    } else {
      new_amount = "-";
    }
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="flex items-center space-x-4">`);
    push_element($$payload2, "div", 101, 0);
    $$payload2.out.push(`<!---->`);
    Root($$payload2, {
      onOpenChange: (open2) => {
        if (open2 && parseFloat(new_amount) == 0) {
          new_amount = "";
        }
      },
      get open() {
        return dialogOpen;
      },
      set open($$value) {
        dialogOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let child = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Button($$payload4, spread_props([
              props,
              {
                variant: "outline",
                class: cn("justify-start text-left font-normal", !new_amount && "text-muted-foreground", buttonClass || "w-36"),
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->${escape_html(currencyFormatter.format(parseFloat(new_amount) || 0))}`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Popover_trigger($$payload3, { child, $$slots: { child: true } });
        }
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "p-0",
          align: "start",
          onEscapeKeydown: () => new_amount = value.toString(),
          children: prevent_snippet_stringification(($$payload4) => {
            const each_array = ensure_array_like(Array.from({ length: 9 }, (_, i) => i + 1));
            $$payload4.out.push(`<div class="p-2">`);
            push_element($$payload4, "div", 131, 6);
            Input($$payload4, {
              class: "mb-2",
              placeholder: "0.00",
              get value() {
                return new_amount;
              },
              set value($$value) {
                new_amount = $$value;
                $$settled = false;
              },
              get ref() {
                return input;
              },
              set ref($$value) {
                input = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!----> <div class="keypad grid grid-cols-3 grid-rows-3 gap-2">`);
            push_element($$payload4, "div", 134, 8);
            $$payload4.out.push(`<!--[-->`);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let i = each_array[$$index];
              Button($$payload4, {
                variant: "outline",
                disabled: valueWellFormatted(),
                onclick: select(i.toString()),
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->${escape_html(i)}`);
                }),
                $$slots: { default: true }
              });
            }
            $$payload4.out.push(`<!--]--> `);
            Button($$payload4, {
              variant: "outline",
              disabled: new_amount?.includes("."),
              onclick: select("."),
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->.`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              variant: "outline",
              disabled: valueWellFormatted(),
              onclick: select("0"),
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->0`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              variant: "outline",
              disabled: !new_amount,
              onclick: backspace,
              children: prevent_snippet_stringification(($$payload5) => {
                Delete($$payload5, {});
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              variant: "outline",
              onclick: changeSign,
              children: prevent_snippet_stringification(($$payload5) => {
                if (!new_amount || parseFloat(new_amount) >= 0) {
                  $$payload5.out.push("<!--[-->");
                  $$payload5.out.push(`-`);
                } else {
                  $$payload5.out.push("<!--[!-->");
                  $$payload5.out.push(`+`);
                }
                $$payload5.out.push(`<!--]-->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              variant: "outline",
              disabled: !new_amount,
              onclick: clear,
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->clear`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              disabled: !new_amount || new_amount === "-",
              onclick: submit,
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->submit`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value, open });
  pop();
}
Numeric_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Multi_numeric_input[FILENAME] = "src/lib/components/input/multi-numeric-input.svelte";
function Multi_numeric_input($$payload, $$props) {
  push(Multi_numeric_input);
  let { value = [0, 0], open = void 0, type = "exact" } = $$props;
  let types = [
    { value: "exact", label: "is exactly" },
    { value: "approximate", label: "is approximately" },
    { value: "range", label: "is between" }
  ];
  let triggerRef = null;
  let typeOpen = false;
  function closeAndFocusTrigger() {
    typeOpen = false;
    tick().then(() => {
      triggerRef.focus();
    });
  }
  function handleTypeChange(newType) {
    if (newType === "range" && type !== "range") {
      if ((value[1] ?? 0) === 0 || (value[1] ?? 0) <= (value[0] ?? 0)) {
        value[1] = (value[0] ?? 0) + 0.01;
      }
    }
    type = newType;
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="flex items-center space-x-1">`);
    push_element($$payload2, "div", 57, 0);
    $$payload2.out.push(`<!---->`);
    Root($$payload2, {
      get open() {
        return typeOpen;
      },
      set open($$value) {
        typeOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let child = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Button($$payload4, spread_props([
              { variant: "outline", class: "justify-between" },
              props,
              {
                role: "combobox",
                "aria-expanded": open,
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->${escape_html(types.find((t) => t.value === type)?.label ?? "Select Type")}`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Popover_trigger($$payload3, {
            get ref() {
              return triggerRef;
            },
            set ref($$value) {
              triggerRef = $$value;
              $$settled = false;
            },
            child,
            $$slots: { child: true }
          });
        }
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "w-auto p-0",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Command($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Command_list($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->`);
                    Command_group($$payload6, {
                      children: prevent_snippet_stringification(($$payload7) => {
                        const each_array = ensure_array_like(types);
                        $$payload7.out.push(`<!--[-->`);
                        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                          let availableType = each_array[$$index];
                          $$payload7.out.push(`<!---->`);
                          Command_item($$payload7, {
                            value: availableType.label,
                            onSelect: () => {
                              handleTypeChange(availableType.value);
                              closeAndFocusTrigger();
                            },
                            children: prevent_snippet_stringification(($$payload8) => {
                              $$payload8.out.push(`<!---->${escape_html(availableType.label)}`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload7.out.push(`<!---->`);
                        }
                        $$payload7.out.push(`<!--]-->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload6.out.push(`<!---->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    if (type === "exact" || type === "approximate") {
      $$payload2.out.push("<!--[-->");
      Numeric_input($$payload2, {
        get value() {
          return value[0];
        },
        set value($$value) {
          value[0] = $$value;
          $$settled = false;
        }
      });
    } else {
      $$payload2.out.push("<!--[!-->");
      if (type === "range") {
        $$payload2.out.push("<!--[-->");
        Numeric_input($$payload2, {
          get value() {
            return value[0];
          },
          set value($$value) {
            value[0] = $$value;
            $$settled = false;
          }
        });
        $$payload2.out.push(`<!----> `);
        Numeric_input($$payload2, {
          get value() {
            return value[1];
          },
          set value($$value) {
            value[1] = $$value;
            $$settled = false;
          }
        });
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]-->`);
    }
    $$payload2.out.push(`<!--]--></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value, open, type });
  pop();
}
Multi_numeric_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Repeating_date_input[FILENAME] = "src/lib/components/input/repeating-date-input.svelte";
function Repeating_date_input($$payload, $$props) {
  push(Repeating_date_input);
  let {
    value = new RepeatingDateInput(),
    class: className,
    disabled = false
  } = $$props;
  let isRepeating = false;
  let hasEndCondition = false;
  let isValid = (() => {
    const validation = value.validate();
    return validation ? validation.valid : true;
  })();
  let validationErrors = (() => {
    const validation = value.validate();
    return validation ? validation.errors : [];
  })();
  (() => {
    return value.upcoming.slice(0, 5);
  })();
  const formatDate = (date) => {
    return dateFormatter.format(date.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2()));
  };
  const isUpcomingDate = (date) => {
    return value.upcoming.some((d) => {
      return d.year === date.year && d.month === date.month && d.day === date.day;
    });
  };
  const handleFrequencyChange = (newFrequency) => {
    value.frequency = newFrequency;
    value.week_days = [];
    value.weeks = [];
    value.weeks_days = [];
    value.days = null;
    value.on = false;
  };
  const handleWeekdayToggle = (weekday) => {
    const current = value.week_days || [];
    const index = current.indexOf(weekday);
    if (index > -1) {
      value.week_days = current.filter((d) => d !== weekday);
    } else {
      value.week_days = [...current, weekday].sort();
    }
  };
  const handleWeekToggle = (week) => {
    const current = value.weeks || [];
    const index = current.indexOf(week);
    if (index > -1) {
      value.weeks = current.filter((w) => w !== week);
    } else {
      value.weeks = [...current, week].sort();
    }
  };
  const handleWeeksDaysToggle = (weekday) => {
    const current = value.weeks_days || [];
    const index = current.indexOf(weekday);
    if (index > -1) {
      value.weeks_days = current.filter((d) => d !== weekday);
    } else {
      value.weeks_days = [...current, weekday].sort();
    }
  };
  inspect([value.end_type]);
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div${attr_class(clsx(cn("space-y-6", className)))}>`);
    push_element($$payload2, "div", 152, 0);
    $$payload2.out.push(`<div class="space-y-2">`);
    push_element($$payload2, "div", 154, 2);
    Label($$payload2, {
      for: "start-date",
      class: "text-sm font-medium",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->Start Date`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Root($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Popover_trigger($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            Button($$payload4, {
              variant: "outline",
              class: "w-full justify-start text-left font-normal",
              disabled,
              children: prevent_snippet_stringification(($$payload5) => {
                Calendar_days($$payload5, { class: "mr-2 h-4 w-4" });
                $$payload5.out.push(`<!----> ${escape_html(value.start ? formatDate(value.start) : "Select a date")}`);
              }),
              $$slots: { default: true }
            });
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "w-auto p-0",
          align: "start",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Calendar_1($$payload4, {
              type: "single",
              initialFocus: true,
              disabled,
              get value() {
                return value.start;
              },
              set value($$value) {
                value.start = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
    $$payload2.out.push(` <div class="space-y-4">`);
    push_element($$payload2, "div", 170, 2);
    Label($$payload2, {
      class: "hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
      children: prevent_snippet_stringification(($$payload3) => {
        Checkbox($$payload3, {
          disabled,
          class: "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
          get checked() {
            return isRepeating;
          },
          set checked($$value) {
            isRepeating = $$value;
            $$settled = false;
          }
        });
        $$payload3.out.push(`<!----> <div class="flex-1 space-y-1">`);
        push_element($$payload3, "div", 179, 6);
        $$payload3.out.push(`<div class="flex items-center gap-2">`);
        push_element($$payload3, "div", 180, 8);
        Repeat($$payload3, { class: "h-4 w-4" });
        $$payload3.out.push(`<!----> <span class="font-medium">`);
        push_element($$payload3, "span", 182, 10);
        $$payload3.out.push(`Make this recurring</span>`);
        pop_element();
        $$payload3.out.push(`</div>`);
        pop_element();
        $$payload3.out.push(` <p class="text-muted-foreground text-sm">`);
        push_element($$payload3, "p", 184, 8);
        $$payload3.out.push(`Set up a repeating schedule for this item</p>`);
        pop_element();
        $$payload3.out.push(`</div>`);
        pop_element();
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    if (isRepeating) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<!---->`);
      Card($$payload2, {
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Card_header($$payload3, {
            class: "pb-4",
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->`);
              Card_title($$payload4, {
                class: "text-base",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Recurrence Pattern`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <!---->`);
              Card_description($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Configure how often this should repeat`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!----> <!---->`);
          Card_content($$payload3, {
            class: "space-y-6",
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->`);
              Tabs($$payload4, {
                onValueChange: handleFrequencyChange,
                get value() {
                  return value.frequency;
                },
                set value($$value) {
                  value.frequency = $$value;
                  $$settled = false;
                },
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->`);
                  Tabs_list($$payload5, {
                    class: "grid w-full grid-cols-4",
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->`);
                      Tabs_trigger($$payload6, {
                        value: "daily",
                        disabled,
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->Daily`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!----> <!---->`);
                      Tabs_trigger($$payload6, {
                        value: "weekly",
                        disabled,
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->Weekly`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!----> <!---->`);
                      Tabs_trigger($$payload6, {
                        value: "monthly",
                        disabled,
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->Monthly`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!----> <!---->`);
                      Tabs_trigger($$payload6, {
                        value: "yearly",
                        disabled,
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->Yearly`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!---->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> <!---->`);
                  Tabs_content($$payload5, {
                    value: "daily",
                    class: "space-y-4",
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<div class="flex items-center gap-2 text-sm">`);
                      push_element($$payload6, "div", 207, 14);
                      $$payload6.out.push(`<span>`);
                      push_element($$payload6, "span", 208, 16);
                      $$payload6.out.push(`Repeat every</span>`);
                      pop_element();
                      $$payload6.out.push(` `);
                      Input($$payload6, {
                        type: "number",
                        min: "1",
                        max: "365",
                        class: "w-20",
                        disabled,
                        get value() {
                          return value.interval;
                        },
                        set value($$value) {
                          value.interval = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out.push(`<!----> <span>`);
                      push_element($$payload6, "span", 217, 16);
                      $$payload6.out.push(`day${escape_html((value.interval || 1) > 1 ? "s" : "")}</span>`);
                      pop_element();
                      $$payload6.out.push(`</div>`);
                      pop_element();
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> <!---->`);
                  Tabs_content($$payload5, {
                    value: "weekly",
                    class: "space-y-4",
                    children: prevent_snippet_stringification(($$payload6) => {
                      const each_array = ensure_array_like(weekdayOptions);
                      $$payload6.out.push(`<div class="flex items-center gap-2 text-sm">`);
                      push_element($$payload6, "div", 223, 14);
                      $$payload6.out.push(`<span>`);
                      push_element($$payload6, "span", 224, 16);
                      $$payload6.out.push(`Repeat every</span>`);
                      pop_element();
                      $$payload6.out.push(` `);
                      Input($$payload6, {
                        type: "number",
                        min: "1",
                        max: "52",
                        class: "w-20",
                        disabled,
                        get value() {
                          return value.interval;
                        },
                        set value($$value) {
                          value.interval = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out.push(`<!----> <span>`);
                      push_element($$payload6, "span", 233, 16);
                      $$payload6.out.push(`week${escape_html((value.interval || 1) > 1 ? "s" : "")}</span>`);
                      pop_element();
                      $$payload6.out.push(`</div>`);
                      pop_element();
                      $$payload6.out.push(` <div class="space-y-2">`);
                      push_element($$payload6, "div", 236, 14);
                      Label($$payload6, {
                        class: "text-sm font-medium",
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->On these days:`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!----> <div class="grid grid-cols-4 gap-2">`);
                      push_element($$payload6, "div", 238, 16);
                      $$payload6.out.push(`<!--[-->`);
                      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                        let weekday = each_array[$$index];
                        Button($$payload6, {
                          variant: (value.week_days || []).includes(weekday.value) ? "default" : "outline",
                          size: "sm",
                          onclick: () => handleWeekdayToggle(weekday.value),
                          disabled,
                          class: "text-xs",
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<!---->${escape_html(weekday.label.slice(0, 3))}`);
                          }),
                          $$slots: { default: true }
                        });
                      }
                      $$payload6.out.push(`<!--]--></div>`);
                      pop_element();
                      $$payload6.out.push(`</div>`);
                      pop_element();
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> <!---->`);
                  Tabs_content($$payload5, {
                    value: "monthly",
                    class: "space-y-4",
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<div class="flex items-center gap-2 text-sm">`);
                      push_element($$payload6, "div", 258, 14);
                      $$payload6.out.push(`<span>`);
                      push_element($$payload6, "span", 259, 16);
                      $$payload6.out.push(`Repeat every</span>`);
                      pop_element();
                      $$payload6.out.push(` `);
                      Input($$payload6, {
                        type: "number",
                        min: "1",
                        max: "12",
                        class: "w-20",
                        disabled,
                        get value() {
                          return value.interval;
                        },
                        set value($$value) {
                          value.interval = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out.push(`<!----> <span>`);
                      push_element($$payload6, "span", 268, 16);
                      $$payload6.out.push(`month${escape_html((value.interval || 1) > 1 ? "s" : "")}</span>`);
                      pop_element();
                      $$payload6.out.push(`</div>`);
                      pop_element();
                      $$payload6.out.push(` <div class="space-y-4">`);
                      push_element($$payload6, "div", 271, 14);
                      $$payload6.out.push(`<div class="flex items-center gap-2">`);
                      push_element($$payload6, "div", 272, 16);
                      Switch($$payload6, {
                        disabled,
                        get checked() {
                          return value.on;
                        },
                        set checked($$value) {
                          value.on = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out.push(`<!----> `);
                      Label($$payload6, {
                        class: "text-sm font-medium",
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->Specify occurrence pattern`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!----></div>`);
                      pop_element();
                      $$payload6.out.push(` `);
                      if (value.on) {
                        $$payload6.out.push("<!--[-->");
                        $$payload6.out.push(`<!---->`);
                        Radio_group($$payload6, {
                          disabled: !value.on || disabled,
                          get value() {
                            return value.on_type;
                          },
                          set value($$value) {
                            value.on_type = $$value;
                            $$settled = false;
                          },
                          children: prevent_snippet_stringification(($$payload7) => {
                            const each_array_1 = ensure_array_like(weekOptions);
                            const each_array_2 = ensure_array_like(weekdayOptions);
                            $$payload7.out.push(`<div class="space-y-3">`);
                            push_element($$payload7, "div", 279, 20);
                            $$payload7.out.push(`<div class="flex items-center gap-3">`);
                            push_element($$payload7, "div", 281, 22);
                            $$payload7.out.push(`<!---->`);
                            Radio_group_item($$payload7, { value: "day" });
                            $$payload7.out.push(`<!----> `);
                            Label($$payload7, {
                              class: "flex items-center gap-2",
                              children: prevent_snippet_stringification(($$payload8) => {
                                $$payload8.out.push(`<span>`);
                                push_element($$payload8, "span", 284, 26);
                                $$payload8.out.push(`On day</span>`);
                                pop_element();
                                $$payload8.out.push(` `);
                                Input($$payload8, {
                                  type: "number",
                                  min: "1",
                                  max: "31",
                                  class: "w-16",
                                  disabled: value.on_type !== "day" || !value.on || disabled,
                                  get value() {
                                    return value.days;
                                  },
                                  set value($$value) {
                                    value.days = $$value;
                                    $$settled = false;
                                  }
                                });
                                $$payload8.out.push(`<!----> <span>`);
                                push_element($$payload8, "span", 293, 26);
                                $$payload8.out.push(`of the month</span>`);
                                pop_element();
                              }),
                              $$slots: { default: true }
                            });
                            $$payload7.out.push(`<!----></div>`);
                            pop_element();
                            $$payload7.out.push(` <div class="flex items-start gap-3">`);
                            push_element($$payload7, "div", 298, 22);
                            $$payload7.out.push(`<!---->`);
                            Radio_group_item($$payload7, { value: "the", class: "mt-1" });
                            $$payload7.out.push(`<!----> <div class="space-y-3">`);
                            push_element($$payload7, "div", 300, 24);
                            Label($$payload7, {
                              children: prevent_snippet_stringification(($$payload8) => {
                                $$payload8.out.push(`<!---->On the`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload7.out.push(`<!----> <div class="space-y-2">`);
                            push_element($$payload7, "div", 303, 26);
                            Label($$payload7, {
                              class: "text-muted-foreground text-xs font-medium",
                              children: prevent_snippet_stringification(($$payload8) => {
                                $$payload8.out.push(`<!---->Week(s):`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload7.out.push(`<!----> <div class="flex flex-wrap gap-1">`);
                            push_element($$payload7, "div", 306, 28);
                            $$payload7.out.push(`<!--[-->`);
                            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                              let week = each_array_1[$$index_1];
                              Button($$payload7, {
                                variant: (value.weeks || []).includes(week.value) ? "default" : "outline",
                                size: "sm",
                                onclick: () => handleWeekToggle(week.value),
                                disabled: value.on_type !== "the" || !value.on || disabled,
                                class: "text-xs",
                                children: prevent_snippet_stringification(($$payload8) => {
                                  $$payload8.out.push(`<!---->${escape_html(week.label)}`);
                                }),
                                $$slots: { default: true }
                              });
                            }
                            $$payload7.out.push(`<!--]--></div>`);
                            pop_element();
                            $$payload7.out.push(`</div>`);
                            pop_element();
                            $$payload7.out.push(` <div class="space-y-2">`);
                            push_element($$payload7, "div", 323, 26);
                            Label($$payload7, {
                              class: "text-muted-foreground text-xs font-medium",
                              children: prevent_snippet_stringification(($$payload8) => {
                                $$payload8.out.push(`<!---->Day(s):`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload7.out.push(`<!----> <div class="grid grid-cols-4 gap-1">`);
                            push_element($$payload7, "div", 325, 28);
                            $$payload7.out.push(`<!--[-->`);
                            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                              let weekday = each_array_2[$$index_2];
                              Button($$payload7, {
                                variant: (value.weeks_days || []).includes(weekday.value) ? "default" : "outline",
                                size: "sm",
                                onclick: () => handleWeeksDaysToggle(weekday.value),
                                disabled: value.on_type !== "the" || !value.on || disabled,
                                class: "text-xs",
                                children: prevent_snippet_stringification(($$payload8) => {
                                  $$payload8.out.push(`<!---->${escape_html(weekday.label.slice(0, 3))}`);
                                }),
                                $$slots: { default: true }
                              });
                            }
                            $$payload7.out.push(`<!--]--></div>`);
                            pop_element();
                            $$payload7.out.push(`</div>`);
                            pop_element();
                            $$payload7.out.push(`</div>`);
                            pop_element();
                            $$payload7.out.push(`</div>`);
                            pop_element();
                            $$payload7.out.push(`</div>`);
                            pop_element();
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!---->`);
                      } else {
                        $$payload6.out.push("<!--[!-->");
                      }
                      $$payload6.out.push(`<!--]--></div>`);
                      pop_element();
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> <!---->`);
                  Tabs_content($$payload5, {
                    value: "yearly",
                    class: "space-y-4",
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<div class="flex items-center gap-2 text-sm">`);
                      push_element($$payload6, "div", 351, 14);
                      $$payload6.out.push(`<span>`);
                      push_element($$payload6, "span", 352, 16);
                      $$payload6.out.push(`Repeat every</span>`);
                      pop_element();
                      $$payload6.out.push(` `);
                      Input($$payload6, {
                        type: "number",
                        min: "1",
                        max: "10",
                        class: "w-20",
                        disabled,
                        get value() {
                          return value.interval;
                        },
                        set value($$value) {
                          value.interval = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out.push(`<!----> <span>`);
                      push_element($$payload6, "span", 361, 16);
                      $$payload6.out.push(`year${escape_html((value.interval || 1) > 1 ? "s" : "")}</span>`);
                      pop_element();
                      $$payload6.out.push(`</div>`);
                      pop_element();
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!---->`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> `);
              Separator($$payload4, {});
              $$payload4.out.push(`<!----> <div class="space-y-4">`);
              push_element($$payload4, "div", 369, 10);
              $$payload4.out.push(`<div class="space-y-2">`);
              push_element($$payload4, "div", 370, 12);
              Label($$payload4, {
                class: "text-sm font-medium",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Weekend Handling`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <p class="text-muted-foreground text-xs">`);
              push_element($$payload4, "p", 372, 14);
              $$payload4.out.push(`Adjust dates that fall on weekends</p>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
              $$payload4.out.push(` <!---->`);
              Radio_group($$payload4, {
                disabled,
                get value() {
                  return value.moveWeekends;
                },
                set value($$value) {
                  value.moveWeekends = $$value;
                  $$settled = false;
                },
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<div class="space-y-2">`);
                  push_element($$payload5, "div", 378, 14);
                  $$payload5.out.push(`<div class="flex items-center space-x-2">`);
                  push_element($$payload5, "div", 379, 16);
                  $$payload5.out.push(`<!---->`);
                  Radio_group_item($$payload5, { value: "none" });
                  $$payload5.out.push(`<!----> `);
                  Label($$payload5, {
                    class: "text-sm",
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->No adjustment`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----></div>`);
                  pop_element();
                  $$payload5.out.push(` <div class="flex items-center space-x-2">`);
                  push_element($$payload5, "div", 383, 16);
                  $$payload5.out.push(`<!---->`);
                  Radio_group_item($$payload5, { value: "next_weekday" });
                  $$payload5.out.push(`<!----> `);
                  Label($$payload5, {
                    class: "text-sm",
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->Move to next weekday (Monday)`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----></div>`);
                  pop_element();
                  $$payload5.out.push(` <div class="flex items-center space-x-2">`);
                  push_element($$payload5, "div", 387, 16);
                  $$payload5.out.push(`<!---->`);
                  Radio_group_item($$payload5, { value: "previous_weekday" });
                  $$payload5.out.push(`<!----> `);
                  Label($$payload5, {
                    class: "text-sm",
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->Move to previous weekday (Friday)`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----></div>`);
                  pop_element();
                  $$payload5.out.push(`</div>`);
                  pop_element();
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----></div>`);
              pop_element();
              $$payload4.out.push(` `);
              Separator($$payload4, {});
              $$payload4.out.push(`<!----> <div class="space-y-4">`);
              push_element($$payload4, "div", 398, 10);
              Label($$payload4, {
                class: "hover:bg-accent/50 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                children: prevent_snippet_stringification(($$payload5) => {
                  Checkbox($$payload5, {
                    onCheckedChange: (checked) => {
                      if (!checked) {
                        value.end_type = null;
                      }
                    },
                    disabled,
                    class: "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
                    get checked() {
                      return hasEndCondition;
                    },
                    set checked($$value) {
                      hasEndCondition = $$value;
                      $$settled = false;
                    }
                  });
                  $$payload5.out.push(`<!----> <div class="flex-1">`);
                  push_element($$payload5, "div", 412, 14);
                  $$payload5.out.push(`<div class="text-sm font-medium">`);
                  push_element($$payload5, "div", 413, 16);
                  $$payload5.out.push(`Set end condition</div>`);
                  pop_element();
                  $$payload5.out.push(` <p class="text-muted-foreground text-xs">`);
                  push_element($$payload5, "p", 414, 16);
                  $$payload5.out.push(`Limit the number of occurrences or set an end date</p>`);
                  pop_element();
                  $$payload5.out.push(`</div>`);
                  pop_element();
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> `);
              if (hasEndCondition) {
                $$payload4.out.push("<!--[-->");
                $$payload4.out.push(`<!---->`);
                Tabs($$payload4, {
                  value: value.end_type || "limit",
                  onValueChange: (v) => value.end_type = v,
                  children: prevent_snippet_stringification(($$payload5) => {
                    $$payload5.out.push(`<!---->`);
                    Tabs_list($$payload5, {
                      class: "grid w-full grid-cols-2",
                      children: prevent_snippet_stringification(($$payload6) => {
                        $$payload6.out.push(`<!---->`);
                        Tabs_trigger($$payload6, {
                          value: "limit",
                          disabled,
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<!---->Limit occurrences`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!----> <!---->`);
                        Tabs_trigger($$payload6, {
                          value: "until",
                          disabled,
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<!---->End on date`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!---->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload5.out.push(`<!----> <!---->`);
                    Tabs_content($$payload5, {
                      value: "limit",
                      class: "space-y-2",
                      children: prevent_snippet_stringification(($$payload6) => {
                        $$payload6.out.push(`<div class="flex items-center gap-2 text-sm">`);
                        push_element($$payload6, "div", 431, 18);
                        $$payload6.out.push(`<span>`);
                        push_element($$payload6, "span", 432, 20);
                        $$payload6.out.push(`Stop after</span>`);
                        pop_element();
                        $$payload6.out.push(` `);
                        Input($$payload6, {
                          type: "number",
                          min: "1",
                          max: "999",
                          class: "w-20",
                          disabled,
                          get value() {
                            return value.limit;
                          },
                          set value($$value) {
                            value.limit = $$value;
                            $$settled = false;
                          }
                        });
                        $$payload6.out.push(`<!----> <span>`);
                        push_element($$payload6, "span", 441, 20);
                        $$payload6.out.push(`occurrence${escape_html((value.limit || 1) > 1 ? "s" : "")}</span>`);
                        pop_element();
                        $$payload6.out.push(`</div>`);
                        pop_element();
                      }),
                      $$slots: { default: true }
                    });
                    $$payload5.out.push(`<!----> <!---->`);
                    Tabs_content($$payload5, {
                      value: "until",
                      class: "space-y-2",
                      children: prevent_snippet_stringification(($$payload6) => {
                        $$payload6.out.push(`<!---->Repeat until <!---->`);
                        Root($$payload6, {
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<!---->`);
                            Popover_trigger($$payload7, {
                              children: prevent_snippet_stringification(($$payload8) => {
                                Button($$payload8, {
                                  variant: "outline",
                                  class: "ml-1 w-full justify-start text-left font-normal",
                                  disabled,
                                  children: prevent_snippet_stringification(($$payload9) => {
                                    Calendar_days($$payload9, { class: "mr-2 h-4 w-4" });
                                    $$payload9.out.push(`<!----> ${escape_html(value.end ? formatDate(value.end) : "Select end date")}`);
                                  }),
                                  $$slots: { default: true }
                                });
                              }),
                              $$slots: { default: true }
                            });
                            $$payload7.out.push(`<!----> <!---->`);
                            Popover_content($$payload7, {
                              class: "w-auto p-0",
                              align: "start",
                              children: prevent_snippet_stringification(($$payload8) => {
                                $$payload8.out.push(`<!---->`);
                                Calendar_1($$payload8, {
                                  type: "single",
                                  initialFocus: true,
                                  disabled,
                                  get value() {
                                    return value.end;
                                  },
                                  set value($$value) {
                                    value.end = $$value;
                                    $$settled = false;
                                  }
                                });
                                $$payload8.out.push(`<!---->`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload7.out.push(`<!---->`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!---->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload5.out.push(`<!---->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload4.out.push(`<!---->`);
              } else {
                $$payload4.out.push("<!--[!-->");
              }
              $$payload4.out.push(`<!--]--></div>`);
              pop_element();
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!---->`);
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></div>`);
    pop_element();
    $$payload2.out.push(` `);
    if (isRepeating && value.start) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<!---->`);
      Card($$payload2, {
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Card_header($$payload3, {
            class: "pb-3",
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->`);
              Card_title($$payload4, {
                class: "text-base",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Preview`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!----> <!---->`);
          Card_content($$payload3, {
            class: "space-y-4",
            children: prevent_snippet_stringification(($$payload4) => {
              if (!isValid && validationErrors.length > 0) {
                $$payload4.out.push("<!--[-->");
                const each_array_3 = ensure_array_like(validationErrors);
                $$payload4.out.push(`<div class="bg-destructive/10 rounded-lg p-3 text-sm">`);
                push_element($$payload4, "div", 485, 10);
                $$payload4.out.push(`<div class="text-destructive flex items-center gap-2 font-medium">`);
                push_element($$payload4, "div", 486, 12);
                Circle_alert($$payload4, { class: "h-4 w-4" });
                $$payload4.out.push(`<!----> Configuration Issues</div>`);
                pop_element();
                $$payload4.out.push(` <ul class="text-destructive/80 mt-2 space-y-1">`);
                push_element($$payload4, "ul", 490, 12);
                $$payload4.out.push(`<!--[-->`);
                for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
                  let error = each_array_3[$$index_3];
                  $$payload4.out.push(`<li>`);
                  push_element($$payload4, "li", 492, 16);
                  $$payload4.out.push(`• ${escape_html(error)}</li>`);
                  pop_element();
                }
                $$payload4.out.push(`<!--]--></ul>`);
                pop_element();
                $$payload4.out.push(`</div>`);
                pop_element();
              } else {
                $$payload4.out.push("<!--[!-->");
              }
              $$payload4.out.push(`<!--]--> <div class="space-y-2">`);
              push_element($$payload4, "div", 499, 8);
              Label($$payload4, {
                class: "text-muted-foreground text-xs font-medium",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Pattern:`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <p class="bg-muted/50 rounded p-2 text-sm">`);
              push_element($$payload4, "p", 501, 10);
              $$payload4.out.push(`${escape_html(value.formatted)}</p>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
              $$payload4.out.push(` <div class="space-y-2">`);
              push_element($$payload4, "div", 505, 8);
              Label($$payload4, {
                class: "text-muted-foreground text-xs font-medium",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Calendar preview:`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <!---->`);
              {
                let day = function($$payload5, { day: day2, outsideMonth }) {
                  validate_snippet_args($$payload5);
                  const isStartDate = value.start && day2 === value.start;
                  const isRecurring = isUpcomingDate(day2);
                  $$payload5.out.push(`<!---->`);
                  Calendar_day($$payload5, {
                    class: cn(isStartDate ? "bg-green-500 font-bold text-white ring-2 ring-green-300 hover:bg-green-600" : isRecurring ? outsideMonth ? "bg-primary/30 text-primary hover:bg-primary/40 border-primary/50 border" : "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground" : outsideMonth ? "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50" : ""),
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->${escape_html(day2.day)}`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!---->`);
                };
                prevent_snippet_stringification(day);
                Calendar_1($$payload4, {
                  type: "single",
                  value: value.start,
                  class: "rounded-md border [--cell-size:--spacing(11)] md:[--cell-size:--spacing(9.75)]",
                  readonly: true,
                  captionLayout: "dropdown",
                  get placeholder() {
                    return value.placeholder;
                  },
                  set placeholder($$value) {
                    value.placeholder = $$value;
                    $$settled = false;
                  },
                  day,
                  $$slots: { day: true }
                });
              }
              $$payload4.out.push(`<!----></div>`);
              pop_element();
              $$payload4.out.push(` <div class="space-y-2">`);
              push_element($$payload4, "div", 539, 8);
              Label($$payload4, {
                class: "text-muted-foreground text-xs font-medium",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Legend:`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <div class="flex flex-wrap gap-3 text-xs">`);
              push_element($$payload4, "div", 541, 10);
              $$payload4.out.push(`<div class="flex items-center gap-1">`);
              push_element($$payload4, "div", 542, 12);
              $$payload4.out.push(`<div class="bg-primary h-3 w-3 rounded">`);
              push_element($$payload4, "div", 543, 14);
              $$payload4.out.push(`</div>`);
              pop_element();
              $$payload4.out.push(` <span>`);
              push_element($$payload4, "span", 544, 14);
              $$payload4.out.push(`Recurring dates</span>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
              $$payload4.out.push(` <div class="flex items-center gap-1">`);
              push_element($$payload4, "div", 546, 12);
              $$payload4.out.push(`<div class="bg-primary/30 border-primary/50 h-3 w-3 rounded border">`);
              push_element($$payload4, "div", 547, 14);
              $$payload4.out.push(`</div>`);
              pop_element();
              $$payload4.out.push(` <span>`);
              push_element($$payload4, "span", 548, 14);
              $$payload4.out.push(`Adjacent month occurrences</span>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!---->`);
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value });
  pop();
}
Repeating_date_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Manage_schedule_form[FILENAME] = "src/lib/components/forms/manage-schedule-form.svelte";
function Manage_schedule_form($$payload, $$props) {
  push(Manage_schedule_form);
  var $$store_subs;
  let { scheduleId, onSave } = $$props;
  const { data: { accounts, payees, manageScheduleForm } } = page;
  const schedules = SchedulesState.get();
  let payee = { id: 0, name: "" };
  let account = { id: 0, name: "" };
  let repeating_date = new RepeatingDateInput();
  const form = superForm(manageScheduleForm, {
    id: "schedule-form",
    validators: zodClient(superformInsertScheduleSchema),
    onResult: async ({ result }) => {
      if (onSave && result.type === "success" && result.data) {
        schedules.addSchedule(result.data["entity"]);
        onSave(result.data["entity"]);
      }
    }
  });
  const { form: formData, enhance } = form;
  let amount = [0, 0];
  let defaultPayee = void 0;
  let defaultAccount = void 0;
  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).amount_type = "exact");
  if (scheduleId && scheduleId > 0) {
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).id = scheduleId);
    const schedule = schedules.getById(scheduleId);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = schedule?.name);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).payeeId = defaultPayee = schedule?.payeeId);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).accountId = defaultAccount = schedule?.accountId);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).amount_type = schedule?.amount_type);
    (() => {
      amount[0] = schedule?.amount || 0;
      amount[1] = schedule?.amount_2 || 0;
    })();
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<form method="post" action="/schedules?/save-schedule">`);
    push_element($$payload2, "form", 98, 0);
    $$payload2.out.push(`<input hidden${attr("value", store_get($$store_subs ??= {}, "$formData", formData).id)} name="id"/>`);
    push_element($$payload2, "input", 99, 2);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Form_field($$payload2, {
      form,
      name: "name",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Name`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Input($$payload4, spread_props([
              props,
              {
                get value() {
                  return store_get($$store_subs ??= {}, "$formData", formData).name;
                },
                set value($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!---->`);
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <div>`);
    push_element($$payload2, "div", 111, 2);
    $$payload2.out.push(`<!---->`);
    Form_field($$payload2, {
      form,
      name: "payeeId",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Payee`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Entity_input($$payload4, {
              entityLabel: "payees",
              entities: payees,
              defaultValue: defaultPayee,
              icon: Hand_coins,
              buttonClass: "w-full",
              get value() {
                return payee;
              },
              set value($$value) {
                payee = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!----> <input hidden${attr("value", store_get($$store_subs ??= {}, "$formData", formData).payeeId)}${attr("name", props.name)}/>`);
            push_element($$payload4, "input", 125, 10);
            pop_element();
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "accountId",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Account`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Entity_input($$payload4, {
              entityLabel: "account",
              entities: accounts,
              defaultValue: defaultAccount,
              icon: Hand_coins,
              buttonClass: "w-full",
              get value() {
                return account;
              },
              set value($$value) {
                account = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!----> <input hidden${attr("value", store_get($$store_subs ??= {}, "$formData", formData).accountId)}${attr("name", props.name)}/>`);
            push_element($$payload4, "input", 143, 10);
            pop_element();
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "amount",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Amount`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Multi_numeric_input($$payload4, spread_props([
              props,
              {
                get value() {
                  return amount;
                },
                set value($$value) {
                  amount = $$value;
                  $$settled = false;
                },
                get type() {
                  return store_get($$store_subs ??= {}, "$formData", formData).amount_type;
                },
                set type($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).amount_type = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!----> <input hidden${attr("value", store_get($$store_subs ??= {}, "$formData", formData).amount)}${attr("name", props.name)}/>`);
            push_element($$payload4, "input", 158, 10);
            pop_element();
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "amount_2",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<input hidden${attr("value", store_get($$store_subs ??= {}, "$formData", formData).amount_2)}${attr("name", props.name)}/>`);
            push_element($$payload4, "input", 166, 10);
            pop_element();
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "amount_type",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<input hidden${attr("value", store_get($$store_subs ??= {}, "$formData", formData).amount_type)}${attr("name", props.name)}/>`);
            push_element($$payload4, "input", 174, 10);
            pop_element();
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "repeating_date",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Repeating_date_input($$payload4, spread_props([
              props,
              {
                get value() {
                  return repeating_date;
                },
                set value($$value) {
                  repeating_date = $$value;
                  $$settled = false;
                }
              }
            ]));
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Form_button($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->save`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></form>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
Manage_schedule_form.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Add_account_dialog[FILENAME] = "src/lib/components/dialogs/add-account-dialog.svelte";
function Add_account_dialog($$payload, $$props) {
  push(Add_account_dialog);
  const dialogOpen = newAccountDialog;
  const accountId = managingAccountId;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    var bind_get = () => dialogOpen.current;
    var bind_set = (newOpen) => dialogOpen.current = newOpen;
    $$payload2.out.push(`<!---->`);
    Root$1($$payload2, {
      get open() {
        return bind_get();
      },
      set open($$value) {
        bind_set($$value);
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Dialog_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Dialog_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Dialog_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    if (accountId.current === 0) {
                      $$payload6.out.push("<!--[-->");
                      $$payload6.out.push(`Add`);
                    } else {
                      $$payload6.out.push("<!--[!-->");
                      $$payload6.out.push(`Manage`);
                    }
                    $$payload6.out.push(`<!--]--> Account`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Dialog_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    Manage_account_form($$payload6, {
                      accountId: accountId.current,
                      onSave: () => dialogOpen.current = false
                    });
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Add_account_dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Delete_account_dialog[FILENAME] = "src/lib/components/dialogs/delete-account-dialog.svelte";
function Delete_account_dialog($$payload, $$props) {
  push(Delete_account_dialog);
  const _deleteAccountDialog = deleteAccountDialog;
  const _deleteAccountId = deleteAccountId;
  const accountsState = AccountsState.get();
  const confirmDeleteAccount = async () => {
    _deleteAccountDialog.current = false;
    accountsState.deleteAccount(_deleteAccountId.current);
    await goto();
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    var bind_get = () => _deleteAccountDialog.current;
    var bind_set = (newOpen) => _deleteAccountDialog.current = newOpen;
    $$payload2.out.push(`<!---->`);
    Root$2($$payload2, {
      get open() {
        return bind_get();
      },
      set open($$value) {
        bind_set($$value);
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Alert_dialog_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Alert_dialog_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Are you absolutely sure?`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->This action cannot be undone. This will permanently delete your account and any associated
        information with it.`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Alert_dialog_footer($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_cancel($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Cancel`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_action($$payload5, {
                  onclick: confirmDeleteAccount,
                  class: buttonVariants({ variant: "destructive" }),
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Continue`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Delete_account_dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Add_schedule_dialog[FILENAME] = "src/lib/components/dialogs/add-schedule-dialog.svelte";
function Add_schedule_dialog($$payload, $$props) {
  push(Add_schedule_dialog);
  const dialogOpen = newScheduleDialog;
  const scheduleId = managingScheduleId;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    var bind_get = () => dialogOpen.current;
    var bind_set = (newOpen) => dialogOpen.current = newOpen;
    $$payload2.out.push(`<!---->`);
    Root$3($$payload2, {
      get open() {
        return bind_get();
      },
      set open($$value) {
        bind_set($$value);
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Sheet_content($$payload3, {
          preventScroll: false,
          class: "overflow-auto",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Sheet_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Sheet_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    if (scheduleId.current === 0) {
                      $$payload6.out.push("<!--[-->");
                      $$payload6.out.push(`Add`);
                    } else {
                      $$payload6.out.push("<!--[!-->");
                      $$payload6.out.push(`Manage`);
                    }
                    $$payload6.out.push(`<!--]--> Schedule`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Sheet_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    Manage_schedule_form($$payload6, {
                      scheduleId: scheduleId.current,
                      onSave: () => dialogOpen.current = false
                    });
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Add_schedule_dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function transformDataForChartType(data, chartType, options = {}) {
  const { categoryField = "category", valueField = "y", seriesField = "series", colors = [] } = options;
  switch (chartType) {
    case "pie":
    case "arc":
      return transformForPieChart(data, { categoryField, valueField, colors });
    // Hierarchy charts (future support)
    // case 'pack':
    // case 'tree':
    // case 'treemap':
    // case 'sunburst':
    // case 'partition':
    //   return transformForHierarchyChart(data, chartType, options);
    // Graph charts (future support)
    // case 'sankey':
    //   return transformForSankeyChart(data, options);
    case "calendar":
      return transformForCalendarChart(data, options);
    // Stacked charts (future support)
    // case 'barstack':
    // case 'areastack':
    //   return transformForStackedChart(data, { seriesField, valueField, categoryField: 'x' });
    // Geo charts (future support)
    // case 'choropleth':
    // case 'geopath':
    // case 'geopoint':
    //   return transformForGeoChart(data, chartType, options);
    default:
      return data;
  }
}
function transformForPieChart(data, options) {
  const { categoryField, valueField, colors } = options;
  const groupedData = data.reduce((acc, item) => {
    const category = item[categoryField] || item.category || item.label || String(item.x);
    const existing = acc.find((d) => d.category === category);
    if (existing) {
      existing.value += Math.abs(Number(item[valueField] || item.value || item.y || 0));
    } else {
      acc.push({
        category,
        value: Math.abs(Number(item[valueField] || item.value || item.y || 0))
      });
    }
    return acc;
  }, []);
  const filteredData = groupedData.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  return filteredData.map((item, index) => ({
    // Required field for pie charts
    value: item.value,
    // Label for display/legend
    label: item.category,
    // Category for grouping
    category: item.category,
    // If colors are provided, map them (these should be resolved HSL strings, not CSS variables)
    ...colors && colors.length > 0 && colors[index % colors.length] ? { color: colors[index % colors.length] } : {}
  }));
}
function transformForCalendarChart(data, options) {
  const { dateField = "x", valueField = "y" } = options;
  return data.map((item) => ({
    ...item,
    date: item[dateField] instanceof Date ? item[dateField] : new Date(item[dateField]),
    value: item[valueField] || item.y || 0
  }));
}
function getDataAccessorsForChartType(chartType) {
  switch (chartType) {
    case "pie":
    case "arc":
      return { x: "value", c: "category" };
    case "calendar":
      return { x: "date", y: "value" };
    // Hierarchy charts (future support)
    // case 'pack':
    // case 'tree':
    // case 'treemap':
    // case 'sunburst':
    // case 'partition':
    //   return {}; // Hierarchy charts use their own layout algorithms
    // Graph charts (future support)
    // case 'sankey':
    //   return {}; // Sankey uses nodes/links structure
    default:
      return { x: "x", y: "y" };
  }
}
function supportsMultiSeries(chartType) {
  const multiSeriesTypes = [
    "bar",
    "area",
    "line",
    "scatter",
    "spline"
    // Future: 'connectedpoints', 'barstack', 'areastack'
  ];
  return multiSeriesTypes.includes(chartType);
}
function isCircularChart(chartType) {
  const circularTypes = ["pie", "arc"];
  return circularTypes.includes(chartType);
}
function requiresHierarchicalData(chartType) {
  const hierarchyTypes = [];
  return hierarchyTypes.includes(chartType);
}
function transformIncomeVsExpensesData(data, mapping) {
  const getField = (field, item) => {
    return typeof field === "function" ? field(item) : item[field];
  };
  const income = data.map((item, index) => ({
    x: getField(mapping.x, item),
    y: Number(getField(mapping.income, item)) || 0,
    category: "Income",
    series: "income",
    metadata: { ...item, index, type: "income" }
  }));
  const expenses = data.map((item, index) => ({
    x: getField(mapping.x, item),
    y: Math.abs(Number(getField(mapping.expenses, item)) || 0),
    category: "Expenses",
    series: "expenses",
    metadata: { ...item, index, type: "expenses" }
  }));
  const combined = data.flatMap((item, index) => [
    {
      x: getField(mapping.x, item),
      y: Number(getField(mapping.income, item)) || 0,
      category: "Income",
      series: "income",
      key: `combined-income-${index}`,
      // Unique key for combined dataset
      metadata: { ...item, index, type: "income" }
    },
    {
      x: getField(mapping.x, item),
      y: Math.abs(Number(getField(mapping.expenses, item)) || 0),
      category: "Expenses",
      series: "expenses",
      key: `combined-expenses-${index}`,
      // Unique key for combined dataset
      metadata: { ...item, index, type: "expenses" }
    }
  ]);
  const series = [...income, ...expenses];
  return { combined, income, expenses, series };
}
function transformData(data, mapping) {
  return data.map((item, index) => {
    const getField = (field) => {
      return typeof field === "function" ? field(item) : item[field];
    };
    return {
      x: getField(mapping.x),
      y: Number(getField(mapping.y)) || 0,
      ...mapping.category && { category: String(getField(mapping.category)) },
      metadata: { ...item, index }
    };
  });
}
function aggregateForPerformance(data, maxPoints = 500) {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const aggregated = [];
  for (let i = 0; i < data.length; i += step) {
    const chunk = data.slice(i, i + step);
    const avgY = chunk.reduce((sum, d) => sum + d.y, 0) / chunk.length;
    const middleIndex = Math.floor(chunk.length / 2);
    const representative = chunk[middleIndex] || chunk[0];
    if (representative) {
      aggregated.push({
        x: representative.x,
        y: avgY,
        category: representative.category,
        metadata: {
          ...representative.metadata,
          aggregated: true,
          pointCount: chunk.length
        }
      });
    }
  }
  return aggregated;
}
function generatePeriodOptions(data, dateField) {
  if (!data.length) return [{ key: 0, label: "All Time" }];
  const dates = data.map((item) => parseDateValue(item[dateField])).filter((date) => date !== null).sort((a, b) => a.compare(b));
  if (dates.length === 0) {
    return [{ key: 0, label: "All Time" }];
  }
  const earliestDate = dates[0];
  const latestDate = dates[dates.length - 1];
  const totalMonths = (latestDate.year - earliestDate.year) * 12 + (latestDate.month - earliestDate.month) + 1;
  const options = [{ key: 0, label: "All Time" }];
  const quarterSpan = Math.max(3, Math.floor(totalMonths / 4));
  const halfSpan = Math.max(6, Math.floor(totalMonths / 2));
  const threeQuarterSpan = Math.max(9, Math.floor(totalMonths * 3 / 4));
  if (totalMonths >= 6) {
    const shortTerm = Math.min(6, quarterSpan);
    options.push({
      key: shortTerm,
      label: `Last ${shortTerm} Month${shortTerm === 1 ? "" : "s"}`
    });
  }
  if (totalMonths >= 12) {
    const mediumTerm = Math.min(12, halfSpan);
    if (mediumTerm > 6) {
      options.push({
        key: mediumTerm,
        label: `Last ${mediumTerm} Months`
      });
    }
  }
  if (totalMonths >= 18) {
    const longTerm = Math.min(24, threeQuarterSpan);
    if (longTerm > 12) {
      options.push({
        key: longTerm,
        label: `Last ${longTerm} Months`
      });
    }
  }
  const hasCurrentYearData = dates.some((date) => date.year === currentDate.year);
  if (hasCurrentYearData) {
    options.push({ key: "ytd", label: "Year to Date" });
  }
  return options;
}
function getPeriodStartDate(periodKey) {
  if (periodKey === 0 || periodKey === "0") return null;
  if (periodKey === "ytd") {
    return currentDate.set({ month: 1, day: 1 });
  }
  const months = typeof periodKey === "number" ? periodKey : parseInt(periodKey.toString());
  if (!isNaN(months) && months > 0) {
    return currentDate.subtract({ months }).set({ day: 1 });
  }
  return null;
}
function filterDataByPeriod(data, dateField, periodKey) {
  if (periodKey === 0 || periodKey === "0") return data;
  const startDate = getPeriodStartDate(periodKey);
  if (!startDate) return data;
  return data.filter((item) => {
    const itemDate = parseDateValue(item[dateField]);
    return itemDate ? itemDate.compare(startDate) >= 0 : true;
  });
}
const chartColors = [
  "hsl(217 91% 60%)",
  // blue-500 equivalent
  "hsl(142 71% 45%)",
  // green-600 equivalent
  "hsl(350 89% 60%)",
  // red-500 equivalent
  "hsl(262 83% 58%)",
  // purple-500 equivalent
  "hsl(25 95% 53%)",
  // orange-500 equivalent
  "hsl(175 85% 45%)",
  // teal-600 equivalent
  "hsl(48 94% 68%)",
  // yellow-400 equivalent
  "hsl(343 75% 68%)"
  // pink-400 equivalent
];
const colorUtils = {
  /**
   * Get a chart color by index, cycling through the color palette
   */
  getChartColor: (index) => {
    return chartColors[index % chartColors.length] || chartColors[0];
  },
  /**
   * Get a CSS custom property color value
   */
  getThemeColor: (cssVariable) => {
    return `hsl(var(--${cssVariable}))`;
  },
  /**
   * Get all available chart colors
   */
  getAllChartColors: () => {
    return [...chartColors];
  },
  /**
   * Get semantic colors for financial data visualization
   */
  getFinancialColors() {
    return {
      positive: colorUtils.getChartColor(1),
      // Green - for positive cash flow/income
      negative: colorUtils.getChartColor(2),
      // Red - for negative cash flow/expenses
      warning: colorUtils.getChartColor(4),
      // Orange - for concerning trends
      neutral: colorUtils.getChartColor(0),
      // Blue - for balance/neutral data
      zeroLine: colorUtils.getChartColor(7)
      // Pink/Gray - for reference lines
    };
  },
  /**
   * Get multiple colors for category-based data (cycles through palette)
   */
  getCategoryColors: (count) => {
    return Array.from({ length: count }, (_, i) => colorUtils.getChartColor(i % 8));
  }
};
const CHART_COLOR_SCHEMES = {
  default: {
    name: "Default",
    colors: Array.from({ length: 8 }, (_, i) => colorUtils.getChartColor(i)),
    description: "Balanced multi-color palette",
    category: "general"
  },
  financial: {
    name: "Financial",
    colors: [
      colorUtils.getChartColor(1),
      // Green - positive/income
      colorUtils.getChartColor(2),
      // Red - negative/expenses
      colorUtils.getChartColor(0),
      // Blue - neutral/balance
      colorUtils.getChartColor(4)
      // Orange - accent/other
    ],
    description: "Green for income, red for expenses",
    category: "financial"
  },
  monochrome: {
    name: "Mono",
    colors: [
      "hsl(220 13% 69%)",
      // Light gray
      "hsl(220 13% 50%)",
      // Medium gray
      "hsl(220 13% 31%)",
      // Dark gray
      "hsl(220 13% 18%)"
      // Very dark gray
    ],
    description: "Grayscale color scheme",
    category: "accessibility"
  },
  vibrant: {
    name: "Vibrant",
    colors: [
      "hsl(340 82% 52%)",
      // Vibrant pink
      "hsl(291 64% 42%)",
      // Vibrant purple
      "hsl(262 83% 58%)",
      // Vibrant blue
      "hsl(175 70% 41%)"
      // Vibrant teal
    ],
    description: "High contrast vibrant colors",
    category: "thematic"
  },
  pastel: {
    name: "Pastel",
    colors: [
      "hsl(210 40% 80%)",
      // Pastel blue
      "hsl(120 40% 80%)",
      // Pastel green
      "hsl(60 40% 80%)",
      // Pastel yellow
      "hsl(0 40% 80%)"
      // Pastel red
    ],
    description: "Soft pastel colors",
    category: "thematic"
  },
  earthy: {
    name: "Earthy",
    colors: [
      "hsl(30 40% 60%)",
      // Earth brown
      "hsl(120 25% 45%)",
      // Forest green
      "hsl(25 70% 50%)",
      // Clay orange
      "hsl(50 30% 50%)"
      // Khaki
    ],
    description: "Natural earth tone colors",
    category: "thematic"
  },
  ocean: {
    name: "Ocean",
    colors: [
      "hsl(200 80% 60%)",
      // Ocean blue
      "hsl(180 60% 50%)",
      // Teal
      "hsl(220 70% 45%)",
      // Deep blue
      "hsl(160 40% 40%)"
      // Sea green
    ],
    description: "Ocean and water inspired colors",
    category: "thematic"
  },
  sunset: {
    name: "Sunset",
    colors: [
      "hsl(15 85% 60%)",
      // Sunset orange
      "hsl(0 75% 55%)",
      // Sunset red
      "hsl(45 80% 65%)",
      // Golden yellow
      "hsl(330 60% 50%)"
      // Pink
    ],
    description: "Warm sunset colors",
    category: "thematic"
  }
};
function getColorSchemesByCategory() {
  const grouped = {
    general: [],
    financial: [],
    accessibility: [],
    thematic: []
  };
  Object.values(CHART_COLOR_SCHEMES).forEach((scheme) => {
    grouped[scheme.category].push(scheme);
  });
  return grouped;
}
function getColorScheme(key) {
  return CHART_COLOR_SCHEMES[key] || null;
}
function getSchemeColors(key) {
  const scheme = getColorScheme(key);
  return scheme?.colors || CHART_COLOR_SCHEMES.default.colors;
}
function createChartDataProcessor(props) {
  const {
    data,
    config,
    chartType,
    currentPeriod,
    viewMode,
    viewModeData,
    yFields,
    yFieldLabels,
    categoryField,
    enableColorScheme = false,
    selectedColorScheme = "default"
  } = props;
  const isChartCircular = isCircularChart(chartType);
  const isChartHierarchical = requiresHierarchicalData(chartType);
  const chartSupportsMultiSeries = supportsMultiSeries(chartType);
  const dataAccessors = getDataAccessorsForChartType(chartType);
  const selectedData = (() => {
    if (!viewModeData || viewMode === "combined") {
      return data;
    }
    return viewModeData.combined || data;
  })();
  const filteredData = (() => {
    const dataToFilter = selectedData;
    if (!config.timeFiltering.enabled) return dataToFilter;
    const hasSourceData = config.timeFiltering.sourceData && config.timeFiltering.sourceData.length > 0 && config.timeFiltering.sourceProcessor;
    if (isChartCircular && hasSourceData) {
      const filteredSourceData = currentPeriod === 0 ? config.timeFiltering.sourceData : filterDataByPeriod(config.timeFiltering.sourceData, config.timeFiltering.sourceDateField, currentPeriod);
      return config.timeFiltering.sourceProcessor(filteredSourceData);
    }
    return filterDataByPeriod(dataToFilter, config.timeFiltering.field, currentPeriod);
  })();
  const chartData = (() => {
    if (!filteredData || filteredData.length === 0) {
      return [];
    }
    const dataToProcess = filteredData.length > 500 ? aggregateForPerformance(filteredData, 500) : filteredData;
    const transformOptions = {
      categoryField: categoryField || "category",
      valueField: "y",
      seriesField: "series"
    };
    if (config.styling.colors !== "auto") {
      transformOptions.colors = config.styling.colors;
    }
    const transformed = transformDataForChartType(dataToProcess, chartType, transformOptions);
    if (chartType === "bar" && dataToProcess.length > 0 && !isChartCircular) {
      const firstItem = dataToProcess[0];
      const shouldConvertToCategories = firstItem && firstItem.x instanceof Date && dataToProcess.length <= 12 && // Only for small datasets
      !(chartSupportsMultiSeries && yFields && yFields.length > 1 && filteredData.some((item) => item.series || item.category));
      if (shouldConvertToCategories) {
        return dataToProcess.map((item) => ({
          ...item,
          x: item.x instanceof Date ? item.x.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : String(item.x)
        }));
      }
    }
    return Array.isArray(transformed) ? transformed : [transformed];
  })();
  const isMultiSeries = chartSupportsMultiSeries && Boolean(yFields && yFields.length > 1 && filteredData.some((item) => item.series || item.category));
  const seriesList = (() => {
    if (!isMultiSeries) return [];
    const uniqueSeries = /* @__PURE__ */ new Set();
    chartData.forEach((item) => {
      if (item.series) uniqueSeries.add(item.series);
      else if (item.category) uniqueSeries.add(item.category);
    });
    return Array.from(uniqueSeries);
  })();
  const legendItems = yFieldLabels && yFieldLabels.length > 0 ? yFieldLabels : seriesList;
  const seriesData = (() => {
    if (!isMultiSeries) return [];
    return seriesList.map((series) => chartData.filter((d) => d.series === series || d.category === series));
  })();
  const bandScale = (() => {
    if (chartType === "bar" && chartData.length > 0 && !isChartCircular) {
      const scale = scaleBand().domain(chartData.map((d) => String(d.x))).range([0, 1]).paddingInner(0.1).paddingOuter(0.05);
      return scale;
    }
    return void 0;
  })();
  const incomeBandScale = (() => {
    if (chartType === "bar" && viewModeData?.income && viewModeData.income.length > 0 && !isChartCircular) {
      const scale = scaleBand().domain(viewModeData.income.map((d) => String(d.x))).range([0, 1]).paddingInner(0.1).paddingOuter(0.05);
      return scale;
    }
    return void 0;
  })();
  const expensesBandScale = (() => {
    if (chartType === "bar" && viewModeData?.expenses && viewModeData.expenses.length > 0 && !isChartCircular) {
      const scale = scaleBand().domain(viewModeData.expenses.map((d) => String(d.x))).range([0, 1]).paddingInner(0.1).paddingOuter(0.05);
      return scale;
    }
    return void 0;
  })();
  const effectiveColors = (() => {
    if (enableColorScheme) {
      return getSchemeColors(selectedColorScheme);
    }
    if (config.styling.colors === "auto") {
      return Array.from({ length: 8 }, (_, i) => colorUtils.getChartColor(i));
    }
    return config.styling.colors;
  })();
  const availablePeriods = (() => {
    if (!config.timeFiltering.enabled) return [];
    const hasSourceData = config.timeFiltering.sourceData && config.timeFiltering.sourceData.length > 0;
    if (isChartCircular && hasSourceData) {
      const options2 = generatePeriodOptions(config.timeFiltering.sourceData, config.timeFiltering.sourceDateField);
      return options2.map((opt) => ({ value: Number(opt.value), label: opt.label }));
    }
    const options = generatePeriodOptions(data, config.timeFiltering.field);
    return options.map((opt) => ({ value: Number(opt.value), label: opt.label }));
  })();
  const dataQuality = {
    totalPoints: chartData.length,
    missingValues: chartData.filter((d) => d.y === null || d.y === void 0).length,
    duplicateKeys: 0,
    // Would need more complex logic to detect duplicates
    dataTypes: {
      x: [...new Set(chartData.map((d) => typeof d.x))],
      y: [...new Set(chartData.map((d) => typeof d.y))]
    },
    valueRanges: {
      x: chartData.length > 0 ? [chartData[0].x, chartData[chartData.length - 1].x] : [null, null],
      y: chartData.length > 0 ? [
        Math.min(...chartData.map((d) => d.y)),
        Math.max(...chartData.map((d) => d.y))
      ] : [0, 0]
    }
  };
  return {
    // Core data
    chartData,
    filteredData,
    // Series information
    isMultiSeries,
    seriesList,
    legendItems,
    seriesData,
    // Scales
    bandScale,
    incomeBandScale,
    expensesBandScale,
    // Colors
    effectiveColors,
    // Period filtering
    availablePeriods,
    // Chart characteristics
    isChartCircular,
    isChartHierarchical,
    chartSupportsMultiSeries,
    // Data accessors
    dataAccessors,
    // Quality metrics
    dataQuality
  };
}
function createReactiveChartDataProcessor(getProps) {
  return () => createChartDataProcessor(getProps());
}
const LAYERCHART_COMPONENT_REGISTRY = {
  // Data-driven components
  area: {
    component: Area,
    category: "data-driven",
    props: ["data", "fill", "fillOpacity", "stroke", "strokeWidth", "curve", "class"],
    requiredProps: [],
    description: "Filled area under a line showing trends over time",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["animation", "multi-series", "stacking"]
  },
  line: {
    component: Spline,
    category: "data-driven",
    props: ["data", "fill", "fillOpacity", "stroke", "strokeWidth", "curve", "class"],
    requiredProps: [],
    description: "Line chart showing trends over time",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["animation", "multi-series", "stacking"]
  },
  bar: {
    component: Bars,
    category: "data-driven",
    props: ["data", "fill", "stroke", "strokeWidth", "padding", "horizontal", "class"],
    requiredProps: [],
    description: "Rectangular bars for categorical data comparison",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["animation", "multi-series", "horizontal", "stacking"]
  },
  spline: {
    component: Spline,
    category: "data-driven",
    props: ["data", "stroke", "strokeWidth", "fill", "curve", "class"],
    requiredProps: [],
    description: "Smooth curved line connecting data points",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["animation", "multi-series", "curves"]
  },
  points: {
    component: Points,
    category: "data-driven",
    props: ["data", "fill", "stroke", "strokeWidth", "r", "class"],
    requiredProps: [],
    description: "Individual data points as circles or custom shapes",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["animation", "multi-series", "variable-size"]
  },
  scatter: {
    component: Points,
    category: "data-driven",
    props: ["data", "fill", "stroke", "strokeWidth", "r", "class"],
    requiredProps: [],
    description: "Scatter plot showing individual data points",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["animation", "multi-series", "variable-size"]
  },
  hull: {
    component: Hull,
    category: "data-driven",
    props: ["data", "fill", "fillOpacity", "stroke", "strokeWidth", "class"],
    requiredProps: [],
    description: "Convex hull around a set of points",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["animation"]
  },
  rule: {
    component: Rule,
    category: "data-driven",
    props: [
      "data",
      "x",
      "y",
      "x1",
      "x2",
      "y1",
      "y2",
      "stroke",
      "strokeWidth",
      "strokeDasharray",
      "class"
    ],
    requiredProps: [],
    description: "Reference lines and value annotations",
    dataRequirements: {
      format: "xy",
      fields: []
    },
    supportedFeatures: ["animation", "annotations"]
  },
  // Radial/Circular components
  pie: {
    component: Pie,
    category: "radial",
    props: ["data", "innerRadius", "outerRadius", "padAngle", "cornerRadius", "range", "startAngle", "endAngle", "offset", "sort", "class"],
    requiredProps: [],
    description: "Circular sectors showing proportions of a whole",
    dataRequirements: {
      format: "categorical",
      fields: ["value"]
    },
    supportedFeatures: ["animation", "labels", "explode"]
  },
  arc: {
    component: Arc,
    category: "radial",
    props: [
      "data",
      "innerRadius",
      "outerRadius",
      "startAngle",
      "endAngle",
      "padAngle",
      "cornerRadius",
      "fill",
      "stroke",
      "offset",
      "class"
    ],
    requiredProps: [],
    description: "Individual arc segments for custom radial charts",
    dataRequirements: {
      format: "categorical",
      fields: ["value"]
    },
    supportedFeatures: ["animation", "custom-angles"]
  },
  // Hierarchy and Graph components are not available in the current LayerChart version
  // These will be added when LayerChart includes these components
  // Time-based components
  calendar: {
    component: Calendar,
    category: "data-driven",
    props: ["data", "start", "end", "value", "fill", "stroke", "cellSize", "class"],
    requiredProps: ["start", "end"],
    description: "Calendar heatmap for time-based data",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
      // x should be date, y should be value
    },
    supportedFeatures: ["animation", "date-navigation"]
  },
  // Utility/Layout components
  group: {
    component: Group,
    category: "utility",
    props: ["x", "y", "center", "class"],
    requiredProps: [],
    description: "SVG group for positioning and centering elements",
    dataRequirements: {
      format: "xy",
      fields: []
    },
    supportedFeatures: ["animation", "positioning"]
  },
  circle: {
    component: Circle,
    category: "utility",
    props: ["cx", "cy", "r", "fill", "stroke", "strokeWidth", "class"],
    requiredProps: [],
    description: "SVG circle primitive with motion support",
    dataRequirements: {
      format: "xy",
      fields: []
    },
    supportedFeatures: ["animation"]
  },
  labels: {
    component: Labels,
    category: "utility",
    props: ["data", "format", "x", "y", "fill", "fontSize", "textAnchor", "class"],
    requiredProps: [],
    description: "Data point labels with formatting options",
    dataRequirements: {
      format: "xy",
      fields: ["x", "y"]
    },
    supportedFeatures: ["formatting", "positioning"]
  },
  grid: {
    component: Grid,
    category: "utility",
    props: [
      "horizontal",
      "vertical",
      "stroke",
      "strokeWidth",
      "strokeDasharray",
      "opacity",
      "class"
    ],
    requiredProps: [],
    description: "Chart grid lines for reference",
    dataRequirements: {
      format: "xy",
      fields: []
    },
    supportedFeatures: ["styling"]
  },
  axis: {
    component: Axis,
    category: "utility",
    props: [
      "placement",
      "ticks",
      "tickFormat",
      "tickSize",
      "tickPadding",
      "grid",
      "label",
      "labelProps",
      "class"
    ],
    requiredProps: ["placement"],
    description: "Chart axis with ticks and labels",
    dataRequirements: {
      format: "xy",
      fields: []
    },
    supportedFeatures: ["formatting", "positioning", "grid"]
  },
  legend: {
    component: Legend,
    category: "utility",
    props: ["placement", "orientation", "colorScale", "format", "class"],
    requiredProps: [],
    description: "Chart legend with color mapping",
    dataRequirements: {
      format: "xy",
      fields: []
    },
    supportedFeatures: ["positioning", "formatting"]
  }
};
function getComponentConfig(chartType) {
  return LAYERCHART_COMPONENT_REGISTRY[chartType] || null;
}
function validateDataCompatibility(chartType, data) {
  const config = getComponentConfig(chartType);
  if (!config) {
    return { isValid: false, errors: [`Unknown chart type: ${chartType}`] };
  }
  const errors = [];
  if (!data || data.length === 0) {
    errors.push("Data array is empty or undefined");
    return { isValid: false, errors };
  }
  const sample = data[0];
  const requiredFields = config.dataRequirements.fields;
  for (const field of requiredFields) {
    if (!(field in sample)) {
      errors.push(`Required field '${field}' missing from data`);
    }
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
const CURVE_MAP = {
  curveLinear,
  curveMonotoneX,
  curveCardinal,
  curveCatmullRom,
  curveNatural,
  curveBasis,
  curveStep
};
function getCurveFunction(curveName) {
  if (!curveName) return curveLinear;
  return CURVE_MAP[curveName] || curveLinear;
}
function transformCurveInConfig(config) {
  if (!config["curve"]) return config;
  if (typeof config["curve"] === "function") return config;
  if (typeof config["curve"] === "string") {
    return {
      ...config,
      curve: getCurveFunction(config["curve"])
    };
  }
  return config;
}
Dynamic_chart_renderer[FILENAME] = "src/lib/components/charts/dynamic-chart-renderer.svelte";
function Dynamic_chart_renderer($$payload, $$props) {
  push(Dynamic_chart_renderer);
  let {
    chartType,
    data,
    config = {},
    seriesData = [],
    seriesColors = [],
    isMultiSeries,
    class: className = ""
  } = $$props;
  const componentConfig = (() => getComponentConfig(chartType))();
  const validation = () => validateDataCompatibility(chartType, data);
  const componentProps = () => {
    if (!componentConfig) return {};
    const transformedConfig = transformCurveInConfig(config);
    const baseProps = { data, class: className, ...transformedConfig };
    if (seriesColors.length > 0) {
      if (isMultiSeries && seriesColors.length > 1) ;
      else {
        if (transformedConfig["fill"] === void 0) {
          baseProps["fill"] = seriesColors[0];
        }
        if (transformedConfig["stroke"] === void 0) {
          baseProps["stroke"] = seriesColors[0];
        }
      }
    }
    return baseProps;
  };
  const ComponentToRender = () => {
    const config2 = componentConfig;
    return config2?.component || null;
  };
  if (!componentConfig) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="flex items-center justify-center h-full">`);
    push_element($$payload, "div", 74, 2);
    $$payload.out.push(`<p class="text-muted-foreground">`);
    push_element($$payload, "p", 75, 4);
    $$payload.out.push(`Unsupported chart type: ${escape_html(chartType)}</p>`);
    pop_element();
    $$payload.out.push(`</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    if (!validation().isValid) {
      $$payload.out.push("<!--[-->");
      const each_array = ensure_array_like(validation().errors);
      $$payload.out.push(`<div class="flex items-center justify-center h-full">`);
      push_element($$payload, "div", 78, 2);
      $$payload.out.push(`<div class="text-center space-y-2">`);
      push_element($$payload, "div", 79, 4);
      $$payload.out.push(`<p class="text-destructive font-medium">`);
      push_element($$payload, "p", 80, 6);
      $$payload.out.push(`Data Validation Error</p>`);
      pop_element();
      $$payload.out.push(` <!--[-->`);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let error = each_array[$$index];
        $$payload.out.push(`<p class="text-sm text-muted-foreground">`);
        push_element($$payload, "p", 82, 8);
        $$payload.out.push(`${escape_html(error)}</p>`);
        pop_element();
      }
      $$payload.out.push(`<!--]--></div>`);
      pop_element();
      $$payload.out.push(`</div>`);
      pop_element();
    } else {
      $$payload.out.push("<!--[!-->");
      if (ComponentToRender()) {
        $$payload.out.push("<!--[-->");
        if (isMultiSeries && seriesData.length > 0) {
          $$payload.out.push("<!--[-->");
          const each_array_1 = ensure_array_like(seriesData);
          $$payload.out.push(`<!--[-->`);
          for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
            let series = each_array_1[index];
            const seriesColor = seriesColors[index % seriesColors.length] || "hsl(var(--chart-1))";
            const seriesProps = transformCurveInConfig({
              ...componentProps(),
              data: series,
              fill: ["line", "spline"].includes(chartType) ? "none" : seriesColor,
              stroke: seriesColor
            });
            const Component = ComponentToRender();
            if (Component) {
              $$payload.out.push("<!--[-->");
              $$payload.out.push(`<!---->`);
              Component($$payload, spread_props([seriesProps]));
              $$payload.out.push(`<!---->`);
            } else {
              $$payload.out.push("<!--[!-->");
            }
            $$payload.out.push(`<!--]-->`);
          }
          $$payload.out.push(`<!--]-->`);
        } else {
          $$payload.out.push("<!--[!-->");
          const Component = ComponentToRender();
          if (Component) {
            $$payload.out.push("<!--[-->");
            $$payload.out.push(`<!---->`);
            Component($$payload, spread_props([componentProps()]));
            $$payload.out.push(`<!---->`);
          } else {
            $$payload.out.push("<!--[!-->");
          }
          $$payload.out.push(`<!--]-->`);
        }
        $$payload.out.push(`<!--]-->`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`<div class="flex items-center justify-center h-full">`);
        push_element($$payload, "div", 111, 2);
        $$payload.out.push(`<p class="text-muted-foreground">`);
        push_element($$payload, "p", 112, 4);
        $$payload.out.push(`Component not available: ${escape_html(chartType)}</p>`);
        pop_element();
        $$payload.out.push(`</div>`);
        pop_element();
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Dynamic_chart_renderer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Chart_legend[FILENAME] = "src/lib/components/charts/chart-legend.svelte";
function Chart_legend($$payload, $$props) {
  push(Chart_legend);
  let {
    show,
    title,
    position = "top",
    items,
    colors,
    isMultiSeries = false,
    spacing = "normal",
    variant = "swatches",
    swatchSize = "small",
    fontSize = "sm",
    onItemClick,
    onItemHover,
    onItemLeave,
    class: className = "",
    itemClass = "",
    swatchClass = ""
  } = $$props;
  const legendScale = (() => {
    if (!items || items.length === 0 || !colors || colors.length === 0) {
      return null;
    }
    const effectiveColors = colors.slice(0, items.length);
    while (effectiveColors.length < items.length) {
      effectiveColors.push(colors[effectiveColors.length % colors.length]);
    }
    return scaleOrdinal().domain(items).range(effectiveColors);
  })();
  const spacingClasses = (() => {
    switch (spacing) {
      case "compact":
        return "gap-x-2 gap-y-0.5";
      case "wide":
        return "gap-x-6 gap-y-2";
      case "normal":
      default:
        return "gap-x-4 gap-y-1";
    }
  })();
  const swatchSizeClasses = (() => {
    switch (swatchSize) {
      case "small":
        return "size-3";
      case "large":
        return "size-5";
      case "medium":
      default:
        return "size-4";
    }
  })();
  const fontSizeClasses = (() => {
    switch (fontSize) {
      case "xs":
        return "text-xs";
      case "base":
        return "text-base";
      case "sm":
      default:
        return "text-sm";
    }
  })();
  const positionClasses = (() => {
    switch (position) {
      case "left":
        return "justify-start";
      case "right":
        return "justify-end";
      case "bottom":
      case "top":
      default:
        return "justify-center";
    }
  })();
  const orientation = position === "left" || position === "right" ? "vertical" : "horizontal";
  function handleItemClick(e, detail) {
    const index = items.indexOf(detail.value);
    if (index >= 0 && onItemClick) {
      onItemClick(detail.value, index);
    }
  }
  function handleItemHover(e, detail) {
    const index = items.indexOf(detail.value);
    if (index >= 0 && onItemHover) {
      onItemHover(detail.value, index);
    }
  }
  function handleItemLeave(e, detail) {
    const index = items.indexOf(detail.value);
    if (index >= 0 && onItemLeave) {
      onItemLeave(detail.value, index);
    }
  }
  const legendClasses = (() => {
    const rootClass = `${positionClasses()} ${className}`;
    const itemsClass = `lc-legend-swatch-group ${spacingClasses()}`;
    const itemClassResolved = `flex items-center gap-1.5 ${fontSizeClasses()} ${itemClass}`;
    const swatchClassResolved = `${swatchSizeClasses()} rounded ${swatchClass}`;
    return {
      root: rootClass,
      items: itemsClass,
      item: itemClassResolved,
      swatch: swatchClassResolved,
      label: fontSizeClasses()
    };
  })();
  if (show && legendScale && items.length > 0) {
    $$payload.out.push("<!--[-->");
    Legend($$payload, spread_props([
      {
        scale: legendScale,
        variant,
        placement: position,
        orientation
      },
      title ? { title } : {},
      {
        onclick: handleItemClick,
        onpointerenter: handleItemHover,
        onpointerleave: handleItemLeave,
        classes: legendClasses()
      }
    ]));
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Chart_legend.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Chart_core[FILENAME] = "src/lib/components/charts/chart-core.svelte";
function Chart_core($$payload, $$props) {
  push(Chart_core);
  let {
    processor,
    chartType,
    config,
    viewMode = "combined",
    viewModeData,
    selectedCurve,
    legendTitle,
    yFieldLabels,
    class: className = "",
    onChartClick
  } = $$props;
  const {
    chartData,
    isMultiSeries,
    legendItems,
    seriesData,
    bandScale,
    incomeBandScale,
    expensesBandScale,
    effectiveColors,
    isChartCircular,
    isChartHierarchical,
    dataAccessors
  } = processor;
  const showLegend = config.styling.legend.show && (isMultiSeries || isChartCircular || yFieldLabels && yFieldLabels.length > 1);
  const xAxisTicks = (() => {
    if (chartData.length > 8) {
      return chartData.filter((_, i) => i % Math.ceil(chartData.length / 4) === 0).map((d) => typeof d === "object" && "x" in d ? d.x : "");
    }
    return void 0;
  })();
  if (viewMode === "side-by-side" && viewModeData?.income && viewModeData?.expenses) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${attr_class(`grid grid-cols-1 md:grid-cols-2 gap-4 h-full ${stringify(className)}`)}>`);
    push_element($$payload, "div", 106, 2);
    $$payload.out.push(`<div class="h-full">`);
    push_element($$payload, "div", 108, 4);
    $$payload.out.push(`<h4 class="text-sm font-medium mb-2 text-center">`);
    push_element($$payload, "h4", 109, 6);
    $$payload.out.push(`Income</h4>`);
    pop_element();
    $$payload.out.push(` `);
    Chart($$payload, spread_props([
      { data: viewModeData.income },
      !isChartCircular && !isChartHierarchical ? {
        x: dataAccessors.x || "x",
        y: dataAccessors.y || "y",
        ...config.axes.y.nice ? { yNice: config.axes.y.nice } : {},
        ...config.axes.x.nice ? { xNice: config.axes.x.nice } : {},
        ...incomeBandScale ? { xScale: incomeBandScale } : {}
      } : {
        ...dataAccessors,
        ...isChartCircular && effectiveColors.length > 0 ? { cRange: [effectiveColors[0] || "hsl(var(--chart-1))"] } : {}
      },
      config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {},
      {
        children: prevent_snippet_stringification(($$payload2) => {
          Svg($$payload2, {
            children: prevent_snippet_stringification(($$payload3) => {
              if (!isChartCircular && !isChartHierarchical) {
                $$payload3.out.push("<!--[-->");
                if (config.axes.y.show) {
                  $$payload3.out.push("<!--[-->");
                  Axis($$payload3, { placement: "left" });
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]--> `);
                if (config.axes.x.show) {
                  $$payload3.out.push("<!--[-->");
                  Axis($$payload3, { placement: "bottom" });
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]-->`);
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              Dynamic_chart_renderer($$payload3, {
                chartType,
                data: viewModeData.income,
                config: {
                  padding: chartType === "bar" ? 4 : void 0,
                  fillOpacity: chartType === "area" ? 0.6 : void 0,
                  strokeWidth: ["line", "spline", "threshold"].includes(chartType) ? 2 : void 0,
                  fill: ["line", "spline"].includes(chartType) ? "none" : void 0,
                  stroke: ["line", "spline"].includes(chartType) ? effectiveColors[0] || "hsl(var(--chart-1))" : void 0,
                  curve: ["line", "spline", "area"].includes(chartType) && config.controls.allowCurveChange ? selectedCurve : void 0
                },
                seriesData: [],
                seriesColors: [effectiveColors[0] || "hsl(var(--chart-1))"],
                isMultiSeries: false
              });
              $$payload3.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          });
          $$payload2.out.push(`<!----> `);
          if (config.interactions.tooltip.enabled) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<!---->`);
            {
              let children = function($$payload3, { data }) {
                validate_snippet_args($$payload3);
                $$payload3.out.push(`<!---->`);
                TooltipHeader($$payload3, {
                  children: prevent_snippet_stringification(($$payload4) => {
                    if (data?.x) {
                      $$payload4.out.push("<!--[-->");
                      if (data.x instanceof Date) {
                        $$payload4.out.push("<!--[-->");
                        $$payload4.out.push(`${escape_html(data.x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}`);
                      } else {
                        $$payload4.out.push("<!--[!-->");
                        $$payload4.out.push(`${escape_html(data.x)}`);
                      }
                      $$payload4.out.push(`<!--]-->`);
                    } else {
                      $$payload4.out.push("<!--[!-->");
                    }
                    $$payload4.out.push(`<!--]-->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!----> <!---->`);
                TooltipList($$payload3, {
                  children: prevent_snippet_stringification(($$payload4) => {
                    $$payload4.out.push(`<!---->`);
                    TooltipItem($$payload4, {
                      label: "Income",
                      value: data?.y || data?.value || 0,
                      color: effectiveColors[0]
                    });
                    $$payload4.out.push(`<!---->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!---->`);
              };
              prevent_snippet_stringification(children);
              Tooltip($$payload2, spread_props([
                {
                  x: config.interactions.tooltip.position || "pointer",
                  y: config.interactions.tooltip.position || "pointer"
                },
                config.interactions.tooltip.xOffset !== void 0 ? { xOffset: config.interactions.tooltip.xOffset } : {},
                config.interactions.tooltip.yOffset !== void 0 ? { yOffset: config.interactions.tooltip.yOffset } : {},
                config.interactions.tooltip.anchor ? { anchor: config.interactions.tooltip.anchor } : {},
                config.interactions.tooltip.variant ? { variant: config.interactions.tooltip.variant } : {},
                {
                  classes: {
                    root: "bg-background/95 backdrop-blur-sm border shadow-lg rounded-md px-3 py-2",
                    content: "text-sm",
                    header: "font-semibold mb-1"
                  },
                  children,
                  $$slots: { default: true }
                }
              ]));
            }
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]-->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload.out.push(`<!----></div>`);
    pop_element();
    $$payload.out.push(` <div class="h-full">`);
    push_element($$payload, "div", 192, 4);
    $$payload.out.push(`<h4 class="text-sm font-medium mb-2 text-center">`);
    push_element($$payload, "h4", 193, 6);
    $$payload.out.push(`Expenses</h4>`);
    pop_element();
    $$payload.out.push(` `);
    Chart($$payload, spread_props([
      { data: viewModeData.expenses },
      !isChartCircular && !isChartHierarchical ? {
        x: dataAccessors.x || "x",
        y: dataAccessors.y || "y",
        ...config.axes.y.nice ? { yNice: config.axes.y.nice } : {},
        ...config.axes.x.nice ? { xNice: config.axes.x.nice } : {},
        ...expensesBandScale ? { xScale: expensesBandScale } : {}
      } : {
        ...dataAccessors,
        ...isChartCircular && effectiveColors.length > 0 ? { cRange: [effectiveColors[1] || "hsl(var(--chart-2))"] } : {}
      },
      config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {},
      {
        children: prevent_snippet_stringification(($$payload2) => {
          Svg($$payload2, {
            children: prevent_snippet_stringification(($$payload3) => {
              if (!isChartCircular && !isChartHierarchical) {
                $$payload3.out.push("<!--[-->");
                if (config.axes.y.show) {
                  $$payload3.out.push("<!--[-->");
                  Axis($$payload3, { placement: "left" });
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]--> `);
                if (config.axes.x.show) {
                  $$payload3.out.push("<!--[-->");
                  Axis($$payload3, { placement: "bottom" });
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]-->`);
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              Dynamic_chart_renderer($$payload3, {
                chartType,
                data: viewModeData.expenses,
                config: {
                  padding: chartType === "bar" ? 4 : void 0,
                  fillOpacity: chartType === "area" ? 0.6 : void 0,
                  strokeWidth: ["line", "spline", "threshold"].includes(chartType) ? 2 : void 0,
                  fill: ["line", "spline"].includes(chartType) ? "none" : void 0,
                  stroke: ["line", "spline"].includes(chartType) ? effectiveColors[1] || "hsl(var(--chart-2))" : void 0,
                  curve: ["line", "spline", "area"].includes(chartType) && config.controls.allowCurveChange ? selectedCurve : void 0
                },
                seriesData: [],
                seriesColors: [effectiveColors[1] || "hsl(var(--chart-2))"],
                isMultiSeries: false
              });
              $$payload3.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          });
          $$payload2.out.push(`<!----> `);
          if (config.interactions.tooltip.enabled) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<!---->`);
            {
              let children = function($$payload3, { data }) {
                validate_snippet_args($$payload3);
                $$payload3.out.push(`<!---->`);
                TooltipHeader($$payload3, {
                  children: prevent_snippet_stringification(($$payload4) => {
                    if (data?.x) {
                      $$payload4.out.push("<!--[-->");
                      if (data.x instanceof Date) {
                        $$payload4.out.push("<!--[-->");
                        $$payload4.out.push(`${escape_html(data.x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}`);
                      } else {
                        $$payload4.out.push("<!--[!-->");
                        $$payload4.out.push(`${escape_html(data.x)}`);
                      }
                      $$payload4.out.push(`<!--]-->`);
                    } else {
                      $$payload4.out.push("<!--[!-->");
                    }
                    $$payload4.out.push(`<!--]-->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!----> <!---->`);
                TooltipList($$payload3, {
                  children: prevent_snippet_stringification(($$payload4) => {
                    $$payload4.out.push(`<!---->`);
                    TooltipItem($$payload4, {
                      label: "Expenses",
                      value: data?.y || data?.value || 0,
                      color: effectiveColors[1]
                    });
                    $$payload4.out.push(`<!---->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!---->`);
              };
              prevent_snippet_stringification(children);
              Tooltip($$payload2, spread_props([
                {
                  x: config.interactions.tooltip.position || "pointer",
                  y: config.interactions.tooltip.position || "pointer"
                },
                config.interactions.tooltip.xOffset !== void 0 ? { xOffset: config.interactions.tooltip.xOffset } : {},
                config.interactions.tooltip.yOffset !== void 0 ? { yOffset: config.interactions.tooltip.yOffset } : {},
                config.interactions.tooltip.anchor ? { anchor: config.interactions.tooltip.anchor } : {},
                config.interactions.tooltip.variant ? { variant: config.interactions.tooltip.variant } : {},
                {
                  classes: {
                    root: "bg-background/95 backdrop-blur-sm border shadow-lg rounded-md px-3 py-2",
                    content: "text-sm",
                    header: "font-semibold mb-1"
                  },
                  children,
                  $$slots: { default: true }
                }
              ]));
            }
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]-->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload.out.push(`<!----></div>`);
    pop_element();
    $$payload.out.push(`</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${attr_class(className)}>`);
    push_element($$payload, "div", 277, 2);
    Chart($$payload, spread_props([
      { data: chartData },
      !isChartCircular && !isChartHierarchical ? {
        x: dataAccessors.x || "x",
        y: dataAccessors.y || "y",
        ...isMultiSeries ? {
          c: (d) => d.series || d.category,
          cDomain: legendItems,
          cRange: effectiveColors.slice(0, legendItems.length)
        } : {},
        ...config.axes.y.nice ? { yNice: config.axes.y.nice } : {},
        ...config.axes.x.nice ? { xNice: config.axes.x.nice } : {},
        ...config.axes.y.domain && (config.axes.y.domain[0] !== null || config.axes.y.domain[1] !== null) ? { yDomain: config.axes.y.domain } : {},
        ...config.axes.x.domain && (config.axes.x.domain[0] !== null || config.axes.x.domain[1] !== null) ? { xDomain: config.axes.x.domain } : {},
        ...bandScale ? { xScale: bandScale } : {}
      } : {
        ...dataAccessors,
        ...isChartCircular && effectiveColors.length > 0 ? {
          c: (d) => d.label || d.category || d.name,
          cDomain: chartData.map((d) => d.label || d.category || d.name).filter((v, i, a) => a.indexOf(v) === i),
          cRange: effectiveColors
        } : {}
      },
      config.styling.dimensions.padding ? { padding: config.styling.dimensions.padding } : {},
      {
        children: prevent_snippet_stringification(($$payload2) => {
          Svg($$payload2, {
            children: prevent_snippet_stringification(($$payload3) => {
              if (!isChartCircular && !isChartHierarchical) {
                $$payload3.out.push("<!--[-->");
                if (config.axes.y.show) {
                  $$payload3.out.push("<!--[-->");
                  Axis($$payload3, { placement: "left" });
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]--> `);
                if (config.axes.x.show) {
                  $$payload3.out.push("<!--[-->");
                  Axis($$payload3, spread_props([
                    { placement: "bottom" },
                    config.axes.x.rotateLabels ? { tickLabelProps: { rotate: -45, textAnchor: "end" } } : {},
                    xAxisTicks ? { ticks: xAxisTicks } : {}
                  ]));
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]-->`);
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              Dynamic_chart_renderer($$payload3, {
                chartType,
                data: chartData,
                config: {
                  padding: chartType === "bar" ? 4 : void 0,
                  fillOpacity: chartType === "area" ? 0.6 : void 0,
                  strokeWidth: ["line", "spline", "threshold"].includes(chartType) ? 2 : void 0,
                  fill: ["line", "spline"].includes(chartType) ? "none" : void 0,
                  stroke: ["line", "spline"].includes(chartType) ? effectiveColors[0] || "hsl(var(--chart-1))" : void 0,
                  curve: ["line", "spline", "area"].includes(chartType) && config.controls.allowCurveChange ? selectedCurve : void 0,
                  r: chartType === "scatter" ? 4 : void 0,
                  innerRadius: chartType === "arc" ? 40 : void 0,
                  outerRadius: chartType === "arc" ? 150 : void 0,
                  start: chartType === "calendar" && chartData.length > 0 ? new Date(Math.min(...chartData.map((d) => {
                    if (typeof d === "object" && "x" in d) {
                      if (d.x instanceof Date) return d.x.getTime();
                      if (typeof d.x === "string") return new Date(d.x).getTime();
                      if (typeof d.x === "number") return d.x;
                    }
                    return (/* @__PURE__ */ new Date()).getTime();
                  }))) : void 0,
                  end: chartType === "calendar" && chartData.length > 0 ? new Date(Math.max(...chartData.map((d) => {
                    if (typeof d === "object" && "x" in d) {
                      if (d.x instanceof Date) return d.x.getTime();
                      if (typeof d.x === "string") return new Date(d.x).getTime();
                      if (typeof d.x === "number") return d.x;
                    }
                    return (/* @__PURE__ */ new Date()).getTime();
                  }))) : void 0
                },
                seriesData,
                seriesColors: effectiveColors,
                isMultiSeries: isMultiSeries || false
              });
              $$payload3.out.push(`<!----> `);
              if (chartType === "threshold") {
                $$payload3.out.push("<!--[-->");
                Rule($$payload3, {});
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              if (config.styling.grid.show || config.styling.grid.horizontal) {
                $$payload3.out.push("<!--[-->");
                Grid($$payload3, spread_props([
                  config.styling.grid.opacity !== void 0 ? { opacity: config.styling.grid.opacity } : {}
                ]));
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              if (config.annotations?.type === "rules" || config.annotations?.type === "both") {
                $$payload3.out.push("<!--[-->");
                if (config.annotations.rules?.show && config.annotations.rules?.values && config.annotations.rules.values.length > 0) {
                  $$payload3.out.push("<!--[-->");
                  const each_array = ensure_array_like(config.annotations.rules.values);
                  $$payload3.out.push(`<!--[-->`);
                  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                    let ruleValue = each_array[$$index];
                    Rule($$payload3, spread_props([
                      { y: ruleValue },
                      config.annotations.rules.class ? { class: config.annotations.rules.class } : {},
                      config.annotations.rules.strokeWidth ? { strokeWidth: config.annotations.rules.strokeWidth } : {},
                      config.annotations.rules.strokeDasharray ? {
                        style: `stroke-dasharray: ${config.annotations.rules.strokeDasharray}`
                      } : {}
                    ]));
                  }
                  $$payload3.out.push(`<!--]-->`);
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]-->`);
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]--> `);
              if (config.annotations?.type === "labels" || config.annotations?.type === "both") {
                $$payload3.out.push("<!--[-->");
                if (config.annotations.labels?.show && !isChartCircular) {
                  $$payload3.out.push("<!--[-->");
                  Labels($$payload3, spread_props([
                    {
                      data: chartData,
                      x: "x",
                      y: "y",
                      format: config.annotations.labels.format || ((d) => {
                        if (typeof d === "object" && d !== null) {
                          return String(d.y ?? d.value ?? d.amount ?? d);
                        }
                        return String(d);
                      })
                    },
                    config.annotations.labels.class ? { class: config.annotations.labels.class } : {},
                    {
                      offset: config.annotations.labels.offset?.y || 4,
                      placement: config.annotations.labels.placement || "outside"
                    }
                  ]));
                } else {
                  $$payload3.out.push("<!--[!-->");
                }
                $$payload3.out.push(`<!--]-->`);
              } else {
                $$payload3.out.push("<!--[!-->");
              }
              $$payload3.out.push(`<!--]-->`);
            }),
            $$slots: { default: true }
          });
          $$payload2.out.push(`<!----> `);
          if (config.interactions.tooltip.enabled) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<!---->`);
            {
              let children = function($$payload3, { data, payload }) {
                validate_snippet_args($$payload3);
                if (config.interactions.tooltip.customContent) {
                  $$payload3.out.push("<!--[-->");
                  $$payload3.out.push(`${html(config.interactions.tooltip.customContent(data, payload))}`);
                } else {
                  $$payload3.out.push("<!--[!-->");
                  $$payload3.out.push(`<!---->`);
                  TooltipHeader($$payload3, {
                    children: prevent_snippet_stringification(($$payload4) => {
                      if (data?.x) {
                        $$payload4.out.push("<!--[-->");
                        if (data.x instanceof Date) {
                          $$payload4.out.push("<!--[-->");
                          $$payload4.out.push(`${escape_html(data.x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}`);
                        } else {
                          $$payload4.out.push("<!--[!-->");
                          if (typeof data.x === "string" || typeof data.x === "number") {
                            $$payload4.out.push("<!--[-->");
                            $$payload4.out.push(`${escape_html(data.x)}`);
                          } else {
                            $$payload4.out.push("<!--[!-->");
                          }
                          $$payload4.out.push(`<!--]-->`);
                        }
                        $$payload4.out.push(`<!--]-->`);
                      } else {
                        $$payload4.out.push("<!--[!-->");
                      }
                      $$payload4.out.push(`<!--]-->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload3.out.push(`<!----> <!---->`);
                  TooltipList($$payload3, {
                    children: prevent_snippet_stringification(($$payload4) => {
                      if (payload && payload.length > 0) {
                        $$payload4.out.push("<!--[-->");
                        const each_array_1 = ensure_array_like(payload);
                        $$payload4.out.push(`<!--[-->`);
                        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                          let item = each_array_1[$$index_1];
                          $$payload4.out.push(`<!---->`);
                          TooltipItem($$payload4, {
                            label: item.label || item.name || item.key || "Value",
                            value: item.value !== void 0 ? item.value : item.payload?.y || item.payload?.value || 0,
                            color: item.color || effectiveColors[0]
                          });
                          $$payload4.out.push(`<!---->`);
                        }
                        $$payload4.out.push(`<!--]--> `);
                        if (config.interactions.tooltip.showTotal && payload.length > 1) {
                          $$payload4.out.push("<!--[-->");
                          $$payload4.out.push(`<!---->`);
                          TooltipSeparator($$payload4, {});
                          $$payload4.out.push(`<!----> <!---->`);
                          TooltipItem($$payload4, {
                            label: "Total",
                            value: payload.reduce(
                              (sum, item) => {
                                const val = item.value !== void 0 ? item.value : item.payload?.y || item.payload?.value || 0;
                                return sum + (typeof val === "number" ? val : 0);
                              },
                              0
                            )
                          });
                          $$payload4.out.push(`<!---->`);
                        } else {
                          $$payload4.out.push("<!--[!-->");
                        }
                        $$payload4.out.push(`<!--]-->`);
                      } else {
                        $$payload4.out.push("<!--[!-->");
                        if (data) {
                          $$payload4.out.push("<!--[-->");
                          $$payload4.out.push(`<!---->`);
                          TooltipItem($$payload4, {
                            label: "Value",
                            value: data.y || data.value || data.amount || 0,
                            color: data.color || effectiveColors[0]
                          });
                          $$payload4.out.push(`<!---->`);
                        } else {
                          $$payload4.out.push("<!--[!-->");
                        }
                        $$payload4.out.push(`<!--]-->`);
                      }
                      $$payload4.out.push(`<!--]-->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload3.out.push(`<!---->`);
                }
                $$payload3.out.push(`<!--]-->`);
              };
              prevent_snippet_stringification(children);
              Tooltip($$payload2, spread_props([
                {
                  x: config.interactions.tooltip.position || "pointer",
                  y: config.interactions.tooltip.position || "pointer"
                },
                config.interactions.tooltip.xOffset !== void 0 ? { xOffset: config.interactions.tooltip.xOffset } : {},
                config.interactions.tooltip.yOffset !== void 0 ? { yOffset: config.interactions.tooltip.yOffset } : {},
                config.interactions.tooltip.anchor ? { anchor: config.interactions.tooltip.anchor } : {},
                config.interactions.tooltip.variant ? { variant: config.interactions.tooltip.variant } : {},
                {
                  classes: {
                    root: "bg-background/95 backdrop-blur-sm border shadow-lg rounded-md px-3 py-2",
                    content: "text-sm",
                    header: "font-semibold mb-1"
                  },
                  children,
                  $$slots: { default: true }
                }
              ]));
            }
            $$payload2.out.push(`<!---->`);
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]--> `);
          Chart_legend($$payload2, {
            show: showLegend,
            title: legendTitle,
            position: config.styling.legend.position || "top",
            items: legendItems,
            colors: effectiveColors,
            isMultiSeries,
            spacing: config.styling.legend.spacing || "normal",
            variant: "swatches",
            swatchSize: config.styling.legend.swatchSize || "small",
            fontSize: config.styling.legend.fontSize || "sm"
          });
          $$payload2.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Chart_core.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Chart_color_selector[FILENAME] = "src/lib/components/charts/chart-color-selector.svelte";
function Chart_color_selector($$payload, $$props) {
  push(Chart_color_selector);
  let { selectedScheme = "default" } = $$props;
  const colorSchemes = CHART_COLOR_SCHEMES;
  const colorSchemesByCategory = getColorSchemesByCategory();
  const selectedColorScheme = (() => {
    return colorSchemes[selectedScheme] || colorSchemes["default"];
  })();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="flex items-center gap-2">`);
    push_element($$payload2, "div", 18, 0);
    $$payload2.out.push(`<label for="color-selector" class="text-sm font-medium">`);
    push_element($$payload2, "label", 19, 2);
    $$payload2.out.push(`Colors:</label>`);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Root$4($$payload2, {
      type: "single",
      get value() {
        return selectedScheme;
      },
      set value($$value) {
        selectedScheme = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Select_trigger($$payload3, {
          class: "w-[160px]",
          children: prevent_snippet_stringification(($$payload4) => {
            const each_array = ensure_array_like(selectedColorScheme.colors.slice(0, 4));
            $$payload4.out.push(`<div class="flex items-center gap-2">`);
            push_element($$payload4, "div", 22, 6);
            $$payload4.out.push(`<div class="flex gap-0.5">`);
            push_element($$payload4, "div", 23, 8);
            $$payload4.out.push(`<!--[-->`);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let color = each_array[$$index];
              $$payload4.out.push(`<div class="size-2.5 rounded-full border border-border/30"${attr_style(`background-color: ${stringify(color)}`)}>`);
              push_element($$payload4, "div", 25, 12);
              $$payload4.out.push(`</div>`);
              pop_element();
            }
            $$payload4.out.push(`<!--]--></div>`);
            pop_element();
            $$payload4.out.push(` <span>`);
            push_element($$payload4, "span", 31, 8);
            $$payload4.out.push(`${escape_html(selectedColorScheme.name)}</span>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Select_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            const each_array_1 = ensure_array_like(Object.entries(colorSchemesByCategory));
            $$payload4.out.push(`<!--[-->`);
            for (let $$index_3 = 0, $$length = each_array_1.length; $$index_3 < $$length; $$index_3++) {
              let [categoryName, schemes] = each_array_1[$$index_3];
              if (schemes.length > 0) {
                $$payload4.out.push("<!--[-->");
                const each_array_2 = ensure_array_like(schemes);
                $$payload4.out.push(`<div class="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">`);
                push_element($$payload4, "div", 38, 10);
                $$payload4.out.push(`${escape_html(categoryName)}</div>`);
                pop_element();
                $$payload4.out.push(` <!--[-->`);
                for (let $$index_2 = 0, $$length2 = each_array_2.length; $$index_2 < $$length2; $$index_2++) {
                  let scheme = each_array_2[$$index_2];
                  const schemeKey = Object.entries(colorSchemes).find(([, s]) => s === scheme)?.[0] || "";
                  $$payload4.out.push(`<!---->`);
                  Select_item($$payload4, {
                    value: schemeKey,
                    children: prevent_snippet_stringification(($$payload5) => {
                      const each_array_3 = ensure_array_like(scheme.colors.slice(0, 4));
                      $$payload5.out.push(`<div class="flex items-center gap-3">`);
                      push_element($$payload5, "div", 46, 14);
                      $$payload5.out.push(`<div class="flex gap-1">`);
                      push_element($$payload5, "div", 47, 16);
                      $$payload5.out.push(`<!--[-->`);
                      for (let $$index_1 = 0, $$length3 = each_array_3.length; $$index_1 < $$length3; $$index_1++) {
                        let color = each_array_3[$$index_1];
                        $$payload5.out.push(`<div class="w-3 h-3 rounded-full border border-border/30"${attr_style(`background-color: ${stringify(color)}`)}>`);
                        push_element($$payload5, "div", 49, 20);
                        $$payload5.out.push(`</div>`);
                        pop_element();
                      }
                      $$payload5.out.push(`<!--]--></div>`);
                      pop_element();
                      $$payload5.out.push(` <div class="flex flex-col">`);
                      push_element($$payload5, "div", 55, 16);
                      $$payload5.out.push(`<span>`);
                      push_element($$payload5, "span", 56, 18);
                      $$payload5.out.push(`${escape_html(scheme.name)}</span>`);
                      pop_element();
                      $$payload5.out.push(` <span class="text-xs text-muted-foreground">`);
                      push_element($$payload5, "span", 57, 18);
                      $$payload5.out.push(`${escape_html(scheme.description)}</span>`);
                      pop_element();
                      $$payload5.out.push(`</div>`);
                      pop_element();
                      $$payload5.out.push(`</div>`);
                      pop_element();
                    }),
                    $$slots: { default: true }
                  });
                  $$payload4.out.push(`<!---->`);
                }
                $$payload4.out.push(`<!--]-->`);
              } else {
                $$payload4.out.push("<!--[!-->");
              }
              $$payload4.out.push(`<!--]-->`);
            }
            $$payload4.out.push(`<!--]-->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { selectedScheme });
  pop();
}
Chart_color_selector.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Chart_curve_selector[FILENAME] = "src/lib/components/charts/chart-curve-selector.svelte";
function Chart_curve_selector($$payload, $$props) {
  push(Chart_curve_selector);
  let { curve = "curveLinear", chartType } = $$props;
  const curveOptions = [
    {
      value: "curveLinear",
      label: "Linear",
      description: "Straight lines between points"
    },
    {
      value: "curveMonotoneX",
      label: "Smooth",
      description: "Smooth monotonic curves"
    },
    {
      value: "curveCardinal",
      label: "Cardinal",
      description: "Smooth cardinal splines"
    },
    {
      value: "curveCatmullRom",
      label: "Catmull-Rom",
      description: "Catmull-Rom splines"
    },
    {
      value: "curveNatural",
      label: "Natural",
      description: "Natural cubic splines"
    },
    {
      value: "curveBasis",
      label: "Basis",
      description: "B-spline curves"
    },
    {
      value: "curveStep",
      label: "Step",
      description: "Step function"
    }
  ];
  const showCurveSelector = ["line", "spline", "area"].includes(chartType);
  const selectedCurveOption = (() => curveOptions.find((option) => option.value === curve) || curveOptions[0])();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (showCurveSelector) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="flex items-center gap-2">`);
      push_element($$payload2, "div", 64, 2);
      $$payload2.out.push(`<label for="curve-selector" class="text-sm font-medium">`);
      push_element($$payload2, "label", 65, 4);
      $$payload2.out.push(`Curve:</label>`);
      pop_element();
      $$payload2.out.push(` <!---->`);
      Root$4($$payload2, {
        type: "single",
        get value() {
          return curve;
        },
        set value($$value) {
          curve = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Select_trigger($$payload3, {
            class: "w-[140px]",
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<div class="flex items-center gap-2">`);
              push_element($$payload4, "div", 68, 8);
              $$payload4.out.push(`<span>`);
              push_element($$payload4, "span", 69, 10);
              $$payload4.out.push(`${escape_html(selectedCurveOption.label)}</span>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!----> <!---->`);
          Select_content($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              const each_array = ensure_array_like(curveOptions);
              $$payload4.out.push(`<!--[-->`);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let curveOption = each_array[$$index];
                $$payload4.out.push(`<!---->`);
                Select_item($$payload4, {
                  value: curveOption.value,
                  children: prevent_snippet_stringification(($$payload5) => {
                    $$payload5.out.push(`<div class="flex flex-col">`);
                    push_element($$payload5, "div", 75, 12);
                    $$payload5.out.push(`<span>`);
                    push_element($$payload5, "span", 76, 14);
                    $$payload5.out.push(`${escape_html(curveOption.label)}</span>`);
                    pop_element();
                    $$payload5.out.push(` <span class="text-xs text-muted-foreground">`);
                    push_element($$payload5, "span", 77, 14);
                    $$payload5.out.push(`${escape_html(curveOption.description)}</span>`);
                    pop_element();
                    $$payload5.out.push(`</div>`);
                    pop_element();
                  }),
                  $$slots: { default: true }
                });
                $$payload4.out.push(`<!---->`);
              }
              $$payload4.out.push(`<!--]-->`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { curve });
  pop();
}
Chart_curve_selector.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Chart_period_controls[FILENAME] = "src/lib/components/charts/chart-period-controls.svelte";
function Chart_period_controls($$payload, $$props) {
  push(Chart_period_controls);
  let { currentPeriod = 0, data, enablePeriodFiltering = false } = $$props;
  if (enablePeriodFiltering && data.length > 0) {
    $$payload.out.push("<!--[-->");
    const each_array = ensure_array_like(data);
    $$payload.out.push(`<div class="flex items-center gap-2">`);
    push_element($$payload, "div", 21, 2);
    $$payload.out.push(`<span class="font-medium">`);
    push_element($$payload, "span", 22, 4);
    $$payload.out.push(`Period:</span>`);
    pop_element();
    $$payload.out.push(` <div class="flex gap-1">`);
    push_element($$payload, "div", 23, 4);
    $$payload.out.push(`<!--[-->`);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let period = each_array[$$index];
      Button($$payload, {
        variant: currentPeriod === period.key ? "default" : "outline",
        size: "sm",
        onclick: () => currentPeriod = period.key,
        children: prevent_snippet_stringification(($$payload2) => {
          $$payload2.out.push(`<!---->${escape_html(period.label)}`);
        }),
        $$slots: { default: true }
      });
    }
    $$payload.out.push(`<!--]--></div>`);
    pop_element();
    $$payload.out.push(`</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { currentPeriod });
  pop();
}
Chart_period_controls.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const ALL_CHART_TYPES = [
  {
    label: "Line & Area",
    options: [
      {
        value: "line",
        label: "Line Chart",
        icon: Chart_line,
        description: "Connected points showing trends"
      },
      {
        value: "area",
        label: "Area Chart",
        icon: Trending_up,
        description: "Filled area under the line"
      },
      {
        value: "spline",
        label: "Spline Chart",
        icon: Chart_line,
        description: "Smooth curved line through data points"
      }
    ]
  },
  {
    label: "Bars & Columns",
    options: [
      {
        value: "bar",
        label: "Bar Chart",
        icon: Chart_bar,
        description: "Rectangular bars for comparison"
      }
    ]
  },
  {
    label: "Circular",
    options: [
      {
        value: "pie",
        label: "Pie Chart",
        icon: Chart_pie,
        description: "Circular sectors showing proportions"
      },
      { value: "arc", label: "Arc Chart", icon: Chart_pie, description: "Partial circular chart" }
    ]
  },
  {
    label: "Points & Scatter",
    options: [
      { value: "scatter", label: "Scatter Plot", icon: Zap, description: "Individual data points" }
    ]
  },
  {
    label: "Specialized",
    options: [
      {
        value: "threshold",
        label: "Threshold Chart",
        icon: Target,
        description: "Data above/below threshold"
      },
      {
        value: "hull",
        label: "Hull Chart",
        icon: Trending_up,
        description: "Convex hull around points"
      },
      {
        value: "calendar",
        label: "Calendar Heatmap",
        icon: Calendar$1,
        description: "Time-based heatmap"
      }
    ]
  }
];
Chart_type_selector[FILENAME] = "src/lib/components/charts/chart-type-selector.svelte";
function Chart_type_selector($$payload, $$props) {
  push(Chart_type_selector);
  let { chartType = "bar", availableChartTypes } = $$props;
  const displayedChartTypes = () => {
    if (availableChartTypes && availableChartTypes.length > 0) {
      return [{ label: "Available Charts", options: availableChartTypes }];
    }
    return ALL_CHART_TYPES;
  };
  const selectedChartTypeOption = () => {
    for (const group of displayedChartTypes()) {
      const option = group.options.find((opt) => opt.value === chartType);
      if (option) return option;
    }
    return null;
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (displayedChartTypes().some((group) => group.options.length > 0)) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="flex items-center gap-2">`);
      push_element($$payload2, "div", 37, 2);
      $$payload2.out.push(`<span class="font-medium">`);
      push_element($$payload2, "span", 38, 4);
      $$payload2.out.push(`Chart:</span>`);
      pop_element();
      $$payload2.out.push(` <!---->`);
      Root$4($$payload2, {
        type: "single",
        get value() {
          return chartType;
        },
        set value($$value) {
          chartType = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Select_trigger($$payload3, {
            class: "w-48",
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<div class="flex items-center gap-2">`);
              push_element($$payload4, "div", 44, 8);
              if (selectedChartTypeOption()) {
                $$payload4.out.push("<!--[-->");
                const option = selectedChartTypeOption();
                if (option.icon) {
                  $$payload4.out.push("<!--[-->");
                  $$payload4.out.push(`<!---->`);
                  option.icon($$payload4, { class: "h-4 w-4" });
                  $$payload4.out.push(`<!---->`);
                } else {
                  $$payload4.out.push("<!--[!-->");
                }
                $$payload4.out.push(`<!--]--> <span>`);
                push_element($$payload4, "span", 50, 12);
                $$payload4.out.push(`${escape_html(option.label)}</span>`);
                pop_element();
              } else {
                $$payload4.out.push("<!--[!-->");
                $$payload4.out.push(`<span>`);
                push_element($$payload4, "span", 52, 12);
                $$payload4.out.push(`Select a chart</span>`);
                pop_element();
              }
              $$payload4.out.push(`<!--]--></div>`);
              pop_element();
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!----> <!---->`);
          Select_content($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              const each_array = ensure_array_like(displayedChartTypes());
              $$payload4.out.push(`<!--[-->`);
              for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
                let group = each_array[$$index_1];
                const each_array_1 = ensure_array_like(group.options);
                if (displayedChartTypes().length > 1) {
                  $$payload4.out.push("<!--[-->");
                  $$payload4.out.push(`<!---->`);
                  Select_label($$payload4, {
                    children: prevent_snippet_stringification(($$payload5) => {
                      $$payload5.out.push(`<!---->${escape_html(group.label)}`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload4.out.push(`<!---->`);
                } else {
                  $$payload4.out.push("<!--[!-->");
                }
                $$payload4.out.push(`<!--]--> <!--[-->`);
                for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                  let option = each_array_1[$$index];
                  $$payload4.out.push(`<!---->`);
                  Select_item($$payload4, {
                    value: option.value,
                    label: option.label,
                    children: prevent_snippet_stringification(($$payload5) => {
                      $$payload5.out.push(`<div class="flex items-center gap-2">`);
                      push_element($$payload5, "div", 66, 14);
                      if (option.icon) {
                        $$payload5.out.push("<!--[-->");
                        $$payload5.out.push(`<!---->`);
                        option.icon($$payload5, { class: "h-4 w-4" });
                        $$payload5.out.push(`<!---->`);
                      } else {
                        $$payload5.out.push("<!--[!-->");
                      }
                      $$payload5.out.push(`<!--]--> <div class="flex flex-col">`);
                      push_element($$payload5, "div", 70, 16);
                      $$payload5.out.push(`<span>`);
                      push_element($$payload5, "span", 71, 18);
                      $$payload5.out.push(`${escape_html(option.label)}</span>`);
                      pop_element();
                      $$payload5.out.push(` <span class="text-xs text-muted-foreground">`);
                      push_element($$payload5, "span", 72, 18);
                      $$payload5.out.push(`${escape_html(option.description)}</span>`);
                      pop_element();
                      $$payload5.out.push(`</div>`);
                      pop_element();
                      $$payload5.out.push(`</div>`);
                      pop_element();
                    }),
                    $$slots: { default: true }
                  });
                  $$payload4.out.push(`<!---->`);
                }
                $$payload4.out.push(`<!--]-->`);
              }
              $$payload4.out.push(`<!--]-->`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { chartType });
  pop();
}
Chart_type_selector.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Chart_view_mode_selector[FILENAME] = "src/lib/components/charts/chart-view-mode-selector.svelte";
function Chart_view_mode_selector($$payload, $$props) {
  push(Chart_view_mode_selector);
  let {
    viewMode = "combined",
    availableViewModes = ["combined", "side-by-side"],
    showDescription = false
  } = $$props;
  const viewModeConfigs = {
    combined: {
      value: "combined",
      label: "Combined",
      description: "Show all series in a single chart"
    },
    "side-by-side": {
      value: "side-by-side",
      label: "Side by Side",
      description: "Show each series in separate charts"
    },
    stacked: {
      value: "stacked",
      label: "Stacked",
      description: "Stack series on top of each other"
    },
    overlaid: {
      value: "overlaid",
      label: "Overlaid",
      description: "Overlay series with transparency"
    }
  };
  const availableConfigs = availableViewModes.map((mode) => viewModeConfigs[mode]).filter(Boolean);
  const selectedViewModeConfig = viewModeConfigs[viewMode] || viewModeConfigs.combined;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (availableConfigs.length > 1) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="flex items-center gap-2">`);
      push_element($$payload2, "div", 59, 2);
      $$payload2.out.push(`<label for="view-mode-selector" class="text-sm font-medium">`);
      push_element($$payload2, "label", 60, 4);
      $$payload2.out.push(`View:</label>`);
      pop_element();
      $$payload2.out.push(` <!---->`);
      Root$4($$payload2, {
        type: "single",
        get value() {
          return viewMode;
        },
        set value($$value) {
          viewMode = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Select_trigger($$payload3, {
            class: "w-[140px]",
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<div class="flex items-center gap-2">`);
              push_element($$payload4, "div", 63, 8);
              $$payload4.out.push(`<span>`);
              push_element($$payload4, "span", 64, 10);
              $$payload4.out.push(`${escape_html(selectedViewModeConfig.label)}</span>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!----> <!---->`);
          Select_content($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              const each_array = ensure_array_like(availableConfigs);
              $$payload4.out.push(`<!--[-->`);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let config = each_array[$$index];
                $$payload4.out.push(`<!---->`);
                Select_item($$payload4, {
                  value: config.value,
                  children: prevent_snippet_stringification(($$payload5) => {
                    $$payload5.out.push(`<div class="flex flex-col">`);
                    push_element($$payload5, "div", 70, 12);
                    $$payload5.out.push(`<span>`);
                    push_element($$payload5, "span", 71, 14);
                    $$payload5.out.push(`${escape_html(config.label)}</span>`);
                    pop_element();
                    $$payload5.out.push(` `);
                    if (showDescription) {
                      $$payload5.out.push("<!--[-->");
                      $$payload5.out.push(`<span class="text-xs text-muted-foreground">`);
                      push_element($$payload5, "span", 73, 16);
                      $$payload5.out.push(`${escape_html(config.description)}</span>`);
                      pop_element();
                    } else {
                      $$payload5.out.push("<!--[!-->");
                    }
                    $$payload5.out.push(`<!--]--></div>`);
                    pop_element();
                  }),
                  $$slots: { default: true }
                });
                $$payload4.out.push(`<!---->`);
              }
              $$payload4.out.push(`<!--]-->`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { viewMode });
  pop();
}
Chart_view_mode_selector.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const locale = "en-US";
const currency = "USD";
const chartFormatters = {
  /**
   * Standard currency formatting without decimals for clean chart labels
   * $1,234 instead of $1,234.00
   */
  currency: (value) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  },
  /**
   * Precise currency formatting with decimals for detailed values
   * $1,234.56
   */
  currencyPrecise: (value) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  },
  /**
   * Compact currency formatting for large values
   * $1.2K instead of $1,234
   */
  currencyCompact: (value) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value);
  },
  /**
   * Smart currency formatting that adapts based on value size
   * Small values: $123, Medium: $1,234, Large: $1.2K
   */
  currencySmart: (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e6) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: "compact",
        compactDisplay: "short",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      }).format(value);
    } else if (absValue >= 1e4) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: "compact",
        compactDisplay: "short",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } else {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
  },
  /**
   * Number formatting with thousands separators
   * 1,234 instead of 1234
   */
  number: (value) => {
    return new Intl.NumberFormat(locale).format(value);
  },
  /**
   * Percentage formatting
   * 12.5% instead of 0.125
   */
  percentage: (value) => {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value / 100);
  },
  /**
   * Compact number formatting for large values
   * 1.2K instead of 1,234
   */
  numberCompact: (value) => {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short"
    }).format(value);
  }
};
const DEFAULT_AXES_CONFIG = {
  x: {
    show: true,
    title: "",
    rotateLabels: false,
    nice: false,
    domain: [null, null],
    format: (value) => String(value)
  },
  y: {
    show: true,
    title: "",
    rotateLabels: false,
    nice: true,
    domain: [0, null],
    format: (value) => String(value)
  },
  secondary: {
    show: false,
    title: "",
    rotateLabels: false,
    nice: true,
    domain: [null, null],
    format: (value) => String(value)
  }
};
const DEFAULT_STYLING_CONFIG = {
  colors: "auto",
  theme: "auto",
  dimensions: {
    padding: {
      top: 20,
      right: 30,
      bottom: 80,
      left: 80
    }
  },
  grid: {
    show: false,
    horizontal: false,
    vertical: false,
    opacity: 0.1
  },
  legend: {
    show: false,
    position: "bottom"
  }
};
const DEFAULT_INTERACTIONS_CONFIG = {
  tooltip: {
    enabled: true,
    format: "default",
    position: "pointer",
    xOffset: 10,
    yOffset: 10,
    anchor: "top-left",
    variant: "default",
    showTotal: false
  },
  zoom: {
    enabled: false,
    resetButton: true
  },
  pan: {
    enabled: false
  },
  brush: {
    enabled: false
  }
};
const DEFAULT_TIME_FILTERING_CONFIG = {
  enabled: false,
  field: "date",
  defaultPeriod: 0,
  // All time
  sourceData: [],
  sourceProcessor: (data) => data,
  sourceDateField: "date"
};
const DEFAULT_CONTROLS_CONFIG = {
  show: false,
  availableTypes: ["bar", "line", "area"],
  allowTypeChange: true,
  allowPeriodChange: true,
  allowColorChange: false,
  allowCurveChange: false,
  allowViewModeChange: false,
  availableViewModes: ["combined", "side-by-side"]
};
const DEFAULT_ANNOTATIONS_CONFIG = {
  type: "labels",
  labels: {
    show: true,
    format: (datum) => {
      const value = typeof datum === "object" && datum !== null ? datum.y ?? datum.value ?? datum.amount ?? 0 : datum;
      return chartFormatters.currency(Number(value) || 0);
    },
    position: "auto",
    placement: "outside",
    class: "",
    offset: { x: 0, y: 0 }
  },
  rules: {
    show: false,
    values: [],
    orientation: "horizontal",
    class: "stroke-muted-foreground/50",
    strokeWidth: 1,
    strokeDasharray: "2 2"
  }
};
const CHART_TYPE_DEFAULTS = {
  bar: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  line: {
    styling: {
      dimensions: { padding: { bottom: 60, left: 80 } }
    }
  },
  area: {
    styling: {
      dimensions: { padding: { bottom: 60, left: 80 } }
    }
  },
  spline: {
    styling: {
      dimensions: { padding: { bottom: 60, left: 80 } }
    }
  },
  pie: {
    styling: {
      legend: { show: true, position: "right" },
      dimensions: { padding: { top: 20, right: 120, bottom: 20, left: 20 } }
    },
    axes: {
      x: { show: false },
      y: { show: false }
    }
  },
  arc: {
    styling: {
      legend: { show: true, position: "right" },
      dimensions: { padding: { top: 20, right: 120, bottom: 20, left: 20 } }
    },
    axes: {
      x: { show: false },
      y: { show: false }
    }
  },
  scatter: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  threshold: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  hull: {
    styling: {
      dimensions: { padding: { bottom: 80, left: 80 } }
    }
  },
  calendar: {
    styling: {
      dimensions: { padding: { top: 20, right: 30, bottom: 40, left: 60 } }
    },
    axes: {
      x: { show: false },
      y: { show: false }
    }
  }
};
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];
    if (sourceValue && typeof sourceValue === "object" && !Array.isArray(sourceValue)) {
      result[key] = deepMerge(targetValue || {}, sourceValue);
    } else if (sourceValue !== void 0) {
      result[key] = sourceValue;
    }
  }
  return result;
}
function resolveColors(colorConfig, data, chartType) {
  if (Array.isArray(colorConfig)) {
    return colorConfig.map((color, index) => {
      switch (color) {
        case "primary":
          return colorUtils.getChartColor(0);
        // Blue
        case "secondary":
          return colorUtils.getChartColor(4);
        // Orange
        case "success":
          return colorUtils.getChartColor(1);
        // Green
        case "destructive":
          return colorUtils.getChartColor(2);
        // Red
        case "warning":
          return colorUtils.getChartColor(3);
        // Yellow
        case "muted":
          return colorUtils.getChartColor(7);
        // Gray/Pink
        default:
          if (color.startsWith("hsl(") || color.startsWith("#") || color.startsWith("rgb(")) {
            return color;
          }
          return colorUtils.getChartColor(index);
      }
    });
  }
  if (chartType === "pie" || chartType === "arc") {
    const categories = [...new Set(data.map((d) => d.category))];
    return categories.map((_, index) => colorUtils.getChartColor(index));
  }
  return [colorUtils.getChartColor(0), colorUtils.getChartColor(1)];
}
function inferChartType(data) {
  if (data.length === 0) return "bar";
  const hasCategories = data.some((d) => d.category !== void 0);
  if (hasCategories) {
    return "pie";
  }
  const hasDateX = data.some((d) => d.x instanceof Date || typeof d.x === "string" && !isNaN(Date.parse(d.x)));
  if (hasDateX) {
    return "line";
  }
  return "bar";
}
function resolveChartConfig(props) {
  const controls = deepMerge(
    deepMerge(DEFAULT_CONTROLS_CONFIG, {}),
    props.controls || {}
  );
  let chartType = props.type || inferChartType(props.data);
  if (controls.availableTypes && controls.availableTypes.length > 0) {
    if (!controls.availableTypes.includes(chartType)) {
      chartType = controls.availableTypes[0];
    }
  }
  const typeDefaults = CHART_TYPE_DEFAULTS[chartType] || {};
  const finalControls = deepMerge(
    deepMerge(DEFAULT_CONTROLS_CONFIG, typeDefaults.controls || {}),
    props.controls || {}
  );
  const axes = deepMerge(
    deepMerge(DEFAULT_AXES_CONFIG, typeDefaults.axes || {}),
    props.axes || {}
  );
  const styling = deepMerge(
    deepMerge(DEFAULT_STYLING_CONFIG, typeDefaults.styling || {}),
    props.styling || {}
  );
  const interactions = deepMerge(
    deepMerge(DEFAULT_INTERACTIONS_CONFIG, typeDefaults.interactions || {}),
    props.interactions || {}
  );
  const timeFiltering = deepMerge(
    deepMerge(DEFAULT_TIME_FILTERING_CONFIG, typeDefaults.timeFiltering || {}),
    props.timeFiltering || {}
  );
  const annotations = deepMerge(
    deepMerge(DEFAULT_ANNOTATIONS_CONFIG, typeDefaults.annotations || {}),
    props.annotations || {}
  );
  const resolvedColors = resolveColors(styling.colors, props.data, chartType);
  return {
    type: chartType,
    data: props.data,
    axes,
    styling,
    interactions,
    timeFiltering,
    controls: finalControls,
    annotations,
    resolvedColors
  };
}
function validateChartData(data, options) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(data)) {
    errors.push({
      type: "structure_error",
      message: "Data must be an array"
    });
    return {
      isValid: false,
      errors,
      warnings,
      dataQuality: {
        totalPoints: 0,
        missingValues: 0,
        duplicateKeys: 0,
        dataTypes: { x: [], y: [] },
        valueRanges: { x: [null, null], y: [0, 0] }
      }
    };
  }
  if (data.length === 0) {
    warnings.push({
      type: "data_quality",
      message: "Data array is empty",
      suggestion: "Provide at least one data point for visualization"
    });
    return {
      isValid: true,
      errors,
      warnings,
      dataQuality: {
        totalPoints: 0,
        missingValues: 0,
        duplicateKeys: 0,
        dataTypes: { x: [], y: [] },
        valueRanges: { x: [null, null], y: [0, 0] }
      }
    };
  }
  let missingValues = 0;
  const xValues = [];
  const yValues = [];
  const xTypes = /* @__PURE__ */ new Set();
  const yTypes = /* @__PURE__ */ new Set();
  data.forEach((item, index) => {
    if (item.x === void 0 || item.x === null) {
      errors.push({
        type: "missing_field",
        message: `Data point at index ${index} is missing required 'x' field`,
        dataIndex: index,
        field: "x"
      });
      missingValues++;
    } else {
      xValues.push(item.x);
      xTypes.add(typeof item.x);
    }
    if (item.y === void 0 || item.y === null) {
      errors.push({
        type: "missing_field",
        message: `Data point at index ${index} is missing required 'y' field`,
        dataIndex: index,
        field: "y"
      });
      missingValues++;
    } else if (typeof item.y !== "number") {
      errors.push({
        type: "invalid_type",
        message: `Data point at index ${index} has non-numeric 'y' value: ${item.y}`,
        dataIndex: index,
        field: "y"
      });
    } else {
      yValues.push(item.y);
      yTypes.add(typeof item.y);
      if (!isFinite(item.y)) {
        errors.push({
          type: "invalid_value",
          message: `Data point at index ${index} has invalid 'y' value (NaN or Infinity): ${item.y}`,
          dataIndex: index,
          field: "y"
        });
      }
    }
  });
  const uniqueKeys = new Set(xValues.map((x) => String(x)));
  const duplicateKeys = xValues.length - uniqueKeys.size;
  if (xTypes.size > 1) {
    warnings.push({
      type: "inconsistent_types",
      message: `Inconsistent x-axis data types found: ${Array.from(xTypes).join(", ")}`,
      suggestion: "Consider converting all x-axis values to a consistent type"
    });
  }
  if (duplicateKeys > 0 && !options?.suppressDuplicateWarnings) {
    warnings.push({
      type: "data_quality",
      message: `Found ${duplicateKeys} duplicate x-axis values`,
      suggestion: "Aggregate duplicate entries or ensure unique keys for better visualization"
    });
  }
  if (data.length > 1e3) {
    warnings.push({
      type: "performance",
      message: `Large dataset detected (${data.length} points)`,
      suggestion: "Consider data aggregation or pagination for better performance"
    });
  }
  const xRange = xValues.length > 0 ? [Math.min(...xValues.filter((x) => typeof x === "number")), Math.max(...xValues.filter((x) => typeof x === "number"))] : [null, null];
  const yRange = yValues.length > 0 ? [Math.min(...yValues), Math.max(...yValues)] : [0, 0];
  const dataQuality = {
    totalPoints: data.length,
    missingValues,
    duplicateKeys,
    dataTypes: {
      x: Array.from(xTypes),
      y: Array.from(yTypes)
    },
    valueRanges: { x: xRange, y: yRange }
  };
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    dataQuality
  };
}
Unified_chart[FILENAME] = "src/lib/components/charts/unified-chart.svelte";
function Unified_chart($$payload, $$props) {
  push(Unified_chart);
  let {
    data,
    type,
    axes,
    styling,
    interactions,
    timeFiltering,
    controls,
    annotations,
    yFields,
    yFieldLabels,
    categoryField,
    legendTitle,
    viewMode,
    viewModeData,
    suppressDuplicateWarnings = false,
    class: className = "h-full w-full"
  } = $$props;
  const config = resolveChartConfig({
    data,
    type,
    axes,
    styling,
    interactions,
    timeFiltering,
    controls,
    annotations
  });
  const validation = validateChartData(data, { suppressDuplicateWarnings });
  let currentChartType = type || "bar";
  let currentPeriod = 0;
  let selectedColorScheme = "default";
  let selectedCurve = "curveLinear";
  let selectedViewMode = viewMode || "combined";
  const processor = createReactiveChartDataProcessor(() => ({
    data,
    config,
    chartType: currentChartType,
    currentPeriod,
    viewMode: selectedViewMode,
    viewModeData: viewModeData || {},
    yFields: yFields || [],
    yFieldLabels: yFieldLabels || [],
    categoryField: categoryField || "category",
    enableColorScheme: config.controls.allowColorChange,
    selectedColorScheme
  }));
  const processorData = processor();
  const availableChartTypes = (() => {
    if (!config.controls.availableTypes) return [];
    return ALL_CHART_TYPES.flatMap((group) => group.options.filter((option) => config.controls.availableTypes.includes(option.value)));
  })();
  const isLoading = data.length > 1e3;
  const chartId = Math.random().toString(36).substring(2, 9);
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div${attr_class(clsx(className))} role="img"${attr("aria-label", `${currentChartType} chart with ${processorData.chartData.length} data points`)}${attr("aria-describedby", `chart-description-${chartId}`)}>`);
    push_element($$payload2, "div", 125, 0);
    {
      $$payload2.out.push("<!--[!-->");
      if (isLoading) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<div class="flex items-center justify-center h-full">`);
        push_element($$payload2, "div", 141, 4);
        $$payload2.out.push(`<div class="space-y-4 text-center">`);
        push_element($$payload2, "div", 142, 6);
        $$payload2.out.push(`<div class="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto">`);
        push_element($$payload2, "div", 143, 8);
        $$payload2.out.push(`</div>`);
        pop_element();
        $$payload2.out.push(` <p class="text-sm text-muted-foreground">`);
        push_element($$payload2, "p", 144, 8);
        $$payload2.out.push(`Loading chart... (${escape_html(data.length.toLocaleString())} data points)</p>`);
        pop_element();
        $$payload2.out.push(`</div>`);
        pop_element();
        $$payload2.out.push(`</div>`);
        pop_element();
      } else {
        $$payload2.out.push("<!--[!-->");
        if (validation.isValid) {
          $$payload2.out.push("<!--[-->");
          if (config.controls.show) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<div class="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg mb-4">`);
            push_element($$payload2, "div", 152, 6);
            $$payload2.out.push(`<div class="flex items-center gap-6 text-sm">`);
            push_element($$payload2, "div", 153, 8);
            if (config.controls.allowTypeChange && availableChartTypes.length > 1) {
              $$payload2.out.push("<!--[-->");
              Chart_type_selector($$payload2, {
                availableChartTypes,
                get chartType() {
                  return currentChartType;
                },
                set chartType($$value) {
                  currentChartType = $$value;
                  $$settled = false;
                }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--> `);
            if (config.controls.allowPeriodChange && config.timeFiltering.enabled) {
              $$payload2.out.push("<!--[-->");
              Chart_period_controls($$payload2, {
                data: processorData.availablePeriods.map((p) => ({ key: p.value, label: p.label })),
                dateField: config.timeFiltering.field,
                enablePeriodFiltering: true,
                get currentPeriod() {
                  return currentPeriod;
                },
                set currentPeriod($$value) {
                  currentPeriod = $$value;
                  $$settled = false;
                }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--> `);
            if (config.controls.allowColorChange) {
              $$payload2.out.push("<!--[-->");
              Chart_color_selector($$payload2, {
                get selectedScheme() {
                  return selectedColorScheme;
                },
                set selectedScheme($$value) {
                  selectedColorScheme = $$value;
                  $$settled = false;
                }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--> `);
            if (config.controls.allowCurveChange) {
              $$payload2.out.push("<!--[-->");
              Chart_curve_selector($$payload2, {
                chartType: currentChartType,
                get curve() {
                  return selectedCurve;
                },
                set curve($$value) {
                  selectedCurve = $$value;
                  $$settled = false;
                }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--> `);
            if (config.controls.allowViewModeChange) {
              $$payload2.out.push("<!--[-->");
              Chart_view_mode_selector($$payload2, {
                availableViewModes: config.controls.availableViewModes || ["combined", "side-by-side"],
                get viewMode() {
                  return selectedViewMode;
                },
                set viewMode($$value) {
                  selectedViewMode = $$value;
                  $$settled = false;
                }
              });
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--></div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]--> `);
          Chart_core($$payload2, spread_props([
            {
              processor: processorData,
              chartType: currentChartType,
              config: {
                ...config,
                type: currentChartType,
                data,
                resolvedColors: config.controls.allowColorChange ? processorData.effectiveColors : config.resolvedColors
              },
              viewMode: selectedViewMode,
              viewModeData: viewModeData || {}
            },
            legendTitle ? { legendTitle } : {},
            config.controls.allowCurveChange ? { selectedCurve } : {},
            yFieldLabels ? { yFieldLabels } : {},
            { class: "h-full w-full" }
          ]));
          $$payload2.out.push(`<!---->`);
        } else {
          $$payload2.out.push("<!--[!-->");
          const each_array = ensure_array_like(validation.errors);
          $$payload2.out.push(`<div class="flex items-center justify-center h-full text-center p-6">`);
          push_element($$payload2, "div", 213, 4);
          $$payload2.out.push(`<div class="space-y-4 max-w-md">`);
          push_element($$payload2, "div", 214, 6);
          $$payload2.out.push(`<h3 class="text-lg font-semibold text-destructive">`);
          push_element($$payload2, "h3", 215, 8);
          $$payload2.out.push(`Chart Data Error</h3>`);
          pop_element();
          $$payload2.out.push(` <div class="space-y-3">`);
          push_element($$payload2, "div", 216, 8);
          $$payload2.out.push(`<!--[-->`);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let error = each_array[$$index];
            $$payload2.out.push(`<div class="text-sm border rounded-md p-3 bg-destructive/5 border-destructive/20">`);
            push_element($$payload2, "div", 218, 12);
            $$payload2.out.push(`<div class="font-medium text-destructive">`);
            push_element($$payload2, "div", 219, 14);
            $$payload2.out.push(`${escape_html(error.type.replace("_", " ").toUpperCase())}</div>`);
            pop_element();
            $$payload2.out.push(` <div class="text-muted-foreground mt-1">`);
            push_element($$payload2, "div", 220, 14);
            $$payload2.out.push(`${escape_html(error.message)}</div>`);
            pop_element();
            $$payload2.out.push(` `);
            if (error.dataIndex !== void 0) {
              $$payload2.out.push("<!--[-->");
              $$payload2.out.push(`<div class="text-xs text-muted-foreground mt-1">`);
              push_element($$payload2, "div", 222, 16);
              $$payload2.out.push(`Data point: ${escape_html(error.dataIndex)}${escape_html(error.field ? ` (field: ${error.field})` : "")}</div>`);
              pop_element();
            } else {
              $$payload2.out.push("<!--[!-->");
            }
            $$payload2.out.push(`<!--]--></div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]--></div>`);
          pop_element();
          $$payload2.out.push(` `);
          if (validation.dataQuality.totalPoints > 0) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<div class="text-xs text-muted-foreground border-t pt-2">`);
            push_element($$payload2, "div", 232, 10);
            $$payload2.out.push(`<div>`);
            push_element($$payload2, "div", 233, 12);
            $$payload2.out.push(`Total data points: ${escape_html(validation.dataQuality.totalPoints)}</div>`);
            pop_element();
            $$payload2.out.push(` <div>`);
            push_element($$payload2, "div", 234, 12);
            $$payload2.out.push(`Missing values: ${escape_html(validation.dataQuality.missingValues)}</div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]--></div>`);
          pop_element();
          $$payload2.out.push(`</div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]-->`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
    $$payload2.out.push(`<!--]--> <div${attr("id", `chart-description-${chartId}`)} class="sr-only">`);
    push_element($$payload2, "div", 242, 2);
    if (validation.isValid && processorData.chartData.length > 0) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<p>`);
      push_element($$payload2, "p", 244, 6);
      $$payload2.out.push(`This is a ${escape_html(currentChartType)} chart displaying ${escape_html(processorData.chartData.length)} data points. `);
      if (validation.dataQuality.valueRanges.y[0] !== validation.dataQuality.valueRanges.y[1]) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`Values range from ${escape_html(validation.dataQuality.valueRanges.y[0])} to ${escape_html(validation.dataQuality.valueRanges.y[1])}.`);
      } else {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]--> `);
      if (validation.warnings.length > 0 && validation.warnings[0]) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`Note: ${escape_html(validation.warnings[0].message)}`);
      } else {
        $$payload2.out.push("<!--[!-->");
      }
      $$payload2.out.push(`<!--]--></p>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
      if (!validation.isValid) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`<p>`);
        push_element($$payload2, "p", 254, 6);
        $$payload2.out.push(`Chart contains invalid data and cannot be displayed.</p>`);
        pop_element();
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<p>`);
        push_element($$payload2, "p", 256, 6);
        $$payload2.out.push(`Chart has no data to display.</p>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    }
    $$payload2.out.push(`<!--]--></div>`);
    pop_element();
    $$payload2.out.push(`</div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Unified_chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_column_header[FILENAME] = "src/routes/accounts/[id]/(components)/data-table-column-header.svelte";
function Data_table_column_header($$payload, $$props) {
  push(Data_table_column_header);
  let {
    column,
    class: className,
    title,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const currentView = currentViews.get()?.activeView;
  const sortState = currentView?.view?.getSorting()?.find((sorter) => sorter.id === column.id);
  if (!column?.getCanSort() && !column?.getCanHide()) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div${spread_attributes(
      {
        class: clsx(cn(buttonVariants({ variant: "ghost", size: "sm" }), className)),
        ...restProps
      },
      null
    )}>`);
    push_element($$payload, "div", 33, 2);
    $$payload.out.push(`${escape_html(title)}</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes(
      {
        class: clsx(cn("flex items-center", className)),
        ...restProps
      },
      null
    )}>`);
    push_element($$payload, "div", 37, 2);
    $$payload.out.push(`<!---->`);
    Root$5($$payload, {
      children: prevent_snippet_stringification(($$payload2) => {
        $$payload2.out.push(`<!---->`);
        {
          let child = function($$payload3, { props }) {
            validate_snippet_args($$payload3);
            Button($$payload3, spread_props([
              props,
              {
                variant: "ghost",
                size: "sm",
                class: "-ml-3 h-8 data-[state=open]:bg-accent",
                children: prevent_snippet_stringification(($$payload4) => {
                  $$payload4.out.push(`<span>`);
                  push_element($$payload4, "span", 47, 12);
                  $$payload4.out.push(`${escape_html(title)}</span>`);
                  pop_element();
                  $$payload4.out.push(` `);
                  if (column.getCanSort()) {
                    $$payload4.out.push("<!--[-->");
                    if (sortState && sortState.desc) {
                      $$payload4.out.push("<!--[-->");
                      Arrow_down($$payload4, { class: "ml-2 size-4" });
                    } else {
                      $$payload4.out.push("<!--[!-->");
                      if (sortState && !sortState.desc) {
                        $$payload4.out.push("<!--[-->");
                        Arrow_up($$payload4, { class: "ml-2 size-4" });
                      } else {
                        $$payload4.out.push("<!--[!-->");
                        Arrow_up_down($$payload4, { class: "ml-2 size-4" });
                      }
                      $$payload4.out.push(`<!--]-->`);
                    }
                    $$payload4.out.push(`<!--]-->`);
                  } else {
                    $$payload4.out.push("<!--[!-->");
                  }
                  $$payload4.out.push(`<!--]-->`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Dropdown_menu_trigger($$payload2, { child, $$slots: { child: true } });
        }
        $$payload2.out.push(`<!----> <!---->`);
        Dropdown_menu_content($$payload2, {
          align: "start",
          children: prevent_snippet_stringification(($$payload3) => {
            if (column.getCanSort()) {
              $$payload3.out.push("<!--[-->");
              $$payload3.out.push(`<!---->`);
              Dropdown_menu_item($$payload3, {
                onclick: () => currentView.updateTableSorter(column.id, false),
                children: prevent_snippet_stringification(($$payload4) => {
                  Arrow_up($$payload4, { class: "mr-2 size-3.5 text-muted-foreground/70" });
                  $$payload4.out.push(`<!----> Asc`);
                }),
                $$slots: { default: true }
              });
              $$payload3.out.push(`<!----> <!---->`);
              Dropdown_menu_item($$payload3, {
                onclick: () => currentView.updateTableSorter(column.id, true),
                children: prevent_snippet_stringification(($$payload4) => {
                  Arrow_down($$payload4, { class: "mr-2 size-3.5 text-muted-foreground/70" });
                  $$payload4.out.push(`<!----> Desc`);
                }),
                $$slots: { default: true }
              });
              $$payload3.out.push(`<!----> <!---->`);
              Dropdown_menu_separator($$payload3, {});
              $$payload3.out.push(`<!---->`);
            } else {
              $$payload3.out.push("<!--[!-->");
            }
            $$payload3.out.push(`<!--]--> <!---->`);
            Dropdown_menu_item($$payload3, {
              onclick: () => currentView.updateColumnVisibility(column.id, false),
              children: prevent_snippet_stringification(($$payload4) => {
                Eye_off($$payload4, { class: "mr-2 size-3.5 text-muted-foreground/70" });
                $$payload4.out.push(`<!----> Hide`);
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload2.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Data_table_column_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_faceted_filter[FILENAME] = "src/routes/accounts/[id]/(components)/data-table-faceted-filter.svelte";
function Data_table_faceted_filter($$payload, $$props) {
  push(Data_table_faceted_filter);
  let {
    column,
    title,
    options,
    allOptions,
    allIcon,
    customValueSnippet
  } = $$props;
  const facets = column?.getFacetedUniqueValues();
  const operators = column?.columnDef.meta?.availableFilters || [];
  let showAll = false;
  let activeOperator = column.getFilterFn()?.name;
  const optionsValues = options?.values().toArray();
  const optionsRawValues = optionsValues?.map((opt) => opt.value);
  const showOptions = (showAll ? optionsValues?.concat(allOptions?.values().toArray().filter((option) => !optionsRawValues?.includes(option.value)) || []) : optionsValues) || [];
  const notIn = (allOptions?.size || 0) - (options?.size || 0);
  const activeView = currentViews.get().activeView;
  const activeViewModel = activeView.view;
  const selectedValues = activeViewModel.getFilterValue(column.id);
  $$payload.out.push(`<div class="flex">`);
  push_element($$payload, "div", 55, 0);
  Badge($$payload, {
    variant: "outline",
    class: "h-8 rounded-r-none",
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->${escape_html(title)}`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> <!---->`);
  Root($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->`);
      {
        let child = function($$payload3, { props }) {
          validate_snippet_args($$payload3);
          Button($$payload3, spread_props([
            props,
            {
              variant: "outline",
              size: "sm",
              class: "h-8 rounded-none border-l-0 border-r-0",
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->${escape_html(operators.find((op) => op.id === activeOperator)?.label)}`);
              }),
              $$slots: { default: true }
            }
          ]));
        };
        prevent_snippet_stringification(child);
        Popover_trigger($$payload2, { child, $$slots: { child: true } });
      }
      $$payload2.out.push(`<!----> <!---->`);
      Popover_content($$payload2, {
        class: "w-auto min-w-[200px] p-0",
        align: "start",
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Command($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->`);
              Command_list($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->`);
                  Command_empty($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->No operators found.`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> <!---->`);
                  Command_group($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      const each_array = ensure_array_like(operators);
                      $$payload6.out.push(`<!--[-->`);
                      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                        let { id, label } = each_array[$$index];
                        const isSelected = activeOperator === id;
                        $$payload6.out.push(`<!---->`);
                        Command_item($$payload6, {
                          value: id,
                          onSelect: () => {
                            activeView.updateFilter({ column: column.id, filter: id });
                            activeOperator = id;
                          },
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<div${attr_class(clsx(cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")))}>`);
                            push_element($$payload7, "div", 87, 16);
                            Check($$payload7, { class: cn("h-4 w-4") });
                            $$payload7.out.push(`<!----></div>`);
                            pop_element();
                            $$payload7.out.push(` <span>`);
                            push_element($$payload7, "span", 97, 16);
                            $$payload7.out.push(`${escape_html(label)}</span>`);
                            pop_element();
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!---->`);
                      }
                      $$payload6.out.push(`<!--]-->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!---->`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> <!---->`);
  Root($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->`);
      {
        let child = function($$payload3, { props }) {
          validate_snippet_args($$payload3);
          Button($$payload3, spread_props([
            props,
            {
              variant: "outline",
              size: "sm",
              class: "h-8 rounded-none",
              children: prevent_snippet_stringification(($$payload4) => {
                if (selectedValues.size === 0) {
                  $$payload4.out.push("<!--[-->");
                  Badge($$payload4, {
                    variant: "secondary",
                    children: prevent_snippet_stringification(($$payload5) => {
                      $$payload5.out.push(`<!---->none selected`);
                    }),
                    $$slots: { default: true }
                  });
                } else {
                  $$payload4.out.push("<!--[!-->");
                  Badge($$payload4, {
                    variant: "secondary",
                    class: "rounded-sm px-1 font-normal lg:hidden",
                    children: prevent_snippet_stringification(($$payload5) => {
                      $$payload5.out.push(`<!---->${escape_html(selectedValues.size)}`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload4.out.push(`<!----> <div class="hidden space-x-1 lg:flex">`);
                  push_element($$payload4, "div", 115, 12);
                  if (selectedValues.size > 2) {
                    $$payload4.out.push("<!--[-->");
                    Badge($$payload4, {
                      variant: "secondary",
                      class: "rounded-sm px-1 font-normal",
                      children: prevent_snippet_stringification(($$payload5) => {
                        $$payload5.out.push(`<!---->${escape_html(selectedValues.size)} selected`);
                      }),
                      $$slots: { default: true }
                    });
                  } else {
                    $$payload4.out.push("<!--[!-->");
                    const matchingOptions = allOptions?.values().toArray().filter((opt) => selectedValues.has(opt.value)) || [];
                    if (matchingOptions.length > 0) {
                      $$payload4.out.push("<!--[-->");
                      const each_array_1 = ensure_array_like(matchingOptions);
                      $$payload4.out.push(`<!--[-->`);
                      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                        let option = each_array_1[$$index_1];
                        Badge($$payload4, {
                          variant: "secondary",
                          class: "rounded-sm px-1 font-normal",
                          children: prevent_snippet_stringification(($$payload5) => {
                            $$payload5.out.push(`<!---->${escape_html(option.label)}`);
                          }),
                          $$slots: { default: true }
                        });
                      }
                      $$payload4.out.push(`<!--]-->`);
                    } else {
                      $$payload4.out.push("<!--[!-->");
                      Badge($$payload4, {
                        variant: "secondary",
                        class: "rounded-sm px-1 font-normal",
                        children: prevent_snippet_stringification(($$payload5) => {
                          $$payload5.out.push(`<!---->${escape_html(selectedValues.size)} selected`);
                        }),
                        $$slots: { default: true }
                      });
                    }
                    $$payload4.out.push(`<!--]-->`);
                  }
                  $$payload4.out.push(`<!--]--></div>`);
                  pop_element();
                }
                $$payload4.out.push(`<!--]-->`);
              }),
              $$slots: { default: true }
            }
          ]));
        };
        prevent_snippet_stringification(child);
        Popover_trigger($$payload2, { child, $$slots: { child: true } });
      }
      $$payload2.out.push(`<!----> <!---->`);
      Popover_content($$payload2, {
        class: "w-auto min-w-[200px] p-0",
        align: "start",
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Command($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->`);
              Command_input($$payload4, { placeholder: title });
              $$payload4.out.push(`<!----> <!---->`);
              Command_list($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->`);
                  Command_empty($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->No results found.`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> <!---->`);
                  Command_group($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      const each_array_2 = ensure_array_like(showOptions);
                      $$payload6.out.push(`<!--[-->`);
                      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                        let option = each_array_2[$$index_2];
                        const isSelected = selectedValues.has(option.value);
                        $$payload6.out.push(`<!---->`);
                        Command_item($$payload6, {
                          onSelect: () => {
                            activeView.toggleFilterValue(column.id, option.value);
                          },
                          children: prevent_snippet_stringification(($$payload7) => {
                            const optionValue = ["category", "payee"].includes(column.id) ? parseInt(option.value) : option.value;
                            $$payload7.out.push(`<div${attr_class(clsx(cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")))}>`);
                            push_element($$payload7, "div", 153, 16);
                            Check($$payload7, { class: cn("h-4 w-4") });
                            $$payload7.out.push(`<!----></div>`);
                            pop_element();
                            $$payload7.out.push(` `);
                            if (option.icon) {
                              $$payload7.out.push("<!--[-->");
                              const Icon = option.icon;
                              $$payload7.out.push(`<!---->`);
                              Icon($$payload7, { class: "size-4" });
                              $$payload7.out.push(`<!---->`);
                            } else {
                              $$payload7.out.push("<!--[!-->");
                            }
                            $$payload7.out.push(`<!--]--> <span>`);
                            push_element($$payload7, "span", 168, 16);
                            $$payload7.out.push(`${escape_html(option.label)}</span>`);
                            pop_element();
                            $$payload7.out.push(` `);
                            if (facets?.has(optionValue)) {
                              $$payload7.out.push("<!--[-->");
                              $$payload7.out.push(`<span class="ml-auto flex size-4 items-center justify-center font-mono text-xs">`);
                              push_element($$payload7, "span", 173, 18);
                              $$payload7.out.push(`${escape_html(facets.get(optionValue))}</span>`);
                              pop_element();
                            } else {
                              $$payload7.out.push("<!--[!-->");
                            }
                            $$payload7.out.push(`<!--]-->`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!---->`);
                      }
                      $$payload6.out.push(`<!--]--> `);
                      if (allOptions?.size && notIn > 0) {
                        $$payload6.out.push("<!--[-->");
                        $$payload6.out.push(`<!---->`);
                        Command_item($$payload6, {
                          onSelect: () => showAll = !showAll,
                          children: prevent_snippet_stringification(($$payload7) => {
                            if (allIcon) {
                              $$payload7.out.push("<!--[-->");
                              const AllIcon = allIcon;
                              $$payload7.out.push(`<!---->`);
                              AllIcon($$payload7, { class: "size-4" });
                              $$payload7.out.push(`<!---->`);
                            } else {
                              $$payload7.out.push("<!--[!-->");
                            }
                            $$payload7.out.push(`<!--]--> <span class="text-sm text-slate-800">`);
                            push_element($$payload7, "span", 185, 16);
                            $$payload7.out.push(`${escape_html(showAll ? "hide" : "show")}
                  ${escape_html(notIn)} options not matching any ${escape_html(title.toLowerCase())}</span>`);
                            pop_element();
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!---->`);
                      } else {
                        $$payload6.out.push("<!--[!-->");
                      }
                      $$payload6.out.push(`<!--]-->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> `);
                  if (customValueSnippet) {
                    $$payload5.out.push("<!--[-->");
                    $$payload5.out.push(`<!---->`);
                    Command_separator($$payload5, {});
                    $$payload5.out.push(`<!----> <!---->`);
                    Command_group($$payload5, {
                      children: prevent_snippet_stringification(($$payload6) => {
                        customValueSnippet($$payload6);
                        $$payload6.out.push(`<!---->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload5.out.push(`<!---->`);
                  } else {
                    $$payload5.out.push("<!--[!-->");
                  }
                  $$payload5.out.push(`<!--]--> `);
                  if (selectedValues.size > 0) {
                    $$payload5.out.push("<!--[-->");
                    $$payload5.out.push(`<!---->`);
                    Command_separator($$payload5, {});
                    $$payload5.out.push(`<!----> <!---->`);
                    Command_group($$payload5, {
                      children: prevent_snippet_stringification(($$payload6) => {
                        $$payload6.out.push(`<!---->`);
                        Command_item($$payload6, {
                          onSelect: () => activeView.clearFilterValue(column.id),
                          class: "justify-center text-center",
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<!---->Clear filters`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload6.out.push(`<!---->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload5.out.push(`<!---->`);
                  } else {
                    $$payload5.out.push("<!--[!-->");
                  }
                  $$payload5.out.push(`<!--]-->`);
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    class: "h-8 rounded-l-none border-l-0 p-2",
    onclick: () => activeView.removeFilter(column.id),
    children: prevent_snippet_stringification(($$payload2) => {
      X($$payload2, {});
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  pop();
}
Data_table_faceted_filter.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Server_data_table_toolbar[FILENAME] = "src/routes/accounts/[id]/(components)/server-data-table-toolbar.svelte";
function Server_data_table_toolbar($$payload, $$props) {
  push(Server_data_table_toolbar);
  let {
    accountState,
    accountId
    /** State manager containing filter state and methods */
    /** State manager containing filter state and methods */
    /** Account identifier for filter operations */
  } = $$props;
  let searchValue = accountState.filters.searchQuery || "";
  let dateFiltersOpen = false;
  function clearSearch() {
    searchValue = "";
  }
  function clearAllFilters() {
    searchValue = "";
    accountState.filters.searchQuery = "";
    accountState.filters.dateFrom = "";
    accountState.filters.dateTo = "";
    accountState.loadTransactions(accountId, true);
  }
  function refresh() {
    accountState.refresh(accountId);
  }
  const activeFiltersCount = () => {
    let count = 0;
    if (accountState.filters.searchQuery) count++;
    if (accountState.filters.dateFrom || accountState.filters.dateTo) count++;
    return count;
  };
  function setDateRange(from, to) {
    accountState.setDateFilter(accountId, from, to);
    dateFiltersOpen = false;
  }
  const sortOptions = [
    {
      value: "date-desc",
      label: "Date (Newest first)",
      sortBy: "date",
      sortOrder: "desc"
    },
    {
      value: "date-asc",
      label: "Date (Oldest first)",
      sortBy: "date",
      sortOrder: "asc"
    },
    {
      value: "amount-desc",
      label: "Amount (Highest first)",
      sortBy: "amount",
      sortOrder: "desc"
    },
    {
      value: "amount-asc",
      label: "Amount (Lowest first)",
      sortBy: "amount",
      sortOrder: "asc"
    },
    {
      value: "notes-asc",
      label: "Description (A-Z)",
      sortBy: "notes",
      sortOrder: "asc"
    },
    {
      value: "notes-desc",
      label: "Description (Z-A)",
      sortBy: "notes",
      sortOrder: "desc"
    }
  ];
  const selectedSort = () => {
    const sortValue = `${accountState.filters.sortBy}-${accountState.filters.sortOrder}`;
    const validOption = sortOptions.find((opt) => opt.value === sortValue);
    return validOption ? validOption.value : "date-desc";
  };
  function setSorting(value) {
    const option = sortOptions.find((opt) => opt.value === value);
    if (option) {
      accountState.setSorting(accountId, option.sortBy, option.sortOrder);
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="flex items-center justify-between">`);
    push_element($$payload2, "div", 131, 0);
    $$payload2.out.push(`<div class="flex flex-1 items-center space-x-2">`);
    push_element($$payload2, "div", 132, 2);
    $$payload2.out.push(`<div class="relative max-w-sm">`);
    push_element($$payload2, "div", 134, 4);
    Search($$payload2, {
      class: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
    });
    $$payload2.out.push(`<!----> `);
    Input($$payload2, {
      placeholder: "Search transactions...",
      class: "pl-8 pr-8",
      get value() {
        return searchValue;
      },
      set value($$value) {
        searchValue = $$value;
        $$settled = false;
      }
    });
    $$payload2.out.push(`<!----> `);
    if (searchValue) {
      $$payload2.out.push("<!--[-->");
      Button($$payload2, {
        variant: "ghost",
        size: "sm",
        class: "absolute right-1 top-1 h-6 w-6 p-0",
        onclick: clearSearch,
        children: prevent_snippet_stringification(($$payload3) => {
          X($$payload3, { class: "h-3 w-3" });
        }),
        $$slots: { default: true }
      });
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> `);
    if (accountState.isSearching) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div class="absolute right-2.5 top-2.5">`);
      push_element($$payload2, "div", 152, 8);
      $$payload2.out.push(`<div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent">`);
      push_element($$payload2, "div", 153, 10);
      $$payload2.out.push(`</div>`);
      pop_element();
      $$payload2.out.push(`</div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></div>`);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Root($$payload2, {
      get open() {
        return dateFiltersOpen;
      },
      set open($$value) {
        dateFiltersOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Popover_trigger($$payload3, {
          class: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2 border-dashed",
          children: prevent_snippet_stringification(($$payload4) => {
            Calendar$1($$payload4, { class: "mr-2 h-4 w-4" });
            $$payload4.out.push(`<!----> Date Range `);
            if (accountState.filters.dateFrom || accountState.filters.dateTo) {
              $$payload4.out.push("<!--[-->");
              Badge($$payload4, {
                variant: "secondary",
                class: "ml-2 h-4 px-1 text-xs",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->Active`);
                }),
                $$slots: { default: true }
              });
            } else {
              $$payload4.out.push("<!--[!-->");
            }
            $$payload4.out.push(`<!--]-->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "w-auto p-3",
          align: "start",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<div class="space-y-3">`);
            push_element($$payload4, "div", 170, 8);
            $$payload4.out.push(`<h4 class="font-medium leading-none">`);
            push_element($$payload4, "h4", 171, 10);
            $$payload4.out.push(`Date Range Filter</h4>`);
            pop_element();
            $$payload4.out.push(` <div class="grid grid-cols-2 gap-3">`);
            push_element($$payload4, "div", 172, 10);
            $$payload4.out.push(`<div class="space-y-2">`);
            push_element($$payload4, "div", 173, 12);
            $$payload4.out.push(`<label for="date-from" class="text-sm font-medium">`);
            push_element($$payload4, "label", 174, 14);
            $$payload4.out.push(`From</label>`);
            pop_element();
            $$payload4.out.push(` `);
            Input($$payload4, {
              id: "date-from",
              type: "date",
              value: accountState.filters.dateFrom ? new Date(accountState.filters.dateFrom).toISOString().split("T")[0] : "",
              onchange: (e) => {
                const value = e.currentTarget.value;
                const dateFrom = value ? new Date(value).toISOString() : void 0;
                setDateRange(dateFrom, accountState.filters.dateTo);
              }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(` <div class="space-y-2">`);
            push_element($$payload4, "div", 186, 12);
            $$payload4.out.push(`<label for="date-to" class="text-sm font-medium">`);
            push_element($$payload4, "label", 187, 14);
            $$payload4.out.push(`To</label>`);
            pop_element();
            $$payload4.out.push(` `);
            Input($$payload4, {
              id: "date-to",
              type: "date",
              value: accountState.filters.dateTo ? new Date(accountState.filters.dateTo).toISOString().split("T")[0] : "",
              onchange: (e) => {
                const value = e.currentTarget.value;
                const dateTo = value ? new Date(value).toISOString() : void 0;
                setDateRange(accountState.filters.dateFrom, dateTo);
              }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
            $$payload4.out.push(` <div class="flex justify-between">`);
            push_element($$payload4, "div", 200, 10);
            Button($$payload4, {
              size: "sm",
              variant: "outline",
              onclick: () => setDateRange(void 0, void 0),
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Clear`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              size: "sm",
              onclick: () => dateFiltersOpen = false,
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Close`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Root$4($$payload2, {
      type: "single",
      value: selectedSort(),
      onValueChange: setSorting,
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Select_trigger($$payload3, {
          class: "h-8 w-[200px]",
          children: prevent_snippet_stringification(($$payload4) => {
            Sliders_horizontal($$payload4, { class: "mr-2 h-4 w-4" });
            $$payload4.out.push(`<!----> ${escape_html(sortOptions.find((opt) => opt.value === selectedSort())?.label || "Sort by...")}`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!----> <!---->`);
        Select_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Select_group($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                const each_array = ensure_array_like(sortOptions);
                $$payload5.out.push(`<!---->`);
                Select_label($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Sort Options`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!--[-->`);
                for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                  let option = each_array[index];
                  $$payload5.out.push(`<!---->`);
                  Select_item($$payload5, {
                    value: option.value,
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->${escape_html(option.label)}`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!---->`);
                }
                $$payload5.out.push(`<!--]-->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    if (activeFiltersCount() > 0) {
      $$payload2.out.push("<!--[-->");
      Badge($$payload2, {
        variant: "secondary",
        class: "ml-2",
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->${escape_html(activeFiltersCount())} filter${escape_html(activeFiltersCount() === 1 ? "" : "s")} active`);
        }),
        $$slots: { default: true }
      });
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></div>`);
    pop_element();
    $$payload2.out.push(` <div class="flex items-center space-x-2">`);
    push_element($$payload2, "div", 249, 2);
    if (activeFiltersCount() > 0) {
      $$payload2.out.push("<!--[-->");
      Button($$payload2, {
        variant: "ghost",
        size: "sm",
        onclick: clearAllFilters,
        class: "h-8 px-2",
        children: prevent_snippet_stringification(($$payload3) => {
          X($$payload3, { class: "mr-2 h-4 w-4" });
          $$payload3.out.push(`<!----> Clear All`);
        }),
        $$slots: { default: true }
      });
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> `);
    Button($$payload2, {
      variant: "outline",
      size: "sm",
      onclick: refresh,
      class: "h-8 px-2",
      disabled: accountState.isLoadingSummary || accountState.isLoadingTransactions,
      children: prevent_snippet_stringification(($$payload3) => {
        Rotate_ccw($$payload3, {
          class: `mr-2 h-4 w-4 ${stringify(accountState.isLoadingSummary || accountState.isLoadingTransactions ? "animate-spin" : "")}`
        });
        $$payload3.out.push(`<!----> Refresh`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
    $$payload2.out.push(`</div>`);
    pop_element();
    $$payload2.out.push(` <div class="flex items-center justify-between text-sm text-muted-foreground">`);
    push_element($$payload2, "div", 278, 0);
    $$payload2.out.push(`<div>`);
    push_element($$payload2, "div", 279, 2);
    if (accountState.isLoadingTransactions) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`Loading transactions...`);
    } else {
      $$payload2.out.push("<!--[!-->");
      if (accountState.filters.searchQuery) {
        $$payload2.out.push("<!--[-->");
        $$payload2.out.push(`Found ${escape_html(accountState.pagination.totalCount)} transaction${escape_html(accountState.pagination.totalCount === 1 ? "" : "s")}
      matching "${escape_html(accountState.filters.searchQuery)}"`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`Showing ${escape_html(accountState.currentTransactions.length)} of ${escape_html(accountState.pagination.totalCount)} transactions`);
      }
      $$payload2.out.push(`<!--]-->`);
    }
    $$payload2.out.push(`<!--]--></div>`);
    pop_element();
    $$payload2.out.push(` <div>`);
    push_element($$payload2, "div", 290, 2);
    $$payload2.out.push(`Page ${escape_html(accountState.pagination.page + 1)} of ${escape_html(accountState.pagination.totalPages || 1)}</div>`);
    pop_element();
    $$payload2.out.push(`</div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Server_data_table_toolbar.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Server_data_table_pagination[FILENAME] = "src/routes/accounts/[id]/(components)/server-data-table-pagination.svelte";
function Server_data_table_pagination($$payload, $$props) {
  push(Server_data_table_pagination);
  let {
    accountState,
    accountId
    /** State manager containing pagination state and methods */
    /** State manager containing pagination state and methods */
    /** Account identifier for pagination operations */
  } = $$props;
  const pageSizeOptions = [
    { value: "10", label: "10 per page" },
    // Small datasets, detailed viewing
    { value: "25", label: "25 per page" },
    // Balanced view
    { value: "50", label: "50 per page" },
    // Default recommended size
    { value: "100", label: "100 per page" }
    // Large datasets, overview
  ];
  function setPageSize(value) {
    const pageSize = parseInt(value);
    if (!isNaN(pageSize) && pageSize > 0) {
      accountState.setPageSize(accountId, pageSize);
    }
  }
  function goToFirstPage() {
    accountState.goToPage(accountId, 0);
  }
  function goToLastPage() {
    accountState.goToPage(accountId, accountState.pagination.totalPages - 1);
  }
  function goToPreviousPage() {
    accountState.previousPage(accountId);
  }
  function goToNextPage() {
    accountState.nextPage(accountId);
  }
  const currentRange = () => {
    const { page: page2, pageSize, totalCount } = accountState.pagination;
    const start = page2 * pageSize + 1;
    const end = Math.min((page2 + 1) * pageSize, totalCount);
    return { start, end };
  };
  $$payload.out.push(`<div class="flex items-center justify-between px-2">`);
  push_element($$payload, "div", 94, 0);
  $$payload.out.push(`<div class="flex-1 text-sm text-muted-foreground">`);
  push_element($$payload, "div", 96, 2);
  if (accountState.pagination.totalCount === 0) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`No transactions`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`Showing ${escape_html(currentRange().start)} to ${escape_html(currentRange().end)} of ${escape_html(accountState.pagination.totalCount)} transactions`);
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  $$payload.out.push(` <div class="flex items-center space-x-6 lg:space-x-8">`);
  push_element($$payload, "div", 105, 2);
  $$payload.out.push(`<div class="flex items-center space-x-2">`);
  push_element($$payload, "div", 107, 4);
  $$payload.out.push(`<p class="text-sm font-medium">`);
  push_element($$payload, "p", 108, 6);
  $$payload.out.push(`Rows per page</p>`);
  pop_element();
  $$payload.out.push(` <!---->`);
  Root$4($$payload, {
    type: "single",
    value: accountState.pagination.pageSize.toString(),
    onValueChange: setPageSize,
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->`);
      Select_trigger($$payload2, {
        class: "h-8 w-[130px]",
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->${escape_html(accountState.pagination.pageSize)} per page`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!----> <!---->`);
      Select_content($$payload2, {
        side: "top",
        children: prevent_snippet_stringification(($$payload3) => {
          const each_array = ensure_array_like(pageSizeOptions);
          $$payload3.out.push(`<!--[-->`);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let option = each_array[$$index];
            $$payload3.out.push(`<!---->`);
            Select_item($$payload3, {
              value: option.value,
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->${escape_html(option.label)}`);
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!---->`);
          }
          $$payload3.out.push(`<!--]-->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(` <div class="flex items-center space-x-2">`);
  push_element($$payload, "div", 128, 4);
  $$payload.out.push(`<div class="flex w-[100px] items-center justify-center text-sm font-medium">`);
  push_element($$payload, "div", 129, 6);
  $$payload.out.push(`Page ${escape_html(accountState.pagination.page + 1)} of ${escape_html(Math.max(1, accountState.pagination.totalPages))}</div>`);
  pop_element();
  $$payload.out.push(` <div class="flex items-center space-x-2">`);
  push_element($$payload, "div", 134, 6);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    class: "hidden h-8 w-8 p-0 lg:flex",
    onclick: goToFirstPage,
    disabled: !accountState.pagination.hasPreviousPage || accountState.isLoadingTransactions,
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<span class="sr-only">`);
      push_element($$payload2, "span", 142, 10);
      $$payload2.out.push(`Go to first page</span>`);
      pop_element();
      $$payload2.out.push(` `);
      Chevrons_left($$payload2, { class: "h-4 w-4" });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    class: "h-8 w-8 p-0",
    onclick: goToPreviousPage,
    disabled: !accountState.pagination.hasPreviousPage || accountState.isLoadingTransactions,
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<span class="sr-only">`);
      push_element($$payload2, "span", 153, 10);
      $$payload2.out.push(`Go to previous page</span>`);
      pop_element();
      $$payload2.out.push(` `);
      Chevron_left($$payload2, { class: "h-4 w-4" });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    class: "h-8 w-8 p-0",
    onclick: goToNextPage,
    disabled: !accountState.pagination.hasNextPage || accountState.isLoadingTransactions,
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<span class="sr-only">`);
      push_element($$payload2, "span", 164, 10);
      $$payload2.out.push(`Go to next page</span>`);
      pop_element();
      $$payload2.out.push(` `);
      Chevron_right($$payload2, { class: "h-4 w-4" });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> `);
  Button($$payload, {
    variant: "outline",
    size: "sm",
    class: "hidden h-8 w-8 p-0 lg:flex",
    onclick: goToLastPage,
    disabled: !accountState.pagination.hasNextPage || accountState.isLoadingTransactions,
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<span class="sr-only">`);
      push_element($$payload2, "span", 175, 10);
      $$payload2.out.push(`Go to last page</span>`);
      pop_element();
      $$payload2.out.push(` `);
      Chevrons_right($$payload2, { class: "h-4 w-4" });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(` `);
  if (accountState.isLoadingTransactions) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="flex items-center justify-center space-x-2 py-2">`);
    push_element($$payload, "div", 185, 2);
    $$payload.out.push(`<div class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent">`);
    push_element($$payload, "div", 186, 4);
    $$payload.out.push(`</div>`);
    pop_element();
    $$payload.out.push(` <span class="text-sm text-muted-foreground">`);
    push_element($$payload, "span", 187, 4);
    $$payload.out.push(`Loading transactions...</span>`);
    pop_element();
    $$payload.out.push(`</div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Server_data_table_pagination.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Add_transaction_dialog[FILENAME] = "src/routes/accounts/[id]/(components)/add-transaction-dialog.svelte";
function Add_transaction_dialog($$payload, $$props) {
  push(Add_transaction_dialog);
  let {
    open = false,
    account,
    payees = [],
    categories = [],
    onSubmit
  } = $$props;
  let isSubmitting = false;
  let transactionForm = {
    amount: 0,
    date: $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2()).toString(),
    notes: null,
    payeeId: null,
    categoryId: null,
    status: "cleared"
  };
  function resetForm() {
    transactionForm = {
      amount: 0,
      date: $14e0f24ef4ac5c92$export$d0bdf45af03a6ea3($14e0f24ef4ac5c92$export$aa8b41735afcabd2()).toString(),
      notes: null,
      payeeId: null,
      categoryId: null,
      status: "cleared"
    };
  }
  async function handleSubmit() {
    if (!account?.id || !transactionForm.amount) return;
    try {
      isSubmitting = true;
      await onSubmit(transactionForm);
      resetForm();
      open = false;
    } catch (error) {
      console.error("Transaction submission failed:", error);
    } finally {
      isSubmitting = false;
    }
  }
  function handleClose() {
    if (!isSubmitting) {
      open = false;
      resetForm();
    }
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Root$1($$payload2, {
      get open() {
        return open;
      },
      set open($$value) {
        open = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Dialog_content($$payload3, {
          class: "max-w-md",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Dialog_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Dialog_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Add New Transaction`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Dialog_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Create a new transaction for ${escape_html(account?.name || "this account")}.`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <div class="space-y-4 py-4">`);
            push_element($$payload4, "div", 93, 4);
            $$payload4.out.push(`<div class="space-y-2">`);
            push_element($$payload4, "div", 95, 6);
            Label($$payload4, {
              for: "amount",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Amount`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Input($$payload4, {
              id: "amount",
              type: "number",
              step: "0.01",
              placeholder: "0.00",
              get value() {
                return transactionForm.amount;
              },
              set value($$value) {
                transactionForm.amount = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(` <div class="space-y-2">`);
            push_element($$payload4, "div", 107, 6);
            Label($$payload4, {
              for: "date",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Date`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Input($$payload4, {
              id: "date",
              type: "date",
              get value() {
                return transactionForm.date;
              },
              set value($$value) {
                transactionForm.date = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(` <div class="space-y-2">`);
            push_element($$payload4, "div", 117, 6);
            Label($$payload4, {
              for: "payee",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Payee`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Root$4($$payload4, {
              type: "single",
              value: transactionForm.payeeId?.toString() ?? void 0,
              onValueChange: (value) => {
                transactionForm.payeeId = value ? parseInt(value) : null;
              },
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Select_trigger($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->${escape_html(payees.find((p) => p.id === transactionForm.payeeId)?.name || "Select payee (optional)")}`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Select_content($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    const each_array = ensure_array_like(payees);
                    $$payload6.out.push(`<!---->`);
                    Select_item($$payload6, {
                      value: "",
                      children: prevent_snippet_stringification(($$payload7) => {
                        $$payload7.out.push(`<!---->No payee`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload6.out.push(`<!----> <!--[-->`);
                    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                      let payee = each_array[$$index];
                      $$payload6.out.push(`<!---->`);
                      Select_item($$payload6, {
                        value: payee.id.toString(),
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->${escape_html(payee.name)}`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!---->`);
                    }
                    $$payload6.out.push(`<!--]-->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(` <div class="space-y-2">`);
            push_element($$payload4, "div", 139, 6);
            Label($$payload4, {
              for: "category",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Category`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Root$4($$payload4, {
              type: "single",
              value: transactionForm.categoryId?.toString() ?? void 0,
              onValueChange: (value) => {
                transactionForm.categoryId = value ? parseInt(value) : null;
              },
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Select_trigger($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->${escape_html(categories.find((c) => c.id === transactionForm.categoryId)?.name || "Select category (optional)")}`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Select_content($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    const each_array_1 = ensure_array_like(categories);
                    $$payload6.out.push(`<!---->`);
                    Select_item($$payload6, {
                      value: "",
                      children: prevent_snippet_stringification(($$payload7) => {
                        $$payload7.out.push(`<!---->No category`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload6.out.push(`<!----> <!--[-->`);
                    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                      let category = each_array_1[$$index_1];
                      $$payload6.out.push(`<!---->`);
                      Select_item($$payload6, {
                        value: category.id.toString(),
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->${escape_html(category.name)}`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!---->`);
                    }
                    $$payload6.out.push(`<!--]-->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(` <div class="space-y-2">`);
            push_element($$payload4, "div", 161, 6);
            Label($$payload4, {
              for: "status",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Status`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Root$4($$payload4, {
              type: "single",
              value: transactionForm.status,
              onValueChange: (value) => {
                if (value) {
                  transactionForm.status = value;
                }
              },
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Select_trigger($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->${escape_html(transactionForm.status || "Select status")}`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Select_content($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->`);
                    Select_item($$payload6, {
                      value: "pending",
                      children: prevent_snippet_stringification(($$payload7) => {
                        $$payload7.out.push(`<!---->Pending`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload6.out.push(`<!----> <!---->`);
                    Select_item($$payload6, {
                      value: "cleared",
                      children: prevent_snippet_stringification(($$payload7) => {
                        $$payload7.out.push(`<!---->Cleared`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload6.out.push(`<!----> <!---->`);
                    Select_item($$payload6, {
                      value: "scheduled",
                      children: prevent_snippet_stringification(($$payload7) => {
                        $$payload7.out.push(`<!---->Scheduled`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload6.out.push(`<!---->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(` <div class="space-y-2">`);
            push_element($$payload4, "div", 184, 6);
            Label($$payload4, {
              for: "notes",
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Notes`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Textarea($$payload4, {
              id: "notes",
              placeholder: "Transaction notes (optional)",
              rows: 3,
              get value() {
                return transactionForm.notes;
              },
              set value($$value) {
                transactionForm.notes = $$value;
                $$settled = false;
              }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
            $$payload4.out.push(` <!---->`);
            Dialog_footer($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                Button($$payload5, {
                  variant: "outline",
                  onclick: handleClose,
                  disabled: isSubmitting,
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Cancel`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> `);
                Button($$payload5, {
                  onclick: handleSubmit,
                  disabled: isSubmitting || !transactionForm.amount,
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->${escape_html(isSubmitting ? "Adding..." : "Add Transaction")}`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { open });
  pop();
}
Add_transaction_dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Transaction_skeleton[FILENAME] = "src/routes/accounts/[id]/(components)/transaction-skeleton.svelte";
function Transaction_skeleton($$payload, $$props) {
  push(Transaction_skeleton);
  let { rows = 5 } = $$props;
  const each_array = ensure_array_like(Array(rows));
  $$payload.out.push(`<div class="rounded-md border">`);
  push_element($$payload, "div", 6, 0);
  $$payload.out.push(`<div class="overflow-hidden">`);
  push_element($$payload, "div", 7, 2);
  $$payload.out.push(`<table class="w-full">`);
  push_element($$payload, "table", 8, 4);
  $$payload.out.push(`<thead>`);
  push_element($$payload, "thead", 9, 6);
  $$payload.out.push(`<tr class="border-b bg-muted/50">`);
  push_element($$payload, "tr", 10, 8);
  $$payload.out.push(`<th class="h-12 px-4 text-left align-middle font-medium">`);
  push_element($$payload, "th", 11, 10);
  $$payload.out.push(`<div class="h-4 w-16 bg-muted animate-pulse rounded">`);
  push_element($$payload, "div", 12, 12);
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</th>`);
  pop_element();
  $$payload.out.push(`<th class="h-12 px-4 text-left align-middle font-medium">`);
  push_element($$payload, "th", 14, 10);
  $$payload.out.push(`<div class="h-4 w-20 bg-muted animate-pulse rounded">`);
  push_element($$payload, "div", 15, 12);
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</th>`);
  pop_element();
  $$payload.out.push(`<th class="h-12 px-4 text-left align-middle font-medium">`);
  push_element($$payload, "th", 17, 10);
  $$payload.out.push(`<div class="h-4 w-16 bg-muted animate-pulse rounded">`);
  push_element($$payload, "div", 18, 12);
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</th>`);
  pop_element();
  $$payload.out.push(`<th class="h-12 px-4 text-left align-middle font-medium">`);
  push_element($$payload, "th", 20, 10);
  $$payload.out.push(`<div class="h-4 w-24 bg-muted animate-pulse rounded">`);
  push_element($$payload, "div", 21, 12);
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</th>`);
  pop_element();
  $$payload.out.push(`<th class="h-12 px-4 text-left align-middle font-medium">`);
  push_element($$payload, "th", 23, 10);
  $$payload.out.push(`<div class="h-4 w-20 bg-muted animate-pulse rounded">`);
  push_element($$payload, "div", 24, 12);
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</th>`);
  pop_element();
  $$payload.out.push(`</tr>`);
  pop_element();
  $$payload.out.push(`</thead>`);
  pop_element();
  $$payload.out.push(`<tbody>`);
  push_element($$payload, "tbody", 28, 6);
  $$payload.out.push(`<!--[-->`);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    each_array[i];
    $$payload.out.push(`<tr class="border-b transition-colors hover:bg-muted/50">`);
    push_element($$payload, "tr", 30, 10);
    $$payload.out.push(`<td class="p-4 align-middle">`);
    push_element($$payload, "td", 31, 12);
    $$payload.out.push(`<div class="h-4 w-20 bg-muted animate-pulse rounded"${attr_style(`animation-delay: ${stringify(i * 50)}ms`)}>`);
    push_element($$payload, "div", 32, 14);
    $$payload.out.push(`</div>`);
    pop_element();
    $$payload.out.push(`</td>`);
    pop_element();
    $$payload.out.push(`<td class="p-4 align-middle">`);
    push_element($$payload, "td", 34, 12);
    $$payload.out.push(`<div class="h-4 w-16 bg-muted animate-pulse rounded"${attr_style(`animation-delay: ${stringify(i * 50 + 25)}ms`)}>`);
    push_element($$payload, "div", 35, 14);
    $$payload.out.push(`</div>`);
    pop_element();
    $$payload.out.push(`</td>`);
    pop_element();
    $$payload.out.push(`<td class="p-4 align-middle">`);
    push_element($$payload, "td", 37, 12);
    $$payload.out.push(`<div class="h-4 w-24 bg-muted animate-pulse rounded"${attr_style(`animation-delay: ${stringify(i * 50 + 50)}ms`)}>`);
    push_element($$payload, "div", 38, 14);
    $$payload.out.push(`</div>`);
    pop_element();
    $$payload.out.push(`</td>`);
    pop_element();
    $$payload.out.push(`<td class="p-4 align-middle">`);
    push_element($$payload, "td", 40, 12);
    $$payload.out.push(`<div class="h-4 w-32 bg-muted animate-pulse rounded"${attr_style(`animation-delay: ${stringify(i * 50 + 75)}ms`)}>`);
    push_element($$payload, "div", 41, 14);
    $$payload.out.push(`</div>`);
    pop_element();
    $$payload.out.push(`</td>`);
    pop_element();
    $$payload.out.push(`<td class="p-4 align-middle">`);
    push_element($$payload, "td", 43, 12);
    $$payload.out.push(`<div class="h-4 w-16 bg-muted animate-pulse rounded"${attr_style(`animation-delay: ${stringify(i * 50 + 100)}ms`)}>`);
    push_element($$payload, "div", 44, 14);
    $$payload.out.push(`</div>`);
    pop_element();
    $$payload.out.push(`</td>`);
    pop_element();
    $$payload.out.push(`</tr>`);
    pop_element();
  }
  $$payload.out.push(`<!--]--></tbody>`);
  pop_element();
  $$payload.out.push(`</table>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  pop();
}
Transaction_skeleton.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Transaction_table_container[FILENAME] = "src/routes/accounts/[id]/(components)/transaction-table-container.svelte";
function Transaction_table_container($$payload, $$props) {
  push(Transaction_table_container);
  let {
    isLoading = false,
    useClientSideTable = false,
    transactions = [],
    filters = {
      searchQuery: "",
      dateFrom: null,
      dateTo: null,
      sortBy: "date",
      sortOrder: "desc"
    },
    pagination = { page: 0, pageSize: 50, totalCount: 0, totalPages: 0 },
    table = void 0,
    serverAccountState = null,
    accountId,
    categoriesState = null,
    payeesState = null,
    views = [],
    columns: columns2,
    formattedTransactions,
    simpleFormatted,
    updateTransactionData,
    searchTransactions,
    loadData
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (isLoading) {
      $$payload2.out.push("<!--[-->");
      Transaction_skeleton($$payload2, { rows: 10 });
    } else {
      $$payload2.out.push("<!--[!-->");
      if (useClientSideTable) {
        $$payload2.out.push("<!--[-->");
        {
          $$payload2.out.push("<!--[!-->");
          $$payload2.out.push(`<div class="bg-red-100 p-4 mb-4 text-red-800">`);
          push_element($$payload2, "div", 88, 6);
          $$payload2.out.push(`DEBUG: browser=${escape_html(browser)}, categoriesState=${escape_html(!!categoriesState)}, payeesState=${escape_html(!!payeesState)}, isLoading=${escape_html(isLoading)}, transactions.length=${escape_html(transactions.length)}</div>`);
          pop_element();
          $$payload2.out.push(` <div class="space-y-4">`);
          push_element($$payload2, "div", 91, 6);
          if (serverAccountState) {
            $$payload2.out.push("<!--[-->");
            Server_data_table_toolbar($$payload2, { accountState: serverAccountState, accountId });
          } else {
            $$payload2.out.push("<!--[!-->");
            $$payload2.out.push(`<div class="flex items-center space-x-4">`);
            push_element($$payload2, "div", 100, 10);
            $$payload2.out.push(`<div class="flex-1">`);
            push_element($$payload2, "div", 101, 12);
            Input($$payload2, {
              placeholder: "Search transactions (fallback filtering)...",
              onchange: () => searchTransactions?.(filters.searchQuery),
              get value() {
                return filters.searchQuery;
              },
              set value($$value) {
                filters.searchQuery = $$value;
                $$settled = false;
              }
            });
            $$payload2.out.push(`<!----></div>`);
            pop_element();
            $$payload2.out.push(` `);
            Button($$payload2, {
              onclick: () => loadData?.(),
              variant: "outline",
              children: prevent_snippet_stringification(($$payload3) => {
                $$payload3.out.push(`<!---->Refresh`);
              }),
              $$slots: { default: true }
            });
            $$payload2.out.push(`<!----></div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]--> `);
          if (serverAccountState?.isLoadingTransactions) {
            $$payload2.out.push("<!--[-->");
            Transaction_skeleton($$payload2, { rows: 8 });
          } else {
            $$payload2.out.push("<!--[!-->");
            $$payload2.out.push(`<div class="rounded-md border">`);
            push_element($$payload2, "div", 118, 10);
            $$payload2.out.push(`<!---->`);
            Table($$payload2, {
              children: prevent_snippet_stringification(($$payload3) => {
                $$payload3.out.push(`<!---->`);
                Table_header($$payload3, {
                  children: prevent_snippet_stringification(($$payload4) => {
                    $$payload4.out.push(`<!---->`);
                    Table_row($$payload4, {
                      children: prevent_snippet_stringification(($$payload5) => {
                        $$payload5.out.push(`<!---->`);
                        Table_head($$payload5, {
                          children: prevent_snippet_stringification(($$payload6) => {
                            $$payload6.out.push(`<!---->Date`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload5.out.push(`<!----> <!---->`);
                        Table_head($$payload5, {
                          children: prevent_snippet_stringification(($$payload6) => {
                            $$payload6.out.push(`<!---->Amount`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload5.out.push(`<!----> <!---->`);
                        Table_head($$payload5, {
                          children: prevent_snippet_stringification(($$payload6) => {
                            $$payload6.out.push(`<!---->Description`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload5.out.push(`<!----> <!---->`);
                        Table_head($$payload5, {
                          children: prevent_snippet_stringification(($$payload6) => {
                            $$payload6.out.push(`<!---->Payee`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload5.out.push(`<!----> <!---->`);
                        Table_head($$payload5, {
                          children: prevent_snippet_stringification(($$payload6) => {
                            $$payload6.out.push(`<!---->Category`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload5.out.push(`<!----> <!---->`);
                        Table_head($$payload5, {
                          children: prevent_snippet_stringification(($$payload6) => {
                            $$payload6.out.push(`<!---->Status`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload5.out.push(`<!---->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload4.out.push(`<!---->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!----> <!---->`);
                Table_body($$payload3, {
                  children: prevent_snippet_stringification(($$payload4) => {
                    const each_array = ensure_array_like(simpleFormatted);
                    if (each_array.length !== 0) {
                      $$payload4.out.push("<!--[-->");
                      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                        let transaction = each_array[$$index];
                        $$payload4.out.push(`<!---->`);
                        Table_row($$payload4, {
                          children: prevent_snippet_stringification(($$payload5) => {
                            $$payload5.out.push(`<!---->`);
                            Table_cell($$payload5, {
                              children: prevent_snippet_stringification(($$payload6) => {
                                $$payload6.out.push(`<!---->${escape_html(new Date(transaction.date.toString()).toLocaleDateString())}`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload5.out.push(`<!----> <!---->`);
                            Table_cell($$payload5, {
                              class: "font-mono",
                              children: prevent_snippet_stringification(($$payload6) => {
                                $$payload6.out.push(`<!---->$${escape_html(transaction.amount?.toFixed(2) || "0.00")}`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload5.out.push(`<!----> <!---->`);
                            Table_cell($$payload5, {
                              children: prevent_snippet_stringification(($$payload6) => {
                                $$payload6.out.push(`<!---->${escape_html(transaction.notes || "-")}`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload5.out.push(`<!----> <!---->`);
                            Table_cell($$payload5, {
                              children: prevent_snippet_stringification(($$payload6) => {
                                $$payload6.out.push(`<!---->${escape_html(transaction.payee?.name || "-")}`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload5.out.push(`<!----> <!---->`);
                            Table_cell($$payload5, {
                              children: prevent_snippet_stringification(($$payload6) => {
                                $$payload6.out.push(`<!---->${escape_html(transaction.category?.name || "-")}`);
                              }),
                              $$slots: { default: true }
                            });
                            $$payload5.out.push(`<!----> <!---->`);
                            Table_cell($$payload5, {
                              children: prevent_snippet_stringification(($$payload6) => {
                                $$payload6.out.push(`<span${attr_class(`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${stringify(transaction.status === "cleared" ? "bg-green-100 text-green-800" : transaction.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800")}`)}>`);
                                push_element($$payload6, "span", 141, 22);
                                $$payload6.out.push(`${escape_html(transaction.status || "pending")}</span>`);
                                pop_element();
                              }),
                              $$slots: { default: true }
                            });
                            $$payload5.out.push(`<!---->`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload4.out.push(`<!---->`);
                      }
                    } else {
                      $$payload4.out.push("<!--[!-->");
                      $$payload4.out.push(`<!---->`);
                      Table_row($$payload4, {
                        children: prevent_snippet_stringification(($$payload5) => {
                          $$payload5.out.push(`<!---->`);
                          Table_cell($$payload5, {
                            colspan: 6,
                            class: "text-center text-muted-foreground py-8",
                            children: prevent_snippet_stringification(($$payload6) => {
                              $$payload6.out.push(`<!---->No transactions found`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload5.out.push(`<!---->`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload4.out.push(`<!---->`);
                    }
                    $$payload4.out.push(`<!--]-->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload3.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload2.out.push(`<!----></div>`);
            pop_element();
          }
          $$payload2.out.push(`<!--]--></div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]-->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="space-y-4">`);
        push_element($$payload2, "div", 164, 4);
        $$payload2.out.push(`<div class="flex items-center space-x-4">`);
        push_element($$payload2, "div", 166, 6);
        $$payload2.out.push(`<div class="flex-1">`);
        push_element($$payload2, "div", 167, 8);
        Input($$payload2, {
          placeholder: "Search transactions...",
          onchange: () => searchTransactions?.(filters.searchQuery),
          get value() {
            return filters.searchQuery;
          },
          set value($$value) {
            filters.searchQuery = $$value;
            $$settled = false;
          }
        });
        $$payload2.out.push(`<!----></div>`);
        pop_element();
        $$payload2.out.push(` `);
        Button($$payload2, {
          onclick: () => loadData?.(),
          variant: "outline",
          children: prevent_snippet_stringification(($$payload3) => {
            $$payload3.out.push(`<!---->Refresh`);
          }),
          $$slots: { default: true }
        });
        $$payload2.out.push(`<!----></div>`);
        pop_element();
        $$payload2.out.push(` `);
        if (serverAccountState?.isLoadingTransactions) {
          $$payload2.out.push("<!--[-->");
          Transaction_skeleton($$payload2, { rows: pagination.pageSize });
        } else {
          $$payload2.out.push("<!--[!-->");
          $$payload2.out.push(`<div class="rounded-md border">`);
          push_element($$payload2, "div", 183, 8);
          $$payload2.out.push(`<!---->`);
          Table($$payload2, {
            children: prevent_snippet_stringification(($$payload3) => {
              $$payload3.out.push(`<!---->`);
              Table_header($$payload3, {
                children: prevent_snippet_stringification(($$payload4) => {
                  $$payload4.out.push(`<!---->`);
                  Table_row($$payload4, {
                    children: prevent_snippet_stringification(($$payload5) => {
                      $$payload5.out.push(`<!---->`);
                      Table_head($$payload5, {
                        children: prevent_snippet_stringification(($$payload6) => {
                          $$payload6.out.push(`<!---->Date`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload5.out.push(`<!----> <!---->`);
                      Table_head($$payload5, {
                        children: prevent_snippet_stringification(($$payload6) => {
                          $$payload6.out.push(`<!---->Amount`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload5.out.push(`<!----> <!---->`);
                      Table_head($$payload5, {
                        children: prevent_snippet_stringification(($$payload6) => {
                          $$payload6.out.push(`<!---->Description`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload5.out.push(`<!----> <!---->`);
                      Table_head($$payload5, {
                        children: prevent_snippet_stringification(($$payload6) => {
                          $$payload6.out.push(`<!---->Payee`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload5.out.push(`<!----> <!---->`);
                      Table_head($$payload5, {
                        children: prevent_snippet_stringification(($$payload6) => {
                          $$payload6.out.push(`<!---->Category`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload5.out.push(`<!----> <!---->`);
                      Table_head($$payload5, {
                        children: prevent_snippet_stringification(($$payload6) => {
                          $$payload6.out.push(`<!---->Status`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload5.out.push(`<!---->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload4.out.push(`<!---->`);
                }),
                $$slots: { default: true }
              });
              $$payload3.out.push(`<!----> <!---->`);
              Table_body($$payload3, {
                children: prevent_snippet_stringification(($$payload4) => {
                  const each_array_1 = ensure_array_like(simpleFormatted);
                  if (each_array_1.length !== 0) {
                    $$payload4.out.push("<!--[-->");
                    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                      let transaction = each_array_1[$$index_1];
                      $$payload4.out.push(`<!---->`);
                      Table_row($$payload4, {
                        children: prevent_snippet_stringification(($$payload5) => {
                          $$payload5.out.push(`<!---->`);
                          Table_cell($$payload5, {
                            children: prevent_snippet_stringification(($$payload6) => {
                              $$payload6.out.push(`<!---->${escape_html(new Date(transaction.date.toString()).toLocaleDateString())}`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload5.out.push(`<!----> <!---->`);
                          Table_cell($$payload5, {
                            class: "font-mono",
                            children: prevent_snippet_stringification(($$payload6) => {
                              $$payload6.out.push(`<!---->$${escape_html(transaction.amount?.toFixed(2) || "0.00")}`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload5.out.push(`<!----> <!---->`);
                          Table_cell($$payload5, {
                            children: prevent_snippet_stringification(($$payload6) => {
                              $$payload6.out.push(`<!---->${escape_html(transaction.notes || "-")}`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload5.out.push(`<!----> <!---->`);
                          Table_cell($$payload5, {
                            children: prevent_snippet_stringification(($$payload6) => {
                              $$payload6.out.push(`<!---->${escape_html(transaction.payee?.name || "-")}`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload5.out.push(`<!----> <!---->`);
                          Table_cell($$payload5, {
                            children: prevent_snippet_stringification(($$payload6) => {
                              $$payload6.out.push(`<!---->${escape_html(transaction.category?.name || "-")}`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload5.out.push(`<!----> <!---->`);
                          Table_cell($$payload5, {
                            children: prevent_snippet_stringification(($$payload6) => {
                              $$payload6.out.push(`<span${attr_class(`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${stringify(transaction.status === "cleared" ? "bg-green-100 text-green-800" : transaction.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800")}`)}>`);
                              push_element($$payload6, "span", 206, 20);
                              $$payload6.out.push(`${escape_html(transaction.status || "pending")}</span>`);
                              pop_element();
                            }),
                            $$slots: { default: true }
                          });
                          $$payload5.out.push(`<!---->`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload4.out.push(`<!---->`);
                    }
                  } else {
                    $$payload4.out.push("<!--[!-->");
                    $$payload4.out.push(`<!---->`);
                    Table_row($$payload4, {
                      children: prevent_snippet_stringification(($$payload5) => {
                        $$payload5.out.push(`<!---->`);
                        Table_cell($$payload5, {
                          colspan: 6,
                          class: "text-center text-muted-foreground py-8",
                          children: prevent_snippet_stringification(($$payload6) => {
                            $$payload6.out.push(`<!---->${escape_html(filters.searchQuery ? `No transactions found matching "${filters.searchQuery}"` : "No transactions found")}`);
                          }),
                          $$slots: { default: true }
                        });
                        $$payload5.out.push(`<!---->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload4.out.push(`<!---->`);
                  }
                  $$payload4.out.push(`<!--]-->`);
                }),
                $$slots: { default: true }
              });
              $$payload3.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          });
          $$payload2.out.push(`<!----></div>`);
          pop_element();
        }
        $$payload2.out.push(`<!--]--> `);
        if (serverAccountState && serverAccountState.pagination.totalPages > 1) {
          $$payload2.out.push("<!--[-->");
          Server_data_table_pagination($$payload2, { accountState: serverAccountState, accountId });
        } else {
          $$payload2.out.push("<!--[!-->");
          if (pagination.totalPages > 1) {
            $$payload2.out.push("<!--[-->");
            $$payload2.out.push(`<div class="flex items-center justify-between">`);
            push_element($$payload2, "div", 234, 8);
            $$payload2.out.push(`<div class="text-sm text-muted-foreground">`);
            push_element($$payload2, "div", 235, 10);
            $$payload2.out.push(`Showing ${escape_html(pagination.page * pagination.pageSize + 1)} to ${escape_html(Math.min((pagination.page + 1) * pagination.pageSize, pagination.totalCount))} of ${escape_html(pagination.totalCount)} transactions</div>`);
            pop_element();
            $$payload2.out.push(` <div class="flex items-center space-x-2">`);
            push_element($$payload2, "div", 238, 10);
            Button($$payload2, {
              variant: "outline",
              size: "sm",
              onclick: () => {
                pagination.page = Math.max(0, pagination.page - 1);
                loadData();
              },
              disabled: pagination.page === 0,
              children: prevent_snippet_stringification(($$payload3) => {
                Chevron_left($$payload3, { class: "h-4 w-4" });
                $$payload3.out.push(`<!----> Previous`);
              }),
              $$slots: { default: true }
            });
            $$payload2.out.push(`<!----> <div class="flex items-center space-x-1">`);
            push_element($$payload2, "div", 251, 12);
            $$payload2.out.push(`<span class="text-sm">`);
            push_element($$payload2, "span", 252, 14);
            $$payload2.out.push(`Page ${escape_html(pagination.page + 1)} of ${escape_html(pagination.totalPages)}</span>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
            $$payload2.out.push(` `);
            Button($$payload2, {
              variant: "outline",
              size: "sm",
              onclick: () => {
                pagination.page = Math.min(pagination.totalPages - 1, pagination.page + 1);
                loadData();
              },
              disabled: pagination.page >= pagination.totalPages - 1,
              children: prevent_snippet_stringification(($$payload3) => {
                $$payload3.out.push(`<!---->Next `);
                Chevron_right($$payload3, { class: "h-4 w-4" });
                $$payload3.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload2.out.push(`<!----></div>`);
            pop_element();
            $$payload2.out.push(`</div>`);
            pop_element();
          } else {
            $$payload2.out.push("<!--[!-->");
          }
          $$payload2.out.push(`<!--]-->`);
        }
        $$payload2.out.push(`<!--]--></div>`);
        pop_element();
      }
      $$payload2.out.push(`<!--]-->`);
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { filters, pagination, table });
  pop();
}
Transaction_table_container.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const analyticsTypes = [
  {
    id: "monthly-spending",
    title: "Monthly Spending Trends",
    description: "Track spending patterns over time",
    icon: Trending_up,
    category: "Time-Based"
  },
  {
    id: "income-vs-expenses",
    title: "Income vs Expenses",
    description: "Compare monthly income and expenses",
    icon: Chart_bar,
    category: "Time-Based"
  },
  {
    id: "cash-flow",
    title: "Cash Flow Timeline",
    description: "Account balance changes over time",
    icon: Activity,
    category: "Time-Based"
  },
  {
    id: "category-spending",
    title: "Spending by Category",
    description: "Distribution of expenses by category",
    icon: Chart_pie,
    category: "Category Analysis"
  }
];
function createMonthlySpendingProcessor(transactions) {
  let processMonthlySpending = [];
  return {
    get data() {
      return processMonthlySpending;
    }
  };
}
function createIncomeVsExpensesProcessor(transactions) {
  let processIncomeVsExpenses = [];
  return {
    get data() {
      return processIncomeVsExpenses;
    }
  };
}
function createCategorySpendingProcessor(transactions) {
  let processCategorySpending = [];
  return {
    get data() {
      return processCategorySpending;
    }
  };
}
function createTopPayeesProcessor(transactions) {
  let processTopPayees = [];
  return {
    get data() {
      return processTopPayees;
    }
  };
}
function createCashFlowProcessor(transactions) {
  let processCashFlow = [];
  return {
    get data() {
      return processCashFlow;
    }
  };
}
Cash_flow_chart[FILENAME] = "src/routes/accounts/[id]/(components)/(charts)/cash-flow-chart.svelte";
function Cash_flow_chart($$payload, $$props) {
  push(Cash_flow_chart);
  let { transactions } = $$props;
  const cashFlowProcessor = createCashFlowProcessor();
  const chartData = transformData(cashFlowProcessor.data, {
    x: (item) => dateValueToJSDate(item.month),
    // Convert CalendarDate to JS Date
    y: "cashFlow"
    // Use the net cash flow value
  });
  const availableChartTypes = ["area", "bar", "line", "scatter"];
  const cashFlowTrend = () => {
    const totalCashFlow = chartData.reduce((sum, item) => sum + item.y, 0);
    return totalCashFlow >= 0 ? "positive" : "negative";
  };
  const chartColors2 = () => {
    const financialColors = colorUtils.getFinancialColors();
    return cashFlowTrend() === "positive" ? [financialColors.positive] : (
      // Green for positive cash flow
      [financialColors.negative]
    );
  };
  const chartDomains = (() => {
    if (chartData.length === 0) {
      return { xDomain: void 0, yDomain: void 0 };
    }
    const xExtent = extent(chartData, (d) => d.x);
    const yExtent = extent(chartData, (d) => d.y);
    const timeBuffer = 7 * 24 * 60 * 60 * 1e3;
    const xDomain = [
      new Date(xExtent[0].getTime() - timeBuffer),
      new Date(xExtent[1].getTime() + timeBuffer)
    ];
    const yRange = Math.abs(yExtent[1] - yExtent[0]);
    const yBuffer = Math.max(yRange * 0.05, 100);
    const yDomain = [yExtent[0] - yBuffer, yExtent[1] + yBuffer];
    return { xDomain, yDomain };
  })();
  if (chartData.length > 0) {
    $$payload.out.push("<!--[-->");
    Unified_chart($$payload, {
      data: chartData,
      type: "area",
      styling: {
        colors: chartColors2(),
        dimensions: { padding: { top: 20, right: 30, bottom: 60, left: 70 } }
      },
      axes: {
        x: { title: "Month", rotateLabels: true },
        y: {
          title: "Net Cash Flow",
          nice: false,
          domain: chartDomains.yDomain
        }
      },
      annotations: {
        type: "both",
        labels: { show: true, placement: "outside" },
        rules: {
          show: true,
          values: [0],
          strokeDasharray: "4 4",
          class: "stroke-muted-foreground/50"
        }
      },
      timeFiltering: { enabled: true, field: "x" },
      controls: {
        show: true,
        availableTypes: availableChartTypes,
        allowTypeChange: true,
        allowPeriodChange: true
      },
      class: "h-full w-full"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="flex items-center justify-center h-full text-muted-foreground">`);
    push_element($$payload, "div", 120, 2);
    $$payload.out.push(`No cash flow data available</div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Cash_flow_chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Category_spending_chart[FILENAME] = "src/routes/accounts/[id]/(components)/(charts)/category-spending-chart.svelte";
function Category_spending_chart($$payload, $$props) {
  push(Category_spending_chart);
  let { transactions } = $$props;
  const categoryProcessor = (() => {
    if (!transactions || transactions.length === 0) return { data: [] };
    return createCategorySpendingProcessor();
  })();
  const chartData = (() => {
    if (!categoryProcessor.data || categoryProcessor.data.length === 0) return [];
    return transformData(categoryProcessor.data, { x: "category", y: "amount" });
  })();
  const transactionsWithDates = (() => {
    if (!transactions || transactions.length === 0) return [];
    return transactions.map((t) => ({
      ...t,
      date_js: dateValueToJSDate(t.date)
      // Add JS Date for filtering
    }));
  })();
  const processCategoriesFromTransactions = (filteredTransactions) => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      return [];
    }
    const categoryData = {};
    filteredTransactions.forEach((t) => {
      if (t.amount < 0 && t.category?.name) {
        const category = t.category.name;
        categoryData[category] = (categoryData[category] || 0) + Math.abs(t.amount);
      }
    });
    const processedData = Object.entries(categoryData).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
    return transformData(processedData, { x: "category", y: "amount" });
  };
  const availableChartTypes = ["pie", "arc", "bar", "scatter"];
  const chartColors2 = (() => {
    return chartData.map(
      (_, index) => colorUtils.getChartColor(index % 8)
      // Cycle through color palette
    );
  })();
  const averageSpending = (() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + (typeof d.y === "number" ? d.y : 0), 0);
    return Math.round(total / chartData.length);
  })();
  if (chartData.length > 0) {
    $$payload.out.push("<!--[-->");
    Unified_chart($$payload, {
      data: chartData,
      type: "pie",
      styling: {
        colors: chartColors2,
        dimensions: { padding: { top: 20, right: 30, bottom: 60, left: 70 } }
      },
      axes: {
        x: { title: "Category", rotateLabels: true },
        y: { title: "Spending Amount", nice: true }
      },
      timeFiltering: {
        enabled: true,
        field: "date",
        sourceData: transactionsWithDates,
        sourceProcessor: processCategoriesFromTransactions,
        sourceDateField: "date_js"
      },
      controls: {
        show: true,
        availableTypes: availableChartTypes,
        allowTypeChange: true,
        allowPeriodChange: true
      },
      annotations: {
        type: "both",
        labels: {
          show: true,
          format: chartFormatters.currencySmart,
          position: "auto"
        },
        rules: {
          show: true,
          values: [averageSpending],
          orientation: "horizontal",
          class: "stroke-primary/60",
          strokeWidth: 2,
          strokeDasharray: "4 2"
        }
      },
      class: "h-full w-full"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="flex items-center justify-center h-full text-muted-foreground">`);
    push_element($$payload, "div", 137, 2);
    $$payload.out.push(`No category spending data available</div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Category_spending_chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Income_vs_expenses_chart[FILENAME] = "src/routes/accounts/[id]/(components)/(charts)/income-vs-expenses-chart.svelte";
function Income_vs_expenses_chart($$payload, $$props) {
  push(Income_vs_expenses_chart);
  let { transactions } = $$props;
  const incomeVsExpensesProcessor = createIncomeVsExpensesProcessor();
  const processedData = incomeVsExpensesProcessor.data;
  const transformedData = transformIncomeVsExpensesData(processedData, {
    x: (item) => dateValueToJSDate(item.month),
    income: "income",
    expenses: "expenses"
  });
  const chartData = {
    combined: transformedData.combined,
    income: transformedData.income,
    expenses: transformedData.expenses
  };
  const availablePeriods = transformedData.combined.length === 0 ? [] : generatePeriodOptions(transformedData.combined, "x");
  const availableChartTypes = ["bar", "line", "area", "pie"];
  if (transformedData.combined.length > 0) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<div class="h-full">`);
    push_element($$payload, "div", 49, 2);
    Unified_chart($$payload, {
      data: chartData.combined,
      type: "bar",
      legendTitle: "Financial Overview",
      styling: {
        colors: [colorUtils.getChartColor(1), colorUtils.getChartColor(2)],
        legend: {
          show: true,
          position: "top",
          spacing: "wide",
          swatchSize: "medium"
        }
      },
      axes: {
        x: { title: "Month", rotateLabels: true },
        y: { title: "Amount ($)", nice: true }
      },
      interactions: {
        tooltip: { enabled: true, format: "currency", showTotal: true }
      },
      yFields: ["income", "expenses"],
      yFieldLabels: ["Income", "Expenses"],
      suppressDuplicateWarnings: true,
      viewModeData: {
        combined: chartData.combined,
        income: chartData.income,
        expenses: chartData.expenses
      },
      timeFiltering: { enabled: availablePeriods.length > 0, field: "x" },
      controls: {
        show: true,
        availableTypes: availableChartTypes,
        allowTypeChange: true,
        allowPeriodChange: availablePeriods.length > 0,
        allowColorChange: true,
        allowCurveChange: true,
        allowViewModeChange: true,
        availableViewModes: ["combined", "side-by-side"]
      },
      class: "h-full w-full"
    });
    $$payload.out.push(`<!----></div>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="flex items-center justify-center h-full text-muted-foreground">`);
    push_element($$payload, "div", 104, 2);
    $$payload.out.push(`No income/expense data available</div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Income_vs_expenses_chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Monthly_spending_chart[FILENAME] = "src/routes/accounts/[id]/(components)/(charts)/monthly-spending-chart.svelte";
function Monthly_spending_chart($$payload, $$props) {
  push(Monthly_spending_chart);
  let { transactions } = $$props;
  const monthlySpendingProcessor = createMonthlySpendingProcessor();
  const chartData = transformData(monthlySpendingProcessor.data, {
    x: (item) => dateValueToJSDate(item.month),
    // Convert CalendarDate to JS Date
    y: "amount"
  });
  const availableChartTypes = ["area", "bar", "line", "scatter"];
  if (chartData.length > 0) {
    $$payload.out.push("<!--[-->");
    Unified_chart($$payload, {
      data: chartData,
      type: "line",
      styling: { colors: "auto" },
      axes: {
        x: { title: "Month", rotateLabels: true },
        y: { title: "Spending Amount", nice: true }
      },
      annotations: { type: "labels", labels: { show: true, placement: "outside" } },
      timeFiltering: { enabled: true, field: "x" },
      interactions: { tooltip: { enabled: true, format: "currency" } },
      controls: {
        show: true,
        availableTypes: availableChartTypes,
        allowTypeChange: true,
        allowPeriodChange: true,
        allowColorChange: true,
        allowCurveChange: true
      },
      class: "h-full w-full"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="flex items-center justify-center h-full text-muted-foreground">`);
    push_element($$payload, "div", 84, 2);
    $$payload.out.push(`No spending data available</div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Monthly_spending_chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Placeholder_chart[FILENAME] = "src/routes/accounts/[id]/(components)/(charts)/placeholder-chart.svelte";
function Placeholder_chart($$payload, $$props) {
  push(Placeholder_chart);
  let { title, description, icon } = $$props;
  $$payload.out.push(`<div class="flex items-center justify-center h-full text-muted-foreground">`);
  push_element($$payload, "div", 11, 0);
  $$payload.out.push(`<div class="text-center">`);
  push_element($$payload, "div", 12, 2);
  $$payload.out.push(`<icon class="h-12 w-12 mx-auto mb-4 opacity-50">`);
  push_element($$payload, "icon", 13, 4);
  $$payload.out.push(`</icon>`);
  pop_element();
  $$payload.out.push(` <h3 class="font-semibold mb-2">`);
  push_element($$payload, "h3", 14, 4);
  $$payload.out.push(`${escape_html(title)}</h3>`);
  pop_element();
  $$payload.out.push(` <p>`);
  push_element($$payload, "p", 15, 4);
  $$payload.out.push(`${escape_html(description)}</p>`);
  pop_element();
  $$payload.out.push(` <p class="mt-2 text-sm">`);
  push_element($$payload, "p", 16, 4);
  $$payload.out.push(`Chart implementation coming soon...</p>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  pop();
}
Placeholder_chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Top_payees_chart[FILENAME] = "src/routes/accounts/[id]/(components)/(charts)/top-payees-chart.svelte";
function Top_payees_chart($$payload, $$props) {
  push(Top_payees_chart);
  let { transactions } = $$props;
  const topPayeesProcessor = createTopPayeesProcessor();
  const chartData = transformData(topPayeesProcessor.data, { x: "payee", y: "total" });
  const averagePayeeAmount = () => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + (typeof d.y === "number" ? d.y : 0), 0);
    return Math.round(total / chartData.length);
  };
  if (chartData.length > 0) {
    $$payload.out.push("<!--[-->");
    Unified_chart($$payload, {
      data: chartData,
      type: "bar",
      styling: { colors: "auto" },
      axes: {
        x: { title: "Payee", rotateLabels: true },
        y: { title: "Total Amount", nice: true }
      },
      controls: {
        show: true,
        availableTypes: ["bar", "line", "area"],
        allowTypeChange: true,
        allowPeriodChange: false
      },
      annotations: {
        type: "labels",
        labels: {
          show: true,
          format: chartFormatters.currencySmart,
          position: "auto",
          class: "fill-foreground text-xs font-medium"
        },
        rules: { show: false, values: [averagePayeeAmount()] }
      },
      class: "h-full w-full"
    });
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div class="flex items-center justify-center h-full text-muted-foreground">`);
    push_element($$payload, "div", 71, 2);
    $$payload.out.push(`No payee data available</div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
Top_payees_chart.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Analytics_dashboard[FILENAME] = "src/routes/accounts/[id]/(components)/analytics-dashboard.svelte";
function Analytics_dashboard($$payload, $$props) {
  push(Analytics_dashboard);
  let { transactions, accountId } = $$props;
  let selectedAnalytic = "monthly-spending";
  const currentAnalytic = analyticsTypes.find((a) => a.id === selectedAnalytic);
  const each_array = ensure_array_like(analyticsTypes);
  $$payload.out.push(`<div class="space-y-6">`);
  push_element($$payload, "div", 25, 0);
  $$payload.out.push(`<div class="flex flex-col gap-4">`);
  push_element($$payload, "div", 27, 2);
  $$payload.out.push(`<div>`);
  push_element($$payload, "div", 28, 4);
  $$payload.out.push(`<h2 class="text-2xl font-bold tracking-tight">`);
  push_element($$payload, "h2", 29, 6);
  $$payload.out.push(`Analytics</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 30, 6);
  $$payload.out.push(`Detailed analysis of your spending patterns and financial trends</p>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(` <div class="grid grid-cols-2 md:grid-cols-4 gap-3">`);
  push_element($$payload, "div", 36, 4);
  $$payload.out.push(`<!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let analytic = each_array[$$index];
    Button($$payload, {
      variant: selectedAnalytic === analytic.id ? "default" : "outline",
      size: "sm",
      class: "h-auto p-3 flex-col items-start gap-2",
      onclick: () => selectedAnalytic = analytic.id,
      children: prevent_snippet_stringification(($$payload2) => {
        $$payload2.out.push(`<div class="flex items-center gap-2 w-full">`);
        push_element($$payload2, "div", 44, 10);
        $$payload2.out.push(`<!---->`);
        analytic.icon($$payload2, { class: "h-4 w-4" });
        $$payload2.out.push(`<!----> <span class="text-xs font-medium">`);
        push_element($$payload2, "span", 46, 12);
        $$payload2.out.push(`${escape_html(analytic.title)}</span>`);
        pop_element();
        $$payload2.out.push(`</div>`);
        pop_element();
        $$payload2.out.push(` <span class="text-xs opacity-75 text-left">`);
        push_element($$payload2, "span", 48, 10);
        $$payload2.out.push(`${escape_html(analytic.description)}</span>`);
        pop_element();
      }),
      $$slots: { default: true }
    });
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  $$payload.out.push(` `);
  if (currentAnalytic) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<!---->`);
    Card($$payload, {
      children: prevent_snippet_stringification(($$payload2) => {
        $$payload2.out.push(`<!---->`);
        Card_header($$payload2, {
          children: prevent_snippet_stringification(($$payload3) => {
            $$payload3.out.push(`<div class="flex items-center gap-2">`);
            push_element($$payload3, "div", 58, 8);
            $$payload3.out.push(`<!---->`);
            currentAnalytic.icon($$payload3, { class: "h-5 w-5" });
            $$payload3.out.push(`<!----> <!---->`);
            Card_title($$payload3, {
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->${escape_html(currentAnalytic.title)}`);
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!----></div>`);
            pop_element();
            $$payload3.out.push(` <!---->`);
            Card_description($$payload3, {
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->${escape_html(currentAnalytic.description)}`);
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload2.out.push(`<!----> <!---->`);
        Card_content($$payload2, {
          class: "p-6",
          children: prevent_snippet_stringification(($$payload3) => {
            $$payload3.out.push(`<div class="h-[400px] w-full">`);
            push_element($$payload3, "div", 65, 8);
            if (selectedAnalytic === "monthly-spending") {
              $$payload3.out.push("<!--[-->");
              Monthly_spending_chart($$payload3, { transactions });
            } else {
              $$payload3.out.push("<!--[!-->");
              if (selectedAnalytic === "income-vs-expenses") {
                $$payload3.out.push("<!--[-->");
                Income_vs_expenses_chart($$payload3, { transactions });
              } else {
                $$payload3.out.push("<!--[!-->");
                if (selectedAnalytic === "cash-flow") {
                  $$payload3.out.push("<!--[-->");
                  Cash_flow_chart($$payload3, { transactions });
                } else {
                  $$payload3.out.push("<!--[!-->");
                  if (selectedAnalytic === "category-spending") {
                    $$payload3.out.push("<!--[-->");
                    Category_spending_chart($$payload3, { transactions });
                  } else {
                    $$payload3.out.push("<!--[!-->");
                    if (selectedAnalytic === "top-payees") {
                      $$payload3.out.push("<!--[-->");
                      Top_payees_chart($$payload3, { transactions });
                    } else {
                      $$payload3.out.push("<!--[!-->");
                      Placeholder_chart($$payload3, {
                        title: currentAnalytic?.title || "Coming Soon",
                        description: currentAnalytic?.description || "This chart is not yet implemented",
                        icon: currentAnalytic?.icon
                      });
                    }
                    $$payload3.out.push(`<!--]-->`);
                  }
                  $$payload3.out.push(`<!--]-->`);
                }
                $$payload3.out.push(`<!--]-->`);
              }
              $$payload3.out.push(`<!--]-->`);
            }
            $$payload3.out.push(`<!--]--></div>`);
            pop_element();
          }),
          $$slots: { default: true }
        });
        $$payload2.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  pop();
}
Analytics_dashboard.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Editable_date_cell[FILENAME] = "src/routes/accounts/[id]/(components)/(cells)/editable-date-cell.svelte";
function Editable_date_cell($$payload, $$props) {
  push(Editable_date_cell);
  let { value = void 0, onUpdateValue } = $$props;
  const handleSubmit = (new_value) => {
    if (onUpdateValue) {
      onUpdateValue(new_value);
    }
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Date_input($$payload2, {
      handleSubmit,
      get value() {
        return value;
      },
      set value($$value) {
        value = $$value;
        $$settled = false;
      }
    });
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value });
  pop();
}
Editable_date_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Editable_entity_cell[FILENAME] = "src/routes/accounts/[id]/(components)/(cells)/editable-entity-cell.svelte";
function Editable_entity_cell($$payload, $$props) {
  push(Editable_entity_cell);
  let {
    value,
    onUpdateValue,
    entityLabel,
    entities,
    management,
    icon
  } = $$props;
  const handleSubmit = (entity) => {
    onUpdateValue(entity?.id);
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Entity_input($$payload2, {
      icon,
      handleSubmit,
      management,
      get entityLabel() {
        return entityLabel;
      },
      set entityLabel($$value) {
        entityLabel = $$value;
        $$settled = false;
      },
      get value() {
        return value;
      },
      set value($$value) {
        value = $$value;
        $$settled = false;
      },
      get entities() {
        return entities;
      },
      set entities($$value) {
        entities = $$value;
        $$settled = false;
      }
    });
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Editable_entity_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_editable_cell[FILENAME] = "src/routes/accounts/[id]/(components)/(cells)/data-table-editable-cell.svelte";
function Data_table_editable_cell($$payload, $$props) {
  push(Data_table_editable_cell);
  let { value, onUpdateValue } = $$props;
  let open = false;
  let newValue = void 0;
  const handleSubmit = () => {
    open = false;
    value = newValue;
    onUpdateValue(value);
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Root($$payload2, {
      onOpenChange: () => {
        newValue = "";
      },
      get open() {
        return open;
      },
      set open($$value) {
        open = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let child = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Button($$payload4, spread_props([
              props,
              {
                variant: "outline",
                class: cn("block w-48 justify-start overflow-hidden text-ellipsis whitespace-nowrap text-left font-normal", !value && "text-muted-foreground"),
                children: prevent_snippet_stringification(($$payload5) => {
                  Square_pen($$payload5, { class: "mr-1 inline-block size-4 align-top" });
                  $$payload5.out.push(`<!----> ${escape_html(value)}`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Popover_trigger($$payload3, { child, $$slots: { child: true } });
        }
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "grid w-auto gap-2 p-2",
          align: "start",
          children: prevent_snippet_stringification(($$payload4) => {
            Textarea($$payload4, {
              placeholder: "",
              value: value?.toString(),
              onchange: (e) => newValue = e.target.value
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              onclick: handleSubmit,
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Save`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Data_table_editable_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
function useEditableCell(options) {
  const {
    initialValue,
    onSave,
    onCancel,
    validator: validator2 = () => true,
    formatter = (value) => String(value)
  } = options;
  let isEditing = false;
  let currentValue = initialValue;
  let originalValue = initialValue;
  const displayValue = formatter(currentValue);
  const hasChanges = currentValue !== originalValue;
  const isValid = validator2(currentValue);
  function startEdit() {
    isEditing = true;
    originalValue = currentValue;
  }
  function cancelEdit() {
    currentValue = originalValue;
    isEditing = false;
    if (onCancel) {
      onCancel();
    }
  }
  async function saveEdit() {
    if (!isValid) return;
    try {
      await onSave(currentValue);
      originalValue = currentValue;
      isEditing = false;
    } catch (error) {
      currentValue = originalValue;
      throw error;
    }
  }
  function updateValue(value) {
    currentValue = value;
  }
  return {
    get isEditing() {
      return isEditing;
    },
    get currentValue() {
      return currentValue;
    },
    get displayValue() {
      return displayValue;
    },
    get hasChanges() {
      return hasChanges;
    },
    get isValid() {
      return isValid;
    },
    startEdit,
    cancelEdit,
    saveEdit,
    updateValue
  };
}
Editable_numeric_cell[FILENAME] = "src/routes/accounts/[id]/(components)/(cells)/editable-numeric-cell.svelte";
function Editable_numeric_cell($$payload, $$props) {
  push(Editable_numeric_cell);
  let { value = void 0, onUpdateValue } = $$props;
  const cellState = useEditableCell({
    initialValue: value,
    onSave: async (newValue) => {
      value = newValue;
      onUpdateValue(newValue);
    },
    validator: (amount) => !isNaN(amount) && isFinite(amount),
    formatter: (amount) => currencyFormatter.format(amount)
  });
  let numericValue = cellState.currentValue;
  let open = false;
  function handleSubmit() {
    cellState.updateValue(numericValue);
    cellState.saveEdit();
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    Numeric_input($$payload2, {
      onSubmit: handleSubmit,
      get value() {
        return numericValue;
      },
      set value($$value) {
        numericValue = $$value;
        $$settled = false;
      },
      get open() {
        return open;
      },
      set open($$value) {
        open = $$value;
        $$settled = false;
      }
    });
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { value });
  pop();
}
Editable_numeric_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Delete_transaction_dialog[FILENAME] = "src/routes/accounts/[id]/(dialogs)/delete-transaction-dialog.svelte";
function Delete_transaction_dialog($$payload, $$props) {
  push(Delete_transaction_dialog);
  let { transactions, dialogOpen = void 0, onDelete } = $$props;
  let account = CurrentAccountState.get();
  let confirmDeleteTransaction = async () => {
    if (transactions) {
      account?.deleteTransactions(transactions);
    }
    if (onDelete) {
      onDelete();
    }
    dialogOpen = false;
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Root$2($$payload2, {
      get open() {
        return dialogOpen;
      },
      set open($$value) {
        dialogOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Alert_dialog_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Alert_dialog_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Are you absolutely sure?`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->This action cannot be undone. This will permanently delete this transaction.`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Alert_dialog_footer($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_cancel($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Cancel`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_action($$payload5, {
                  onclick: confirmDeleteTransaction,
                  class: buttonVariants({ variant: "destructive" }),
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Continue`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { dialogOpen });
  pop();
}
Delete_transaction_dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_actions[FILENAME] = "src/routes/accounts/[id]/(components)/data-table-actions.svelte";
function Data_table_actions($$payload, $$props) {
  push(Data_table_actions);
  let { id } = $$props;
  let deleteOpen = false;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Root$5($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let child = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Button($$payload4, spread_props([
              { variant: "ghost", size: "icon", class: "relative size-8 p-0" },
              props,
              {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<span class="sr-only">`);
                  push_element($$payload5, "span", 20, 8);
                  $$payload5.out.push(`Open menu</span>`);
                  pop_element();
                  $$payload5.out.push(` `);
                  Ellipsis($$payload5, { class: "size-4" });
                  $$payload5.out.push(`<!---->`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Dropdown_menu_trigger($$payload3, { child, $$slots: { child: true } });
        }
        $$payload3.out.push(`<!----> <!---->`);
        Dropdown_menu_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Dropdown_menu_group($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Dropdown_menu_item($$payload5, {
                  onSelect: () => deleteOpen = true,
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Delete`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    if (deleteOpen) {
      $$payload2.out.push("<!--[-->");
      Delete_transaction_dialog($$payload2, {
        transactions: [id],
        get dialogOpen() {
          return deleteOpen;
        },
        set dialogOpen($$value) {
          deleteOpen = $$value;
          $$settled = false;
        }
      });
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]-->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Data_table_actions.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_editable_status_cell[FILENAME] = "src/routes/accounts/[id]/(components)/(cells)/data-table-editable-status-cell.svelte";
function Data_table_editable_status_cell($$payload, $$props) {
  push(Data_table_editable_status_cell);
  let { value = void 0, onUpdateValue } = $$props;
  const handleSubmit = (new_value) => {
    if (onUpdateValue) {
      onUpdateValue(new_value);
    }
  };
  if (value === "cleared" || value === "pending") {
    $$payload.out.push("<!--[-->");
    Button($$payload, {
      onclick: () => handleSubmit(value == "cleared" ? "pending" : "cleared"),
      variant: "ghost",
      class: "[&_svg]:size-auto",
      children: prevent_snippet_stringification(($$payload2) => {
        if (value === "cleared") {
          $$payload2.out.push("<!--[-->");
          Square_check($$payload2, {
            class: cn(value === "cleared" ? "fill-primary" : "fill-foreground", "text-white"),
            strokeWidth: 1.5,
            size: 22
          });
        } else {
          $$payload2.out.push("<!--[!-->");
          Square($$payload2, { strokeWidth: 1.5, size: 20, class: "text-gray-400" });
        }
        $$payload2.out.push(`<!--]-->`);
      }),
      $$slots: { default: true }
    });
  } else {
    $$payload.out.push("<!--[!-->");
    Calendar_clock($$payload, { color: "gray", size: "14" });
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { value });
  pop();
}
Data_table_editable_status_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Manage_payee_form[FILENAME] = "src/routes/accounts/[id]/(components)/manage-payee-form.svelte";
function Manage_payee_form($$payload, $$props) {
  push(Manage_payee_form);
  var $$store_subs;
  let { id, onDelete, onSave } = $$props;
  const { data: { managePayeeForm } } = page;
  const form = superForm(managePayeeForm || { name: "", notes: "" }, {
    id: "payee-form",
    validators: zodClient(superformInsertPayeeSchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          onSave(result.data["entity"], (id ?? 0) === 0);
        }
      }
    }
  });
  const { form: formData, enhance } = form;
  if (id) {
    const payee = PayeesState.get().getById(id);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = payee.name);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).notes = payee.notes);
  }
  let alertDialogOpen = false;
  const deletePayee = async (id2) => {
    alertDialogOpen = false;
    if (onDelete) {
      onDelete(id2);
    }
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<form method="post" action="/payees?/save-payee">`);
    push_element($$payload2, "form", 57, 0);
    if (id) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<input type="hidden" name="id"${attr("value", id)}/>`);
      push_element($$payload2, "input", 59, 4);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> <!---->`);
    Form_field($$payload2, {
      form,
      name: "name",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Name`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Input($$payload4, spread_props([
              props,
              {
                get value() {
                  return store_get($$store_subs ??= {}, "$formData", formData).name;
                },
                set value($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!---->`);
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "notes",
      class: "col-span-full",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Notes`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Textarea($$payload4, spread_props([
              props,
              {
                get value() {
                  return store_get($$store_subs ??= {}, "$formData", formData).notes;
                },
                set value($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).notes = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!---->`);
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_button($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->save`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    if (id) {
      $$payload2.out.push("<!--[-->");
      Button($$payload2, {
        variant: "destructive",
        onclick: () => alertDialogOpen = true,
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->delete`);
        }),
        $$slots: { default: true }
      });
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></form>`);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Root$2($$payload2, {
      get open() {
        return alertDialogOpen;
      },
      set open($$value) {
        alertDialogOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Alert_dialog_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Alert_dialog_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Are you absolutely sure?`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->This action cannot be undone. This will permanently delete this payee.`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Alert_dialog_footer($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_cancel($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Cancel`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_action($$payload5, {
                  onclick: () => deletePayee(id),
                  class: buttonVariants({ variant: "destructive" }),
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Continue`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
Manage_payee_form.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Manage_category_form[FILENAME] = "src/routes/accounts/[id]/(components)/manage-category-form.svelte";
function Manage_category_form($$payload, $$props) {
  push(Manage_category_form);
  var $$store_subs;
  let { id, onDelete, onSave } = $$props;
  const pageData = page.data["manageCategoryForm"];
  const form = superForm(pageData || { name: "", notes: "" }, {
    id: "category-form",
    validators: zodClient(superformInsertCategorySchema),
    onResult: async ({ result }) => {
      if (onSave) {
        if (result.type === "success" && result.data) {
          onSave(result.data["entity"], (id ?? 0) === 0);
        }
      }
    }
  });
  const { form: formData, enhance } = form;
  if (id) {
    const category = CategoriesState.get().getById(id);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = category.name);
    store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).notes = category.notes);
  }
  let alertDialogOpen = false;
  const deleteCategory = async (id2) => {
    alertDialogOpen = false;
    if (onDelete) {
      onDelete(id2);
    }
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<form method="post" action="/categories?/save-category">`);
    push_element($$payload2, "form", 56, 0);
    if (id) {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<input type="hidden" name="id"${attr("value", id)}/>`);
      push_element($$payload2, "input", 58, 4);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--> <!---->`);
    Form_field($$payload2, {
      form,
      name: "name",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Name`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Input($$payload4, spread_props([
              props,
              {
                get value() {
                  return store_get($$store_subs ??= {}, "$formData", formData).name;
                },
                set value($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).name = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!---->`);
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_field($$payload2, {
      form,
      name: "notes",
      class: "col-span-full",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let children = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            $$payload4.out.push(`<!---->`);
            Form_label($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Notes`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Textarea($$payload4, spread_props([
              props,
              {
                get value() {
                  return store_get($$store_subs ??= {}, "$formData", formData).notes;
                },
                set value($$value) {
                  store_mutate($$store_subs ??= {}, "$formData", formData, store_get($$store_subs ??= {}, "$formData", formData).notes = $$value);
                  $$settled = false;
                }
              }
            ]));
            $$payload4.out.push(`<!----> <!---->`);
            Form_field_errors($$payload4, {});
            $$payload4.out.push(`<!---->`);
          };
          prevent_snippet_stringification(children);
          Control($$payload3, { children });
        }
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Form_button($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->save`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    if (id) {
      $$payload2.out.push("<!--[-->");
      Button($$payload2, {
        variant: "destructive",
        onclick: () => alertDialogOpen = true,
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->delete`);
        }),
        $$slots: { default: true }
      });
    } else {
      $$payload2.out.push("<!--[!-->");
    }
    $$payload2.out.push(`<!--]--></form>`);
    pop_element();
    $$payload2.out.push(` <!---->`);
    Root$2($$payload2, {
      get open() {
        return alertDialogOpen;
      },
      set open($$value) {
        alertDialogOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Alert_dialog_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Alert_dialog_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Are you absolutely sure?`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->This action cannot be undone. This will permanently delete this category.`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!---->`);
            Alert_dialog_footer($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Alert_dialog_cancel($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Cancel`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Alert_dialog_action($$payload5, {
                  onclick: () => deleteCategory(id),
                  class: buttonVariants({ variant: "destructive" }),
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Continue`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  if ($$store_subs) unsubscribe_stores($$store_subs);
  pop();
}
Manage_category_form.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_faceted_filter_status[FILENAME] = "src/routes/accounts/[id]/(components)/(facets)/data-table-faceted-filter-status.svelte";
function Data_table_faceted_filter_status($$payload, $$props) {
  push(Data_table_faceted_filter_status);
  let { column } = $$props;
  const { data } = page;
  const account = data.account;
  const activeView = currentViews.get().activeView;
  const activeViewModel = activeView.view;
  const selectedValues = activeViewModel.getFilterValue(column.id);
  const statuses = [
    ...new SvelteSet(account.transactions.map((transaction) => transaction.status)).union(selectedValues)
  ];
  const allStatuses = Object.values(TransactionStatuses);
  const statusOptions = new SvelteMap(statuses?.map((status) => {
    return [
      status,
      { label: status, value: status, icon: Circle_user_round }
    ];
  }));
  const allStatusOptions = new SvelteMap(allStatuses?.map((status) => {
    return [
      status,
      { label: status, value: status, icon: Circle_user_round }
    ];
  }));
  Data_table_faceted_filter($$payload, {
    column,
    title: "Status",
    options: statusOptions,
    allOptions: allStatusOptions,
    allIcon: Users_round
  });
  pop();
}
Data_table_faceted_filter_status.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_faceted_filter_category[FILENAME] = "src/routes/accounts/[id]/(components)/(facets)/data-table-faceted-filter-category.svelte";
function Data_table_faceted_filter_category($$payload, $$props) {
  push(Data_table_faceted_filter_category);
  let { column } = $$props;
  const { data } = page;
  const account = data.account;
  const activeView = currentViews.get().activeView;
  const activeViewModel = activeView.view;
  const selectedValues = activeViewModel.getFilterValue(column.id);
  const categories = account.transactions.map((transaction) => transaction.category).concat(selectedValues);
  const allCategories = data.categories;
  const hasNullCategories = account.transactions.some((transaction) => transaction.categoryId === null);
  const categoryOptions = (() => {
    const options = new SvelteMap();
    if (hasNullCategories) {
      options.set("null", { label: "(None)", value: "null", icon: Square_mouse_pointer });
    }
    categories?.filter((category) => category.id !== void 0).forEach((category) => {
      options.set(category.id, {
        label: category.name || "",
        value: category.id + "",
        icon: Square_mouse_pointer
      });
    });
    return options;
  })();
  const allCategoryOptions = (() => {
    const options = new SvelteMap();
    if (hasNullCategories) {
      options.set("null", { label: "(None)", value: "null", icon: Square_mouse_pointer });
    }
    allCategories?.forEach((category) => {
      options.set(category.id, {
        label: category.name || "",
        value: category.id + "",
        icon: Square_mouse_pointer
      });
    });
    return options;
  })();
  Data_table_faceted_filter($$payload, {
    column,
    title: "Category",
    options: categoryOptions,
    allOptions: allCategoryOptions,
    allIcon: Square_mouse_pointer
  });
  pop();
}
Data_table_faceted_filter_category.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_faceted_filter_payee[FILENAME] = "src/routes/accounts/[id]/(components)/(facets)/data-table-faceted-filter-payee.svelte";
function Data_table_faceted_filter_payee($$payload, $$props) {
  push(Data_table_faceted_filter_payee);
  let { column } = $$props;
  const { data } = page;
  const account = data.account;
  const activeView = currentViews.get().activeView;
  const activeViewModel = activeView.view;
  const selectedValues = activeViewModel.getFilterValue(column.id);
  const payees = account.transactions.map((transaction) => transaction.payee).concat(selectedValues);
  const allPayees = data.payees;
  const hasNullPayees = account.transactions.some((transaction) => transaction.payeeId === null);
  const payeeOptions = (() => {
    const options = new SvelteMap();
    if (hasNullPayees) {
      options.set("null", { label: "(None)", value: "null", icon: Hand_coins });
    }
    payees?.filter((payee) => payee.id !== void 0).forEach((payee) => {
      options.set(payee.id, {
        label: payee.name || "",
        value: payee.id + "",
        icon: Hand_coins
      });
    });
    return options;
  })();
  const allPayeeOptions = (() => {
    const options = new SvelteMap();
    if (hasNullPayees) {
      options.set("null", { label: "(None)", value: "null", icon: Hand_coins });
    }
    allPayees?.forEach((payee) => {
      options.set(payee.id, {
        label: payee.name || "",
        value: payee.id + "",
        icon: Hand_coins
      });
    });
    return options;
  })();
  Data_table_faceted_filter($$payload, {
    column,
    title: "Payee",
    options: payeeOptions,
    allOptions: allPayeeOptions,
    allIcon: Hand_coins
  });
  pop();
}
Data_table_faceted_filter_payee.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Advanced_date_dialog[FILENAME] = "src/lib/components/dialogs/advanced-date-dialog.svelte";
function Advanced_date_dialog($$payload, $$props) {
  push(Advanced_date_dialog);
  let { dialogOpen = void 0, onSubmit } = $$props;
  const _onSubmit = (new_value) => {
    onSubmit(new_value);
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    var bind_get = () => dialogOpen;
    var bind_set = (newOpen) => dialogOpen = newOpen;
    $$payload2.out.push(`<!---->`);
    Root$1($$payload2, {
      get open() {
        return bind_get();
      },
      set open($$value) {
        bind_set($$value);
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Dialog_content($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<!---->`);
            Dialog_header($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Dialog_title($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    $$payload6.out.push(`<!---->Custom Date`);
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!----> <!---->`);
                Dialog_description($$payload5, {
                  children: prevent_snippet_stringification(($$payload6) => {
                    Advanced_date_input($$payload6, { onSubmit: _onSubmit });
                  }),
                  $$slots: { default: true }
                });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { dialogOpen });
  pop();
}
Advanced_date_dialog.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_faceted_filter_date[FILENAME] = "src/routes/accounts/[id]/(components)/(facets)/data-table-faceted-filter-date.svelte";
function Data_table_faceted_filter_date($$payload, $$props) {
  push(Data_table_faceted_filter_date);
  let { column } = $$props;
  let dateFiltersState = DateFiltersState.get();
  const allDates = dateFiltersState?.dateFilters;
  const faceted = column.getFacetedUniqueValues();
  const activeView = currentViews.get().activeView;
  const activeViewModel = activeView.view;
  const selectedValues = activeViewModel.getFilterValue(column.id);
  const allOptions = (() => {
    const options2 = new SvelteMap();
    if (allDates) {
      for (const date of allDates) {
        options2.set(date.value, date);
      }
    }
    if (selectedValues && selectedValues.size > 0) {
      for (const selectedValue of selectedValues) {
        if (!options2.has(selectedValue) && typeof selectedValue === "string") {
          options2.set(selectedValue, {
            value: selectedValue,
            label: selectedValue,
            // Could be improved with better formatting
            icon: void 0
          });
        }
      }
    }
    return options2;
  })();
  const options = new SvelteMap(allDates?.filter((date) => faceted.has(date.value)).map((date) => [date.value, date]));
  let dialogOpen = false;
  function customValueSnippet($$payload2) {
    validate_snippet_args($$payload2);
    $$payload2.out.push(`<!---->`);
    Command_item($$payload2, {
      onSelect: () => dialogOpen = true,
      class: "justify-center text-center",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->Custom value`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!---->`);
  }
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    prevent_snippet_stringification(customValueSnippet);
    Data_table_faceted_filter($$payload2, {
      column,
      title: "Date",
      options,
      allOptions,
      allIcon: Users_round,
      customValueSnippet
    });
    $$payload2.out.push(`<!----> `);
    Advanced_date_dialog($$payload2, {
      onSubmit: (new_value) => {
        dateFiltersState?.add(new_value);
        dialogOpen = false;
      },
      get dialogOpen() {
        return dialogOpen;
      },
      set dialogOpen($$value) {
        dialogOpen = $$value;
        $$settled = false;
      }
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Data_table_faceted_filter_date.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Data_table_faceted_filter_amount[FILENAME] = "src/routes/accounts/[id]/(components)/(facets)/data-table-faceted-filter-amount.svelte";
function Data_table_faceted_filter_amount($$payload, $$props) {
  push(Data_table_faceted_filter_amount);
  let {
    column,
    title = "Amount"
    /** TanStack table column instance for applying filters */
    /** TanStack table column instance for applying filters */
    /** Display title for the filter component */
  } = $$props;
  let operatorOpen = false;
  let valueOpen = false;
  const filterTypes = [
    { value: "equals", label: "equals" },
    // Exact match
    { value: "greaterThan", label: "greater than" },
    // Amount > value
    { value: "lessThan", label: "less than" },
    // Amount < value
    { value: "between", label: "between" },
    // value1 <= Amount <= value2
    { value: "notEquals", label: "not equals" }
    // Amount != value
  ];
  const activeView = currentViews.get().activeView;
  activeView.view;
  const currentFilter = column.getFilterValue();
  const activeOperator = () => {
    if (!currentFilter) return filterTypes[0];
    return filterTypes.find((t) => t.value === currentFilter.type) || filterTypes[0];
  };
  const setOperator = (operator) => {
    if (currentFilter) {
      const newFilter = { type: operator.value };
      column.setFilterValue(newFilter);
    } else {
      column.setFilterValue({ type: operator.value });
    }
    operatorOpen = false;
  };
  const clearFilter = () => {
    column.setFilterValue(void 0);
    valueOpen = false;
  };
  const formatFilterValue = (filter) => {
    if (!filter) return "Select value";
    if (filter.type === "between") {
      if (filter.min === void 0 && filter.max === void 0) {
        return "Select range";
      }
      if (filter.min !== void 0 && filter.max !== void 0) {
        return `${currencyFormatter.format(filter.min)} - ${currencyFormatter.format(filter.max)}`;
      }
      return "Select range";
    }
    if (filter.value === void 0) {
      return "Select value";
    }
    return currencyFormatter.format(filter.value);
  };
  let inputValue = "";
  let rangeMin = "";
  let rangeMax = "";
  const applyValue = () => {
    if (!currentFilter) return;
    if (currentFilter.type === "between") {
      const min = parseFloat(rangeMin);
      const max = parseFloat(rangeMax);
      if (!isNaN(min) && !isNaN(max)) {
        const newFilter = { ...currentFilter, min, max };
        console.log("🔍 Applying between filter:", newFilter);
        column.setFilterValue(newFilter);
      }
    } else {
      const value = parseFloat(inputValue);
      if (!isNaN(value)) {
        const newFilter = { ...currentFilter, value };
        console.log("🔍 Applying single value filter:", newFilter);
        column.setFilterValue(newFilter);
      }
    }
    valueOpen = false;
  };
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="flex">`);
    push_element($$payload2, "div", 153, 0);
    Badge($$payload2, {
      variant: "outline",
      class: "h-8 rounded-r-none",
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->${escape_html(title)}`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Root($$payload2, {
      get open() {
        return operatorOpen;
      },
      set open($$value) {
        operatorOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let child = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Button($$payload4, spread_props([
              props,
              {
                variant: "outline",
                size: "sm",
                class: "h-8 rounded-none border-l-0 border-r-0",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->${escape_html(activeOperator().label)}`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Popover_trigger($$payload3, { child, $$slots: { child: true } });
        }
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "w-48 p-0",
          align: "start",
          children: prevent_snippet_stringification(($$payload4) => {
            const each_array = ensure_array_like(filterTypes);
            $$payload4.out.push(`<div class="space-y-1 p-2">`);
            push_element($$payload4, "div", 171, 6);
            $$payload4.out.push(`<!--[-->`);
            for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
              let type = each_array[$$index];
              Button($$payload4, {
                variant: "ghost",
                size: "sm",
                class: cn("w-full justify-start", activeOperator().value === type.value && "bg-accent"),
                onclick: () => setOperator(type),
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->${escape_html(type.label)}`);
                }),
                $$slots: { default: true }
              });
            }
            $$payload4.out.push(`<!--]--></div>`);
            pop_element();
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> <!---->`);
    Root($$payload2, {
      get open() {
        return valueOpen;
      },
      set open($$value) {
        valueOpen = $$value;
        $$settled = false;
      },
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        {
          let child = function($$payload4, { props }) {
            validate_snippet_args($$payload4);
            Button($$payload4, spread_props([
              props,
              {
                variant: "outline",
                size: "sm",
                class: "h-8 rounded-none",
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->${escape_html(formatFilterValue(currentFilter))}`);
                }),
                $$slots: { default: true }
              }
            ]));
          };
          prevent_snippet_stringification(child);
          Popover_trigger($$payload3, { child, $$slots: { child: true } });
        }
        $$payload3.out.push(`<!----> <!---->`);
        Popover_content($$payload3, {
          class: "w-80",
          align: "start",
          children: prevent_snippet_stringification(($$payload4) => {
            $$payload4.out.push(`<div class="space-y-4 p-4">`);
            push_element($$payload4, "div", 204, 6);
            if (currentFilter?.type === "between") {
              $$payload4.out.push("<!--[-->");
              $$payload4.out.push(`<div class="grid grid-cols-2 gap-2">`);
              push_element($$payload4, "div", 206, 10);
              $$payload4.out.push(`<div class="space-y-2">`);
              push_element($$payload4, "div", 207, 12);
              $$payload4.out.push(`<label for="amount-min" class="text-sm font-medium">`);
              push_element($$payload4, "label", 208, 14);
              $$payload4.out.push(`Min Amount</label>`);
              pop_element();
              $$payload4.out.push(` `);
              Input($$payload4, {
                id: "amount-min",
                type: "number",
                step: "0.01",
                placeholder: "0.00",
                onkeydown: (e) => {
                  if (e.key === "Enter") {
                    applyValue();
                  }
                },
                get value() {
                  return rangeMin;
                },
                set value($$value) {
                  rangeMin = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out.push(`<!----></div>`);
              pop_element();
              $$payload4.out.push(` <div class="space-y-2">`);
              push_element($$payload4, "div", 222, 12);
              $$payload4.out.push(`<label for="amount-max" class="text-sm font-medium">`);
              push_element($$payload4, "label", 223, 14);
              $$payload4.out.push(`Max Amount</label>`);
              pop_element();
              $$payload4.out.push(` `);
              Input($$payload4, {
                id: "amount-max",
                type: "number",
                step: "0.01",
                placeholder: "100.00",
                onkeydown: (e) => {
                  if (e.key === "Enter") {
                    applyValue();
                  }
                },
                get value() {
                  return rangeMax;
                },
                set value($$value) {
                  rangeMax = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out.push(`<!----></div>`);
              pop_element();
              $$payload4.out.push(`</div>`);
              pop_element();
            } else {
              $$payload4.out.push("<!--[!-->");
              $$payload4.out.push(`<div class="space-y-2">`);
              push_element($$payload4, "div", 239, 10);
              $$payload4.out.push(`<label for="amount-value" class="text-sm font-medium">`);
              push_element($$payload4, "label", 240, 12);
              $$payload4.out.push(`Amount</label>`);
              pop_element();
              $$payload4.out.push(` `);
              Input($$payload4, {
                id: "amount-value",
                type: "number",
                step: "0.01",
                placeholder: "0.00",
                onkeydown: (e) => {
                  if (e.key === "Enter") {
                    applyValue();
                  }
                },
                get value() {
                  return inputValue;
                },
                set value($$value) {
                  inputValue = $$value;
                  $$settled = false;
                }
              });
              $$payload4.out.push(`<!----></div>`);
              pop_element();
            }
            $$payload4.out.push(`<!--]--> <div class="flex space-x-2">`);
            push_element($$payload4, "div", 256, 8);
            Button($$payload4, {
              size: "sm",
              onclick: applyValue,
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Apply`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> `);
            Button($$payload4, {
              variant: "outline",
              size: "sm",
              onclick: clearFilter,
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->Clear`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----></div>`);
            pop_element();
            $$payload4.out.push(`</div>`);
            pop_element();
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----> `);
    Button($$payload2, {
      variant: "outline",
      size: "sm",
      class: "h-8 rounded-l-none border-l-0 p-2",
      onclick: clearFilter,
      children: prevent_snippet_stringification(($$payload3) => {
        X($$payload3, { class: "h-4 w-4" });
      }),
      $$slots: { default: true }
    });
    $$payload2.out.push(`<!----></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  pop();
}
Data_table_faceted_filter_amount.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const columns = (categories, payees, updateData) => {
  const updateHandler = (info, columnId, new_value, value_transformer = (value) => value) => {
    return updateData(info.row.original.id, columnId, value_transformer(new_value));
  };
  return [
    {
      id: "select-col",
      header: ({ table }) => renderComponent(Checkbox, {
        checked: table.getIsAllPageRowsSelected(),
        indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
        onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
        controlledChecked: true,
        "aria-label": "Select all"
      }),
      cell: ({ row }) => renderComponent(Checkbox, {
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onCheckedChange: (value) => row.toggleSelected(!!value),
        controlledChecked: true,
        "aria-label": "Select row"
      }),
      aggregatedCell: ({ row }) => renderComponent(Checkbox, {
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onCheckedChange: (value) => row.toggleSelected(!!value),
        controlledChecked: true,
        "aria-label": "Select row"
      }),
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      enableHiding: false
    },
    {
      id: "expand-contract-col",
      header: ({ table }) => table.getCanSomeRowsExpand() ? renderComponent(Expand_toggle, {
        checked: table.getIsAllRowsExpanded(),
        // disabled: table.getCanSomeRowsExpand(),
        onCheckedChange: table.getToggleAllRowsExpandedHandler(),
        controlledChecked: true,
        "aria-label": "Expand/contract all"
      }) : "",
      aggregatedCell: ({ row }) => row.getCanExpand() ? renderComponent(Expand_toggle, {
        checked: row.getIsExpanded(),
        disabled: !row.getCanExpand(),
        onCheckedChange: row.getToggleExpandedHandler(),
        controlledChecked: true,
        "aria-label": "Expand/contract row"
      }) : "",
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      enableHiding: false
    },
    {
      accessorKey: "id",
      cell: (info) => info.getValue(),
      aggregatedCell: () => {
      },
      header: ({ column }) => renderComponent(Data_table_column_header, { column, title: "ID" }),
      sortingFn: "alphanumeric",
      enableColumnFilter: false,
      enableGrouping: false,
      meta: { label: "ID" }
    },
    {
      accessorKey: "date",
      id: "date",
      cell: (info) => renderComponent(Editable_date_cell, {
        value: info.getValue(),
        onUpdateValue: (new_value) => updateHandler(info, "date", new_value, (new_value2) => {
          if (new_value2 && typeof new_value2 === "object" && "toString" in new_value2) {
            return new_value2.toString();
          }
          return new_value2;
        })
      }),
      aggregatedCell: () => {
      },
      header: ({ column }) => renderComponent(Data_table_column_header, { title: "Date", column }),
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.getValue("date");
        const dateB = rowB.getValue("date");
        if (!dateA || !dateB) return 0;
        return dateA.compare(dateB);
      },
      filterFn: "dateAfter",
      meta: {
        label: "Date",
        facetedFilter: (column) => {
          return {
            name: "Date",
            icon: Calendar_days,
            column,
            component: () => renderComponent(Data_table_faceted_filter_date, { column })
          };
        },
        availableFilters: [
          { id: "dateIn", label: "in" },
          { id: "dateBefore", label: "before" },
          { id: "dateAfter", label: "after" }
        ]
      }
    },
    {
      accessorKey: "payeeId",
      id: "payee",
      cell: (info) => renderComponent(Editable_entity_cell, {
        value: payees.getById(info.getValue()),
        entityLabel: "payee",
        onUpdateValue: (new_value) => updateHandler(info, "payeeId", new_value),
        entities: payees.all,
        icon: Hand_coins,
        management: {
          enable: true,
          component: Manage_payee_form,
          onSave: (new_value, is_new) => {
            if (is_new) {
              payees.addPayee(new_value);
            } else {
              payees.updatePayee(new_value);
            }
          },
          onDelete: (id) => {
            payees.deletePayee(id);
          }
        }
      }),
      aggregatedCell: () => {
      },
      header: ({ column }) => renderComponent(Data_table_column_header, { column, title: "Payee" }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(payees.getById(rowA.getValue("payee"))?.name || "", payees.getById(rowB.getValue("payee"))?.name || "");
      },
      enableColumnFilter: true,
      filterFn: "entityIsFilter",
      meta: {
        label: "Payee",
        facetedFilter: (column, value) => {
          return {
            name: "Payee",
            icon: Hand_coins,
            column,
            value,
            component: () => renderComponent(Data_table_faceted_filter_payee, { column })
          };
        },
        availableFilters: [
          { id: "entityIsFilter", label: "is" },
          { id: "entityIsNotFilter", label: "is not" }
        ]
      }
    },
    {
      accessorKey: "notes",
      id: "notes",
      cell: (info) => renderComponent(Data_table_editable_cell, {
        value: info.getValue(),
        onUpdateValue: (new_value) => updateData(info.row.original.id, "notes", new_value)
      }),
      aggregatedCell: () => {
      },
      header: ({ column }) => renderComponent(Data_table_column_header, { column, title: "Notes" }),
      enableSorting: false,
      enableGrouping: false,
      meta: { label: "Notes" }
    },
    {
      accessorKey: "categoryId",
      id: "category",
      cell: (info) => renderComponent(Editable_entity_cell, {
        value: categories.getById(info.getValue()),
        entityLabel: "category",
        onUpdateValue: (new_value) => updateHandler(info, "categoryId", new_value),
        entities: categories.all,
        icon: Square_mouse_pointer,
        management: {
          enable: true,
          component: Manage_category_form,
          onSave: (new_value, is_new) => {
            if (is_new) {
              categories.addCategory(new_value);
            } else {
              categories.updateCategory(new_value);
            }
          },
          onDelete: (id) => {
            categories.deleteCategory(id);
          }
        }
      }),
      aggregatedCell: () => {
      },
      header: ({ column }) => renderComponent(Data_table_column_header, { column, title: "Category" }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(categories.getById(rowA.getValue("category"))?.name || "", categories.getById(rowB.getValue("category"))?.name || "");
      },
      filterFn: "entityIsFilter",
      meta: {
        label: "Category",
        facetedFilter: (column) => {
          return {
            name: "Category",
            icon: Square_mouse_pointer,
            column,
            component: () => renderComponent(Data_table_faceted_filter_category, { column })
          };
        },
        availableFilters: [
          { id: "entityIsFilter", label: "is" },
          { id: "entityIsNotFilter", label: "is not" }
        ]
      }
    },
    {
      accessorKey: "amount",
      id: "amount",
      cell: (info) => renderComponent(Editable_numeric_cell, {
        value: info.getValue(),
        onUpdateValue: (new_value) => updateHandler(info, "amount", new_value)
      }),
      aggregatedCell: (info) => {
        const value = info.getValue();
        return currencyFormatter.format(isNaN(value) ? 0 : value ?? 0);
      },
      header: ({ column }) => renderComponent(Data_table_column_header, { column, title: "Amount" }),
      sortingFn: (rowA, rowB) => (rowA.getValue("amount") || 0) - (rowB.getValue("amount") || 0),
      enableGrouping: false,
      enableColumnFilter: true,
      filterFn: "amountFilter",
      meta: {
        label: "Amount",
        facetedFilter: (column) => {
          return {
            name: "Amount",
            icon: Dollar_sign,
            column,
            component: () => renderComponent(Data_table_faceted_filter_amount, { column, title: "Amount" })
          };
        },
        availableFilters: [{ id: "amountFilter", label: "amount" }]
      }
    },
    {
      accessorKey: "balance",
      id: "balance",
      header: ({ column }) => renderComponent(Data_table_column_header, { column, title: "Balance" }),
      cell: (info) => {
        const value = info.getValue();
        return currencyFormatter.format(isNaN(value) ? 0 : value ?? 0);
      },
      aggregatedCell: (info) => {
        const value = info.getValue();
        return currencyFormatter.format(isNaN(value) ? 0 : value ?? 0);
      },
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      meta: { label: "Balance" }
    },
    {
      accessorKey: "status",
      id: "status",
      cell: (info) => renderComponent(Data_table_editable_status_cell, {
        value: info.getValue(),
        onUpdateValue: (new_value) => updateHandler(info, "status", new_value)
      }),
      aggregatedCell: () => {
      },
      header: "",
      filterFn: "equalsString",
      meta: {
        label: "Status",
        facetedFilter: (column, value) => {
          return {
            name: "Status",
            icon: Square_check,
            column,
            value,
            component: () => {
              return renderComponent(Data_table_faceted_filter_status, { column });
            }
          };
        },
        availableFilters: [
          { id: "equalsString", label: "is" },
          { id: "doesntEqualString", label: "is not" }
        ]
      }
    },
    {
      id: "actions",
      accessorFn: (row) => row.id,
      aggregatedCell: () => {
      },
      header: "",
      cell: (info) => renderComponent(Data_table_actions, { id: info.getValue() }),
      enableColumnFilter: false,
      enableSorting: false,
      enableGrouping: false,
      enableHiding: false
    }
  ];
};
export {
  Add_account_dialog as A,
  Delete_account_dialog as D,
  Transaction_table_container as T,
  Unified_chart as U,
  Add_schedule_dialog as a,
  superformInsertScheduleSchema as b,
  superformInsertAccountSchema as c,
  superformInsertTransactionSchema as d,
  Add_transaction_dialog as e,
  Delete_transaction_dialog as f,
  columns as g,
  Analytics_dashboard as h,
  superformInsertViewSchema as i,
  superformInsertCategorySchema as j,
  superformInsertPayeeSchema as s
};
