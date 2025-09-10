const load = async ({ params, parent }) => {
  let { schedules } = await parent();
  return {
    scheduleId: parseInt(params.id),
    schedule: schedules.find((schedule) => schedule.id === parseInt(params.id))
  };
};
export {
  load
};
