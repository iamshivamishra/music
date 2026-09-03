import { serviceJobMutationPost } from "@/lib/api/service-job-mutation";
import { serviceJobService } from "@/lib/services/service-job.service";

export const POST = serviceJobMutationPost({
  prefix: "service-job-complete",
  handler: (id, userId) => serviceJobService.complete(id, userId),
});
