import { p as push, l as prevent_snippet_stringification, i as push_element, o as escape_html, k as pop_element, n as ensure_array_like, h as pop, F as FILENAME, v as validate_snippet_args, $ as spread_attributes, q as stringify, m as spread_props } from "../../chunks/vendor-misc.js";
import "clsx";
import { a6 as Root, a7 as Dropdown_menu_trigger, X as buttonVariants, a8 as Dropdown_menu_content, ao as Dropdown_menu_label, aa as Dropdown_menu_separator, ap as Sub, aq as Dropdown_menu_sub_trigger, ar as Dropdown_menu_sub_content, a9 as Dropdown_menu_item, as as Sidebar, at as Sidebar_content, au as Sidebar_group, av as Sidebar_group_label, aw as Sidebar_group_action, ax as Sidebar_group_content, ay as Sidebar_menu, az as Sidebar_menu_item, aA as Sidebar_menu_button, aB as Sidebar_menu_action, aC as Sidebar_provider, aD as Sidebar_trigger } from "../../chunks/ui-components.js";
import { A as AccountsState, c as cn, S as SchedulesState, m as managingAccountId, n as newAccountDialog, f as deleteAccountId, e as deleteAccountDialog, g as managingScheduleId, h as newScheduleDialog, l as CategoriesState, P as PayeesState } from "../../chunks/app-state.js";
import { a as Check, i as Arrow_up, A as Arrow_down, P as Plus, s as Ellipsis } from "../../chunks/vendor-ui.js";
import { A as Add_account_dialog, a as Add_schedule_dialog, D as Delete_account_dialog } from "../../chunks/data-table.js";
Account_sort_dropdown[FILENAME] = "src/lib/components/shared/account-sort-dropdown.svelte";
function Account_sort_dropdown($$payload, $$props) {
  push(Account_sort_dropdown);
  let { size = "default", variant = "ghost" } = $$props;
  const accountsState = AccountsState.get();
  const currentSortField = accountsState.sortField;
  const currentSortDirection = accountsState.sortDirection;
  const sortOptions = [
    {
      field: "name",
      label: "Name",
      description: "Sort by account name"
    },
    {
      field: "balance",
      label: "Balance",
      description: "Sort by account balance"
    },
    {
      field: "dateOpened",
      label: "Date Opened",
      description: "Sort by when account was opened"
    },
    {
      field: "status",
      label: "Status",
      description: "Sort by active/closed status"
    },
    {
      field: "createdAt",
      label: "Date Created",
      description: "Sort by creation date"
    }
  ];
  const getCurrentSortIcon = () => {
    return currentSortDirection === "asc" ? Arrow_up : Arrow_down;
  };
  const handleSort = (field, direction) => {
    accountsState.setSorting(field, direction);
  };
  const getCurrentSortLabel = () => {
    const option = sortOptions.find((opt) => opt.field === currentSortField);
    return `Sorting by: ${option?.label || "Name"}`;
  };
  $$payload.out.push(`<!---->`);
  Root($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->`);
      Dropdown_menu_trigger($$payload2, {
        class: cn(buttonVariants({ variant, size }), "gap-1 data-[state=open]:bg-accent w-auto", size === "icon" ? "w-8 h-8" : "px-2"),
        title: `${getCurrentSortLabel()} (${currentSortDirection === "asc" ? "Ascending" : "Descending"})`,
        children: prevent_snippet_stringification(($$payload3) => {
          const SortIcon = getCurrentSortIcon();
          $$payload3.out.push(`<!---->`);
          SortIcon($$payload3, { class: "h-4 w-4" });
          $$payload3.out.push(`<!----> `);
          if (size !== "icon") {
            $$payload3.out.push("<!--[-->");
            $$payload3.out.push(`<span class="sr-only sm:not-sr-only sm:whitespace-nowrap text-xs">`);
            push_element($$payload3, "span", 56, 6);
            $$payload3.out.push(`${escape_html(getCurrentSortLabel())}</span>`);
            pop_element();
          } else {
            $$payload3.out.push("<!--[!-->");
          }
          $$payload3.out.push(`<!--]-->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!----> <!---->`);
      Dropdown_menu_content($$payload2, {
        align: "end",
        class: "w-52",
        children: prevent_snippet_stringification(($$payload3) => {
          const each_array = ensure_array_like(sortOptions);
          $$payload3.out.push(`<!---->`);
          Dropdown_menu_label($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->Sort accounts by`);
            }),
            $$slots: { default: true }
          });
          $$payload3.out.push(`<!----> <!---->`);
          Dropdown_menu_separator($$payload3, {});
          $$payload3.out.push(`<!----> <!--[-->`);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let option = each_array[$$index];
            $$payload3.out.push(`<!---->`);
            Sub($$payload3, {
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->`);
                Dropdown_menu_sub_trigger($$payload4, {
                  class: "gap-2",
                  children: prevent_snippet_stringification(($$payload5) => {
                    if (currentSortField === option.field) {
                      $$payload5.out.push("<!--[-->");
                      Check($$payload5, { class: "h-4 w-4 text-primary" });
                    } else {
                      $$payload5.out.push("<!--[!-->");
                      $$payload5.out.push(`<div class="h-4 w-4">`);
                      push_element($$payload5, "div", 72, 12);
                      $$payload5.out.push(`</div>`);
                      pop_element();
                    }
                    $$payload5.out.push(`<!--]--> <div class="flex flex-col items-start">`);
                    push_element($$payload5, "div", 74, 10);
                    $$payload5.out.push(`<span>`);
                    push_element($$payload5, "span", 75, 12);
                    $$payload5.out.push(`${escape_html(option.label)}</span>`);
                    pop_element();
                    $$payload5.out.push(` <span class="text-xs text-muted-foreground">`);
                    push_element($$payload5, "span", 76, 12);
                    $$payload5.out.push(`${escape_html(option.description)}</span>`);
                    pop_element();
                    $$payload5.out.push(`</div>`);
                    pop_element();
                  }),
                  $$slots: { default: true }
                });
                $$payload4.out.push(`<!----> <!---->`);
                Dropdown_menu_sub_content($$payload4, {
                  children: prevent_snippet_stringification(($$payload5) => {
                    $$payload5.out.push(`<!---->`);
                    Dropdown_menu_item($$payload5, {
                      class: "gap-2",
                      onclick: () => handleSort(option.field, "asc"),
                      children: prevent_snippet_stringification(($$payload6) => {
                        Arrow_up($$payload6, { class: "h-4 w-4" });
                        $$payload6.out.push(`<!----> <span>`);
                        push_element($$payload6, "span", 86, 12);
                        $$payload6.out.push(`Ascending</span>`);
                        pop_element();
                        $$payload6.out.push(` `);
                        if (currentSortField === option.field && currentSortDirection === "asc") {
                          $$payload6.out.push("<!--[-->");
                          Check($$payload6, { class: "h-4 w-4 ml-auto text-primary" });
                        } else {
                          $$payload6.out.push("<!--[!-->");
                        }
                        $$payload6.out.push(`<!--]-->`);
                      }),
                      $$slots: { default: true }
                    });
                    $$payload5.out.push(`<!----> <!---->`);
                    Dropdown_menu_item($$payload5, {
                      class: "gap-2",
                      onclick: () => handleSort(option.field, "desc"),
                      children: prevent_snippet_stringification(($$payload6) => {
                        Arrow_down($$payload6, { class: "h-4 w-4" });
                        $$payload6.out.push(`<!----> <span>`);
                        push_element($$payload6, "span", 97, 12);
                        $$payload6.out.push(`Descending</span>`);
                        pop_element();
                        $$payload6.out.push(` `);
                        if (currentSortField === option.field && currentSortDirection === "desc") {
                          $$payload6.out.push("<!--[-->");
                          Check($$payload6, { class: "h-4 w-4 ml-auto text-primary" });
                        } else {
                          $$payload6.out.push("<!--[!-->");
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
          }
          $$payload3.out.push(`<!--]-->`);
        }),
        $$slots: { default: true }
      });
      $$payload2.out.push(`<!---->`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!---->`);
  pop();
}
Account_sort_dropdown.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
App_sidebar[FILENAME] = "src/lib/components/layout/app-sidebar.svelte";
function App_sidebar($$payload, $$props) {
  push(App_sidebar);
  const accountsState = AccountsState.get();
  const accounts = accountsState.sorted;
  const _newAccountDialog = newAccountDialog;
  const _managingAccountId = managingAccountId;
  const _deleteAccountDialog = deleteAccountDialog;
  const _deleteAccountId = deleteAccountId;
  const schedulesState = SchedulesState.get();
  const schedules = schedulesState.schedules.values();
  const _newScheduleDialog = newScheduleDialog;
  const _managingScheduleId = managingScheduleId;
  $$payload.out.push(`<!---->`);
  Sidebar($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->`);
      Sidebar_content($$payload2, {
        children: prevent_snippet_stringification(($$payload3) => {
          $$payload3.out.push(`<!---->`);
          Sidebar_group($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->`);
              Sidebar_group_label($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<a href="/accounts">`);
                  push_element($$payload5, "a", 28, 26);
                  $$payload5.out.push(`Accounts</a>`);
                  pop_element();
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> `);
              Account_sort_dropdown($$payload4, { size: "default", variant: "outline" });
              $$payload4.out.push(`<!----> <!---->`);
              Sidebar_group_action($$payload4, {
                title: "Add Account",
                onclick: () => {
                  _managingAccountId.current = 0;
                  _newAccountDialog.setTrue();
                },
                children: prevent_snippet_stringification(($$payload5) => {
                  Plus($$payload5, {});
                  $$payload5.out.push(`<!----> <span class="sr-only">`);
                  push_element($$payload5, "span", 34, 17);
                  $$payload5.out.push(`Add Account</span>`);
                  pop_element();
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <!---->`);
              Sidebar_group_content($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->`);
                  Sidebar_menu($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      const each_array = ensure_array_like(accounts);
                      $$payload6.out.push(`<!--[-->`);
                      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                        let account = each_array[$$index];
                        $$payload6.out.push(`<!---->`);
                        Sidebar_menu_item($$payload6, {
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<!---->`);
                            {
                              let child = function($$payload8, { props }) {
                                validate_snippet_args($$payload8);
                                $$payload8.out.push(`<a${spread_attributes({ href: `/accounts/${stringify(account.id)}`, ...props }, null)}>`);
                                push_element($$payload8, "a", 42, 18);
                                $$payload8.out.push(`<span data-testid="account-name">`);
                                push_element($$payload8, "span", 43, 20);
                                $$payload8.out.push(`${escape_html(account.name)}</span>`);
                                pop_element();
                                $$payload8.out.push(`</a>`);
                                pop_element();
                              };
                              prevent_snippet_stringification(child);
                              Sidebar_menu_button($$payload7, { child, $$slots: { child: true } });
                            }
                            $$payload7.out.push(`<!----> <!---->`);
                            Root($$payload7, {
                              children: prevent_snippet_stringification(($$payload8) => {
                                $$payload8.out.push(`<!---->`);
                                {
                                  let child = function($$payload9, { props }) {
                                    validate_snippet_args($$payload9);
                                    $$payload9.out.push(`<!---->`);
                                    Sidebar_menu_action($$payload9, spread_props([
                                      props,
                                      {
                                        children: prevent_snippet_stringification(($$payload10) => {
                                          Ellipsis($$payload10, {});
                                        }),
                                        $$slots: { default: true }
                                      }
                                    ]));
                                    $$payload9.out.push(`<!---->`);
                                  };
                                  prevent_snippet_stringification(child);
                                  Dropdown_menu_trigger($$payload8, { child, $$slots: { child: true } });
                                }
                                $$payload8.out.push(`<!----> <!---->`);
                                Dropdown_menu_content($$payload8, {
                                  side: "right",
                                  align: "start",
                                  children: prevent_snippet_stringification(($$payload9) => {
                                    $$payload9.out.push(`<!---->`);
                                    Dropdown_menu_item($$payload9, {
                                      onclick: () => {
                                        _managingAccountId.current = account.id;
                                        _newAccountDialog.setTrue();
                                      },
                                      children: prevent_snippet_stringification(($$payload10) => {
                                        $$payload10.out.push(`<span>`);
                                        push_element($$payload10, "span", 60, 20);
                                        $$payload10.out.push(`Edit</span>`);
                                        pop_element();
                                      }),
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out.push(`<!----> <!---->`);
                                    Dropdown_menu_item($$payload9, {
                                      onclick: () => {
                                        _deleteAccountId.current = account.id;
                                        _deleteAccountDialog.setTrue();
                                      },
                                      children: prevent_snippet_stringification(($$payload10) => {
                                        $$payload10.out.push(`<span>`);
                                        push_element($$payload10, "span", 66, 20);
                                        $$payload10.out.push(`Delete</span>`);
                                        pop_element();
                                      }),
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out.push(`<!---->`);
                                  }),
                                  $$slots: { default: true }
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
          $$payload3.out.push(`<!----> <!---->`);
          Sidebar_group($$payload3, {
            children: prevent_snippet_stringification(($$payload4) => {
              $$payload4.out.push(`<!---->`);
              Sidebar_group_label($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<a href="/schedules">`);
                  push_element($$payload5, "a", 77, 26);
                  $$payload5.out.push(`Schedules</a>`);
                  pop_element();
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <!---->`);
              Sidebar_group_action($$payload4, {
                title: "Add Schedule",
                onclick: () => {
                  _managingScheduleId.current = 0;
                  _newScheduleDialog.setTrue();
                },
                children: prevent_snippet_stringification(($$payload5) => {
                  Plus($$payload5, {});
                  $$payload5.out.push(`<!----> <span class="sr-only">`);
                  push_element($$payload5, "span", 82, 17);
                  $$payload5.out.push(`Add Schedule</span>`);
                  pop_element();
                }),
                $$slots: { default: true }
              });
              $$payload4.out.push(`<!----> <!---->`);
              Sidebar_group_content($$payload4, {
                children: prevent_snippet_stringification(($$payload5) => {
                  $$payload5.out.push(`<!---->`);
                  Sidebar_menu($$payload5, {
                    children: prevent_snippet_stringification(($$payload6) => {
                      const each_array_1 = ensure_array_like(schedules);
                      $$payload6.out.push(`<!--[-->`);
                      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                        let schedule = each_array_1[$$index_1];
                        $$payload6.out.push(`<!---->`);
                        Sidebar_menu_item($$payload6, {
                          children: prevent_snippet_stringification(($$payload7) => {
                            $$payload7.out.push(`<!---->`);
                            {
                              let child = function($$payload8, { props }) {
                                validate_snippet_args($$payload8);
                                $$payload8.out.push(`<a${spread_attributes({ href: `/schedules/${stringify(schedule.id)}`, ...props }, null)}>`);
                                push_element($$payload8, "a", 90, 18);
                                $$payload8.out.push(`<span>`);
                                push_element($$payload8, "span", 91, 20);
                                $$payload8.out.push(`${escape_html(schedule.name)}</span>`);
                                pop_element();
                                $$payload8.out.push(`</a>`);
                                pop_element();
                              };
                              prevent_snippet_stringification(child);
                              Sidebar_menu_button($$payload7, { child, $$slots: { child: true } });
                            }
                            $$payload7.out.push(`<!----> <!---->`);
                            Root($$payload7, {
                              children: prevent_snippet_stringification(($$payload8) => {
                                $$payload8.out.push(`<!---->`);
                                {
                                  let child = function($$payload9, { props }) {
                                    validate_snippet_args($$payload9);
                                    $$payload9.out.push(`<!---->`);
                                    Sidebar_menu_action($$payload9, spread_props([
                                      props,
                                      {
                                        children: prevent_snippet_stringification(($$payload10) => {
                                          Ellipsis($$payload10, {});
                                        }),
                                        $$slots: { default: true }
                                      }
                                    ]));
                                    $$payload9.out.push(`<!---->`);
                                  };
                                  prevent_snippet_stringification(child);
                                  Dropdown_menu_trigger($$payload8, { child, $$slots: { child: true } });
                                }
                                $$payload8.out.push(`<!----> <!---->`);
                                Dropdown_menu_content($$payload8, {
                                  side: "right",
                                  align: "start",
                                  children: prevent_snippet_stringification(($$payload9) => {
                                    $$payload9.out.push(`<!---->`);
                                    Dropdown_menu_item($$payload9, {
                                      onclick: () => {
                                        _managingScheduleId.current = schedule.id;
                                        _newScheduleDialog.setTrue();
                                      },
                                      children: prevent_snippet_stringification(($$payload10) => {
                                        $$payload10.out.push(`<span>`);
                                        push_element($$payload10, "span", 108, 20);
                                        $$payload10.out.push(`Edit</span>`);
                                        pop_element();
                                      }),
                                      $$slots: { default: true }
                                    });
                                    $$payload9.out.push(`<!---->`);
                                  }),
                                  $$slots: { default: true }
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
  $$payload.out.push(`<!---->`);
  pop();
}
App_sidebar.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
_layout[FILENAME] = "src/routes/+layout.svelte";
function _layout($$payload, $$props) {
  push(_layout);
  let { data, children } = $$props;
  const { accounts, payees, categories, schedules } = data;
  AccountsState.set(/* @__PURE__ */ (() => accounts)());
  SchedulesState.set(/* @__PURE__ */ (() => schedules)());
  CategoriesState.set(/* @__PURE__ */ (() => categories)());
  PayeesState.set(/* @__PURE__ */ (() => payees)());
  Add_account_dialog($$payload);
  $$payload.out.push(`<!----> `);
  Add_schedule_dialog($$payload);
  $$payload.out.push(`<!----> `);
  Delete_account_dialog($$payload);
  $$payload.out.push(`<!----> <div class="bg-background">`);
  push_element($$payload, "div", 34, 0);
  $$payload.out.push(`<div class="grid">`);
  push_element($$payload, "div", 35, 2);
  $$payload.out.push(`<!---->`);
  Sidebar_provider($$payload, {
    children: prevent_snippet_stringification(($$payload2) => {
      App_sidebar($$payload2);
      $$payload2.out.push(`<!----> <main class="w-full">`);
      push_element($$payload2, "main", 38, 6);
      $$payload2.out.push(`<div class="fixed">`);
      push_element($$payload2, "div", 39, 8);
      $$payload2.out.push(`<!---->`);
      Sidebar_trigger($$payload2, {});
      $$payload2.out.push(`<!----></div>`);
      pop_element();
      $$payload2.out.push(` <div class="col-span-3 lg:col-span-4">`);
      push_element($$payload2, "div", 42, 8);
      $$payload2.out.push(`<div class="h-full px-4 py-6 lg:px-8">`);
      push_element($$payload2, "div", 43, 10);
      children?.($$payload2);
      $$payload2.out.push(`<!----></div>`);
      pop_element();
      $$payload2.out.push(`</div>`);
      pop_element();
      $$payload2.out.push(`</main>`);
      pop_element();
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  pop();
}
_layout.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _layout as default
};
