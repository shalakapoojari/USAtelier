import { Skeleton } from "@/components/ui/skeleton"

export function ProductSkeleton() {
    return (
        <div className="space-y-4 w-full">
            <Skeleton className="aspect-3/4 w-full rounded-none bg-white/5" />
            <div className="space-y-2">
                <Skeleton className="h-3 w-1/3 rounded-none bg-white/5" />
                <Skeleton className="h-5 w-2/3 rounded-none bg-white/5" />
                <Skeleton className="h-4 w-1/4 rounded-none bg-white/5" />
            </div>
        </div>
    )
}
