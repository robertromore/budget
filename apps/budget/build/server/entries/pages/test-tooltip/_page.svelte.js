import { p as push, i as push_element, k as pop_element, h as pop, F as FILENAME } from "../../../chunks/vendor-misc.js";
import "clsx";
import { U as Unified_chart } from "../../../chunks/data-table.js";
import "@layerstack/utils";
import "@layerstack/tailwind";
import "d3-interpolate-path";
import "@dagrejs/dagre";
import "@layerstack/utils/object";
import "d3-tile";
import "d3-sankey";
import "../../../chunks/app-state.js";
_page[FILENAME] = "src/routes/test-tooltip/+page.svelte";
function _page($$payload, $$props) {
  push(_page);
  const basicData = [
    { x: "Jan", y: 1500 },
    { x: "Feb", y: 2300 },
    { x: "Mar", y: 1800 },
    { x: "Apr", y: 2100 },
    { x: "May", y: 2500 },
    { x: "Jun", y: 2200 }
  ];
  const multiSeriesData = [
    { x: "Jan", y: 1500, series: "Income" },
    { x: "Jan", y: 1200, series: "Expenses" },
    { x: "Feb", y: 2300, series: "Income" },
    { x: "Feb", y: 1800, series: "Expenses" },
    { x: "Mar", y: 1800, series: "Income" },
    { x: "Mar", y: 1500, series: "Expenses" },
    { x: "Apr", y: 2100, series: "Income" },
    { x: "Apr", y: 1900, series: "Expenses" },
    { x: "May", y: 2500, series: "Income" },
    { x: "May", y: 2e3, series: "Expenses" },
    { x: "Jun", y: 2200, series: "Income" },
    { x: "Jun", y: 2100, series: "Expenses" }
  ];
  const pieData = [
    { x: "Groceries", y: 450, category: "Groceries" },
    { x: "Transportation", y: 320, category: "Transportation" },
    { x: "Entertainment", y: 280, category: "Entertainment" },
    { x: "Utilities", y: 200, category: "Utilities" },
    { x: "Other", y: 150, category: "Other" }
  ];
  const customTooltipContent = (data, payload) => {
    if (!data) return "";
    let html = `<div class="font-semibold">${data.x || "Value"}</div>`;
    html += '<div class="mt-1 space-y-1">';
    if (payload && payload.length > 0) {
      payload.forEach((item) => {
        const value = item.value || item.payload?.y || 0;
        html += `<div class="flex justify-between gap-4">
          <span>${item.label || item.name || "Value"}:</span>
          <span class="font-mono">$${value.toLocaleString()}</span>
        </div>`;
      });
    } else {
      html += `<div class="font-mono">$${(data.y || 0).toLocaleString()}</div>`;
    }
    html += "</div>";
    return html;
  };
  $$payload.out.push(`<div class="container mx-auto p-8 space-y-12">`);
  push_element($$payload, "div", 62, 0);
  $$payload.out.push(`<h1 class="text-3xl font-bold mb-8">`);
  push_element($$payload, "h1", 63, 2);
  $$payload.out.push(`Tooltip Configuration Examples</h1>`);
  pop_element();
  $$payload.out.push(` <section class="space-y-4">`);
  push_element($$payload, "section", 66, 2);
  $$payload.out.push(`<h2 class="text-xl font-semibold">`);
  push_element($$payload, "h2", 67, 4);
  $$payload.out.push(`1. Basic Tooltip (Default Settings)</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 68, 4);
  $$payload.out.push(`Hover over the chart to see the default tooltip with currency formatting.</p>`);
  pop_element();
  $$payload.out.push(` <div class="h-[400px] border rounded-lg p-4">`);
  push_element($$payload, "div", 71, 4);
  Unified_chart($$payload, {
    data: basicData,
    type: "bar",
    axes: { x: { title: "Month" }, y: { title: "Amount ($)" } },
    interactions: { tooltip: { enabled: true, format: "currency" } }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</section>`);
  pop_element();
  $$payload.out.push(` <section class="space-y-4">`);
  push_element($$payload, "section", 90, 2);
  $$payload.out.push(`<h2 class="text-xl font-semibold">`);
  push_element($$payload, "h2", 91, 4);
  $$payload.out.push(`2. Multi-Series Tooltip with Total</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 92, 4);
  $$payload.out.push(`Shows multiple series in the tooltip with an optional total row.</p>`);
  pop_element();
  $$payload.out.push(` <div class="h-[400px] border rounded-lg p-4">`);
  push_element($$payload, "div", 95, 4);
  Unified_chart($$payload, {
    data: multiSeriesData,
    type: "line",
    axes: { x: { title: "Month" }, y: { title: "Amount ($)" } },
    styling: { legend: { show: true, position: "top" } },
    interactions: {
      tooltip: { enabled: true, format: "currency", showTotal: true }
    }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</section>`);
  pop_element();
  $$payload.out.push(` <section class="space-y-4">`);
  push_element($$payload, "section", 118, 2);
  $$payload.out.push(`<h2 class="text-xl font-semibold">`);
  push_element($$payload, "h2", 119, 4);
  $$payload.out.push(`3. Customized Tooltip Position &amp; Style</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 120, 4);
  $$payload.out.push(`Tooltip with custom offset, anchor position, and inverted variant.</p>`);
  pop_element();
  $$payload.out.push(` <div class="h-[400px] border rounded-lg p-4">`);
  push_element($$payload, "div", 123, 4);
  Unified_chart($$payload, {
    data: basicData,
    type: "area",
    axes: { x: { title: "Month" }, y: { title: "Sales" } },
    styling: { colors: ["hsl(var(--chart-3))"] },
    interactions: {
      tooltip: {
        enabled: true,
        format: "default",
        position: "pointer",
        xOffset: 20,
        yOffset: -10,
        anchor: "bottom-right",
        variant: "invert"
      }
    }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</section>`);
  pop_element();
  $$payload.out.push(` <section class="space-y-4">`);
  push_element($$payload, "section", 150, 2);
  $$payload.out.push(`<h2 class="text-xl font-semibold">`);
  push_element($$payload, "h2", 151, 4);
  $$payload.out.push(`4. Pie Chart with Percentage Tooltip</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 152, 4);
  $$payload.out.push(`Pie chart showing category breakdown with percentage formatting.</p>`);
  pop_element();
  $$payload.out.push(` <div class="h-[400px] border rounded-lg p-4">`);
  push_element($$payload, "div", 155, 4);
  Unified_chart($$payload, {
    data: pieData,
    type: "pie",
    interactions: {
      tooltip: { enabled: true, format: "currency", position: "data" }
    }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</section>`);
  pop_element();
  $$payload.out.push(` <section class="space-y-4">`);
  push_element($$payload, "section", 171, 2);
  $$payload.out.push(`<h2 class="text-xl font-semibold">`);
  push_element($$payload, "h2", 172, 4);
  $$payload.out.push(`5. Custom Tooltip Content</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 173, 4);
  $$payload.out.push(`Using a custom content function for complete control over tooltip display.</p>`);
  pop_element();
  $$payload.out.push(` <div class="h-[400px] border rounded-lg p-4">`);
  push_element($$payload, "div", 176, 4);
  Unified_chart($$payload, {
    data: multiSeriesData,
    type: "bar",
    axes: { x: { title: "Month" }, y: { title: "Financial Data" } },
    styling: { legend: { show: true, position: "top" } },
    interactions: {
      tooltip: { enabled: true, customContent: customTooltipContent }
    }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</section>`);
  pop_element();
  $$payload.out.push(` <section class="space-y-4">`);
  push_element($$payload, "section", 198, 2);
  $$payload.out.push(`<h2 class="text-xl font-semibold">`);
  push_element($$payload, "h2", 199, 4);
  $$payload.out.push(`6. Disabled Tooltip</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 200, 4);
  $$payload.out.push(`Chart with tooltip explicitly disabled.</p>`);
  pop_element();
  $$payload.out.push(` <div class="h-[400px] border rounded-lg p-4">`);
  push_element($$payload, "div", 203, 4);
  Unified_chart($$payload, {
    data: basicData,
    type: "spline",
    axes: { x: { title: "Month" }, y: { title: "Value" } },
    interactions: { tooltip: { enabled: false } }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</section>`);
  pop_element();
  $$payload.out.push(` <section class="space-y-4">`);
  push_element($$payload, "section", 221, 2);
  $$payload.out.push(`<h2 class="text-xl font-semibold">`);
  push_element($$payload, "h2", 222, 4);
  $$payload.out.push(`7. Chart with Controls and Tooltip</h2>`);
  pop_element();
  $$payload.out.push(` <p class="text-muted-foreground">`);
  push_element($$payload, "p", 223, 4);
  $$payload.out.push(`Full-featured chart with type selector, period controls, and tooltips.</p>`);
  pop_element();
  $$payload.out.push(` <div class="h-[500px] border rounded-lg p-4">`);
  push_element($$payload, "div", 226, 4);
  Unified_chart($$payload, {
    data: multiSeriesData,
    type: "bar",
    axes: {
      x: { title: "Period", rotateLabels: true },
      y: { title: "Amount ($)", nice: true }
    },
    styling: {
      legend: { show: true, position: "top" },
      grid: { show: true, horizontal: true }
    },
    interactions: {
      tooltip: {
        enabled: true,
        format: "currency",
        showTotal: true,
        position: "pointer",
        variant: "default"
      }
    },
    controls: {
      show: true,
      availableTypes: ["bar", "line", "area", "spline"],
      allowTypeChange: true,
      allowColorChange: true,
      allowCurveChange: true
    }
  });
  $$payload.out.push(`<!----></div>`);
  pop_element();
  $$payload.out.push(`</section>`);
  pop_element();
  $$payload.out.push(`</div>`);
  pop_element();
  pop();
}
_page.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  _page as default
};
