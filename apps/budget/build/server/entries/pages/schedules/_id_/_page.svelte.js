import { p as push, y as inspect, i as push_element, o as escape_html, k as pop_element, h as pop, F as FILENAME } from "../../../../chunks/vendor-misc.js";
_page[FILENAME] = "src/routes/schedules/[id]/+page.svelte";
function _page($$payload, $$props) {
  push(_page);
  let { data } = $$props;
  const schedule = data.schedule;
  inspect([schedule]);
  $$payload.out.push(`<h1 class="text-3xl">`);
  push_element($$payload, "h1", 10, 0);
  $$payload.out.push(`Schedule: ${escape_html(schedule?.name)}</h1>`);
  pop_element();
  pop();
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
