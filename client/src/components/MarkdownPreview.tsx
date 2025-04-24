import { Card, CardContent } from "@/components/ui/card";

interface MarkdownPreviewProps {
  htmlContent: string;
  title: string;
}

export function MarkdownPreview({ htmlContent, title }: MarkdownPreviewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      <Card className="mb-4">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-2 text-primary">
            Preview of Your AI Project Showcase
          </h2>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
