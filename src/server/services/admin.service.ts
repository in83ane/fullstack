import { connectDB } from "../db";
import User, { IUser } from "../models/User";
import { hashPassword } from "../auth/password";

export async function listAdmins(): Promise<IUser[]> {
  await connectDB();
  return User.find({ role: { $in: ["admin", "owner"] } })
    .select("_id email role createdAt")
    .sort({ createdAt: -1 })
    .lean();
}

export async function createAdminUser(data: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<IUser> {
  await connectDB();
  const passwordHash = await hashPassword(data.password);
  const email = data.email.toLowerCase().trim();
  const existing = await User.findOne({ email });
  if (existing) {
    return User.findByIdAndUpdate(
      existing._id,
      { role: "admin", isApproved: true, passwordHash },
      { new: true },
    ) as Promise<IUser>;
  }
  return User.create({
    email,
    passwordHash,
    fullName: data.fullName ?? null,
    role: "admin",
    isApproved: true,
  });
}

export async function removeAdminRole(userId: string): Promise<void> {
  await connectDB();
  await User.findByIdAndUpdate(userId, { role: "user" });
}
