// Public map layers linked by the official Campus Closures frontend.
// Request only operational fields; never request editor/user fields or attachments.
import { get, metadata } from '../lib/http.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const layers = ['Closure_Polygon_view', 'Closure_Detour_view'];
const results = [];
for (const layer of layers) {
  const base = `https://gis.ufl.edu/Hosting/rest/services/Hosted/${layer}/FeatureServer/0`;
  const response = await get(`${base}?f=json`);
  const result = { id: layer, authentication: 'none', metadataRequest: metadata(response), requests: [] };
  if (response.body) {
    try {
      const info = JSON.parse(response.body);
      result.layer = { name: info.name, capabilities: info.capabilities, geometryType: info.geometryType, maxRecordCount: info.maxRecordCount, copyrightText: info.copyrightText, paginationSupported: info.advancedQueryCapabilities?.supportsPagination };
      if (!/\bQuery\b/i.test(info.capabilities ?? '')) throw new Error('QUERY_NOT_ADVERTISED');
      const available = info.fields.map(f => f.name);
      const fields = ['close_id', 'close_type', 'close_stat', 'close_start', 'close_end', 'close_note', 'adaaccess'].filter(f => available.includes(f));
      result.requestedFields = fields;
      result.fieldTypes = Object.fromEntries(info.fields.filter(f => fields.includes(f.name)).map(f => [f.name, f.type]));
      result.enums = Object.fromEntries(info.fields.filter(f => ['close_type', 'close_stat', 'adaaccess'].includes(f.name) && f.domain?.codedValues).map(f => [f.name, f.domain.codedValues]));
      const countUrl = new URL(`${base}/query`);
      countUrl.search = new URLSearchParams({ where: '1=1', returnCountOnly: 'true', f: 'json' });
      const count = await get(countUrl.href); result.requests.push(metadata(count));
      if (count.body) { const json = JSON.parse(count.body); result.totalFeatures = json.count; if (json.error) result.countError = json.error.code; }
      if (count.status === 200 && !result.countError && result.totalFeatures > 0) {
        const dataUrl = new URL(`${base}/query`);
        dataUrl.search = new URLSearchParams({ where: '1=1', outFields: fields.join(','), returnGeometry: 'true', outSR: '4326', resultRecordCount: '5', f: 'json' });
        const data = await get(dataUrl.href); result.requests.push(metadata(data));
        if (data.body) {
          const json = JSON.parse(data.body);
          if (json.error) result.dataError = { code: json.error.code, message: json.error.message };
          else {
            const rows = json.features ?? [];
            result.count = rows.length; result.exceededTransferLimit = json.exceededTransferLimit ?? false;
            result.geometryRecords = rows.filter(r => r.geometry).length;
            result.noteRecords = rows.filter(r => r.attributes?.close_note).length;
            const date = value => typeof value === 'number' && Number.isFinite(value) ? new Date(value).toISOString() : value ?? null;
            result.samples = rows.slice(0, 2).map(row => {
              const a = row.attributes; const vertices = (row.geometry?.rings ?? row.geometry?.paths ?? []).flat();
              return { closureId: a.close_id, type: a.close_type, status: a.close_stat, start: date(a.close_start), end: date(a.close_end), adaAccess: a.adaaccess, notePresent: Boolean(a.close_note), geometryType: info.geometryType, vertexCount: vertices.length, sourceUrl: 'https://campusclosures.ufl.edu/' };
            });
          }
        }
      }
      const publishedUrl = new URL(`${base}/query`);
      publishedUrl.search = new URLSearchParams({ where: "close_stat='PUBLISHED'", outFields: fields.join(','), returnGeometry: 'true', outSR: '4326', resultRecordCount: '5', f: 'json' });
      const published = await get(publishedUrl.href); result.requests.push(metadata(published));
      if (published.body) {
        const json = JSON.parse(published.body);
        if (Array.isArray(json.features)) {
          const items = json.features;
          result.publishedSubset = { count: items.length, exceededTransferLimit: json.exceededTransferLimit ?? false, withStart: items.filter(r => r.attributes?.close_start != null).length, withEnd: items.filter(r => r.attributes?.close_end != null).length, withGeometry: items.filter(r => r.geometry).length, withNotes: items.filter(r => r.attributes?.close_note).length, samples: items.slice(0, 2).map(r => ({ closureId: r.attributes.close_id, type: r.attributes.close_type, status: r.attributes.close_stat, start: r.attributes.close_start == null ? null : new Date(r.attributes.close_start).toISOString(), end: r.attributes.close_end == null ? null : new Date(r.attributes.close_end).toISOString(), adaAccess: r.attributes.adaaccess ?? null })) };
        } else result.publishedError = json.error?.code ?? 'NO_FEATURE_ARRAY';
      }
      result.usefulRecordsParsed = result.count > 0;
    } catch (error) { result.error = error.message.slice(0, 120); }
  }
  results.push(result); console.log(JSON.stringify(result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  await writeFile(new URL('./evidence/closures.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
}
