import { serviceJobMutationPost } from "@/lib/api/service-job-mutation";
import { serviceJobService } from "@/lib/services/service-job.service";

export const POST = serviceJobMutationPost({
  prefix: "service-job-decline",
  actor: "producer",
  handler: (id, userId) => serviceJobService.decline(id, userId),
});
