import { createAdminDomain } from "./composition";

const adminDomain = createAdminDomain();

export const adminRouter = adminDomain.adminRouter;

export { createAdminDomain } from "./composition";
export { createAdminRouter } from "./admin.controller";
