import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";

export const AdminCard = ({ title, value, icon, trend, trendLabel, className }) => {
  const isPositive = trend && trend.startsWith('+');
  
  return (
    <Card className={cn("overflow-hidden group hover:shadow-md transition-all", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </CardTitle>
        <div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          {value}
        </div>
        {trend && (
          <p className="text-xs mt-2 flex items-center font-medium">
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] mr-2 font-bold",
              isPositive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {trend}
            </span>
            <span className="text-gray-500">{trendLabel || "vs last month"}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
};
