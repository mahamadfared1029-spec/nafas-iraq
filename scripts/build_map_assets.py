import re
import json
import shutil
import os

html_source = r"C:\Users\D Kurdistan\.gemini\antigravity\brain\2c167a8e-99b8-4944-9f43-1902baa87919\.user_uploaded\media_1795151251095_858fdab6.html"

# 1. Copy to public/nafas-iraq-map.html
public_html_dest = r"C:\Users\D Kurdistan\.gemini\antigravity\scratch\nafas\public\nafas-iraq-map.html"
shutil.copy2(html_source, public_html_dest)
print(f"Copied standalone map to {public_html_dest}")

with open(html_source, "r", encoding="utf-8") as f:
    content = f.read()

# Projection math from source
projection = {
    "w": 720,
    "h": 690,
    "minLng": 38.794905311000036,
    "maxLat": 37.33355718200005,
    "sx": 63.6771300971179,
    "sy": 76.0700143987508,
    "x0": 47.58970569868751,
    "y0": 28.0
}

def svg_to_lng(x):
    return projection["minLng"] + (x - projection["x0"]) / projection["sx"]

def svg_to_lat(y):
    return projection["maxLat"] - (y - projection["y0"]) / projection["sy"]

# Extract provinces
pattern = r'<path class="province" id="g-([^"]+)"[^>]*aria-label="([^"]+)" d="([^"]+)"'
provinces_raw = re.findall(pattern, content)

provinces_data = []
geojson_features = []

for p_id, p_name, p_d in provinces_raw:
    # extract (x, y) coordinates
    coords = re.findall(r'([0-9.]+),([0-9.]+)', p_d)
    pts = [[float(x), float(y)] for x, y in coords]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    
    bbox = {
        "x": round(min_x, 2),
        "y": round(min_y, 2),
        "width": round(max_x - min_x, 2),
        "height": round(max_y - min_y, 2)
    }
    
    provinces_data.append({
        "id": p_id,
        "name": p_name,
        "nameAr": p_name,
        "d": p_d,
        "bbox": bbox,
        "points": pts
    })
    
    # GeoJSON coordinates: [[lng, lat], ...]
    geo_pts = [[round(svg_to_lng(x), 6), round(svg_to_lat(y), 6)] for x, y in pts]
    # Ensure closed polygon
    if geo_pts and geo_pts[0] != geo_pts[-1]:
        geo_pts.append(geo_pts[0])
        
    feature = {
        "type": "Feature",
        "properties": {
            "id": p_id,
            "name": p_name,
            "name_ar": p_name,
            "country": "Iraq"
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [geo_pts]
        }
    }
    geojson_features.append(feature)

# Extract rivers
river_pattern = r'<path class="river ([^"]+)" d="([^"]+)"'
rivers_raw = re.findall(river_pattern, content)
rivers_data = {}
for r_cls, r_d in rivers_raw:
    if "tigris" in r_cls:
        rivers_data["tigris"] = r_d
    elif "euphrates" in r_cls:
        rivers_data["euphrates"] = r_d

# 2. Write public/iraq-provinces.geojson
geojson_obj = {
    "type": "FeatureCollection",
    "name": "Iraq_Governorates_19",
    "crs": {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
        }
    },
    "features": geojson_features
}

geojson_path = r"C:\Users\D Kurdistan\.gemini\antigravity\scratch\nafas\public\iraq-provinces.geojson"
with open(geojson_path, "w", encoding="utf-8") as f:
    json.dump(geojson_obj, f, ensure_ascii=False, indent=2)
print(f"Wrote GeoJSON to {geojson_path}")

