import * as homes from "$core/query/home-homes";
import * as locations from "$core/query/home-locations";
import * as items from "$core/query/home-items";
import * as labels from "$core/query/home-labels";
import * as floorPlans from "$core/query/home-floor-plans";
import * as maintenance from "$core/query/home-maintenance";
import * as attachments from "$core/query/home-attachments";

export const rpc = {
  homes,
  locations,
  items,
  labels,
  floorPlans,
  maintenance,
  attachments,
} as const;

export { queryClient, queryPresets } from "$core/query/_client";
export { createQueryKeys, defineMutation, defineQuery } from "$core/query/_factory";

export { homeKeys } from "$core/query/home-homes";
export { homeLocationKeys } from "$core/query/home-locations";
export { homeItemKeys } from "$core/query/home-items";
export { homeLabelKeys } from "$core/query/home-labels";
export { floorPlanKeys } from "$core/query/home-floor-plans";
export { homeMaintenanceKeys } from "$core/query/home-maintenance";
export { homeAttachmentKeys } from "$core/query/home-attachments";
