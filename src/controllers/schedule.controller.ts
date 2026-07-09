import { Response } from 'express';
import { Schedule } from '../models/Schedule.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';

function mapScheduleEntry(entry: InstanceType<typeof Schedule>) {
  return {
    id: entry._id.toString(),
    title: entry.title,
    description: entry.description ?? undefined,
    program: entry.program ?? undefined,
    startDate: entry.startDate.toISOString(),
    endDate: entry.endDate ? entry.endDate.toISOString() : undefined,
    fileUrl: entry.fileUrl ?? undefined,
    fileName: entry.fileName ?? undefined,
    uploadedAt: entry.createdAt.toISOString(),
  };
}

export async function listAdminSchedules(_req: AuthRequest, res: Response): Promise<void> {
  const entries = await Schedule.find().sort({ startDate: -1 });
  res.json({
    success: true,
    data: entries.map(mapScheduleEntry),
  });
}

export async function uploadSchedule(req: AuthRequest, res: Response): Promise<void> {
  const { title, description, program, startDate, endDate } = req.body as Record<string, string>;

  if (!title?.trim() || !startDate) {
    res.status(400).json({ success: false, message: 'Title and start date are required.' });
    return;
  }

  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    res.status(400).json({ success: false, message: 'Invalid start date.' });
    return;
  }

  let end: Date | undefined;
  if (endDate) {
    end = new Date(endDate);
    if (Number.isNaN(end.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid end date.' });
      return;
    }
  }

  const file = req.file;
  const entry = await Schedule.create({
    title: title.trim(),
    description: description?.trim() || undefined,
    program: program?.trim() || undefined,
    startDate: start,
    endDate: end,
    fileUrl: file ? `/uploads/schedules/${file.filename}` : undefined,
    fileName: file?.originalname,
    uploadedBy: req.user!.userId,
  });

  res.json({
    success: true,
    message: 'Schedule published successfully.',
    data: mapScheduleEntry(entry),
  });
}

export async function deleteSchedule(req: AuthRequest, res: Response): Promise<void> {
  const entry = await Schedule.findByIdAndDelete(req.params.id);
  if (!entry) {
    res.status(404).json({ success: false, message: 'Schedule entry not found.' });
    return;
  }
  res.json({ success: true, message: 'Schedule deleted.' });
}

export async function listStudentSchedules(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const enrolledProgram = user.enrolledProgram;
  const filter = enrolledProgram
    ? { $or: [{ program: { $exists: false } }, { program: '' }, { program: enrolledProgram }] }
    : {};

  const entries = await Schedule.find(filter).sort({ startDate: 1 });
  res.json({
    success: true,
    data: entries.map(mapScheduleEntry),
  });
}
