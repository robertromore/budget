import { p as push, n as ensure_array_like, l as prevent_snippet_stringification, i as push_element, j as attr, q as stringify, o as escape_html, k as pop_element, h as pop, F as FILENAME } from "../../../chunks/vendor-misc.js";
import { D as Delete_account_dialog, A as Add_account_dialog } from "../../../chunks/data-table.js";
import { B as Button, o as Card, p as Card_header, q as Card_title, r as Card_description, s as Card_content, aE as Card_footer } from "../../../chunks/ui-components.js";
import "clsx";
import { A as AccountsState, a as currencyFormatter, m as managingAccountId, n as newAccountDialog, f as deleteAccountId, e as deleteAccountDialog } from "../../../chunks/app-state.js";
_page[FILENAME] = "src/routes/accounts/+page.svelte";
function _page($$payload, $$props) {
  push(_page);
  const accountsState = AccountsState.get();
  const accounts = accountsState.accounts.values();
  let deleteDialogId = deleteAccountId;
  let deleteDialogOpen = deleteAccountDialog;
  const deleteAccount = (id) => {
    deleteDialogId.current = id;
    deleteDialogOpen.setTrue();
  };
  const dialogOpen = newAccountDialog;
  const managingAccount = managingAccountId;
  const editAccount = (id) => {
    managingAccount.current = id;
    dialogOpen.current = true;
  };
  const each_array = ensure_array_like(accounts);
  Button($$payload, {
    onclick: () => {
      managingAccount.current = 0;
      dialogOpen.current = true;
    },
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->Add Account`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">`);
  push_element($$payload, "div", 42, 0);
  $$payload.out.push(`<!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let { id, name, balance, notes } = each_array[$$index];
    $$payload.out.push(`<!---->`);
    Card($$payload, {
      children: prevent_snippet_stringification(($$payload2) => {
        $$payload2.out.push(`<!---->`);
        Card_header($$payload2, {
          children: prevent_snippet_stringification(($$payload3) => {
            $$payload3.out.push(`<!---->`);
            Card_title($$payload3, {
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<a${attr("href", `/accounts/${stringify(id)}`)} class="text-foreground hover:text-primary focus:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded">`);
                push_element($$payload4, "a", 47, 10);
                $$payload4.out.push(`${escape_html(name)}</a>`);
                pop_element();
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!----> <!---->`);
            Card_description($$payload3, {
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->${escape_html((notes?.length || 0) > 100 ? notes?.substring(0, 100) + "..." : notes)}`);
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!---->`);
          }),
          $$slots: { default: true }
        });
        $$payload2.out.push(`<!----> <!---->`);
        Card_content($$payload2, {
          children: prevent_snippet_stringification(($$payload3) => {
            $$payload3.out.push(`<strong>`);
            push_element($$payload3, "strong", 59, 8);
            $$payload3.out.push(`Balance:</strong>`);
            pop_element();
            $$payload3.out.push(` ${escape_html(currencyFormatter.format(balance ?? 0))}`);
          }),
          $$slots: { default: true }
        });
        $$payload2.out.push(`<!----> <!---->`);
        Card_footer($$payload2, {
          class: "flex gap-2",
          children: prevent_snippet_stringification(($$payload3) => {
            Button($$payload3, {
              onclick: () => editAccount(id),
              variant: "outline",
              size: "sm",
              "aria-label": `Edit account ${stringify(name)}`,
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->Edit`);
              }),
              $$slots: { default: true }
            });
            $$payload3.out.push(`<!----> `);
            Button($$payload3, {
              onclick: () => deleteAccount(id),
              variant: "secondary",
              size: "sm",
              "aria-label": `Delete account ${stringify(name)}`,
              children: prevent_snippet_stringification(($$payload4) => {
                $$payload4.out.push(`<!---->Delete`);
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
  }
  $$payload.out.push(`<!--]--></div>`);
  pop_element();
  $$payload.out.push(` `);
  Delete_account_dialog($$payload);
  $$payload.out.push(`<!----> `);
  Add_account_dialog($$payload);
  $$payload.out.push(`<!---->`);
  pop();
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
