import "clsx";
import { a2 as MediaQuery, s as setContext, g as getContext, d as derived, p as push, $ as spread_attributes, w as clsx, i as push_element, k as pop_element, r as bind_props, h as pop, F as FILENAME, e as copy_payload, f as assign_payload, a3 as Tooltip_trigger$1, m as spread_props, a4 as Portal$1, l as prevent_snippet_stringification, a5 as Tooltip_content$1, v as validate_snippet_args, a6 as Tooltip_arrow, a7 as Tooltip_provider, a8 as Tooltip, a9 as mergeProps, q as stringify, aa as Separator$1, ab as Dialog_overlay$1, ac as Dialog_content$1, ad as Dialog_close, ae as Dialog_title$1, af as Dialog_description$1, ag as Dialog, j as attr, t as attr_class, ah as Dropdown_menu_content$1, ai as Menu_group, aj as Menu_item, ak as Menu_separator, al as Menu_trigger, am as Menu_sub_content, an as Menu_sub_trigger, ao as Menu, ap as Menu_sub, aq as Label$1, ar as Label$2, n as ensure_array_like, o as escape_html, as as Field_errors, at as Field, au as Control$1, av as Toggle_group$1, aw as Toggle_group_item$1, ax as Calendar, ay as Calendar_cell$1, az as Calendar_day$1, aA as Calendar_grid$1, aB as Calendar_header$1, aC as Calendar_grid_row$1, aD as Calendar_grid_body$1, aE as Calendar_grid_head$1, aF as Calendar_head_cell$1, aG as Calendar_next_button$1, aH as Calendar_prev_button$1, aI as maybe_selected, aJ as Calendar_month_select$1, aK as Calendar_year_select$1, aL as Popover_content$1, aM as Popover_trigger$1, aN as Popover, aO as Select_group$1, aP as Select_item$1, aQ as Select_scroll_up_button$1, aR as Select_scroll_down_button$1, aS as Select_content$1, aT as Select_viewport, aU as Select_trigger$1, aV as Select, aW as validate_void_dynamic_element, aX as validate_dynamic_element_tag, aY as element, aZ as Switch$1, a_ as Switch_thumb, a$ as Command$1, b0 as Command_empty$1, b1 as Command_group$1, b2 as useId, b3 as Command_group_heading, b4 as Command_group_items, b5 as Command_item$1, b6 as Command_input$1, b7 as Command_list$1, b8 as Command_separator$1, b9 as Tabs$1, ba as Tabs_content$1, bb as Tabs_list$1, bc as Tabs_trigger$1, bd as Radio_group$1, be as Radio_group_item$1, bf as Checkbox$1, bg as Alert_dialog_action$1, bh as Alert_dialog_cancel$1, bi as Alert_dialog_content$1, bj as Alert_dialog } from "./vendor-misc.js";
import { c as cn } from "./app-state.js";
import { tv } from "tailwind-variants";
import { z as Panel_left, X, o as Chevron_right, n as Chevron_left, B as Chevron_down, a as Check, F as Chevron_up, S as Search, G as Circle, I as Minus, J as Minimize_2, K as Expand } from "./vendor-ui.js";
import { h as $14e0f24ef4ac5c92$export$5a8da0c44a3afdf2, $ as $14e0f24ef4ac5c92$export$aa8b41735afcabd2, c as $fb18d541ea1ad717$export$ad991b66133851cf } from "./vendor-date.js";
import "@layerstack/utils";
import "@layerstack/tailwind";
import "d3-interpolate-path";
import "@dagrejs/dagre";
import "@layerstack/utils/object";
import "d3-tile";
import "d3-sankey";
const MOBILE_BREAKPOINT = 768;
class IsMobile extends MediaQuery {
  constructor() {
    super(`max-width: ${MOBILE_BREAKPOINT - 1}px`);
  }
}
const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
class SidebarState {
  props;
  #open = derived(() => this.props.open());
  get open() {
    return this.#open();
  }
  set open($$value) {
    return this.#open($$value);
  }
  openMobile = false;
  setOpen;
  #isMobile;
  #state = derived(() => this.open ? "expanded" : "collapsed");
  get state() {
    return this.#state();
  }
  set state($$value) {
    return this.#state($$value);
  }
  constructor(props) {
    this.setOpen = props.setOpen;
    this.#isMobile = new IsMobile();
    this.props = props;
  }
  // Convenience getter for checking if the sidebar is mobile
  // without this, we would need to use `sidebar.isMobile.current` everywhere
  get isMobile() {
    return this.#isMobile.current;
  }
  // Event handler to apply to the `<svelte:window>`
  handleShortcutKeydown = (e) => {
    if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.toggle();
    }
  };
  setOpenMobile = (value) => {
    this.openMobile = value;
  };
  toggle = () => {
    return this.#isMobile.current ? this.openMobile = !this.openMobile : this.setOpen(!this.open);
  };
}
const SYMBOL_KEY = "scn-sidebar";
function setSidebar(props) {
  return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}
function useSidebar() {
  return getContext(Symbol.for(SYMBOL_KEY));
}
Sidebar_content[FILENAME] = "src/lib/components/ui/sidebar/sidebar-content.svelte";
function Sidebar_content($$payload, $$props) {
  push(Sidebar_content);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-sidebar": "content",
      class: clsx(cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 14, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Sidebar_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_group_action[FILENAME] = "src/lib/components/ui/sidebar/sidebar-group-action.svelte";
function Sidebar_group_action($$payload, $$props) {
  push(Sidebar_group_action);
  let {
    ref = null,
    class: className,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const propObj = {
    class: cn(
      "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-none transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
      // Increases the hit area of the button on mobile.
      "after:absolute after:-inset-2 after:md:hidden",
      "group-data-[collapsible=icon]:hidden",
      className
    ),
    "data-sidebar": "group-action",
    ...restProps
  };
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: propObj });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...propObj }, null)}>`);
    push_element($$payload, "button", 33, 2);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Sidebar_group_action.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_group_content[FILENAME] = "src/lib/components/ui/sidebar/sidebar-group-content.svelte";
function Sidebar_group_content($$payload, $$props) {
  push(Sidebar_group_content);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-sidebar": "group-content",
      class: clsx(cn("w-full text-sm", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 14, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Sidebar_group_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_group_label[FILENAME] = "src/lib/components/ui/sidebar/sidebar-group-label.svelte";
function Sidebar_group_label($$payload, $$props) {
  push(Sidebar_group_label);
  let {
    ref = null,
    children,
    child,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const mergedProps = {
    class: cn("text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-none transition-[margin,opa] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className),
    "data-sidebar": "group-label",
    ...restProps
  };
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<div${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "div", 31, 2);
    children?.($$payload);
    $$payload.out.push(`<!----></div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Sidebar_group_label.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_group[FILENAME] = "src/lib/components/ui/sidebar/sidebar-group.svelte";
