import { beatCommandService } from "./beat-command.service";
import { beatQueryService } from "./beat-query.service";
import { beatPageService } from "./beat-page.service";

export { beatCommandService } from "./beat-command.service";
export { beatQueryService } from "./beat-query.service";
export { beatPageService } from "./beat-page.service";

/**
 * Combined facade for backward compatibility.
 * Existing code can continue importing `beatService` from this module.
 */
export const beatService = {
  ...beatQueryService,
  ...beatCommandService,
  ...beatPageService,
};
