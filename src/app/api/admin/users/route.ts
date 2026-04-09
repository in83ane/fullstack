import { NextRequest, NextResponse } from "next/server";
import { requireOwner, handleAuthError } from "@/server/auth/requireAuth";
import * as adminService from "@/server/services/admin.service";
import { z } from "zod";

const createAdminSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "fullName is required")
    .max(200, "fullName is too long")
    .regex(/^[\u0E00-\u0E7Fa-zA-Z\s'-]+$/, "Invalid characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(254)
    .toLowerCase(),
  password: z
    .string()
    .min(15, "Password doesnt meet the security requirements")
    .max(128, "Password is too long"),
});

const deleteAdminSchema = z.object({
  userId: z.string().min(1, "User identifier is required"),
});

export async function GET(request: NextRequest) {
  try {
    await requireOwner(request);
    const admins = await adminService.listAdmins();
    return NextResponse.json({ admins });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner(request);
    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const user = await adminService.createAdminUser(parsed.data);
    return NextResponse.json(
      { user: { _id: user._id, email: user.email, role: user.role } },
      { status: 201 },
    );
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireOwner(request);
    const body = await request.json();
    const parsed = deleteAdminSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    await adminService.removeAdminRole(parsed.data.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
