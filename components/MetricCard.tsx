interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  valueColor?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon = "📊",
  valueColor,
}: MetricCardProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm mb-2">
        <span>{icon}</span>
        <span className="font-medium">{title}</span>
      </div>
      <div
        className="text-2xl md:text-4xl font-bold mb-1"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {subtitle && (
        <div className="text-xs md:text-sm text-gray-400">{subtitle}</div>
      )}
    </div>
  );
}
