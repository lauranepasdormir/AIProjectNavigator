import React from 'react';
import { ProjectSubmission } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Lock, Users, Globe } from "lucide-react";

interface SubmissionDetailsDialogProps {
  open: boolean;
  submission: ProjectSubmission | null;
  onClose: () => void;
  onDelete: (submission: ProjectSubmission) => void;
  onDownload: (submission: ProjectSubmission) => void;
}

export default function SubmissionDetailsDialog({
  open,
  submission,
  onClose,
  onDelete,
  onDownload,
}: SubmissionDetailsDialogProps) {
  if (!submission) return null;

  const visibilityIcon = () => {
    switch (submission.visibility.toLowerCase()) {
      case 'private':
        return <Lock className="h-3.5 w-3.5" />;
      case 'internal':
        return <Users className="h-3.5 w-3.5" />;
      case 'public':
        return <Globe className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <>
          <DialogHeader>
            <DialogTitle className="text-2xl">{submission.title}</DialogTitle>
            <DialogDescription className="flex flex-wrap gap-3 pt-2">
              <Badge variant="outline" className="text-sm">
                By {submission.username}
              </Badge>
              <Badge variant="outline" className="text-sm flex items-center gap-1 capitalize">
                {visibilityIcon()}
                {submission.visibility}
              </Badge>
              <Badge variant="outline" className="text-sm capitalize">
                Status: {submission.status}
              </Badge>
              <Badge variant="outline" className="text-sm">
                Submitted: {new Date(submission.createdAt).toLocaleDateString()}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Description</h3>
              <p className="text-gray-700">{submission.description}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Problem Statement</h3>
              <p className="text-gray-700">{submission.problem}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Technology Stack</h3>
              <p className="text-gray-700">{submission.technology}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Impact</h3>
              <p className="text-gray-700">{submission.impact}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Team</h3>
              <p className="text-gray-700">{submission.team}</p>
            </div>
          </div>

          <div className="flex justify-between gap-2 mt-4">
            <Button
              variant="destructive"
              onClick={() => {
                onClose();
                onDelete(submission);
              }}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Submission
            </Button>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onDownload(submission)}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                Download Markdown
              </Button>
              <Button size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
