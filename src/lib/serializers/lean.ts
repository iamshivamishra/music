/**
 * Convert a Mongoose document (or array of documents) into a plain
 * JSON-safe object suitable for passing to client components.
 *
 * Handles ObjectIds, Dates, Maps, and nested structures by calling
 * `.toJSON()` when available and falling back to structured traversal.
 *
 * Replaces the `JSON.parse(JSON.stringify(doc))` anti-pattern.
 */
export function serializeLean<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(serializeLean) as T;
  }

  if (data instanceof Date) {
    return data.toISOString() as T;
  }

  if (typeof data === "object") {
    // Mongoose docs with .toJSON()
    const doc = data as Record<string, unknown>;
    if (typeof doc.toJSON === "function") {
      return serializeLean(doc.toJSON()) as T;
    }

    // ObjectId-like (has .toString and _bsontype)
    if (typeof doc.toString === "function" && ("_bsontype" in doc || doc.constructor?.name === "ObjectId")) {
      return doc.toString() as T;
    }

    // Map
    if (data instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [key, value] of data.entries()) {
        obj[key] = serializeLean(value);
      }
      return obj as T;
    }

    // Plain object
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(doc)) {
      result[key] = serializeLean(doc[key]);
    }
    return result as T;
  }

  return data;
}
