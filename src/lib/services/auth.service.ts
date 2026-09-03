import crypto from "crypto";
import bcrypt from "bcryptjs";
import { userRepository } from "@/lib/repositories/user.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { withTransaction } from "@/lib/db";
import { emailService } from "@/lib/services/email.service";
import { invitationService } from "@/lib/services/invitation.service";
import { producerService } from "@/lib/services/producer.service";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { SignupInput, UpdateProfileInput } from "@/lib/validators/auth";
import { mergeTaxProfile, withMaskedTaxProfile } from "@/lib/serializers/tax-profile";
import type { IUser, UserRole } from "@/types";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const authService = {
  async signup(input: SignupInput & { inviteToken?: string }): Promise<IUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    let username: string | undefined;
    if (input.role === "producer") {
      username = await producerService.allocateUniqueUsername(input.name);
    }

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: input.role,
      username,
      displayName: input.name,
    });

    logger.info("User registered", { userId: user._id, role: input.role });
    audit({ action: "user.signup", userId: user._id.toString(), metadata: { role: input.role } });

    if (input.inviteToken && input.role === "producer") {
      try {
        await invitationService.accept(input.inviteToken, user._id.toString());
      } catch (err) {
        logger.warn("Failed to apply founding invitation on signup", {
          userId: user._id.toString(),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.linkGuestPurchases(user._id.toString(), input.email).catch((err) => {
      logger.warn("Failed to link guest purchases on signup", {
        userId: user._id.toString(),
        error: err instanceof Error ? err.message : String(err),
      });
    });

    if (input.role === "producer") {
      emailService
        .sendProducerWelcome({ to: user.email, name: user.name })
        .catch(() => {
          /* already logged inside emailService */
        });
    }

    return user;
  },

  async getProfile(userId: string): Promise<IUser> {
    const user = await userRepository.findByIdWithTaxProfile(userId);
    if (!user) throw new NotFoundError("User");
    return withMaskedTaxProfile(user);
  },

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<IUser> {
    if (data.username) {
      const taken = await userRepository.usernameExists(data.username, userId);
      if (taken) throw new ConflictError("This username is already taken");
    }

    const existing = await userRepository.findByIdWithTaxProfile(userId);
    if (!existing) throw new NotFoundError("User");

    const { taxProfile, ...rest } = data;
    const update: Record<string, unknown> = { ...rest };

    const canEditTax = existing.role === "producer" || existing.role === "admin";
    if (taxProfile && canEditTax) {
      update.taxProfile = mergeTaxProfile(existing.taxProfile, taxProfile);
    }

    const updated = await userRepository.update(userId, update as Partial<IUser>);
    if (!updated) throw new NotFoundError("User");

    logger.info("Profile updated", { userId });
    audit({ action: "admin.action", userId, metadata: { event: "user.profile_update" } });

    const withTax = await userRepository.findByIdWithTaxProfile(userId);
    return withMaskedTaxProfile(withTax ?? updated);
  },

  async updateProfileImage(
    userId: string,
    type: "avatar" | "cover",
    imageUrl: string
  ): Promise<IUser> {
    const update = type === "avatar"
      ? { avatarUrl: imageUrl }
      : { coverImageUrl: imageUrl };
    const updated = await userRepository.update(userId, update);
    if (!updated) throw new NotFoundError("User");
    return updated;
  },

  async setRole(userId: string, role: UserRole): Promise<IUser> {
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) throw new NotFoundError("User");

    const updated =
      role === "producer"
        ? await producerService.ensureProducerAccount(userId)
        : await userRepository.update(userId, { role });
    if (!updated) throw new NotFoundError("User");

    logger.info("User role updated", { userId, role });
    audit({ action: "user.role_change", userId, metadata: { newRole: role } });

    const isNewProducer =
      role === "producer" && existingUser?.role !== "producer";
    if (isNewProducer) {
      emailService
        .sendProducerWelcome({ to: updated.email, name: updated.name })
        .catch(() => {
          /* already logged inside emailService */
        });
    }

    return updated;
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email, true);

    // Silent return for unknown emails or Google-only accounts (no info leakage)
    if (!user?.password) return;

    const rawToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const hash = hashToken(rawToken);
    const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await userRepository.setResetToken(user._id.toString(), hash, expiry);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    try {
      await emailService.sendPasswordReset({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (error) {
      // Swallow to prevent timing-based email enumeration.
      // The email failure is already logged inside emailService.
      logger.error("Password reset email failed (swallowed)", { userId: user._id.toString(), error });
      return;
    }

    logger.info("Password reset requested", { userId: user._id.toString() });
    audit({
      action: "user.forgot_password",
      userId: user._id.toString(),
    });
  },

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hash = hashToken(rawToken);
    const user = await userRepository.findByResetToken(hash);

    if (!user) {
      throw new AppError("Invalid or expired reset link", 400, "INVALID_TOKEN");
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const userId = user._id.toString();

    await userRepository.updatePasswordAndClearResetToken(userId, hashedPassword);

    logger.info("Password reset completed", { userId });
    audit({ action: "user.password_reset", userId });
  },

  async linkGuestPurchases(userId: string, email: string): Promise<number> {
    const { linkedPurchases, linkedOrders } = await withTransaction(async (session) => {
      const [purchases, orders] = await Promise.all([
        purchaseRepository.linkGuestPurchases(email, userId, { session }),
        orderRepository.linkGuestOrders(email, userId, { session }),
      ]);
      return { linkedPurchases: purchases, linkedOrders: orders };
    });
    const total = linkedPurchases + linkedOrders;
    if (total > 0) {
      logger.info("Linked guest purchases to new account", {
        userId, email, purchases: linkedPurchases, orders: linkedOrders,
      });
      audit({
        action: "admin.action",
        userId,
        metadata: { event: "user.guest_purchases_linked", email, purchases: linkedPurchases, orders: linkedOrders },
      });
    }
    return linkedPurchases;
  },
};
