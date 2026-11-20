import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  IRAQ_VECTOR_PROVINCES, 
  IRAQ_RIVERS, 
  IRAQ_MAP_PROJECTION,
  projectLatLngToSvg, 
  projectSvgToLatLng, 
  findProvinceByLatLng 
} from '../src/data/iraqVectorMapData';

describe('Iraq Vector Map Data & Geometry Acceptance Tests', () => {
  it('should contain all 19 Iraqi governorates including Halabja', () => {
    expect(IRAQ_VECTOR_PROVINCES).toHaveLength(19);
    
    const expectedIds = [
      'anbar', 'karbala', 'najaf', 'babil', 'baghdad', 
      'qadisiyah', 'muthanna', 'dhi-qar', 'basra', 'maysan', 
      'wasit', 'nineveh', 'duhok', 'salah-al-din', 'diyala', 
      'kirkuk', 'erbil', 'sulaymaniyah', 'halabja'
    ];

    expectedIds.forEach(id => {
      const prov = IRAQ_VECTOR_PROVINCES.find(p => p.id === id);
      expect(prov, `Governorate ${id} must exist`).toBeDefined();
      expect(prov?.nameAr).toBeTruthy();
      expect(prov?.d.length).toBeGreaterThan(100);
      expect(prov?.bbox.width).toBeGreaterThan(0);
      expect(prov?.bbox.height).toBeGreaterThan(0);
    });

    const halabja = IRAQ_VECTOR_PROVINCES.find(p => p.id === 'halabja');
    expect(halabja?.nameAr).toBe('حلبجة');
  });

  it('should include both Mesopotamian rivers Tigris and Euphrates with valid SVG paths', () => {
    expect(IRAQ_RIVERS.tigris).toBeTruthy();
    expect(IRAQ_RIVERS.tigris.length).toBeGreaterThan(500);

    expect(IRAQ_RIVERS.euphrates).toBeTruthy();
    expect(IRAQ_RIVERS.euphrates.length).toBeGreaterThan(500);
  });

  it('should perform accurate forward and inverse coordinate projections', () => {
    // Baghdad center coordinates
    const bgLat = 33.3152;
    const bgLng = 44.3661;

    const svg = projectLatLngToSvg(bgLat, bgLng);
    expect(svg.x).toBeGreaterThan(0);
    expect(svg.x).toBeLessThan(IRAQ_MAP_PROJECTION.w);
    expect(svg.y).toBeGreaterThan(0);
    expect(svg.y).toBeLessThan(IRAQ_MAP_PROJECTION.h);

    const roundtrip = projectSvgToLatLng(svg.x, svg.y);
    expect(Math.abs(roundtrip.lat - bgLat)).toBeLessThan(0.0001);
    expect(Math.abs(roundtrip.lng - bgLng)).toBeLessThan(0.0001);
  });

  it('should identify provinces correctly by geographic coordinates', () => {
    // Baghdad
    const provBaghdad = findProvinceByLatLng(33.3152, 44.3661);
    expect(provBaghdad).toBeDefined();
    expect(provBaghdad?.id).toBe('baghdad');

    // Basra
    const provBasra = findProvinceByLatLng(30.5081, 47.7835);
    expect(provBasra).toBeDefined();
    expect(provBasra?.id).toBe('basra');

    // Erbil
    const provErbil = findProvinceByLatLng(36.1901, 44.0091);
    expect(provErbil).toBeDefined();
    expect(provErbil?.id).toBe('erbil');

    // Coordinates far outside Iraq
    const outside = findProvinceByLatLng(51.5074, -0.1278); // London
    expect(outside).toBeNull();
  });

  it('should have valid public iraq-provinces.geojson file', () => {
    const geojsonPath = path.join(process.cwd(), 'public', 'iraq-provinces.geojson');
    expect(fs.existsSync(geojsonPath)).toBe(true);

    const raw = fs.readFileSync(geojsonPath, 'utf-8');
    const geojson = JSON.parse(raw);

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(19);

    const halabja = geojson.features.find((f: any) => f.properties.id === 'halabja');
    expect(halabja).toBeDefined();
    expect(halabja.properties.name_ar).toBe('حلبجة');
    expect(halabja.geometry.type).toBe('Polygon');
    expect(halabja.geometry.coordinates[0].length).toBeGreaterThan(10);
  });

  it('should have public standalone map file nafas-iraq-map.html', () => {
    const htmlPath = path.join(process.cwd(), 'public', 'nafas-iraq-map.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const content = fs.readFileSync(htmlPath, 'utf-8');
    expect(content).toContain('id="iraq"');
    expect(content).toContain('id="g-halabja"');
    expect(content).toContain('class="river tigris"');
    expect(content).toContain('class="river euphrates"');
    expect(content).toContain('setReports');
  });
});
