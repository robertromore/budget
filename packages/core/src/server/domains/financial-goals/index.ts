export {
  listGoals,
  getGoal,
  saveGoal,
  deleteGoal,
  markGoalComplete,
  calculateGoalProgress,
} from "./services";

export type { GoalProgress, GoalWithProgress, SaveGoalInput } from "./services";
