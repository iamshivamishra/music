import bcrypt from "bcryptjs";
import { userRepository } from "@/lib/repositories/user.repository";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { SignupInput, LoginInput } from "@/lib/validators/auth";
import type { IUser, UserRole } from "@/types";

const BCRYPT_ROUNDS = 12;

function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const authService = {
  async signup(input: SignupInput): Promise<IUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    let username: string | undefined;
    if (input.role === "producer") {
      username = generateUsername(input.name);
      const taken = await userRepository.usernameExists(username);
      if (taken) {
        username = `${username}-${Date.now().toString(36)}`;
      }
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
    return user;
  },

  async login(input: LoginInput): Promise<IUser> {
    const user = await userRepository.findByEmail(input.email, true);
    if (!user || !user.password) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValid = await bcrypt.compare(input.password, user.password);
    if (!isValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    logger.info("User logged in", { userId: user._id });
    audit({ action: "user.login", userId: user._id.toString() });

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as IUser;
  },

  async setRole(userId: string, role: UserRole): Promise<IUser> {
    let username: string | undefined;
    if (role === "producer") {
      const user = await userRepository.findById(userId);
      if (user) {
        username = generateUsername(user.name);
        const taken = await userRepository.usernameExists(username, userId);
        if (taken) {
          username = `${username}-${Date.now().toString(36)}`;
        }
      }
    }

    const updated = await userRepository.update(userId, {
      role,
      ...(username ? { username, displayName: (await userRepository.findById(userId))?.name } : {}),
    });
    if (!updated) throw new Error("User not found");

    logger.info("User role updated", { userId, role });
    audit({ action: "user.role_change", userId, metadata: { newRole: role } });
    return updated;
  },

  async getProfile(userId: string): Promise<IUser | null> {
    return userRepository.findById(userId);
  },
};