# 3. Write TypeScript data module src/data/iraqVectorMapData.ts
ts_code = f"""// NAFAS - Authentic High-Precision Vector Map Data for Iraq (19 Governorates + Tigris & Euphrates)
// Source: geoBoundaries CC0 + OpenStreetMap ODbL + Natural Earth Public Domain

export interface ProvinceBBox {{
  x: number;
  y: number;
  width: number;
  height: number;
}}

export interface ProvinceVectorItem {{
  id: string;
  name: string;
  nameAr: string;
  d: string;
  bbox: ProvinceBBox;
}}

export interface MapProjectionConfig {{
  w: number;
  h: number;
  minLng: number;
  maxLat: number;
  sx: number;
  sy: number;
  x0: number;
  y0: number;
}}

export const IRAQ_MAP_PROJECTION: MapProjectionConfig = {json.dumps(projection, indent=2)};

export const IRAQ_VECTOR_PROVINCES: ProvinceVectorItem[] = [
"""

for p in provinces_data:
    clean_p = {
        "id": p["id"],
        "name": p["name"],
        "nameAr": p["nameAr"],
        "d": p["d"],
        "bbox": p["bbox"]
    }
    ts_code += f"  {json.dumps(clean_p, ensure_ascii=False)},\n"

ts_code += f"""];

export const IRAQ_RIVERS = {{
  tigris: {json.dumps(rivers_data.get('tigris', ''))},
  euphrates: {json.dumps(rivers_data.get('euphrates', ''))}
}};

// Precomputed simplified boundary polygons for fast point-in-polygon detection
export const PROVINCE_POLYGONS: Record<string, [number, number][]> = {{
"""

for p in provinces_data:
    # take a sampled set of points if very large, or all points
    # All points are around 20-300 points, perfectly fine for fast ray-casting!
    ts_code += f'  "{p["id"]}": {json.dumps(p["points"])},\n'

ts_code += f"""}};

/**
 * Projects real-world (lat, lng) to SVG coordinate space (x, y)
 */
export function projectLatLngToSvg(lat: number, lng: number): {{ x: number; y: number }} {{
  const x = IRAQ_MAP_PROJECTION.x0 + (lng - IRAQ_MAP_PROJECTION.minLng) * IRAQ_MAP_PROJECTION.sx;
  const y = IRAQ_MAP_PROJECTION.y0 + (IRAQ_MAP_PROJECTION.maxLat - lat) * IRAQ_MAP_PROJECTION.sy;
  return {{ x, y }};
}}

/**
 * Inverse projects SVG (x, y) back to (lat, lng)
 */
export function projectSvgToLatLng(x: number, y: number): {{ lat: number; lng: number }} {{
  const lng = IRAQ_MAP_PROJECTION.minLng + (x - IRAQ_MAP_PROJECTION.x0) / IRAQ_MAP_PROJECTION.sx;
  const lat = IRAQ_MAP_PROJECTION.maxLat - (y - IRAQ_MAP_PROJECTION.y0) / IRAQ_MAP_PROJECTION.sy;
  return {{ lat, lng }};
}}

/**
 * Ray-casting algorithm to test if a point (x, y) is inside a polygon
 */
function isPointInPoly(pt: [number, number], poly: [number, number][]): boolean {{
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {{
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }}
  return inside;
}}

/**
 * Detects which Iraqi province a given (lat, lng) coordinate belongs to
 */
export function findProvinceByLatLng(lat: number, lng: number): ProvinceVectorItem | null {{
  const {{ x, y }} = projectLatLngToSvg(lat, lng);
  
  // Search from end to start (matching source logic)
  const reversed = [...IRAQ_VECTOR_PROVINCES].reverse();
  for (const prov of reversed) {{
    const poly = PROVINCE_POLYGONS[prov.id];
    if (poly && isPointInPoly([x, y], poly)) {{
      return prov;
    }}
  }}
  
  // Fallback: check bounding box if right on the border
  for (const prov of reversed) {{
    const b = prov.bbox;
    if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {{
      return prov;
    }}
  }}

  return null;
}}
"""

ts_path = r"C:\Users\D Kurdistan\.gemini\antigravity\scratch\nafas\src\data\iraqVectorMapData.ts"
os.makedirs(os.path.dirname(ts_path), exist_ok=True)
with open(ts_path, "w", encoding="utf-8") as f:
    f.write(ts_code)
print(f"Wrote TypeScript module to {ts_path}")
