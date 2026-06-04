import { z } from "zod";
import { ShiftSource, ShiftStatus, UserRole } from "./enums";

export const userSchema = z.object({
  name: z.string().min(2),
  role: z.enum([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EMPLOYEE]),
  color: z.string().min(4),
  isActive: z.boolean()
});

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

export const zoneSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.coerce.number().int(),
  dayStartTime: hhmm.default("10:00"),
  dayEndTime: hhmm.default("22:00"),
  lunchStartTime: hhmm.optional().or(z.literal("")),
  lunchEndTime: hhmm.optional().or(z.literal("")),
  isActive: z.boolean().optional()
});

export const userZoneIdsSchema = z.object({
  userId: z.string().cuid(),
  zoneIds: z.array(z.string().cuid())
});

export const zoneLimitSchema = z.object({
  zoneId: z.string().cuid(),
  dayOfWeek: z.coerce.number().int().min(1).max(7).nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxEmployees: z.coerce.number().int().min(1)
});

export const shiftSchema = z.object({
  userId: z.string().cuid(),
  zoneId: z.string().cuid(),
  weekStartDate: z.coerce.date(),
  dayOfWeek: z.coerce.number().int().min(1).max(7),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  source: z.enum([ShiftSource.SELF, ShiftSource.ADMIN]).default(ShiftSource.SELF),
  comment: z.string().optional()
});

export const updateShiftSchema = shiftSchema.partial().extend({
  id: z.string().cuid(),
  status: z.enum([ShiftStatus.PLANNED, ShiftStatus.IN_PROGRESS, ShiftStatus.COMPLETED, ShiftStatus.CANCELLED]).optional()
});

export const reportSchema = z.object({
  shiftId: z.string().cuid(),
  text: z.string().min(5),
  salesAmountCardRub: z.coerce.number().finite().min(0, "Укажите сумму по карте (0 или больше)"),
  salesAmountCashRub: z.coerce.number().finite().min(0, "Укажите сумму наличными (0 или больше)"),
  photoInsidePath: z.string().min(1),
  workplacePhotoPath: z.string().min(1),
  photoOutsidePath: z.string().min(1),
  photoElectricalPanelPath: z.string().min(1),
  photoClosingReceiptPath: z.string().min(1)
});

export const updateReportSchema = z.object({
  reportId: z.string().cuid(),
  text: z.string().min(5)
});
