// Longdo Map API Key
export const LONGDO_KEY = '7ab7d7d3dbf947cebbdae10203740d2a';

// Generate avatar URL from name
export function getAvatarUrl(name: string): string {
    const displayName = name?.trim() || "Staff";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&size=200&font-size=0.35`;
}

// Interface for Longdo search results
export interface LongdoResult {
    lat: number;
    lon: number;
    name: string;
    address: string;
}

// Search places using Longdo API
export async function searchPlaces(query: string): Promise<LongdoResult[]> {
    if (!query.trim() || query.length < 2) return [];
    try {
        const res = await fetch(`https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent(query)}&limit=6&key=${LONGDO_KEY}`);
        const data = await res.json();
        return (data.data ?? []).map((item: { lat: number; lon: number; name: string; address?: string }) => ({
            lat: item.lat, lon: item.lon, name: item.name, address: item.address ?? '',
        }));
    } catch { return []; }
}

// Common Department interface
export interface Department {
    id: string;
    name: string;
    color_code: string;
}

// Common Employee interface
export interface Employee {
    id: string;
    name: string;
    staff_id?: string | null;
    image_url: string | null;
    departments: Department | null;
}

// Normalize department from API response
export function normalizeDept(d: Record<string, unknown>): Department {
    return {
        id: String(d._id),
        name: String(d.name ?? ''),
        color_code: String(d.colorCode ?? ''),
    };
}

// Normalize employee from API response
export function normalizeEmployee(e: Record<string, unknown>): Employee {
    const dept = e.departmentId as Record<string, unknown> | null;
    return {
        id: String(e._id),
        name: String(e.name ?? ''),
        staff_id: e.staffId ? String(e.staffId) : null,
        image_url: e.imageUrl ? String(e.imageUrl) : null,
        departments: dept ? normalizeDept(dept) : null,
    };
}
