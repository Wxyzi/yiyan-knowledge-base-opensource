export default function PrivacyPage() {
  return <section className="resource-page">
    <h1>隐私与数据 / Privacy and Data</h1>
    <p>本代码示例不连接原网站的数据库。未配置服务时，演示仅展示两篇示例文章，不创建账号或保存互动数据。</p>
    <p>This starter does not connect to the original website's database. Without services configured, the demo only displays two sample articles and does not save accounts or interactions.</p>
    <h2>配置独立服务后 / When services are configured</h2>
    <p>账号、评论、收藏和问答记录保存在部署者配置的 Supabase 项目中。用户名和评论对已登录用户可见。启用 AI 时，问题、相关知识片段和最近对话上下文会发送给配置的模型服务商。</p>
    <p>Accounts, comments, favorites, and chat history are stored in the operator's Supabase project. Usernames and comments are visible to signed-in users. AI requests send the question, relevant excerpts, and recent conversation context to the configured model provider.</p>
    <p>默认 SQL 允许管理员审阅和删除问答记录。用户可以删除自己的会话。请勿提交密码、身份信息或其他不宜分享的资料。</p>
    <p>The default SQL permits administrators to review and delete conversations. Users can delete their own conversations. Do not submit passwords, identity documents, or other sensitive material.</p>
    <h2>学习统计 / Learning analytics</h2>
    <p>学习统计默认关闭。部署者若启用，需先说明记录范围、用途、保存期限和删除方式，并获取适用的授权。启用后可记录文章浏览、时间、设备信息、脱敏 IP 和粗略位置。</p>
    <p>Learning analytics are disabled by default. Before enabling them, operators must state the scope, purpose, retention, deletion process, and obtain applicable consent. Enabled analytics may record article views, time, device information, masked IP addresses, and approximate location.</p>
    <p>这是代码示例的数据说明。实际运营者应在开放注册前补充自己的联系方式、数据保存期限和适用的隐私政策。</p>
    <p>This describes the starter's data flows. Operators must provide their own contact details, retention periods, and applicable privacy policy before opening registration.</p>
  </section>;
}
