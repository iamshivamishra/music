import { connectDB } from "@/lib/db";
import Invitation from "@/lib/models/Invitation";
import type { IInvitation } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

const FOLLOW_UP_FIELDS = {
  3: "followUp3SentAt",
  7: "followUp7SentAt",
} as const;

function followUpField(day: 3 | 7): (typeof FOLLOW_UP_FIELDS)[3 | 7] {
  return FOLLOW_UP_FIELDS[day];
}

export const invitationRepository = {
  async create(data: Partial<IInvitation>): Promise<IInvitation> {
    await connectDB();
    const invitation = await Invitation.create(data);
    return invitation.toObject() as unknown as IInvitation;
  },

  async findByToken(token: string): Promise<IInvitation | null> {
    await connectDB();
    return Invitation.findOne({ token }).lean<IInvitation>();
  },

  async findByEmail(email: string): Promise<IInvitation | null> {
    await connectDB();
    return Invitation.findOne({ email: email.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean<IInvitation>();
  },

  async markAccepted(token: string, options: RepoOptions = {}): Promise<IInvitation | null> {
    await connectDB();
    return Invitation.findOneAndUpdate(
      { token },
      { status: "accepted", acceptedAt: new Date() },
      { new: true, session: options.session }
    ).lean<IInvitation>();
  },

  async markExpiredSent(): Promise<number> {
    await connectDB();
    const result = await Invitation.updateMany(
      { status: "sent", expiresAt: { $lt: new Date() } },
      { $set: { status: "expired" } }
    );
    return result.modifiedCount;
  },

  async findDueFollowUps(day: 3 | 7, acceptedBefore: Date): Promise<IInvitation[]> {
    await connectDB();
    const field = followUpField(day);
    return Invitation.find({
      status: "accepted",
      producerTier: "founding",
      acceptedAt: { $lte: acceptedBefore },
      $or: [{ [field]: { $exists: false } }, { [field]: null }],
    }).lean<IInvitation[]>();
  },

  async markFollowUpSent(id: string, day: 3 | 7): Promise<void> {
    await connectDB();
    const field = followUpField(day);
    await Invitation.findByIdAndUpdate(id, { $set: { [field]: new Date() } });
  },

  async findAll(page = 1, limit = 50): Promise<{ data: IInvitation[]; total: number }> {
    await connectDB();
    const [data, total] = await Promise.all([
      Invitation.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IInvitation[]>(),
      Invitation.countDocuments(),
    ]);
    return { data, total };
  },
};
