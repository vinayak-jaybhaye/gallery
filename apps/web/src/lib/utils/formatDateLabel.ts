export default function formatDateLabel(dateKey: string): string {
    const date = new Date(dateKey + "T00:00:00");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (targetDate.getTime() === today.getTime()) {
        return "Today";
    }
    if (targetDate.getTime() === yesterday.getTime()) {
        return "Yesterday";
    }

    // Check if same year
    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
        });
    }

    return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}
