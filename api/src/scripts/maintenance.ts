import { loadEnv } from "../config/env.js";
import { createContainer } from "../container.js";
import { runMaintenance } from "../modules/maintenance/maintenance.js";

/** One maintenance run, for a cron job or by hand: `npm run maintenance`. */
const { db, storage, close } = createContainer(loadEnv(), { withoutDemoData: true });
try {
  console.log(JSON.stringify(await runMaintenance({ db, storage }), null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  close();
}
