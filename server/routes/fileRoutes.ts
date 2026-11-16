import fs from 'node:fs';
import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import {
  collegeLogos,
  collegePhotos,
  grievanceAttachments,
  grievances,
  posters,
  studentProfiles,
  verificationRequests,
} from '../../src/db/schema.ts';
import { assertCollegeTenantAccess, optionalAuth, requireAuth } from '../middleware/auth.ts';

export const fileRouter = Router();

fileRouter.get('/verification/:requestId', requireAuth, async (req, res) => {
  const requestId = Number(req.params.requestId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ error: 'Invalid verification request ID' });
  }

  const [row] = await db
    .select({
      studentUserId: verificationRequests.studentUserId,
      collegeId: verificationRequests.collegeId,
      evidenceFilePath: verificationRequests.evidenceFilePath,
      evidenceOriginalName: verificationRequests.evidenceOriginalName,
      evidenceMimeType: verificationRequests.evidenceMimeType,
    })
    .from(verificationRequests)
    .where(eq(verificationRequests.id, requestId))
    .limit(1);

  if (!row || !row.evidenceFilePath) {
    return res.status(404).json({ error: 'Verification document not found' });
  }

  const user = req.user!;
  const isOwnerStudent = user.role === 'student' && user.id === row.studentUserId;
  const isAuthorizedStaff =
    (user.role === 'college_admin' && assertCollegeTenantAccess(user, row.collegeId)) ||
    user.role === 'state_admin';

  if (!isOwnerStudent && !isAuthorizedStaff) {
    return res.status(403).json({ error: 'Access denied to private student verification evidence.' });
  }

  if (!fs.existsSync(row.evidenceFilePath)) {
    return res.status(404).json({ error: 'Stored file not found on disk' });
  }

  res.setHeader('Content-Type', row.evidenceMimeType || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${(row.evidenceOriginalName || 'evidence').replace(/"/g, '')}"`
  );
  return res.sendFile(row.evidenceFilePath);
});

fileRouter.get('/grievance/:attachmentId', requireAuth, async (req, res) => {
  const attachmentId = Number(req.params.attachmentId);
  if (!Number.isInteger(attachmentId) || attachmentId <= 0) {
    return res.status(400).json({ error: 'Invalid attachment ID' });
  }

  const [row] = await db
    .select({
      filePath: grievanceAttachments.filePath,
      originalName: grievanceAttachments.originalName,
      mimeType: grievanceAttachments.mimeType,
      studentUserId: grievances.studentUserId,
      collegeId: grievances.collegeId,
    })
    .from(grievanceAttachments)
    .innerJoin(grievances, eq(grievances.id, grievanceAttachments.grievanceId))
    .where(eq(grievanceAttachments.id, attachmentId))
    .limit(1);

  if (!row) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  const user = req.user!;
  const isOwnerStudent = user.role === 'student' && user.id === row.studentUserId;
  const isAuthorizedStaff =
    (user.role === 'college_admin' && assertCollegeTenantAccess(user, row.collegeId)) ||
    user.role === 'state_admin';

  if (!isOwnerStudent && !isAuthorizedStaff) {
    return res.status(403).json({ error: 'Access denied to private grievance attachment.' });
  }

  if (!fs.existsSync(row.filePath)) {
    return res.status(404).json({ error: 'Stored file not found on disk' });
  }

  res.setHeader('Content-Type', row.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${row.originalName.replace(/"/g, '')}"`);
  return res.sendFile(row.filePath);
});

fileRouter.get('/student-photo/:studentUserId', requireAuth, async (req, res) => {
  const studentUserId = Number(req.params.studentUserId);
  if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
    return res.status(400).json({ error: 'Invalid student user ID' });
  }

  const [row] = await db
    .select({
      userId: studentProfiles.userId,
      collegeId: studentProfiles.collegeId,
      profilePhotoPath: studentProfiles.profilePhotoPath,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, studentUserId))
    .limit(1);

  if (!row || !row.profilePhotoPath) {
    return res.status(404).json({ error: 'Student photograph not found' });
  }

  const user = req.user!;
  const isOwnerStudent = user.role === 'student' && user.id === row.userId;
  const isAuthorizedStaff =
    (user.role === 'college_admin' && assertCollegeTenantAccess(user, row.collegeId)) ||
    user.role === 'state_admin';

  if (!isOwnerStudent && !isAuthorizedStaff) {
    return res.status(403).json({ error: 'Access denied to private student photograph.' });
  }

  if (!fs.existsSync(row.profilePhotoPath)) {
    return res.status(404).json({ error: 'Stored file not found on disk' });
  }

  return res.sendFile(row.profilePhotoPath);
});

