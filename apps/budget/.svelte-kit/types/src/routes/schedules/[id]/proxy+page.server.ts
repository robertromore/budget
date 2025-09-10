// @ts-nocheck
import type { PageServerLoad } from "./$types";

export const load = async ({ params, parent }: Parameters<PageServerLoad>[0]) => {
  let { schedules } = await parent();
  return {
    scheduleId: parseInt(params.id),
    schedule: schedules.find((schedule) => schedule.id === parseInt(params.id)),
  };
};
