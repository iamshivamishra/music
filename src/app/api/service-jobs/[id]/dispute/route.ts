import { serviceJobMutationPost } from "@/lib/api/service-job-mutation";
import { serviceJobService } from "@/lib/services/service-job.service";

export const POST = serviceJobMutationPost({
  prefix: "service-job-dispute",
  limit: 6,
  handler: (id, userId) => serviceJobService.dispute(id, userId),
});
