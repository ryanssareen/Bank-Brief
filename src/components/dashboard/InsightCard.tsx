import { Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function InsightCard({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-warning" />
        <h3 className="font-semibold text-text-primary">AI Insights</h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
            <span className="text-primary-light font-medium mt-0.5">•</span>
            {insight}
          </li>
        ))}
      </ul>
    </Card>
  );
}
