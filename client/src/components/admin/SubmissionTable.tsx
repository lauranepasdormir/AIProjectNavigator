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
import { User, Calendar, Download, Eye, Trash2 } from "lucide-react";
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
  const getVisibilityColor = (visibility: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (visibility.toLowerCase()) {
      case 'private': return 'secondary';
      case 'internal': return 'default';
      case 'public': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Limits for status preview
  const charLimit = 80;
  const wordLimit = 9;

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full table-auto">
        <TableCaption>A list of all project submissions.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-2">Project</TableHead>
            {/* <TableHead className="px-4 py-2">Visibility</TableHead> */}
            <TableHead className="px-4 py-2">Status</TableHead>
            <TableHead className="px-4 py-2">Submitted by</TableHead>
            <TableHead className="px-4 py-2">Date</TableHead>
            <TableHead className="px-4 py-2 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id} className="hover:bg-gray-50">
              <TableCell className="px-4 py-2 whitespace-normal">
                <div className="font-semibold text-sm break-words">{submission.title}</div>
                <div className="text-xs text-gray-500 break-words mt-1">
                  {(() => {
                    const description = submission.description;
                    const words = description.split(/\s+/);
                    if (description.length > charLimit) return description.slice(0, charLimit) + '...';
                    if (words.length > wordLimit) return words.slice(0, wordLimit).join(' ') + '...';
                    return description;
                  })()}
                </div>
              </TableCell>

              {/* <TableCell className="px-4 py-2 whitespace-normal">
                <Badge variant={getVisibilityColor(submission.visibility)} className="inline-flex items-center px-3 py-1 rounded-full text-xs whitespace-normal">
                  {submission.visibility}
                </Badge>
              </TableCell> */}

              <TableCell className="px-3 py-2 whitespace-normal">
                <Badge
                  variant={
                    submission.status === 'Completed'   ? 'default' :
                    submission.status === 'In Progress' ? 'secondary' :
                    'outline'
                  }
                  className="inline-flex items-center px-7 py-3 rounded-full text-xs "
                >
                  {(() => {
                    const status = submission.status;
                    const words = status.split(/\s+/);
                    if (status.length > charLimit) return status.slice(0, charLimit) + '...';
                    if (words.length > wordLimit) return words.slice(0, wordLimit).join(' ') + '...';
                    return status;
                  })()}
                </Badge>
              </TableCell>

              <TableCell className="px-4 py-2 whitespace-normal">
                <div className="flex items-center gap-2 text-xs break-words">
                  <User className="h-4 w-4 text-gray-500" />
                  {submission.username}
                </div>
              </TableCell>

              <TableCell className="px-4 py-2 whitespace-normal">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(submission.createdAt)}</span>
                </div>
              </TableCell>

              <TableCell className="px-4 py-2 text-right whitespace-nowrap">
                <div className="inline-flex items-center gap-2 text-xs">
                  <Button size="sm" variant="outline" onClick={() => onDownload(submission)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => onView(submission)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onDelete(submission)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
