import formatDateLabel from "./formatDateLabel";
import type { Media } from "@/store/mediaStore";

type GroupedMedia = {
    date: string;
    label: string;
    items: Media[];
};

export default function groupMediaByDate(items: Media[]): GroupedMedia[] {
    const groups = new Map<string, Media[]>();

    for (const item of items) {
        const date = new Date(item.createdAt);
        // Use local date components
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(item);
    }

    // Sort groups by date descending (newest first)
    const sortedEntries = Array.from(groups.entries()).sort(
        ([a], [b]) => b.localeCompare(a)
    );

    return sortedEntries.map(([dateKey, items]) => ({
        date: dateKey,
        label: formatDateLabel(dateKey),
        items,
    }));
}

