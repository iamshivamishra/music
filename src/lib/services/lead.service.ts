import { beatRepository } from "@/lib/repositories/beat.repository";
import { leadRepository } from "@/lib/repositories/lead.repository";
import { downloadService } from "@/lib/services/download.service";
import { emailService } from "@/lib/services/email.service";
import { canGrantFreeDownload } from "@/lib/free-download";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { withFeatureFlag } from "@/lib/assert-feature";
import { toLeadsCsv, toStudioLeadRow, type StudioLeadRow } from "@/lib/serializers/lead";
import type {
  CaptureLeadInput,
  ExportLeadsQuery,
  ListLeadsQuery,
} from "@/lib/validators/lead";
import type { PaginatedResult } from "@/types";

const CSV_EXPORT_LIMIT = 5000;

async function beatTitleMap(beatIds: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(beatIds)];
  const beats = await beatRepository.findByIds(uniqueIds);
  return new Map(beats.map((beat) => [beat._id.toString(), beat.title ?? "—"]));
}

export const leadService = withFeatureFlag("freeDownloadLeads", {
  async captureAndGrant(
    beatId: string,
    input: CaptureLeadInput,
    options: { userId?: string } = {}
  ): Promise<{ downloadUrl: string; filename: string; expiresIn: number }> {
    const beat = await beatRepository.findByIdWithKeys(beatId);
    if (!beat || !canGrantFreeDownload(beat)) {
      throw new NotFoundError("Beat");
    }

    const lead = await leadRepository.upsertByIdentity({
      producerId: beat.producerId.toString(),
      beatId,
      email: input.email,
      whatsappNumber: input.whatsappNumber,
      source: "free_download",
      consentAt: new Date(),
      userId: options.userId,
    });

    const signed = await downloadService.signTaggedPreview(beat);

    audit({
      action: "lead.captured",
      userId: options.userId,
      resourceType: "lead",
      resourceId: lead._id?.toString(),
      metadata: { beatId, source: lead.source },
    });

    if (input.email) {
      void emailService.sendTaggedPreviewDownload({
        to: input.email,
        beatTitle: beat.title,
        downloadUrl: signed.url,
      });
    }

    logger.info("Free tagged download granted", {
      beatId,
      leadId: lead._id?.toString(),
    });

    return {
      downloadUrl: signed.url,
      filename: signed.filename,
      expiresIn: signed.expiresInSeconds,
    };
  },

  async listForProducer(
    producerId: string,
    query: ListLeadsQuery
  ): Promise<
    PaginatedResult<StudioLeadRow> & { beats: { id: string; title: string }[] }
  > {
    const [result, filterBeatIds] = await Promise.all([
      leadRepository.listByProducer(producerId, query),
      leadRepository.distinctBeatIds(producerId),
    ]);

    const titleIds = [
      ...result.data.map((lead) => lead.beatId.toString()),
      ...filterBeatIds,
    ];
    const titles = await beatTitleMap(titleIds);

    return {
      ...result,
      data: result.data.map((lead) =>
        toStudioLeadRow(lead, titles.get(lead.beatId.toString()) ?? "—")
      ),
      beats: filterBeatIds.map((id) => ({
        id,
        title: titles.get(id) ?? "—",
      })),
    };
  },

  async exportCsv(
    producerId: string,
    query: ExportLeadsQuery = {}
  ): Promise<string> {
    const leads = await leadRepository.listAllForExport(producerId, {
      beatId: query.beatId,
      limit: CSV_EXPORT_LIMIT,
    });
    const titles = await beatTitleMap(leads.map((lead) => lead.beatId.toString()));
    const rows = leads.map((lead) =>
      toStudioLeadRow(lead, titles.get(lead.beatId.toString()) ?? "—")
    );
    return toLeadsCsv(rows);
  },
});
