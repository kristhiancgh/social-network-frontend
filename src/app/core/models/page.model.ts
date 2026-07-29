/**
 * A page of results. Mirrors `dev.social.shared.web.PageResponse` - deliberately
 * small, so the client is not coupled to Spring Data's internal `Page` shape.
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/** An empty page, for initialising a store before the first load. */
export function emptyPage<T>(size = 20): PageResponse<T> {
  return {
    content: [],
    page: 0,
    size,
    totalElements: 0,
    totalPages: 0,
    last: true,
  };
}