fileRouter.get('/college-photo/:photoId', optionalAuth, async (req, res) => {
  const photoId = Number(req.params.photoId);
  if (!Number.isInteger(photoId) || photoId <= 0) {
    return res.status(400).json({ error: 'Invalid photo ID' });
  }

  const [row] = await db
    .select({
      collegeId: collegePhotos.collegeId,
      filePath: collegePhotos.filePath,
      approvalStatus: collegePhotos.approvalStatus,
    })
    .from(collegePhotos)
    .where(eq(collegePhotos.id, photoId))
    .limit(1);

  if (!row) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  if (row.approvalStatus !== 'approved') {
    const user = req.user;
    if (
      !user ||
      (user.role !== 'state_admin' && !(user.role === 'college_admin' && assertCollegeTenantAccess(user, row.collegeId)))
    ) {
      return res.status(403).json({ error: 'This photograph has not been approved for public display.' });
    }
  }

  if (!fs.existsSync(row.filePath)) {
    return res.status(404).json({ error: 'Stored photo not found on disk' });
  }

  return res.sendFile(row.filePath);
});

fileRouter.get('/college-logo/:logoId', optionalAuth, async (req, res) => {
  const logoId = Number(req.params.logoId);
  if (!Number.isInteger(logoId) || logoId <= 0) {
    return res.status(400).json({ error: 'Invalid logo ID' });
  }

  const [row] = await db
    .select({
      collegeId: collegeLogos.collegeId,
      filePath: collegeLogos.filePath,
      approvalStatus: collegeLogos.approvalStatus,
    })
    .from(collegeLogos)
    .where(eq(collegeLogos.id, logoId))
    .limit(1);

  if (!row || !row.filePath) {
    return res.status(404).json({ error: 'Official logo file not found' });
  }

  if (row.approvalStatus !== 'approved') {
    const user = req.user;
    if (
      !user ||
      (user.role !== 'state_admin' && !(user.role === 'college_admin' && assertCollegeTenantAccess(user, row.collegeId)))
    ) {
      return res.status(403).json({ error: 'This official logo has not been approved for public display.' });
    }
  }

  if (!fs.existsSync(row.filePath)) {
    return res.status(404).json({ error: 'Stored logo not found on disk' });
  }

  return res.sendFile(row.filePath);
});

fileRouter.get('/poster/:posterId', optionalAuth, async (req, res) => {
  const posterId = Number(req.params.posterId);
  if (!Number.isInteger(posterId) || posterId <= 0) {
    return res.status(400).json({ error: 'Invalid poster ID' });
  }

  const [row] = await db
    .select({
      collegeId: posters.collegeId,
      imageFilePath: posters.imageFilePath,
      approvalStatus: posters.approvalStatus,
      isArchived: posters.isArchived,
    })
    .from(posters)
    .where(eq(posters.id, posterId))
    .limit(1);

  if (!row || !row.imageFilePath) {
    return res.status(404).json({ error: 'Poster image not found' });
  }

  if (row.approvalStatus !== 'approved' || row.isArchived) {
    const user = req.user;
    const isAuthorizedCollegeAdmin =
      user?.role === 'college_admin' && row.collegeId !== null && assertCollegeTenantAccess(user, row.collegeId);
    if (!user || (user.role !== 'state_admin' && !isAuthorizedCollegeAdmin)) {
      return res.status(403).json({ error: 'This poster image is not publicly active.' });
    }
  }

  if (!fs.existsSync(row.imageFilePath)) {
    return res.status(404).json({ error: 'Stored poster image not found on disk' });
  }

  return res.sendFile(row.imageFilePath);
});
