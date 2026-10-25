"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, MessageSquareReply, Send, Trash2, X } from "lucide-react";
import { createClient, hasSupabaseConfig } from "@/lib/supabase/client";

function getTargetKey({ articleSlug, targetType, targetId }) {
  if (articleSlug) return articleSlug;
  return `${targetType || "knowledge"}:${targetId}`;
}

export default function CommentSection({
  articleSlug,
  targetType = "article",
  targetId,
  title,
  lang = "zh",
  collapsed = false,
  embedded = false
}) {
  const router = useRouter();
  const isZh = lang !== "en";
  const targetKey = getTargetKey({ articleSlug, targetType, targetId });
  const [comments, setComments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState("user");
  const [content, setContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!collapsed);
  const [expanded, setExpanded] = useState(!collapsed);
  const [hasLoaded, setHasLoaded] = useState(false);
  const configured = hasSupabaseConfig();
  const heading = title || (isZh ? "讨论区" : "Discussion");
  const topLevelComments = comments.filter((comment) => !comment.parent_id);
  const repliesByParentId = comments.reduce((groups, comment) => {
    if (!comment.parent_id) return groups;
    return {
      ...groups,
      [comment.parent_id]: [...(groups[comment.parent_id] || []), comment]
    };
  }, {});

  const loadComments = useCallback(async ({ silent = false } = {}) => {
    if (!configured) {
      setLoading(false);
      setHasLoaded(true);
      return;
    }

    if (!silent) setLoading(true);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user || null;
    setCurrentUser(user);
    setCurrentRole("user");

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setCurrentRole(profile?.role || "user");
    }

    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id, profiles(username)")
      .eq("article_slug", targetKey)
      .order("created_at", { ascending: true });

    if (!error) {
      setComments(data || []);
    } else {
      setMessage(isZh ? "评论暂时无法加载，请稍后重试。" : "Comments are temporarily unavailable. Please try again later.");
    }
    if (!silent) setLoading(false);
    setHasLoaded(true);
  }, [configured, targetKey]);

  useEffect(() => {
    setComments([]);
    setMessage("");
    setReplyingTo(null);
    setContent("");
    setReplyContent("");
    setHasLoaded(false);

    if (expanded) {
      loadComments();
    } else {
      setLoading(false);
    }
  }, [targetKey, configured, expanded, loadComments]);

  useEffect(() => {
    if (!expanded || !configured) return undefined;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadComments({ silent: true });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [configured, expanded, loadComments]);

  async function submitComment(event, parentId = null) {
    event.preventDefault();
    const text = parentId ? replyContent.trim() : content.trim();
    if (!text) return;
    if (!configured) {
      setMessage("请先配置 Supabase 环境变量，再使用评论功能。");
      return;
    }

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      const redirectTo = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    const { error } = await supabase.from("comments").insert({
      article_slug: targetKey,
      parent_id: parentId,
      user_id: user.id,
      content: text
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (parentId) {
      setReplyContent("");
      setReplyingTo(null);
      setMessage("回复已发布。 / Reply posted.");
    } else {
      setContent("");
      setMessage("评论已发布。 / Comment posted.");
    }

    await loadComments();
  }

  async function deleteComment(commentId) {
    if (!configured || !currentUser) return;

    const supabase = createClient();
    let query = supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (currentRole !== "admin") {
      query = query.eq("user_id", currentUser.id);
    }

    const { error } = await query;

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("评论已删除。 / Comment deleted.");
    await loadComments();
  }

  const body = (
    <div className="comment-content">
      {!configured ? <p className="notice">配置 Supabase 后可加载和发布评论。</p> : null}
      {loading ? <p className="notice">加载中……</p> : null}
      <div className="comment-list">
        {topLevelComments.length === 0 && !loading ? <p className="notice">暂无评论。 / No comments yet.</p> : null}
        {topLevelComments.map((comment) => {
          const canDelete = currentRole === "admin" || currentUser?.id === comment.user_id;
          const replies = repliesByParentId[comment.id] || [];

          return (
            <div key={comment.id} className="comment">
              <strong>{comment.profiles?.username || "User"}</strong>
              <p>{comment.content}</p>
              <p className="notice">{new Date(comment.created_at).toLocaleString()}</p>
              <div className="comment-actions">
                <button className="small-button" type="button" onClick={() => setReplyingTo(comment)}>
                  <MessageSquareReply size={14} /> 回复
                </button>
                {canDelete ? (
                  <button className="small-button" type="button" onClick={() => deleteComment(comment.id)}>
                    <Trash2 size={14} /> {currentRole === "admin" && currentUser?.id !== comment.user_id ? "管理员删除" : "删除"}
                  </button>
                ) : null}
              </div>

              {replyingTo?.id === comment.id ? (
                <form onSubmit={(event) => submitComment(event, comment.id)} className="reply-form">
                  <textarea
                    className="textarea"
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                    placeholder={`回复 ${comment.profiles?.username || "User"}...`}
                  />
                  <div className="comment-actions">
                    <button className="primary-button" type="submit"><Send size={16} /> 发布回复</button>
                    <button className="secondary-button" type="button" onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}>
                      <X size={16} /> 取消
                    </button>
                  </div>
                </form>
              ) : null}

              {replies.length > 0 ? (
                <div className="reply-list">
                  {replies.map((reply) => {
                    const canDeleteReply = currentRole === "admin" || currentUser?.id === reply.user_id;

                    return (
                      <div className="comment reply" key={reply.id}>
                        <strong>{reply.profiles?.username || "User"}</strong>
                        <p>{reply.content}</p>
                        <p className="notice">{new Date(reply.created_at).toLocaleString()}</p>
                        {canDeleteReply ? (
                          <button className="small-button" type="button" onClick={() => deleteComment(reply.id)}>
                            <Trash2 size={14} /> {currentRole === "admin" && currentUser?.id !== reply.user_id ? "管理员删除" : "删除"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <form onSubmit={(event) => submitComment(event)} className="form-stack">
        <textarea
          className="textarea"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="写下你的问题、补充或学习笔记…… / Write your question, note, or comment..."
        />
        <button className="primary-button" type="submit"><Send size={16} /> 发表评论</button>
      </form>
      {message && <p className="notice">{message}</p>}
    </div>
  );

  return (
    <section className={embedded ? "comment-panel embedded-comment-panel" : "card panel comment-panel"}>
      {collapsed ? (
        <button className={`comment-toggle ${expanded ? "open" : ""}`} type="button" onClick={() => setExpanded((value) => !value)}>
          <span><MessageCircle size={15} /> {heading}</span>
          <span className="comment-count">{hasLoaded ? `${comments.length}` : isZh ? "打开讨论" : "Open"}</span>
          <ChevronDown className="comment-chevron" size={15} />
        </button>
      ) : (
        <h2 className="panel-title"><MessageCircle size={15} /> {heading}</h2>
      )}
      {expanded ? body : null}
    </section>
  );
}
