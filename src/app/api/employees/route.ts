import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  handleAuthError,
  requireAdminOnly,
} from "@/server/auth/requireAuth";
import * as employeeService from "@/server/services/employee.service";
import { z } from "zod";

const createEmployeeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(200, 'Name is too long')
    .regex(/^[\u0E00-\u0E7Fa-zA-Z\s'-]+$/, 'Invalid characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(254, 'Email is too long')
    .toLowerCase(),
  password: z
    .string()
    .min(15, 'Password doesnt meet the security requirments')
    .max(128, 'Password is too long'),
  departmentId: z.string().nullish().transform(v => v ?? undefined),
  imageUrl: z.string().nullish().transform(v => v ?? undefined),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const pending = request.nextUrl.searchParams.get("pending") === "true";
    const disabled = request.nextUrl.searchParams.get("disabled") === "true";
    const active = request.nextUrl.searchParams.get("active");
    const userId = request.nextUrl.searchParams.get("userId") ?? undefined;

    const employees = await employeeService.listEmployees({
      pending: pending || undefined,
      disabled: disabled || undefined,
      active: active === null ? undefined : active === "true",
      userId,
    });

    return NextResponse.json({ employees });
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminOnly(request);
    const body = await request.json();

    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input data";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const employee = await employeeService.createEmployee(parsed.data);

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return handleAuthError(error);
  }
}