function Sidebar_group($$payload, $$props) {
  push(Sidebar_group);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-sidebar": "group",
      class: clsx(cn("relative flex w-full min-w-0 flex-col p-2", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 14, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Sidebar_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Input[FILENAME] = "src/lib/components/ui/input/input.svelte";
function Input($$payload, $$props) {
  push(Input);
  let {
    ref = null,
    value = void 0,
    type,
    files = void 0,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  if (type === "file") {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<input${spread_attributes(
      {
        "data-slot": "input",
        class: clsx(cn("selection:bg-primary dark:bg-input/30 selection:text-primary-foreground border-input ring-offset-background placeholder:text-muted-foreground shadow-xs flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 pt-1.5 text-sm font-medium outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]", "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", className)),
        type: "file",
        ...restProps
      },
      null
    )}/>`);
    push_element($$payload, "input", 22, 2);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<input${spread_attributes(
      {
        "data-slot": "input",
        class: clsx(cn("border-input bg-background selection:bg-primary dark:bg-input/30 selection:text-primary-foreground ring-offset-background placeholder:text-muted-foreground shadow-xs flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]", "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive", className)),
        type,
        value,
        ...restProps
      },
      null
    )}/>`);
    push_element($$payload, "input", 37, 2);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref, value, files });
  pop();
}
Input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_menu_action[FILENAME] = "src/lib/components/ui/sidebar/sidebar-menu-action.svelte";
function Sidebar_menu_action($$payload, $$props) {
  push(Sidebar_menu_action);
  let {
    ref = null,
    class: className,
    showOnHover = false,
    children,
    child,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const mergedProps = {
    class: cn(
      "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-none transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
      // Increases the hit area of the button on mobile.
      "after:absolute after:-inset-2 after:md:hidden",
      "peer-data-[size=sm]/menu-button:top-1",
      "peer-data-[size=default]/menu-button:top-1.5",
      "peer-data-[size=lg]/menu-button:top-2.5",
      "group-data-[collapsible=icon]:hidden",
      showOnHover && "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
      className
    ),
    "data-sidebar": "menu-action",
    ...restProps
  };
  if (child) {
    $$payload.out.push("<!--[-->");
    child($$payload, { props: mergedProps });
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
    push_element($$payload, "button", 40, 2);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Sidebar_menu_action.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tooltip_trigger[FILENAME] = "src/lib/components/ui/tooltip/tooltip-trigger.svelte";
function Tooltip_trigger($$payload, $$props) {
  push(Tooltip_trigger);
  let { ref = null, $$slots, $$events, ...restProps } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Tooltip_trigger$1($$payload2, spread_props([
      { "data-slot": "tooltip-trigger" },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Tooltip_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tooltip_content[FILENAME] = "src/lib/components/ui/tooltip/tooltip-content.svelte";
function Tooltip_content($$payload, $$props) {
  push(Tooltip_content);
  let {
    ref = null,
    class: className,
    sideOffset = 0,
    side = "top",
    children,
    arrowClasses,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Portal$1($$payload2, {
      children: prevent_snippet_stringification(($$payload3) => {
        $$payload3.out.push(`<!---->`);
        Tooltip_content$1($$payload3, spread_props([
          {
            "data-slot": "tooltip-content",
            sideOffset,
            side,
            class: cn("bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-tooltip-content-transform-origin) z-50 w-fit text-balance rounded-md px-3 py-1.5 text-xs", className)
          },
          restProps,
          {
            get ref() {
              return ref;
            },
            set ref($$value) {
              ref = $$value;
              $$settled = false;
            },
            children: prevent_snippet_stringification(($$payload4) => {
              children?.($$payload4);
              $$payload4.out.push(`<!----> <!---->`);
              {
                let child = function($$payload5, { props }) {
                  validate_snippet_args($$payload5);
                  $$payload5.out.push(`<div${spread_attributes(
                    {
                      class: clsx(cn("bg-primary z-50 size-2.5 rotate-45 rounded-[2px]", "data-[side=top]:translate-x-1/2 data-[side=top]:translate-y-[calc(-50%_+_2px)]", "data-[side=bottom]:-translate-x-1/2 data-[side=bottom]:-translate-y-[calc(-50%_+_1px)]", "data-[side=right]:translate-x-[calc(50%_+_2px)] data-[side=right]:translate-y-1/2", "data-[side=left]:-translate-y-[calc(50%_-_3px)]", arrowClasses)),
                      ...props
                    },
                    null
                  )}>`);
                  push_element($$payload5, "div", 33, 8);
                  $$payload5.out.push(`</div>`);
                  pop_element();
                };
                prevent_snippet_stringification(child);
                Tooltip_arrow($$payload4, { child, $$slots: { child: true } });
              }
              $$payload4.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          }
        ]));
        $$payload3.out.push(`<!---->`);
      })
    });
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Tooltip_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Root$6 = Tooltip;
const Provider = Tooltip_provider;
Sidebar_menu_button[FILENAME] = "src/lib/components/ui/sidebar/sidebar-menu-button.svelte";
const sidebarMenuButtonVariants = tv({
  base: "peer/menu-button ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  variants: {
    variant: {
      default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      outline: "bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
    },
    size: {
      default: "h-8 text-sm",
      sm: "h-7 text-xs",
      lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0"
    }
  },
  defaultVariants: { variant: "default", size: "default" }
});
function Sidebar_menu_button($$payload, $$props) {
  push(Sidebar_menu_button);
  let {
    ref = null,
    class: className,
    children,
    child,
    variant = "default",
    size = "default",
    isActive = false,
    tooltipContent,
    tooltipContentProps,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const sidebar = useSidebar();
  const buttonProps = {
    class: cn(sidebarMenuButtonVariants({ variant, size }), className),
    "data-sidebar": "menu-button",
    "data-size": size,
    "data-active": isActive,
    ...restProps
  };
  prevent_snippet_stringification(Button2);
  function Button2($$payload2, { props }) {
    validate_snippet_args($$payload2);
    const mergedProps = mergeProps(buttonProps, props);
    if (child) {
      $$payload2.out.push("<!--[-->");
      child($$payload2, { props: mergedProps });
      $$payload2.out.push(`<!---->`);
    } else {
      $$payload2.out.push("<!--[!-->");
      $$payload2.out.push(`<button${spread_attributes({ ...mergedProps }, null)}>`);
      push_element($$payload2, "button", 74, 4);
      children?.($$payload2);
      $$payload2.out.push(`<!----></button>`);
      pop_element();
    }
    $$payload2.out.push(`<!--]-->`);
  }
  if (!tooltipContent) {
    $$payload.out.push("<!--[-->");
    Button2($$payload, {});
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<!---->`);
    Root$6($$payload, {
      children: prevent_snippet_stringification(($$payload2) => {
        $$payload2.out.push(`<!---->`);
        {
          let child2 = function($$payload3, { props }) {
            validate_snippet_args($$payload3);
            Button2($$payload3, { props });
          };
          prevent_snippet_stringification(child2);
          Tooltip_trigger($$payload2, { child: child2, $$slots: { child: true } });
        }
        $$payload2.out.push(`<!----> <!---->`);
        Tooltip_content($$payload2, spread_props([
          {
            side: "right",
            align: "center",
            hidden: sidebar.state !== "collapsed" || sidebar.isMobile,
            children: tooltipContent
          },
          tooltipContentProps
        ]));
        $$payload2.out.push(`<!---->`);
      }),
      $$slots: { default: true }
    });
    $$payload.out.push(`<!---->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Sidebar_menu_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_menu_item[FILENAME] = "src/lib/components/ui/sidebar/sidebar-menu-item.svelte";
function Sidebar_menu_item($$payload, $$props) {
  push(Sidebar_menu_item);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<li${spread_attributes(
    {
      "data-sidebar": "menu-item",
      class: clsx(cn("group/menu-item relative", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "li", 14, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></li>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Sidebar_menu_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_menu[FILENAME] = "src/lib/components/ui/sidebar/sidebar-menu.svelte";
function Sidebar_menu($$payload, $$props) {
  push(Sidebar_menu);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<ul${spread_attributes(
    {
      "data-sidebar": "menu",
      class: clsx(cn("flex w-full min-w-0 flex-col gap-1", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "ul", 14, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></ul>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Sidebar_menu.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_provider[FILENAME] = "src/lib/components/ui/sidebar/sidebar-provider.svelte";
function Sidebar_provider($$payload, $$props) {
  push(Sidebar_provider);
  let {
    ref = null,
    open = true,
    onOpenChange = () => {
    },
    class: className,
    style,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  setSidebar({
    open: () => open,
    setOpen: (value) => {
      open = value;
      onOpenChange(value);
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    }
  });
  $$payload.out.push(`<!---->`);
  Provider($$payload, {
    delayDuration: 0,
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<div${spread_attributes(
        {
          style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH)}; --sidebar-width-icon: ${stringify(SIDEBAR_WIDTH_ICON)}; ${stringify(style)}`,
          class: clsx(cn("group/sidebar-wrapper has-[[data-variant=inset]]:bg-sidebar flex min-h-svh w-full", className)),
          ...restProps
        },
        null
      )}>`);
      push_element($$payload2, "div", 42, 2);
      children?.($$payload2);
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    })
  });
  $$payload.out.push(`<!---->`);
  bind_props($$props, { ref, open });
  pop();
}
Sidebar_provider.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Separator[FILENAME] = "src/lib/components/ui/separator/separator.svelte";
function Separator($$payload, $$props) {
  push(Separator);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Separator$1($$payload2, spread_props([
      {
        "data-slot": "separator",
        class: cn("bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Separator.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Button[FILENAME] = "src/lib/components/ui/button/button.svelte";
const buttonVariants = tv({
  base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
      destructive: "bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white",
      outline: "bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border",
      secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
      link: "text-primary underline-offset-4 hover:underline"
    },
    size: {
      default: "h-9 px-4 py-2 has-[>svg]:px-3",
      sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
      lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
      icon: "size-9"
    }
  },
  defaultVariants: { variant: "default", size: "default" }
});
function Button($$payload, $$props) {
  push(Button);
  let {
    class: className,
    variant = "default",
    size = "default",
    ref = null,
    href = void 0,
    type = "button",
    disabled,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  if (href) {
    $$payload.out.push("<!--[-->");
    $$payload.out.push(`<a${spread_attributes(
      {
        "data-slot": "button",
        class: clsx(cn(buttonVariants({ variant, size }), className)),
        href: disabled ? void 0 : href,
        "aria-disabled": disabled,
        role: disabled ? "link" : void 0,
        tabindex: disabled ? -1 : void 0,
        ...restProps
      },
      null
    )}>`);
    push_element($$payload, "a", 52, 2);
    children?.($$payload);
    $$payload.out.push(`<!----></a>`);
    pop_element();
  } else {
    $$payload.out.push("<!--[!-->");
    $$payload.out.push(`<button${spread_attributes(
      {
        "data-slot": "button",
        class: clsx(cn(buttonVariants({ variant, size }), className)),
        type,
        disabled,
        ...restProps
      },
      null
    )}>`);
    push_element($$payload, "button", 65, 2);
    children?.($$payload);
    $$payload.out.push(`<!----></button>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { ref });
  pop();
}
Button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sidebar_trigger[FILENAME] = "src/lib/components/ui/sidebar/sidebar-trigger.svelte";
function Sidebar_trigger($$payload, $$props) {
  push(Sidebar_trigger);
  let {
    ref = null,
    class: className,
    onclick,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const sidebar = useSidebar();
  Button($$payload, spread_props([
    {
      type: "button",
      onclick: (e) => {
        onclick?.(e);
        sidebar.toggle();
      },
      "data-sidebar": "trigger",
      variant: "ghost",
      size: "icon",
      class: cn("h-7 w-7", className)
    },
    restProps,
    {
      children: prevent_snippet_stringification(($$payload2) => {
        Panel_left($$payload2, {});
        $$payload2.out.push(`<!----> <span class="sr-only">`);
        push_element($$payload2, "span", 33, 2);
        $$payload2.out.push(`Toggle Sidebar</span>`);
        pop_element();
      }),
      $$slots: { default: true }
    }
  ]));
  bind_props($$props, { ref });
  pop();
}
Sidebar_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sheet_overlay[FILENAME] = "src/lib/components/ui/sheet/sheet-overlay.svelte";
function Sheet_overlay($$payload, $$props) {
  push(Sheet_overlay);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_overlay$1($$payload2, spread_props([
      {
        "data-slot": "sheet-overlay",
        class: cn("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Sheet_overlay.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sheet_content[FILENAME] = "src/lib/components/ui/sheet/sheet-content.svelte";
const sheetVariants = tv({
  base: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  variants: {
    side: {
      top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
      bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
      left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm"
    }
  },
  defaultVariants: { side: "right" }
});
function Sheet_content($$payload, $$props) {
  push(Sheet_content);
  let {
    ref = null,
    class: className,
    side = "right",
    portalProps,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Portal$1($$payload2, spread_props([
      portalProps,
      {
        children: prevent_snippet_stringification(($$payload3) => {
          Sheet_overlay($$payload3, {});
          $$payload3.out.push(`<!----> <!---->`);
          Dialog_content$1($$payload3, spread_props([
            {
              "data-slot": "sheet-content",
              class: cn(sheetVariants({ side }), className)
            },
            restProps,
            {
              get ref() {
                return ref;
              },
              set ref($$value) {
                ref = $$value;
                $$settled = false;
              },
              children: prevent_snippet_stringification(($$payload4) => {
                children?.($$payload4);
                $$payload4.out.push(`<!----> <!---->`);
                Dialog_close($$payload4, {
                  class: "ring-offset-background focus-visible:ring-ring rounded-xs focus-visible:outline-hidden absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none",
                  children: prevent_snippet_stringification(($$payload5) => {
                    X($$payload5, { class: "size-4" });
                    $$payload5.out.push(`<!----> <span class="sr-only">`);
                    push_element($$payload5, "span", 51, 6);
                    $$payload5.out.push(`Close</span>`);
                    pop_element();
                  }),
                  $$slots: { default: true }
                });
                $$payload4.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            }
          ]));
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Sheet_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sheet_header[FILENAME] = "src/lib/components/ui/sheet/sheet-header.svelte";
function Sheet_header($$payload, $$props) {
  push(Sheet_header);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "sheet-header",
      class: clsx(cn("flex flex-col gap-1.5 p-4", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Sheet_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sheet_title[FILENAME] = "src/lib/components/ui/sheet/sheet-title.svelte";
function Sheet_title($$payload, $$props) {
  push(Sheet_title);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_title$1($$payload2, spread_props([
      {
        "data-slot": "sheet-title",
        class: cn("text-foreground font-semibold", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Sheet_title.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Sheet_description[FILENAME] = "src/lib/components/ui/sheet/sheet-description.svelte";
function Sheet_description($$payload, $$props) {
  push(Sheet_description);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_description$1($$payload2, spread_props([
      {
        "data-slot": "sheet-description",
        class: cn("text-muted-foreground text-sm", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Sheet_description.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Root$5 = Dialog;
Sidebar[FILENAME] = "src/lib/components/ui/sidebar/sidebar.svelte";
function Sidebar($$payload, $$props) {
  push(Sidebar);
  let {
    ref = null,
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const sidebar = useSidebar();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    if (collapsible === "none") {
      $$payload2.out.push("<!--[-->");
      $$payload2.out.push(`<div${spread_attributes(
        {
          class: clsx(cn("bg-sidebar text-sidebar-foreground flex h-full w-[var(--sidebar-width)] flex-col", className)),
          ...restProps
        },
        null
      )}>`);
      push_element($$payload2, "div", 27, 2);
      children?.($$payload2);
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    } else {
      $$payload2.out.push("<!--[!-->");
      if (sidebar.isMobile) {
        $$payload2.out.push("<!--[-->");
        var bind_get = () => sidebar.openMobile;
        var bind_set = (v) => sidebar.setOpenMobile(v);
        $$payload2.out.push(`<!---->`);
        Root$5($$payload2, spread_props([
          {
            get open() {
              return bind_get();
            },
            set open($$value) {
              bind_set($$value);
            }
          },
          restProps,
          {
            children: prevent_snippet_stringification(($$payload3) => {
              $$payload3.out.push(`<!---->`);
              Sheet_content($$payload3, {
                "data-sidebar": "sidebar",
                "data-mobile": "true",
                class: "bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden",
                style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH_MOBILE)};`,
                side,
                children: prevent_snippet_stringification(($$payload4) => {
                  $$payload4.out.push(`<div class="flex h-full w-full flex-col">`);
                  push_element($$payload4, "div", 49, 6);
                  children?.($$payload4);
                  $$payload4.out.push(`<!----></div>`);
                  pop_element();
                }),
                $$slots: { default: true }
              });
              $$payload3.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          }
        ]));
        $$payload2.out.push(`<!---->`);
      } else {
        $$payload2.out.push("<!--[!-->");
        $$payload2.out.push(`<div class="text-sidebar-foreground group peer hidden md:block"${attr("data-state", sidebar.state)}${attr("data-collapsible", sidebar.state === "collapsed" ? collapsible : "")}${attr("data-variant", variant)}${attr("data-side", side)}>`);
        push_element($$payload2, "div", 55, 2);
        $$payload2.out.push(`<div${attr_class(clsx(cn("relative h-svh w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]" : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]")))}>`);
        push_element($$payload2, "div", 64, 4);
        $$payload2.out.push(`</div>`);
        pop_element();
        $$payload2.out.push(` <div${spread_attributes(
          {
            class: clsx(cn(
              "fixed inset-y-0 z-10 hidden h-svh w-[var(--sidebar-width)] transition-[left,right,width] duration-200 ease-linear md:flex",
              side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]" : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)] group-data-[side=left]:border-r group-data-[side=right]:border-l",
              className
            )),
            ...restProps
          },
          null
        )}>`);
        push_element($$payload2, "div", 74, 4);
        $$payload2.out.push(`<div data-sidebar="sidebar" class="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow">`);
        push_element($$payload2, "div", 88, 6);
        children?.($$payload2);
        $$payload2.out.push(`<!----></div>`);
        pop_element();
        $$payload2.out.push(`</div>`);
        pop_element();
        $$payload2.out.push(`</div>`);
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
  bind_props($$props, { ref });
  pop();
}
Sidebar.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_content[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte";
function Dropdown_menu_content($$payload, $$props) {
  push(Dropdown_menu_content);
  let {
    ref = null,
    sideOffset = 4,
    portalProps,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Portal$1($$payload2, spread_props([
      portalProps,
      {
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Dropdown_menu_content$1($$payload3, spread_props([
            {
              "data-slot": "dropdown-menu-content",
              sideOffset,
              class: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-(--bits-dropdown-menu-content-available-height) origin-(--bits-dropdown-menu-content-transform-origin) z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border p-1 shadow-md outline-none", className)
            },
            restProps,
            {
              get ref() {
                return ref;
              },
              set ref($$value) {
                ref = $$value;
                $$settled = false;
              }
            }
          ]));
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_group[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-group.svelte";
function Dropdown_menu_group($$payload, $$props) {
  push(Dropdown_menu_group);
  let { ref = null, $$slots, $$events, ...restProps } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Menu_group($$payload2, spread_props([
      { "data-slot": "dropdown-menu-group" },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_item[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte";
function Dropdown_menu_item($$payload, $$props) {
  push(Dropdown_menu_item);
  let {
    ref = null,
    class: className,
    inset,
    variant = "default",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Menu_item($$payload2, spread_props([
      {
        "data-slot": "dropdown-menu-item",
        "data-inset": inset,
        "data-variant": variant,
        class: cn("data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-[variant=destructive]:data-highlighted:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_label[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte";
function Dropdown_menu_label($$payload, $$props) {
  push(Dropdown_menu_label);
  let {
    ref = null,
    class: className,
    inset,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "dropdown-menu-label",
      "data-inset": inset,
      class: clsx(cn("px-2 py-1.5 text-sm font-semibold data-[inset]:pl-8", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 14, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_label.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_separator[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte";
function Dropdown_menu_separator($$payload, $$props) {
  push(Dropdown_menu_separator);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Menu_separator($$payload2, spread_props([
      {
        "data-slot": "dropdown-menu-separator",
        class: cn("bg-border -mx-1 my-1 h-px", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_separator.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_trigger[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte";
function Dropdown_menu_trigger($$payload, $$props) {
  push(Dropdown_menu_trigger);
  let { ref = null, $$slots, $$events, ...restProps } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Menu_trigger($$payload2, spread_props([
      { "data-slot": "dropdown-menu-trigger" },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_sub_content[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-sub-content.svelte";
function Dropdown_menu_sub_content($$payload, $$props) {
  push(Dropdown_menu_sub_content);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Menu_sub_content($$payload2, spread_props([
      {
        "data-slot": "dropdown-menu-sub-content",
        class: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-dropdown-menu-content-transform-origin) z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_sub_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dropdown_menu_sub_trigger[FILENAME] = "src/lib/components/ui/dropdown-menu/dropdown-menu-sub-trigger.svelte";
function Dropdown_menu_sub_trigger($$payload, $$props) {
  push(Dropdown_menu_sub_trigger);
  let {
    ref = null,
    class: className,
    inset,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Menu_sub_trigger($$payload2, spread_props([
      {
        "data-slot": "dropdown-menu-sub-trigger",
        "data-inset": inset,
        class: cn("data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground outline-hidden [&_svg:not([class*='text-'])]:text-muted-foreground flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          children?.($$payload3);
          $$payload3.out.push(`<!----> `);
          Chevron_right($$payload3, { class: "ml-auto size-4" });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dropdown_menu_sub_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Sub = Menu_sub;
const Root$4 = Menu;
Dialog_title[FILENAME] = "src/lib/components/ui/dialog/dialog-title.svelte";
function Dialog_title($$payload, $$props) {
  push(Dialog_title);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_title$1($$payload2, spread_props([
      {
        "data-slot": "dialog-title",
        class: cn("text-lg font-semibold leading-none", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dialog_title.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_footer[FILENAME] = "src/lib/components/ui/dialog/dialog-footer.svelte";
function Dialog_footer($$payload, $$props) {
  push(Dialog_footer);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "dialog-footer",
      class: clsx(cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Dialog_footer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_header[FILENAME] = "src/lib/components/ui/dialog/dialog-header.svelte";
function Dialog_header($$payload, $$props) {
  push(Dialog_header);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "dialog-header",
      class: clsx(cn("flex flex-col gap-2 text-center sm:text-left", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Dialog_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_overlay[FILENAME] = "src/lib/components/ui/dialog/dialog-overlay.svelte";
function Dialog_overlay($$payload, $$props) {
  push(Dialog_overlay);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_overlay$1($$payload2, spread_props([
      {
        "data-slot": "dialog-overlay",
        class: cn("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dialog_overlay.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_content[FILENAME] = "src/lib/components/ui/dialog/dialog-content.svelte";
function Dialog_content($$payload, $$props) {
  push(Dialog_content);
  let {
    ref = null,
    class: className,
    portalProps,
    children,
    showCloseButton = true,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Portal($$payload2, spread_props([
      portalProps,
      {
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Dialog_overlay($$payload3, {});
          $$payload3.out.push(`<!----> <!---->`);
          Dialog_content$1($$payload3, spread_props([
            {
              "data-slot": "dialog-content",
              class: cn("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg", className)
            },
            restProps,
            {
              get ref() {
                return ref;
              },
              set ref($$value) {
                ref = $$value;
                $$settled = false;
              },
              children: prevent_snippet_stringification(($$payload4) => {
                children?.($$payload4);
                $$payload4.out.push(`<!----> `);
                if (showCloseButton) {
                  $$payload4.out.push("<!--[-->");
                  $$payload4.out.push(`<!---->`);
                  Dialog_close($$payload4, {
                    class: "ring-offset-background focus:ring-ring rounded-xs focus:outline-hidden absolute end-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                    children: prevent_snippet_stringification(($$payload5) => {
                      X($$payload5, {});
                      $$payload5.out.push(`<!----> <span class="sr-only">`);
                      push_element($$payload5, "span", 37, 8);
                      $$payload5.out.push(`Close</span>`);
                      pop_element();
                    }),
                    $$slots: { default: true }
                  });
                  $$payload4.out.push(`<!---->`);
                } else {
                  $$payload4.out.push("<!--[!-->");
                }
                $$payload4.out.push(`<!--]-->`);
              }),
              $$slots: { default: true }
            }
          ]));
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dialog_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Dialog_description[FILENAME] = "src/lib/components/ui/dialog/dialog-description.svelte";
function Dialog_description($$payload, $$props) {
  push(Dialog_description);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_description$1($$payload2, spread_props([
      {
        "data-slot": "dialog-description",
        class: cn("text-muted-foreground text-sm", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Dialog_description.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Root$3 = Dialog;
const Portal = Portal$1;
Label[FILENAME] = "src/lib/components/ui/label/label.svelte";
function Label($$payload, $$props) {
  push(Label);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Label$1($$payload2, spread_props([
      {
        "data-slot": "label",
        class: cn("flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Label.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Form_label[FILENAME] = "src/lib/components/ui/form/form-label.svelte";
function Form_label($$payload, $$props) {
  push(Form_label);
  let {
    ref = null,
    children,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    {
      let child = function($$payload3, { props }) {
        validate_snippet_args($$payload3);
        Label($$payload3, spread_props([
          props,
          {
            "data-slot": "form-label",
            class: cn("data-[fs-error]:text-destructive", className),
            children: prevent_snippet_stringification(($$payload4) => {
              children?.($$payload4);
              $$payload4.out.push(`<!---->`);
            }),
            $$slots: { default: true }
          }
        ]));
      };
      prevent_snippet_stringification(child);
      Label$2($$payload2, spread_props([
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          child,
          $$slots: { child: true }
        }
      ]));
    }
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Form_label.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Form_field_errors[FILENAME] = "src/lib/components/ui/form/form-field-errors.svelte";
function Form_field_errors($$payload, $$props) {
  push(Form_field_errors);
  let {
    ref = null,
    class: className,
    errorClasses,
    children: childrenProp,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    {
      let children = function($$payload3, { errors, errorProps }) {
        validate_snippet_args($$payload3);
        if (childrenProp) {
          $$payload3.out.push("<!--[-->");
          childrenProp($$payload3, { errors, errorProps });
          $$payload3.out.push(`<!---->`);
        } else {
          $$payload3.out.push("<!--[!-->");
          const each_array = ensure_array_like(errors);
          $$payload3.out.push(`<!--[-->`);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let error = each_array[$$index];
            $$payload3.out.push(`<div${spread_attributes({ ...errorProps, class: clsx(cn(errorClasses)) }, null)}>`);
            push_element($$payload3, "div", 24, 8);
            $$payload3.out.push(`${escape_html(error)}</div>`);
            pop_element();
          }
          $$payload3.out.push(`<!--]-->`);
        }
        $$payload3.out.push(`<!--]-->`);
      };
      prevent_snippet_stringification(children);
      Field_errors($$payload2, spread_props([
        { class: cn("text-destructive text-sm font-medium", className) },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        }
      ]));
    }
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Form_field_errors.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Form_field[FILENAME] = "src/lib/components/ui/form/form-field.svelte";
function Form_field($$payload, $$props) {
  push(Form_field);
  let {
    ref = null,
    class: className,
    form,
    name,
    children: childrenProp,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<!---->`);
  {
    let children = function($$payload2, { constraints, errors, tainted, value }) {
      validate_snippet_args($$payload2);
      $$payload2.out.push(`<div${spread_attributes(
        {
          "data-slot": "form-item",
          class: clsx(cn("space-y-2", className)),
          ...restProps
        },
        null
      )}>`);
      push_element($$payload2, "div", 18, 4);
      childrenProp?.($$payload2, { constraints, errors, tainted, value });
      $$payload2.out.push(`<!----></div>`);
      pop_element();
    };
    prevent_snippet_stringification(children);
    Field($$payload, { form, name, children });
  }
  $$payload.out.push(`<!---->`);
  bind_props($$props, { ref });
  pop();
}
Form_field.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Form_button[FILENAME] = "src/lib/components/ui/form/form-button.svelte";
function Form_button($$payload, $$props) {
  push(Form_button);
  let { ref = null, $$slots, $$events, ...restProps } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Button($$payload2, spread_props([
      { type: "submit" },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Form_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Control = Control$1;
Textarea[FILENAME] = "src/lib/components/ui/textarea/textarea.svelte";
function Textarea($$payload, $$props) {
  push(Textarea);
  let {
    ref = null,
    value = void 0,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<textarea${spread_attributes(
    {
      "data-slot": "textarea",
      class: clsx(cn("border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 field-sizing-content shadow-xs flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "textarea", 13, 0);
  const $$body = escape_html(value);
  if ($$body) {
    $$payload.out.push(`${$$body}`);
  }
  $$payload.out.push(`</textarea>`);
  pop_element();
  bind_props($$props, { ref, value });
  pop();
}
Textarea.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Toggle_group[FILENAME] = "src/lib/components/ui/toggle-group/toggle-group.svelte";
function setToggleGroupCtx(props) {
  setContext("toggleGroup", props);
}
function getToggleGroupCtx() {
  return getContext("toggleGroup");
}
function Toggle_group($$payload, $$props) {
  push(Toggle_group);
  let {
    ref = null,
    value = void 0,
    class: className,
    size = "default",
    variant = "default",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  setToggleGroupCtx({ variant, size });
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Toggle_group$1($$payload2, spread_props([
      {
        "data-slot": "toggle-group",
        "data-variant": variant,
        "data-size": size,
        class: cn("group/toggle-group data-[variant=outline]:shadow-xs flex w-fit items-center rounded-md", className)
      },
      restProps,
      {
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        },
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, value });
  pop();
}
Toggle_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const toggleVariants = tv({
  base: "hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  variants: {
    variant: {
      default: "bg-transparent",
      outline: "border-input shadow-xs hover:bg-accent hover:text-accent-foreground border bg-transparent"
    },
    size: {
      default: "h-9 min-w-9 px-2",
      sm: "h-8 min-w-8 px-1.5",
      lg: "h-10 min-w-10 px-2.5"
    }
  },
  defaultVariants: { variant: "default", size: "default" }
});
Toggle_group_item[FILENAME] = "src/lib/components/ui/toggle-group/toggle-group-item.svelte";
function Toggle_group_item($$payload, $$props) {
  push(Toggle_group_item);
  let {
    ref = null,
    value = void 0,
    class: className,
    size,
    variant,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const ctx = getToggleGroupCtx();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Toggle_group_item$1($$payload2, spread_props([
      {
        "data-slot": "toggle-group-item",
        "data-variant": ctx.variant || variant,
        "data-size": ctx.size || size,
        class: cn(toggleVariants({ variant: ctx.variant || variant, size: ctx.size || size }), "min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l", className),
        value
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, value });
  pop();
}
Toggle_group_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_1[FILENAME] = "src/lib/components/ui/calendar/calendar.svelte";
function Calendar_1($$payload, $$props) {
  push(Calendar_1);
  let {
    ref = null,
    value = void 0,
    placeholder = void 0,
    class: className,
    weekdayFormat = "short",
    buttonVariant = "ghost",
    captionLayout = "label",
    locale = "en-US",
    months: monthsProp,
    years,
    monthFormat: monthFormatProp,
    yearFormat = "numeric",
    day,
    disableDaysOutsideMonth = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const monthFormat = (() => {
    if (monthFormatProp) return monthFormatProp;
    if (captionLayout.startsWith("dropdown")) return "short";
    return "long";
  })();
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    {
      let children = function($$payload3, { months, weekdays }) {
        validate_snippet_args($$payload3);
        $$payload3.out.push(`<!---->`);
        Calendar_months($$payload3, {
          children: prevent_snippet_stringification(($$payload4) => {
            const each_array = ensure_array_like(months);
            $$payload4.out.push(`<!---->`);
            Calendar_nav($$payload4, {
              children: prevent_snippet_stringification(($$payload5) => {
                $$payload5.out.push(`<!---->`);
                Calendar_prev_button($$payload5, { variant: buttonVariant });
                $$payload5.out.push(`<!----> <!---->`);
                Calendar_next_button($$payload5, { variant: buttonVariant });
                $$payload5.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            });
            $$payload4.out.push(`<!----> <!--[-->`);
            for (let monthIndex = 0, $$length = each_array.length; monthIndex < $$length; monthIndex++) {
              let month = each_array[monthIndex];
              $$payload4.out.push(`<!---->`);
              Calendar_month($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->`);
                  Calendar_header($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->`);
                      Calendar_caption($$payload6, {
                        captionLayout,
                        months: monthsProp,
                        monthFormat,
                        years,
                        yearFormat,
                        month: month.value,
                        locale,
                        monthIndex,
                        get placeholder() {
                          return placeholder;
                        },
                        set placeholder($$value) {
                          placeholder = $$value;
                          $$settled = false;
                        }
                      });
                      $$payload6.out.push(`<!---->`);
                    }),
                    $$slots: { default: true }
                  });
                  $$payload5.out.push(`<!----> <!---->`);
                  Calendar_grid($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      $$payload6.out.push(`<!---->`);
                      Calendar_grid_head($$payload6, {
                        children: prevent_snippet_stringification(($$payload7) => {
                          $$payload7.out.push(`<!---->`);
                          Calendar_grid_row($$payload7, {
                            class: "select-none",
                            children: prevent_snippet_stringification(($$payload8) => {
                              const each_array_1 = ensure_array_like(weekdays);
                              $$payload8.out.push(`<!--[-->`);
                              for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                                let weekday = each_array_1[$$index];
                                $$payload8.out.push(`<!---->`);
                                Calendar_head_cell($$payload8, {
                                  children: prevent_snippet_stringification(($$payload9) => {
                                    $$payload9.out.push(`<!---->${escape_html(weekday.slice(0, 2))}`);
                                  }),
                                  $$slots: { default: true }
                                });
                                $$payload8.out.push(`<!---->`);
                              }
                              $$payload8.out.push(`<!--]-->`);
                            }),
                            $$slots: { default: true }
                          });
                          $$payload7.out.push(`<!---->`);
                        }),
                        $$slots: { default: true }
                      });
                      $$payload6.out.push(`<!----> <!---->`);
                      Calendar_grid_body($$payload6, {
                        children: prevent_snippet_stringification(($$payload7) => {
                          const each_array_2 = ensure_array_like(month.weeks);
                          $$payload7.out.push(`<!--[-->`);
                          for (let $$index_2 = 0, $$length2 = each_array_2.length; $$index_2 < $$length2; $$index_2++) {
                            let weekDates = each_array_2[$$index_2];
                            $$payload7.out.push(`<!---->`);
                            Calendar_grid_row($$payload7, {
                              class: "mt-2 w-full",
                              children: prevent_snippet_stringification(($$payload8) => {
                                const each_array_3 = ensure_array_like(weekDates);
                                $$payload8.out.push(`<!--[-->`);
                                for (let $$index_1 = 0, $$length3 = each_array_3.length; $$index_1 < $$length3; $$index_1++) {
                                  let date = each_array_3[$$index_1];
                                  $$payload8.out.push(`<!---->`);
                                  Calendar_cell($$payload8, {
                                    date,
                                    month: month.value,
                                    children: prevent_snippet_stringification(($$payload9) => {
                                      if (day) {
                                        $$payload9.out.push("<!--[-->");
                                        day($$payload9, { day: date, outsideMonth: !$14e0f24ef4ac5c92$export$5a8da0c44a3afdf2(date, month.value) });
                                        $$payload9.out.push(`<!---->`);
                                      } else {
                                        $$payload9.out.push("<!--[!-->");
                                        $$payload9.out.push(`<!---->`);
                                        Calendar_day($$payload9, {});
                                        $$payload9.out.push(`<!---->`);
                                      }
                                      $$payload9.out.push(`<!--]-->`);
                                    }),
                                    $$slots: { default: true }
                                  });
                                  $$payload8.out.push(`<!---->`);
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
            }
            $$payload4.out.push(`<!--]-->`);
          }),
          $$slots: { default: true }
        });
        $$payload3.out.push(`<!---->`);
      };
      prevent_snippet_stringification(children);
      Calendar($$payload2, spread_props([
        {
          weekdayFormat,
          disableDaysOutsideMonth,
          class: cn("bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent", className),
          locale,
          monthFormat,
          yearFormat
        },
        restProps,
        {
          get value() {
            return value;
          },
          set value($$value) {
            value = $$value;
            $$settled = false;
          },
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get placeholder() {
            return placeholder;
          },
          set placeholder($$value) {
            placeholder = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        }
      ]));
    }
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, value, placeholder });
  pop();
}
Calendar_1.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_cell[FILENAME] = "src/lib/components/ui/calendar/calendar-cell.svelte";
function Calendar_cell($$payload, $$props) {
  push(Calendar_cell);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_cell$1($$payload2, spread_props([
      {
        class: cn("size-(--cell-size) relative p-0 text-center text-sm focus-within:z-20 [&:first-child[data-selected]_[data-bits-day]]:rounded-l-md [&:last-child[data-selected]_[data-bits-day]]:rounded-r-md", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_day[FILENAME] = "src/lib/components/ui/calendar/calendar-day.svelte";
function Calendar_day($$payload, $$props) {
  push(Calendar_day);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_day$1($$payload2, spread_props([
      {
        class: cn(buttonVariants({ variant: "ghost" }), "size-(--cell-size) flex select-none flex-col items-center justify-center gap-1 whitespace-nowrap p-0 font-normal leading-none", "[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground [&[data-today][data-disabled]]:text-muted-foreground", "data-[selected]:bg-primary dark:data-[selected]:hover:bg-accent/50 data-[selected]:text-primary-foreground", "[&[data-outside-month]:not([data-selected])]:text-muted-foreground [&[data-outside-month]:not([data-selected])]:hover:text-accent-foreground", "data-[disabled]:text-muted-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", "data-[unavailable]:text-muted-foreground data-[unavailable]:line-through", "dark:hover:text-accent-foreground", "focus:border-ring focus:ring-ring/50 focus:relative", "[&>span]:text-xs [&>span]:opacity-70", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_day.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid[FILENAME] = "src/lib/components/ui/calendar/calendar-grid.svelte";
function Calendar_grid($$payload, $$props) {
  push(Calendar_grid);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_grid$1($$payload2, spread_props([
      {
        class: cn("mt-4 flex w-full border-collapse flex-col gap-1", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_header[FILENAME] = "src/lib/components/ui/calendar/calendar-header.svelte";
function Calendar_header($$payload, $$props) {
  push(Calendar_header);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_header$1($$payload2, spread_props([
      {
        class: cn("h-(--cell-size) flex w-full items-center justify-center gap-1.5 text-sm font-medium", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_months[FILENAME] = "src/lib/components/ui/calendar/calendar-months.svelte";
function Calendar_months($$payload, $$props) {
  push(Calendar_months);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      class: clsx(cn("relative flex flex-col gap-4 md:flex-row", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Calendar_months.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid_row[FILENAME] = "src/lib/components/ui/calendar/calendar-grid-row.svelte";
function Calendar_grid_row($$payload, $$props) {
  push(Calendar_grid_row);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_grid_row$1($$payload2, spread_props([
      { class: cn("flex", className) },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid_row.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid_body[FILENAME] = "src/lib/components/ui/calendar/calendar-grid-body.svelte";
function Calendar_grid_body($$payload, $$props) {
  push(Calendar_grid_body);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_grid_body$1($$payload2, spread_props([
      { class: cn(className) },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid_body.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_grid_head[FILENAME] = "src/lib/components/ui/calendar/calendar-grid-head.svelte";
function Calendar_grid_head($$payload, $$props) {
  push(Calendar_grid_head);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_grid_head$1($$payload2, spread_props([
      { class: cn(className) },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_grid_head.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_head_cell[FILENAME] = "src/lib/components/ui/calendar/calendar-head-cell.svelte";
function Calendar_head_cell($$payload, $$props) {
  push(Calendar_head_cell);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_head_cell$1($$payload2, spread_props([
      {
        class: cn("text-muted-foreground w-(--cell-size) rounded-md text-[0.8rem] font-normal", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_head_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_next_button[FILENAME] = "src/lib/components/ui/calendar/calendar-next-button.svelte";
prevent_snippet_stringification(Fallback$1);
function Fallback$1($$payload) {
  validate_snippet_args($$payload);
  Chevron_right($$payload, { class: "size-4" });
}
function Calendar_next_button($$payload, $$props) {
  push(Calendar_next_button);
  let {
    ref = null,
    class: className,
    children,
    variant = "ghost",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_next_button$1($$payload2, spread_props([
      {
        class: cn(buttonVariants({ variant }), "size-(--cell-size) select-none bg-transparent p-0 disabled:opacity-50 rtl:rotate-180", className),
        children: children || Fallback$1
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_next_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_prev_button[FILENAME] = "src/lib/components/ui/calendar/calendar-prev-button.svelte";
prevent_snippet_stringification(Fallback);
function Fallback($$payload) {
  validate_snippet_args($$payload);
  Chevron_left($$payload, { class: "size-4" });
}
function Calendar_prev_button($$payload, $$props) {
  push(Calendar_prev_button);
  let {
    ref = null,
    class: className,
    children,
    variant = "ghost",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Calendar_prev_button$1($$payload2, spread_props([
      {
        class: cn(buttonVariants({ variant }), "size-(--cell-size) select-none bg-transparent p-0 disabled:opacity-50 rtl:rotate-180", className),
        children: children || Fallback
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_prev_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_month_select[FILENAME] = "src/lib/components/ui/calendar/calendar-month-select.svelte";
function Calendar_month_select($$payload, $$props) {
  push(Calendar_month_select);
  let {
    ref = null,
    class: className,
    value,
    onchange,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<span${attr_class(clsx(cn("has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative flex rounded-md border", className)))}>`);
    push_element($$payload2, "span", 13, 0);
    $$payload2.out.push(`<!---->`);
    {
      let child = function($$payload3, { props, monthItems, selectedMonthItem }) {
        validate_snippet_args($$payload3);
        const each_array = ensure_array_like(monthItems);
        $$payload3.out.push(`<select${spread_attributes({ ...props }, null)}>`);
        push_element($$payload3, "select", 21, 6);
        $$payload3.select_value = { ...props, value }?.value;
        $$payload3.out.push(`<!--[-->`);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let monthItem = each_array[$$index];
          $$payload3.out.push(`<option${attr("value", monthItem.value)}${maybe_selected($$payload3, monthItem.value)}${attr(
            "selected",
            value !== void 0 ? monthItem.value === value : monthItem.value === selectedMonthItem.value,
            true
          )}>`);
          push_element($$payload3, "option", 23, 10);
          $$payload3.out.push(`${escape_html(monthItem.label)}</option>`);
          pop_element();
        }
        $$payload3.out.push(`<!--]-->`);
        $$payload3.select_value = void 0;
        $$payload3.out.push(`</select>`);
        pop_element();
        $$payload3.out.push(` <span class="[&amp;>svg]:text-muted-foreground flex h-8 select-none items-center gap-1 rounded-md pl-2 pr-1 text-sm font-medium [&amp;>svg]:size-3.5" aria-hidden="true">`);
        push_element($$payload3, "span", 33, 6);
        $$payload3.out.push(`${escape_html(monthItems.find((item) => item.value === value)?.label || selectedMonthItem.label)} `);
        Chevron_down($$payload3, { class: "size-4" });
        $$payload3.out.push(`<!----></span>`);
        pop_element();
      };
      prevent_snippet_stringification(child);
      Calendar_month_select$1($$payload2, spread_props([
        { class: "absolute inset-0 opacity-0" },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          child,
          $$slots: { child: true }
        }
      ]));
    }
    $$payload2.out.push(`<!----></span>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_month_select.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_year_select[FILENAME] = "src/lib/components/ui/calendar/calendar-year-select.svelte";
function Calendar_year_select($$payload, $$props) {
  push(Calendar_year_select);
  let {
    ref = null,
    class: className,
    value,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<span${attr_class(clsx(cn("has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative flex rounded-md border", className)))}>`);
    push_element($$payload2, "span", 12, 0);
    $$payload2.out.push(`<!---->`);
    {
      let child = function($$payload3, { props, yearItems, selectedYearItem }) {
        validate_snippet_args($$payload3);
        const each_array = ensure_array_like(yearItems);
        $$payload3.out.push(`<select${spread_attributes({ ...props }, null)}>`);
        push_element($$payload3, "select", 20, 6);
        $$payload3.select_value = { ...props, value }?.value;
        $$payload3.out.push(`<!--[-->`);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let yearItem = each_array[$$index];
          $$payload3.out.push(`<option${attr("value", yearItem.value)}${maybe_selected($$payload3, yearItem.value)}${attr(
            "selected",
            value !== void 0 ? yearItem.value === value : yearItem.value === selectedYearItem.value,
            true
          )}>`);
          push_element($$payload3, "option", 22, 10);
          $$payload3.out.push(`${escape_html(yearItem.label)}</option>`);
          pop_element();
        }
        $$payload3.out.push(`<!--]-->`);
        $$payload3.select_value = void 0;
        $$payload3.out.push(`</select>`);
        pop_element();
        $$payload3.out.push(` <span class="[&amp;>svg]:text-muted-foreground flex h-8 select-none items-center gap-1 rounded-md pl-2 pr-1 text-sm font-medium [&amp;>svg]:size-3.5" aria-hidden="true">`);
        push_element($$payload3, "span", 32, 6);
        $$payload3.out.push(`${escape_html(yearItems.find((item) => item.value === value)?.label || selectedYearItem.label)} `);
        Chevron_down($$payload3, { class: "size-4" });
        $$payload3.out.push(`<!----></span>`);
        pop_element();
      };
      prevent_snippet_stringification(child);
      Calendar_year_select$1($$payload2, spread_props([
        { class: "absolute inset-0 opacity-0" },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          child,
          $$slots: { child: true }
        }
      ]));
    }
    $$payload2.out.push(`<!----></span>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Calendar_year_select.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_month[FILENAME] = "src/lib/components/ui/calendar/calendar-month.svelte";
function Calendar_month($$payload, $$props) {
  push(Calendar_month);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes({ ...restProps, class: clsx(cn("flex flex-col", className)) }, null)}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Calendar_month.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_nav[FILENAME] = "src/lib/components/ui/calendar/calendar-nav.svelte";
function Calendar_nav($$payload, $$props) {
  push(Calendar_nav);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<nav${spread_attributes(
    {
      ...restProps,
      class: clsx(cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", className))
    },
    null
  )}>`);
  push_element($$payload, "nav", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></nav>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Calendar_nav.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Calendar_caption[FILENAME] = "src/lib/components/ui/calendar/calendar-caption.svelte";
function Calendar_caption($$payload, $$props) {
  push(Calendar_caption);
  let {
    captionLayout,
    months,
    monthFormat,
    years,
    yearFormat,
    month,
    locale,
    placeholder = void 0,
    monthIndex = 0
  } = $$props;
  function formatYear(date) {
    const dateObj = date.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
    if (typeof yearFormat === "function") return yearFormat(dateObj.getFullYear());
    return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, { year: yearFormat }).format(dateObj);
  }
  function formatMonth(date) {
    const dateObj = date.toDate($14e0f24ef4ac5c92$export$aa8b41735afcabd2());
    if (typeof monthFormat === "function") return monthFormat(dateObj.getMonth() + 1);
    return new $fb18d541ea1ad717$export$ad991b66133851cf(locale, { month: monthFormat }).format(dateObj);
  }
  prevent_snippet_stringification(MonthSelect);
  function MonthSelect($$payload2) {
    validate_snippet_args($$payload2);
    Calendar_month_select($$payload2, {
      months,
      monthFormat,
      value: month.month,
      onchange: (e) => {
        if (!placeholder) return;
        const v = Number.parseInt(e.currentTarget.value);
        const newPlaceholder = placeholder.set({ month: v });
        placeholder = newPlaceholder.subtract({ months: monthIndex });
      }
    });
  }
  prevent_snippet_stringification(YearSelect);
  function YearSelect($$payload2) {
    validate_snippet_args($$payload2);
    Calendar_year_select($$payload2, { years, yearFormat, value: month.year });
  }
  if (captionLayout === "dropdown") {
    $$payload.out.push("<!--[-->");
    MonthSelect($$payload);
    $$payload.out.push(`<!----> `);
    YearSelect($$payload);
    $$payload.out.push(`<!---->`);
  } else {
    $$payload.out.push("<!--[!-->");
    if (captionLayout === "dropdown-months") {
      $$payload.out.push("<!--[-->");
      MonthSelect($$payload);
      $$payload.out.push(`<!----> `);
      if (placeholder) {
        $$payload.out.push("<!--[-->");
        $$payload.out.push(`${escape_html(formatYear(placeholder))}`);
      } else {
        $$payload.out.push("<!--[!-->");
      }
      $$payload.out.push(`<!--]-->`);
    } else {
      $$payload.out.push("<!--[!-->");
      if (captionLayout === "dropdown-years") {
        $$payload.out.push("<!--[-->");
        if (placeholder) {
          $$payload.out.push("<!--[-->");
          $$payload.out.push(`${escape_html(formatMonth(placeholder))}`);
        } else {
          $$payload.out.push("<!--[!-->");
        }
        $$payload.out.push(`<!--]--> `);
        YearSelect($$payload);
        $$payload.out.push(`<!---->`);
      } else {
        $$payload.out.push("<!--[!-->");
        $$payload.out.push(`${escape_html(formatMonth(month))} ${escape_html(formatYear(month))}`);
      }
      $$payload.out.push(`<!--]-->`);
    }
    $$payload.out.push(`<!--]-->`);
  }
  $$payload.out.push(`<!--]-->`);
  bind_props($$props, { placeholder });
  pop();
}
Calendar_caption.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popover_content[FILENAME] = "src/lib/components/ui/popover/popover-content.svelte";
function Popover_content($$payload, $$props) {
  push(Popover_content);
  let {
    ref = null,
    class: className,
    sideOffset = 4,
    align = "center",
    portalProps,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Portal$1($$payload2, spread_props([
      portalProps,
      {
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Popover_content$1($$payload3, spread_props([
            {
              "data-slot": "popover-content",
              sideOffset,
              align,
              class: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-popover-content-transform-origin) outline-hidden z-50 w-72 rounded-md border p-4 shadow-md", className)
            },
            restProps,
            {
              get ref() {
                return ref;
              },
              set ref($$value) {
                ref = $$value;
                $$settled = false;
              }
            }
          ]));
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Popover_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Popover_trigger[FILENAME] = "src/lib/components/ui/popover/popover-trigger.svelte";
function Popover_trigger($$payload, $$props) {
  push(Popover_trigger);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Popover_trigger$1($$payload2, spread_props([
      { "data-slot": "popover-trigger", class: cn("", className) },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Popover_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Root$2 = Popover;
Select_group[FILENAME] = "src/lib/components/ui/select/select-group.svelte";
function Select_group($$payload, $$props) {
  push(Select_group);
  let { ref = null, $$slots, $$events, ...restProps } = $$props;
  $$payload.out.push(`<!---->`);
  Select_group$1($$payload, spread_props([{ "data-slot": "select-group" }, restProps]));
  $$payload.out.push(`<!---->`);
  bind_props($$props, { ref });
  pop();
}
Select_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_label[FILENAME] = "src/lib/components/ui/select/select-label.svelte";
function Select_label($$payload, $$props) {
  push(Select_label);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "select-label",
      class: clsx(cn("text-muted-foreground px-2 py-1.5 text-xs", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 13, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Select_label.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_item[FILENAME] = "src/lib/components/ui/select/select-item.svelte";
function Select_item($$payload, $$props) {
  push(Select_item);
  let {
    ref = null,
    class: className,
    value,
    label,
    children: childrenProp,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    {
      let children = function($$payload3, { selected, highlighted }) {
        validate_snippet_args($$payload3);
        $$payload3.out.push(`<span class="absolute right-2 flex size-3.5 items-center justify-center">`);
        push_element($$payload3, "span", 26, 4);
        if (selected) {
          $$payload3.out.push("<!--[-->");
          Check($$payload3, { class: "size-4" });
        } else {
          $$payload3.out.push("<!--[!-->");
        }
        $$payload3.out.push(`<!--]--></span>`);
        pop_element();
        $$payload3.out.push(` `);
        if (childrenProp) {
          $$payload3.out.push("<!--[-->");
          childrenProp($$payload3, { selected, highlighted });
          $$payload3.out.push(`<!---->`);
        } else {
          $$payload3.out.push("<!--[!-->");
          $$payload3.out.push(`${escape_html(label || value)}`);
        }
        $$payload3.out.push(`<!--]-->`);
      };
      prevent_snippet_stringification(children);
      Select_item$1($$payload2, spread_props([
        {
          value,
          "data-slot": "select-item",
          class: cn("data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground outline-hidden *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        }
      ]));
    }
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_scroll_up_button[FILENAME] = "src/lib/components/ui/select/select-scroll-up-button.svelte";
function Select_scroll_up_button($$payload, $$props) {
  push(Select_scroll_up_button);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Select_scroll_up_button$1($$payload2, spread_props([
      {
        "data-slot": "select-scroll-up-button",
        class: cn("flex cursor-default items-center justify-center py-1", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          Chevron_up($$payload3, { class: "size-4" });
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_scroll_up_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_scroll_down_button[FILENAME] = "src/lib/components/ui/select/select-scroll-down-button.svelte";
function Select_scroll_down_button($$payload, $$props) {
  push(Select_scroll_down_button);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Select_scroll_down_button$1($$payload2, spread_props([
      {
        "data-slot": "select-scroll-down-button",
        class: cn("flex cursor-default items-center justify-center py-1", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          Chevron_down($$payload3, { class: "size-4" });
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_scroll_down_button.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_content[FILENAME] = "src/lib/components/ui/select/select-content.svelte";
function Select_content($$payload, $$props) {
  push(Select_content);
  let {
    ref = null,
    class: className,
    sideOffset = 4,
    portalProps,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Portal$1($$payload2, spread_props([
      portalProps,
      {
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Select_content$1($$payload3, spread_props([
            {
              sideOffset,
              "data-slot": "select-content",
              class: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-(--bits-select-content-available-height) origin-(--bits-select-content-transform-origin) relative z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border shadow-md data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className)
            },
            restProps,
            {
              get ref() {
                return ref;
              },
              set ref($$value) {
                ref = $$value;
                $$settled = false;
              },
              children: prevent_snippet_stringification(($$payload4) => {
                Select_scroll_up_button($$payload4, {});
                $$payload4.out.push(`<!----> <!---->`);
                Select_viewport($$payload4, {
                  class: cn("h-(--bits-select-anchor-height) min-w-(--bits-select-anchor-width) w-full scroll-my-1 p-1"),
                  children: prevent_snippet_stringification(($$payload5) => {
                    children?.($$payload5);
                    $$payload5.out.push(`<!---->`);
                  }),
                  $$slots: { default: true }
                });
                $$payload4.out.push(`<!----> `);
                Select_scroll_down_button($$payload4, {});
                $$payload4.out.push(`<!---->`);
              }),
              $$slots: { default: true }
            }
          ]));
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Select_trigger[FILENAME] = "src/lib/components/ui/select/select-trigger.svelte";
function Select_trigger($$payload, $$props) {
  push(Select_trigger);
  let {
    ref = null,
    class: className,
    children,
    size = "default",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Select_trigger$1($$payload2, spread_props([
      {
        "data-slot": "select-trigger",
        "data-size": size,
        class: cn("border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 shadow-xs flex w-fit select-none items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          children?.($$payload3);
          $$payload3.out.push(`<!----> `);
          Chevron_down($$payload3, { class: "size-4 opacity-50" });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Select_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Root$1 = Select;
Badge[FILENAME] = "src/lib/components/ui/badge/badge.svelte";
const badgeVariants = tv({
  base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent",
      secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent",
      destructive: "bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70 border-transparent text-white",
      outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
    }
  },
  defaultVariants: { variant: "default" }
});
function Badge($$payload, $$props) {
  push(Badge);
  let {
    ref = null,
    href,
    class: className,
    variant = "default",
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  const $$tag = href ? "a" : "span";
  validate_void_dynamic_element(() => $$tag);
  validate_dynamic_element_tag(() => $$tag);
  push_element($$payload, $$tag, 36, 0);
  element(
    $$payload,
    $$tag,
    () => {
      $$payload.out.push(`${spread_attributes(
        {
          "data-slot": "badge",
          href,
          class: clsx(cn(badgeVariants({ variant }), className)),
          ...restProps
        },
        null
      )}`);
    },
    () => {
      children?.($$payload);
      $$payload.out.push(`<!---->`);
    }
  );
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Badge.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Switch[FILENAME] = "src/lib/components/ui/switch/switch.svelte";
function Switch($$payload, $$props) {
  push(Switch);
  let {
    ref = null,
    class: className,
    checked = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Switch$1($$payload2, spread_props([
      {
        "data-slot": "switch",
        class: cn("data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 shadow-xs peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        get checked() {
          return checked;
        },
        set checked($$value) {
          checked = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Switch_thumb($$payload3, {
            "data-slot": "switch-thumb",
            class: cn("bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0")
          });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, checked });
  pop();
}
Switch.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command[FILENAME] = "src/lib/components/ui/command/command.svelte";
function Command($$payload, $$props) {
  push(Command);
  let {
    ref = null,
    value = "",
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Command$1($$payload2, spread_props([
      {
        "data-slot": "command",
        class: cn("bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md", className)
      },
      restProps,
      {
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        },
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, value });
  pop();
}
Command.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_empty[FILENAME] = "src/lib/components/ui/command/command-empty.svelte";
function Command_empty($$payload, $$props) {
  push(Command_empty);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Command_empty$1($$payload2, spread_props([
      {
        "data-slot": "command-empty",
        class: cn("py-6 text-center text-sm", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Command_empty.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_group[FILENAME] = "src/lib/components/ui/command/command-group.svelte";
function Command_group($$payload, $$props) {
  push(Command_group);
  let {
    ref = null,
    class: className,
    children,
    heading,
    value,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Command_group$1($$payload2, spread_props([
      {
        "data-slot": "command-group",
        class: cn("text-foreground overflow-hidden p-1", className),
        value: value ?? heading ?? `----${useId()}`
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        children: prevent_snippet_stringification(($$payload3) => {
          if (heading) {
            $$payload3.out.push("<!--[-->");
            $$payload3.out.push(`<!---->`);
            Command_group_heading($$payload3, {
              class: "text-muted-foreground px-2 py-1.5 text-xs font-medium",
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->${escape_html(heading)}`);
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!---->`);
          } else {
            $$payload3.out.push("<!--[!-->");
          }
          $$payload3.out.push(`<!--]--> <!---->`);
          Command_group_items($$payload3, { children });
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Command_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_item[FILENAME] = "src/lib/components/ui/command/command-item.svelte";
function Command_item($$payload, $$props) {
  push(Command_item);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Command_item$1($$payload2, spread_props([
      {
        "data-slot": "command-item",
        class: cn("aria-selected:bg-accent aria-selected:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Command_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_input[FILENAME] = "src/lib/components/ui/command/command-input.svelte";
function Command_input($$payload, $$props) {
  push(Command_input);
  let {
    ref = null,
    class: className,
    value = "",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<div class="flex h-9 items-center gap-2 border-b pl-3 pr-8" data-slot="command-input-wrapper">`);
    push_element($$payload2, "div", 12, 0);
    Search($$payload2, { class: "size-4 shrink-0 opacity-50" });
    $$payload2.out.push(`<!----> <!---->`);
    Command_input$1($$payload2, spread_props([
      {
        "data-slot": "command-input",
        class: cn("placeholder:text-muted-foreground outline-hidden flex h-10 w-full rounded-md bg-transparent py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!----></div>`);
    pop_element();
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, value });
  pop();
}
Command_input.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_list[FILENAME] = "src/lib/components/ui/command/command-list.svelte";
function Command_list($$payload, $$props) {
  push(Command_list);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Command_list$1($$payload2, spread_props([
      {
        "data-slot": "command-list",
        class: cn("max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Command_list.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Command_separator[FILENAME] = "src/lib/components/ui/command/command-separator.svelte";
function Command_separator($$payload, $$props) {
  push(Command_separator);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Command_separator$1($$payload2, spread_props([
      {
        "data-slot": "command-separator",
        class: cn("bg-border -mx-1 h-px", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Command_separator.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Card[FILENAME] = "src/lib/components/ui/card/card.svelte";
function Card($$payload, $$props) {
  push(Card);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "card",
      class: clsx(cn("bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Card.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Card_content[FILENAME] = "src/lib/components/ui/card/card-content.svelte";
function Card_content($$payload, $$props) {
  push(Card_content);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "card-content",
      class: clsx(cn("px-6", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Card_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Card_description[FILENAME] = "src/lib/components/ui/card/card-description.svelte";
function Card_description($$payload, $$props) {
  push(Card_description);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<p${spread_attributes(
    {
      "data-slot": "card-description",
      class: clsx(cn("text-muted-foreground text-sm", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "p", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></p>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Card_description.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Card_footer[FILENAME] = "src/lib/components/ui/card/card-footer.svelte";
function Card_footer($$payload, $$props) {
  push(Card_footer);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "card-footer",
      class: clsx(cn("[.border-t]:pt-6 flex items-center px-6", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Card_footer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Card_header[FILENAME] = "src/lib/components/ui/card/card-header.svelte";
function Card_header($$payload, $$props) {
  push(Card_header);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "card-header",
      class: clsx(cn("@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Card_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Card_title[FILENAME] = "src/lib/components/ui/card/card-title.svelte";
function Card_title($$payload, $$props) {
  push(Card_title);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "card-title",
      class: clsx(cn("font-semibold leading-none", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Card_title.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tabs[FILENAME] = "src/lib/components/ui/tabs/tabs.svelte";
function Tabs($$payload, $$props) {
  push(Tabs);
  let {
    ref = null,
    value = "",
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Tabs$1($$payload2, spread_props([
      {
        "data-slot": "tabs",
        class: cn("flex flex-col gap-2", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, value });
  pop();
}
Tabs.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tabs_content[FILENAME] = "src/lib/components/ui/tabs/tabs-content.svelte";
function Tabs_content($$payload, $$props) {
  push(Tabs_content);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Tabs_content$1($$payload2, spread_props([
      {
        "data-slot": "tabs-content",
        class: cn("flex-1 outline-none", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Tabs_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tabs_list[FILENAME] = "src/lib/components/ui/tabs/tabs-list.svelte";
function Tabs_list($$payload, $$props) {
  push(Tabs_list);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Tabs_list$1($$payload2, spread_props([
      {
        "data-slot": "tabs-list",
        class: cn("bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Tabs_list.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Tabs_trigger[FILENAME] = "src/lib/components/ui/tabs/tabs-trigger.svelte";
function Tabs_trigger($$payload, $$props) {
  push(Tabs_trigger);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Tabs_trigger$1($$payload2, spread_props([
      {
        "data-slot": "tabs-trigger",
        class: cn("data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Tabs_trigger.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Radio_group[FILENAME] = "src/lib/components/ui/radio-group/radio-group.svelte";
function Radio_group($$payload, $$props) {
  push(Radio_group);
  let {
    ref = null,
    class: className,
    value = "",
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Radio_group$1($$payload2, spread_props([
      {
        "data-slot": "radio-group",
        class: cn("grid gap-3", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        },
        get value() {
          return value;
        },
        set value($$value) {
          value = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, value });
  pop();
}
Radio_group.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Radio_group_item[FILENAME] = "src/lib/components/ui/radio-group/radio-group-item.svelte";
function Radio_group_item($$payload, $$props) {
  push(Radio_group_item);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    {
      let children = function($$payload3, { checked }) {
        validate_snippet_args($$payload3);
        $$payload3.out.push(`<div data-slot="radio-group-indicator" class="relative flex items-center justify-center">`);
        push_element($$payload3, "div", 22, 4);
        if (checked) {
          $$payload3.out.push("<!--[-->");
          Circle($$payload3, {
            class: "fill-primary absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2"
          });
        } else {
          $$payload3.out.push("<!--[!-->");
        }
        $$payload3.out.push(`<!--]--></div>`);
        pop_element();
      };
      prevent_snippet_stringification(children);
      Radio_group_item$1($$payload2, spread_props([
        {
          "data-slot": "radio-group-item",
          class: cn("border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 shadow-xs aspect-square size-4 shrink-0 rounded-full border outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        }
      ]));
    }
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Radio_group_item.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Checkbox[FILENAME] = "src/lib/components/ui/checkbox/checkbox.svelte";
function Checkbox($$payload, $$props) {
  push(Checkbox);
  let {
    ref = null,
    class: className,
    checked = false,
    indeterminate = false,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    {
      let children = function($$payload3, { checked: checked2, indeterminate: indeterminate2 }) {
        validate_snippet_args($$payload3);
        $$payload3.out.push(`<span class="flex items-center justify-center text-current">`);
        push_element($$payload3, "span", 27, 4);
        if (indeterminate2) {
          $$payload3.out.push("<!--[-->");
          Minus($$payload3, { class: "size-4" });
        } else {
          $$payload3.out.push("<!--[!-->");
          Check($$payload3, { class: cn("size-4", !checked2 && "text-transparent") });
        }
        $$payload3.out.push(`<!--]--></span>`);
        pop_element();
      };
      prevent_snippet_stringification(children);
      Checkbox$1($$payload2, spread_props([
        {
          class: cn("border-primary focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground peer box-content size-4 shrink-0 rounded-sm border shadow focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50", className)
        },
        restProps,
        {
          get checked() {
            return checked;
          },
          set checked($$value) {
            checked = $$value;
            $$settled = false;
          },
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get indeterminate() {
            return indeterminate;
          },
          set indeterminate($$value) {
            indeterminate = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        }
      ]));
    }
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, checked, indeterminate });
  pop();
}
Checkbox.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_title[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-title.svelte";
function Alert_dialog_title($$payload, $$props) {
  push(Alert_dialog_title);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_title$1($$payload2, spread_props([
      {
        "data-slot": "alert-dialog-title",
        class: cn("text-lg font-semibold", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_title.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_action[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-action.svelte";
function Alert_dialog_action($$payload, $$props) {
  push(Alert_dialog_action);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Alert_dialog_action$1($$payload2, spread_props([
      {
        "data-slot": "alert-dialog-action",
        class: cn(buttonVariants(), className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_action.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_cancel[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-cancel.svelte";
function Alert_dialog_cancel($$payload, $$props) {
  push(Alert_dialog_cancel);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Alert_dialog_cancel$1($$payload2, spread_props([
      {
        "data-slot": "alert-dialog-cancel",
        class: cn(buttonVariants({ variant: "outline" }), className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_cancel.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_footer[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-footer.svelte";
function Alert_dialog_footer($$payload, $$props) {
  push(Alert_dialog_footer);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "alert-dialog-footer",
      class: clsx(cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_footer.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_header[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-header.svelte";
function Alert_dialog_header($$payload, $$props) {
  push(Alert_dialog_header);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div${spread_attributes(
    {
      "data-slot": "alert-dialog-header",
      class: clsx(cn("flex flex-col gap-2 text-center sm:text-left", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "div", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_overlay[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-overlay.svelte";
function Alert_dialog_overlay($$payload, $$props) {
  push(Alert_dialog_overlay);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_overlay$1($$payload2, spread_props([
      {
        "data-slot": "alert-dialog-overlay",
        class: cn("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_overlay.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_content[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-content.svelte";
function Alert_dialog_content($$payload, $$props) {
  push(Alert_dialog_content);
  let {
    ref = null,
    class: className,
    portalProps,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Portal$1($$payload2, spread_props([
      portalProps,
      {
        children: prevent_snippet_stringification(($$payload3) => {
          Alert_dialog_overlay($$payload3, {});
          $$payload3.out.push(`<!----> <!---->`);
          Alert_dialog_content$1($$payload3, spread_props([
            {
              "data-slot": "alert-dialog-content",
              class: cn("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg", className)
            },
            restProps,
            {
              get ref() {
                return ref;
              },
              set ref($$value) {
                ref = $$value;
                $$settled = false;
              }
            }
          ]));
          $$payload3.out.push(`<!---->`);
        }),
        $$slots: { default: true }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_content.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Alert_dialog_description[FILENAME] = "src/lib/components/ui/alert-dialog/alert-dialog-description.svelte";
function Alert_dialog_description($$payload, $$props) {
  push(Alert_dialog_description);
  let {
    ref = null,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    Dialog_description$1($$payload2, spread_props([
      {
        "data-slot": "alert-dialog-description",
        class: cn("text-muted-foreground text-sm", className)
      },
      restProps,
      {
        get ref() {
          return ref;
        },
        set ref($$value) {
          ref = $$value;
          $$settled = false;
        }
      }
    ]));
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref });
  pop();
}
Alert_dialog_description.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
const Root = Alert_dialog;
class RenderComponentConfig {
  component;
  props;
  constructor(component, props = {}) {
    this.component = component;
    this.props = props;
  }
}
function renderComponent(component, props = {}) {
  return new RenderComponentConfig(component, props);
}
Table[FILENAME] = "src/lib/components/ui/table/table.svelte";
function Table($$payload, $$props) {
  push(Table);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<div data-slot="table-container" class="relative w-full overflow-x-auto">`);
  push_element($$payload, "div", 11, 0);
  $$payload.out.push(`<table${spread_attributes(
    {
      "data-slot": "table",
      class: clsx(cn("w-full caption-bottom text-sm", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "table", 12, 2);
  children?.($$payload);
  $$payload.out.push(`<!----></table>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Table.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Table_body[FILENAME] = "src/lib/components/ui/table/table-body.svelte";
function Table_body($$payload, $$props) {
  push(Table_body);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<tbody${spread_attributes(
    {
      "data-slot": "table-body",
      class: clsx(cn("[&_tr:last-child]:border-0", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "tbody", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></tbody>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Table_body.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Table_cell[FILENAME] = "src/lib/components/ui/table/table-cell.svelte";
function Table_cell($$payload, $$props) {
  push(Table_cell);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<td${spread_attributes(
    {
      "data-slot": "table-cell",
      class: clsx(cn("whitespace-nowrap bg-clip-padding p-2 align-middle [&:has([role=checkbox])]:pr-0", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "td", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></td>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Table_cell.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Table_head[FILENAME] = "src/lib/components/ui/table/table-head.svelte";
function Table_head($$payload, $$props) {
  push(Table_head);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<th${spread_attributes(
    {
      "data-slot": "table-head",
      class: clsx(cn("text-foreground h-10 whitespace-nowrap bg-clip-padding px-2 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "th", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></th>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Table_head.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Table_header[FILENAME] = "src/lib/components/ui/table/table-header.svelte";
function Table_header($$payload, $$props) {
  push(Table_header);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<thead${spread_attributes(
    {
      "data-slot": "table-header",
      class: clsx(cn("[&_tr]:border-b", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "thead", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></thead>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Table_header.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
Table_row[FILENAME] = "src/lib/components/ui/table/table-row.svelte";
function Table_row($$payload, $$props) {
  push(Table_row);
  let {
    ref = null,
    class: className,
    children,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  $$payload.out.push(`<tr${spread_attributes(
    {
      "data-slot": "table-row",
      class: clsx(cn("hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors", className)),
      ...restProps
    },
    null
  )}>`);
  push_element($$payload, "tr", 11, 0);
  children?.($$payload);
  $$payload.out.push(`<!----></tr>`);
  pop_element();
  bind_props($$props, { ref });
  pop();
}
Table_row.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
tv({
  base: "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      destructive: "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current"
    }
  },
  defaultVariants: { variant: "default" }
});
Expand_toggle[FILENAME] = "src/lib/components/ui/expand-toggle/expand-toggle.svelte";
function Expand_toggle($$payload, $$props) {
  push(Expand_toggle);
  let {
    ref = null,
    checked = false,
    class: className,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  let $$settled = true;
  let $$inner_payload;
  function $$render_inner($$payload2) {
    $$payload2.out.push(`<!---->`);
    {
      let children = function($$payload3, { checked: checked2 }) {
        validate_snippet_args($$payload3);
        $$payload3.out.push(`<div class="flex items-center justify-center text-current">`);
        push_element($$payload3, "div", 25, 4);
        if (checked2) {
          $$payload3.out.push("<!--[-->");
          Minimize_2($$payload3, { class: "size-4 text-slate-500" });
        } else {
          $$payload3.out.push("<!--[!-->");
          Expand($$payload3, { class: "size-4 text-slate-500" });
        }
        $$payload3.out.push(`<!--]--></div>`);
        pop_element();
      };
      prevent_snippet_stringification(children);
      Checkbox$1($$payload2, spread_props([
        {
          class: cn("peer box-content size-5 shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get checked() {
            return checked;
          },
          set checked($$value) {
            checked = $$value;
            $$settled = false;
          },
          children,
          $$slots: { default: true }
        }
      ]));
    }
    $$payload2.out.push(`<!---->`);
  }
  do {
    $$settled = true;
    $$inner_payload = copy_payload($$payload);
    $$render_inner($$inner_payload);
  } while (!$$settled);
  assign_payload($$payload, $$inner_payload);
  bind_props($$props, { ref, checked });
  pop();
}
Expand_toggle.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  Sheet_title as $,
  Calendar_day as A,
  Button as B,
  Control as C,
  Root$3 as D,
  Dialog_content as E,
  Form_field as F,
  Dialog_header as G,
  Dialog_title as H,
  Input as I,
  Dialog_description as J,
  Root as K,
  Label as L,
  Alert_dialog_content as M,
  Alert_dialog_header as N,
  Alert_dialog_title as O,
  Popover_trigger as P,
  Alert_dialog_description as Q,
  Root$2 as R,
  Switch as S,
  Textarea as T,
  Alert_dialog_footer as U,
  Alert_dialog_cancel as V,
  Alert_dialog_action as W,
  buttonVariants as X,
  Root$5 as Y,
  Sheet_content as Z,
  Sheet_header as _,
  Form_label as a,
  Sheet_description as a0,
  Root$1 as a1,
  Select_trigger as a2,
  Select_content as a3,
  Select_item as a4,
  Select_label as a5,
  Root$4 as a6,
  Dropdown_menu_trigger as a7,
  Dropdown_menu_content as a8,
  Dropdown_menu_item as a9,
  Sidebar_menu_button as aA,
  Sidebar_menu_action as aB,
  Sidebar_provider as aC,
  Sidebar_trigger as aD,
  Card_footer as aE,
  Dropdown_menu_separator as aa,
  Badge as ab,
  Command_separator as ac,
  Select_group as ad,
  Dialog_footer as ae,
  Table as af,
  Table_header as ag,
  Table_row as ah,
  Table_head as ai,
  Table_body as aj,
  Table_cell as ak,
  Dropdown_menu_group as al,
  renderComponent as am,
  Expand_toggle as an,
  Dropdown_menu_label as ao,
  Sub as ap,
  Dropdown_menu_sub_trigger as aq,
  Dropdown_menu_sub_content as ar,
  Sidebar as as,
  Sidebar_content as at,
  Sidebar_group as au,
  Sidebar_group_label as av,
  Sidebar_group_action as aw,
  Sidebar_group_content as ax,
  Sidebar_menu as ay,
  Sidebar_menu_item as az,
  Form_field_errors as b,
  Form_button as c,
  Toggle_group as d,
  Toggle_group_item as e,
  Calendar_1 as f,
  Popover_content as g,
  Command as h,
  Command_input as i,
  Command_list as j,
  Command_empty as k,
  Command_group as l,
  Command_item as m,
  Checkbox as n,
  Card as o,
  Card_header as p,
  Card_title as q,
  Card_description as r,
  Card_content as s,
  Tabs as t,
  Tabs_list as u,
  Tabs_trigger as v,
  Tabs_content as w,
  Radio_group as x,
  Radio_group_item as y,
  Separator as z
};
