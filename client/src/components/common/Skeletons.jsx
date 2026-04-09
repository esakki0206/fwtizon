import { Skeleton } from "../ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

export function GlobalSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 w-full border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </CardHeader>
      <CardContent className="flex-grow">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
      <CardFooter className="justify-between border-t border-gray-100 dark:border-gray-800 pt-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-16" />
      </CardFooter>
    </Card>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in">
      <Skeleton className="h-10 w-48" />
      <Card>
        <div className="p-8 border-b border-gray-200 dark:border-gray-800 flex items-center gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="p-8 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </Card>
    </div>
  );
}

export function DashboardProgressSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3 mb-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
