import { getAllArticles } from "@/lib/markdown";
import FavoritesList from "@/components/FavoritesList";

export const metadata = {
  title: "我的收藏 | 译研知识库"
};

export default async function FavoritesPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh");
  const articles = getAllArticles().map((article) => ({
    slug: article.slug,
    titleZh: article.titleZh,
    titleEn: article.titleEn,
    summaryZh: article.summaryZh,
    summaryEn: article.summaryEn,
    category: article.category,
    date: article.date
  }));

  return (
    <section style={{ margin: "34px 0 60px" }}>
      <FavoritesList articles={articles} lang={lang} />
    </section>
  );
}
