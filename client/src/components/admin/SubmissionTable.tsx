// client/src/components/admin/SubmissionTable.tsx
import React from 'react';
import { ProjectSubmission } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Calendar, Download, Eye, Trash2, Lock, Users, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SubmissionTableProps {
  submissions: ProjectSubmission[];
  onView: (submission: ProjectSubmission) => void;
  onDelete: (submission: ProjectSubmission) => void;
  onDownload: (submission: ProjectSubmission) => void;
}

export default function SubmissionTable({
  submissions,
  onView,
  onDelete,
  onDownload,
}: SubmissionTableProps) {
  const getVisibilityColor = (v: string): "default"|"secondary"|"destructive"|"outline" => {
    switch (v.toLowerCase()) {
      case 'private': return 'secondary';
      case 'internal': return 'default';
      case 'public': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (d: string|Date) =>
    formatDistanceToNow(typeof d === 'string' ? new Date(d) : d, { addSuffix: true });

  return (
    <Table className="w-full table-fixed">
      <TableCaption>A list of all project submissions.</TableCaption>

      {/* Define column widths */}
      <colgroup>
        <col className="w-2/5" />   {/* Project */}
        <col className="w-1/6" />   {/* Visibility */}
        <col className="w-1/6" />   {/* Status */}
        <col className="w-1/6" />   {/* Submitted by */}
        <col className="w-1/6" />   {/* Date */}
        <col className="w-1/6" />   {/* Actions */}
      </colgroup>

      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted by</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => (
          <TableRow key={submission.id}>
            {/* Project cell: title + truncated description */}
            <TableCell>
              <div className="font-semibold">{submission.title}</div>
              <div className="text-sm text-gray-500 truncate" style={{ maxWidth: '100%' }}>
                {submission.description}
              </div>
            </TableCell>

            {/* Visibility */}
            <TableCell>
              <Badge variant={getVisibilityColor(submission.visibility)} className="capitalize">
                {submission.visibility}
              </Badge>
            </TableCell>

            {/* Status */}
            <TableCell>
              <Badge
                variant={
                  submission.status === 'Completed'   ? 'default' :
                  submission.status === 'In Progress' ? 'secondary' :
                  'outline'
                }
                className="capitalize"
              >
                {submission.status}
              </Badge>
            </TableCell>

            {/* Submitted by */}
            <TableCell>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-gray-500" />
                <span className="truncate">{submission.username}</span>
              </div>
            </TableCell>

            {/* Date */}
            <TableCell>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{formatDate(submission.createdAt)}</span>
              </div>
            </TableCell>

            {/* Actions */}
            <TableCell className="text-right">
              <div className="inline-flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => onDownload(submission)}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button size="sm" onClick={() => onView(submission)}>
                  <Eye className="h-4 w-4" />
                  View
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(submission)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
