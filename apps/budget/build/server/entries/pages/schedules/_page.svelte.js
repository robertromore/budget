import { p as push, n as ensure_array_like, l as prevent_snippet_stringification, i as push_element, o as escape_html, k as pop_element, h as pop, F as FILENAME } from "../../../chunks/vendor-misc.js";
import { B as Button } from "../../../chunks/ui-components.js";
import { g as managingScheduleId, h as newScheduleDialog } from "../../../chunks/app-state.js";
_page[FILENAME] = "src/routes/schedules/+page.svelte";
function _page($$payload, $$props) {
  push(_page);
  let { data } = $$props;
  const schedules = data.schedules;
  const each_array = ensure_array_like(schedules);
  Button($$payload, {
    onclick: () => {
      managingScheduleId.current = 0;
      newScheduleDialog.current = true;
    },
    children: prevent_snippet_stringification(($$payload2) => {
      $$payload2.out.push(`<!---->Add Schedule`);
    }),
    $$slots: { default: true }
  });
  $$payload.out.push(`<!----> <!--[-->`);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let schedule = each_array[$$index];
    $$payload.out.push(`<div class="schedule">`);
    push_element($$payload, "div", 16, 2);
    $$payload.out.push(`<h2>`);
    push_element($$payload, "h2", 17, 4);
    $$payload.out.push(`${escape_html(schedule.name)}</h2>`);
    pop_element();
    $$payload.out.push(`</div>`);
    pop_element();
  }
  $$payload.out.push(`<!--]-->`);
  pop();
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
