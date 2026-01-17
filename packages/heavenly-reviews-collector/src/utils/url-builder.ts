/**
 * ベースURLから全ページのURLリストを生成
 *
 * @param params.baseUrl - 最初のページのURL（例: https://example.com/reviews/?girlid=123）
 * @param params.totalPages - 総ページ数
 * @returns 全ページのURLリスト（1ページ目からtotalPagesページ目まで）
 */
export function buildPageUrls({
  baseUrl,
  totalPages,
}: {
  baseUrl: string;
  totalPages: number;
}): string[] {
  const urls: string[] = [baseUrl];
  const url = new URL(baseUrl);

  for (let page = 2; page <= totalPages; page++) {
    const pageUrl = new URL(url);
    // /reviews/ → /reviews/2/
    pageUrl.pathname = pageUrl.pathname.replace(
      /\/reviews\//,
      `/reviews/${page}/`,
    );
    urls.push(pageUrl.toString());
  }

  return urls;
}
