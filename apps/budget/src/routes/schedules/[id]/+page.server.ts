import type {PageServerLoad} from "./$types";

export const load: PageServerLoad = async ({params, parent}) => {
  let {schedules} = await parent();
  return {
    scheduleId: parseInt(params.id),
    schedule: schedules.find((schedule) => schedule.id === parseInt(params.id)),
  };
};
