import { MessageCircleMore } from "lucide-react";
import DiscussionActivityFeed from "@/components/DiscussionActivityFeed";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "讨论动态 | 译研知识库",
  description: "查看译研知识库中最近发生的知识点评论与回复。"
};

export default async function DiscussionsPage({ searchParams }) {
  const sp = await searchParams;
  const lang = String(sp?.lang || "zh") === "en" ? "en" : "zh";
  const isZh = lang !== "en";

  return (
    <section className="discussion-page">
      <div className="discussion-page-title">
        <span className="badge"><MessageCircleMore size={15} /> Community</span>
        <h1>{isZh ? "讨论动态" : "Discussion activity"}</h1>
        <p>
          {isZh
            ? "围绕具体知识点展开的最新评论与回复。这里仅显示公开用户名、知识点和发布时间。"
            : "Recent comments and replies around specific knowledge items. Only public usernames, knowledge items, and posting times are shown here."}
        </p>
      </div>
      <DiscussionActivityFeed lang={lang} limit={24} />
    </section>
  );
}
