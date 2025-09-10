import {test, expect} from "@playwright/test";

test.describe("Widget Drag and Drop - Manual Testing", () => {
  test("should demonstrate widget drag and drop functionality", async ({page}) => {
    // Navigate to the account page
    await page.goto("http://localhost:3000/accounts/1");
    await page.waitForLoadState("networkidle");

    // Take initial screenshot
    await page.screenshot({path: "test-results/manual-01-initial-page.png", fullPage: true});

    // Find and click the Customize button to enter edit mode
    const customizeButton = page.locator("button", {hasText: /customize/i}).first();
    await expect(customizeButton).toBeVisible({timeout: 10000});
    await customizeButton.click();
    await page.waitForTimeout(1000); // Wait for edit mode to activate

    // Take screenshot after entering edit mode
    await page.screenshot({path: "test-results/manual-02-edit-mode-active.png", fullPage: true});

    // Find all widget wrappers (the draggable containers)
    const widgets = page.locator('.widget-wrapper[draggable="true"]');
    const widgetCount = await widgets.count();

    console.log(`Found ${widgetCount} draggable widgets`);
    expect(widgetCount).toBeGreaterThan(0);

    if (widgetCount >= 2) {
      // Get the text content of the first two widgets to track their positions
      const firstWidget = widgets.first();
      const secondWidget = widgets.nth(1);

      // Get widget data attributes or text to identify them
      const firstWidgetId =
        (await firstWidget.getAttribute("data-widget-id")) ||
        (await firstWidget.locator("[data-widget-id]").first().getAttribute("data-widget-id"));
      const secondWidgetId =
        (await secondWidget.getAttribute("data-widget-id")) ||
        (await secondWidget.locator("[data-widget-id]").first().getAttribute("data-widget-id"));

      const firstWidgetText = await firstWidget.textContent();
      const secondWidgetText = await secondWidget.textContent();

      console.log(`Widget 1 ID: ${firstWidgetId}, Text: "${firstWidgetText?.slice(0, 30)}..."`);
      console.log(`Widget 2 ID: ${secondWidgetId}, Text: "${secondWidgetText?.slice(0, 30)}..."`);

      // Test manual drag and drop using mouse events that work with HTML5 drag/drop
      await page.evaluate(async () => {
        const firstWidget = document.querySelector(
          '.widget-wrapper[draggable="true"]'
        ) as HTMLElement;
        const secondWidget = document.querySelector(
          '.widget-wrapper[draggable="true"]:nth-child(2)'
        ) as HTMLElement;

        if (firstWidget && secondWidget) {
          // Create and dispatch drag events
          const dragStartEvent = new DragEvent("dragstart", {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer(),
          });

          // Set drag data
          dragStartEvent.dataTransfer?.setData(
            "text/plain",
            firstWidget.querySelector("[data-widget-id]")?.getAttribute("data-widget-id") || ""
          );

          // Start drag
          firstWidget.dispatchEvent(dragStartEvent);

          // Wait a bit
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Dragover on target
          const dragOverEvent = new DragEvent("dragover", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dragStartEvent.dataTransfer,
          });
          secondWidget.dispatchEvent(dragOverEvent);

          // Drop on target
          const dropEvent = new DragEvent("drop", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dragStartEvent.dataTransfer,
          });
          secondWidget.dispatchEvent(dropEvent);

          // End drag
          const dragEndEvent = new DragEvent("dragend", {
            bubbles: true,
            cancelable: true,
            dataTransfer: dragStartEvent.dataTransfer,
          });
          firstWidget.dispatchEvent(dragEndEvent);
        }
      });

      // Wait for any animations or updates
      await page.waitForTimeout(2000);

      // Take screenshot after drag attempt
      await page.screenshot({path: "test-results/manual-03-after-drag.png", fullPage: true});

      // Check if order changed by comparing widget positions
      const updatedWidgets = page.locator('.widget-wrapper[draggable="true"]');
      const newFirstWidget = updatedWidgets.first();
      const newSecondWidget = updatedWidgets.nth(1);

      const newFirstWidgetId =
        (await newFirstWidget.getAttribute("data-widget-id")) ||
        (await newFirstWidget.locator("[data-widget-id]").first().getAttribute("data-widget-id"));
      const newSecondWidgetId =
        (await newSecondWidget.getAttribute("data-widget-id")) ||
        (await newSecondWidget.locator("[data-widget-id]").first().getAttribute("data-widget-id"));

      const newFirstWidgetText = await newFirstWidget.textContent();
      const newSecondWidgetText = await newSecondWidget.textContent();

      console.log(
        `After drag - Widget 1 ID: ${newFirstWidgetId}, Text: "${newFirstWidgetText?.slice(0, 30)}..."`
      );
      console.log(
        `After drag - Widget 2 ID: ${newSecondWidgetId}, Text: "${newSecondWidgetText?.slice(0, 30)}..."`
      );

      // Check if positions swapped
      const positionsSwapped =
        (firstWidgetId === newSecondWidgetId && secondWidgetId === newFirstWidgetId) ||
        (firstWidgetText !== newFirstWidgetText && secondWidgetText !== newSecondWidgetText);

      console.log(`Positions swapped: ${positionsSwapped}`);

      // Test drop zone functionality by trying to drop on drop zones
      console.log("Testing drop zone functionality...");

      // Try dropping on a drop zone if available
      await page.evaluate(() => {
        const dropZones = document.querySelectorAll('.drop-zone-overlay, [class*="drop-zone"]');
        console.log(`Found ${dropZones.length} drop zones`);
        return dropZones.length;
      });

      // Test wiggling/rapid movement detection
      console.log("Testing for smooth drag behavior...");

      let rapidMovements = 0;
      const monitorMovements = page.locator(".widget-wrapper").first();

      // Start another drag to monitor for wiggling
      await page.evaluate(() => {
        let movementCount = 0;
        const widget = document.querySelector('.widget-wrapper[draggable="true"]') as HTMLElement;

        if (widget) {
          // Monitor transform changes
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === "attributes" && mutation.attributeName === "style") {
                const style = (mutation.target as HTMLElement).style;
                if (style.transform && style.transform.includes("translate")) {
                  movementCount++;
                }
              }
            });
          });

          observer.observe(widget, {attributes: true, attributeFilter: ["style"]});

          // Start a drag operation
          const dragEvent = new DragEvent("dragstart", {
            bubbles: true,
            dataTransfer: new DataTransfer(),
          });
          widget.dispatchEvent(dragEvent);

          // Stop monitoring after 1 second
          setTimeout(() => {
            observer.disconnect();
            console.log(`Detected ${movementCount} rapid movements during drag`);
            (window as any).movementCount = movementCount;
          }, 1000);
        }
      });

      await page.waitForTimeout(1200);

      const movementCount = await page.evaluate(() => (window as any).movementCount || 0);
      console.log(`Rapid movements detected: ${movementCount}`);

      // Take final screenshot
      await page.screenshot({path: "test-results/manual-04-final-state.png", fullPage: true});
    }

    // Test exiting edit mode
    const doneButton = page.locator("button", {hasText: /done/i}).first();
    if (await doneButton.isVisible()) {
      await doneButton.click();
      await page.waitForTimeout(1000);

      // Take screenshot after exiting edit mode
      await page.screenshot({path: "test-results/manual-05-exit-edit-mode.png", fullPage: true});

      // Verify widgets are no longer draggable
      const remainingDraggableWidgets = page.locator('[draggable="true"]');
      const remainingCount = await remainingDraggableWidgets.count();
      console.log(`Draggable widgets after exiting edit mode: ${remainingCount}`);
      expect(remainingCount).toBe(0);
    }

    console.log("Manual drag and drop testing completed!");
  });
});
