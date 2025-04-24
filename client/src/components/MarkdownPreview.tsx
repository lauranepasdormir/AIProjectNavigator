import { Card, CardContent } from "@/components/ui/card";

interface MarkdownPreviewProps {
  htmlContent: string;
  title: string;
}

export function MarkdownPreview({ htmlContent, title }: MarkdownPreviewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <Card className="mb-4 shadow-md border border-gray-100">
        <CardContent className="pt-6 px-6 pb-8">
          <h2 className="text-xl font-semibold mb-4 text-primary border-b pb-2">
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
