import { Card, Badge } from "@/components/shared";
import { LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
}

export function ComingSoon({ title, description, icon: Icon, phase }: ComingSoonProps) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-sm text-center flex flex-col items-center py-10 px-8 border-border bg-card">
        <Badge variant="outline" className="mb-5">{phase}</Badge>
        
        <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
        
        <h2 className="text-lg font-medium mb-2 text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </Card>
    </div>
  );
}
