export function handleKeyClick(e: React.KeyboardEvent, handler: () => void) {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
    }
}

export function formatDisplayDate(dateStr: string | null): string {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${parseInt(y) + 543}`;
}

export function formatTimestamp(isoString: string | null | undefined): string {
    if (!isoString) return "—";
    const d = new Date(isoString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear() + 543).slice(-2);
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${HH}:${MM} น.`;
}

export function calcDuration(start: string | null | undefined, end: string | null | undefined): string | null {
    if (!start || !end) return null;
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (diffMs <= 0) return null;
    const totalMins = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h} ชม. ${m} น.`;
    if (h > 0) return `${h} ชม.`;
    return `${m} น.`;
}

export function cleanWorkerName(name: string) {
    const idx = name.indexOf('(');
    if (idx === -1) return name.trim();
    const endIdx = name.indexOf(')', idx);
    if (endIdx === -1) return name.trim();
    return (name.slice(0, idx) + name.slice(endIdx + 1)).trim().replace(/\s+/g, " ");
}
