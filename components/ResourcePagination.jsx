import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function createHref(basePath, params, page) {
  const next = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== "") {
      next.set(key, String(value));
    }
  }

  next.set("page", String(page));
  return `${basePath}?${next.toString()}`;
}

function visiblePages(currentPage, totalPages) {
  const pages = new Set([1, totalPages]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  return [...pages].sort((a, b) => a - b);
}

export default function ResourcePagination({
  basePath,
  currentPage,
  totalPages,
  params,
  isZh
}) {
  if (totalPages <= 1) return null;

  const pages = visiblePages(currentPage, totalPages);

  return (
    <nav className="resource-pagination" aria-label={isZh ? "分页导航" : "Pagination"}>
      {currentPage > 1 ? (
        <Link className="pagination-arrow" href={createHref(basePath, params, currentPage - 1)}>
          <ChevronLeft size={17} />
          <span>{isZh ? "上一页" : "Previous"}</span>
        </Link>
      ) : <span className="pagination-arrow disabled"><ChevronLeft size={17} /><span>{isZh ? "上一页" : "Previous"}</span></span>}

      <div className="pagination-pages">
        {pages.map((page, index) => {
          const previous = pages[index - 1];
          return (
            <span className="pagination-page-wrap" key={page}>
              {previous && page - previous > 1 ? <span className="pagination-gap">…</span> : null}
              <Link
                aria-current={page === currentPage ? "page" : undefined}
                className={`pagination-page ${page === currentPage ? "active" : ""}`}
                href={createHref(basePath, params, page)}
              >
                {page}
              </Link>
            </span>
          );
        })}
      </div>

      {currentPage < totalPages ? (
        <Link className="pagination-arrow" href={createHref(basePath, params, currentPage + 1)}>
          <span>{isZh ? "下一页" : "Next"}</span>
          <ChevronRight size={17} />
        </Link>
      ) : <span className="pagination-arrow disabled"><span>{isZh ? "下一页" : "Next"}</span><ChevronRight size={17} /></span>}
    </nav>
  );
}
