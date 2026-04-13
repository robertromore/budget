export function getAlertTypeLabel(type: string): string {
  switch (type) {
    case "price_drop":
      return "Price Drop";
    case "target_reached":
      return "Target Reached";
    case "back_in_stock":
      return "Back in Stock";
    case "any_change":
      return "Any Change";
    default:
      return type;
  }
}
