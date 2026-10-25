# Yiyan Knowledge Base Starter

译研知识库的独立代码开源版。包含双语笔记浏览、关键词检索、学习路径、术语和方法卡，以及可选的 Supabase 登录、评论回复、收藏和 AI 问答功能。

**本仓库只有两篇专门编写的示例文章，不包含完整知识库、生产数据库、用户记录、生产密钥或旧站提交历史。** 示例中的课堂情境均为虚构，不是实际研究结果。完整知识库不属于本仓库的开源许可范围。

## 本地试用

需要 Node.js 20.9 或更新的受支持版本，以及 npm。

```sh
npm ci
npm run demo
```

打开 http://127.0.0.1:3000 。端口占用时运行 `npm run demo -- --port 3042`。

无需注册或配置任何密钥，即可阅读两篇示例、切换语言并查看它们之间的关联。演示模式只允许指定的只读页面；它不提供评论写入、真实登录、管理后台或 AI 请求。配置了 Supabase 的环境不会启用这个只读例外。

## 配置自己的实例

1. **创建一个全新的 Supabase 项目**，不要使用他人的生产项目。将 `.env.example` 复制为 `.env.local`，填写你自己的项目 URL 和 anon/publishable key。
2. 在新项目的 SQL Editor 中运行 `supabase/schema.sql`。SQL 包含表、权限和 RLS 策略，只应在你控制的数据库中审阅后运行。不要把 `service_role`/secret key 填入 `NEXT_PUBLIC_` 变量。
3. 在 Supabase Auth 中设置你自己的 Site URL、允许的回调地址、邮箱确认策略和 SMTP。先完成普通用户注册，再按 `/settings` 中的管理员 SQL 示例设置你自己的账号。管理员页面本身只允许管理员访问，首次提权可在 SQL Editor 直接运行下方语句。
4. 保持 `DEMO_MODE=false`，运行 `npm run dev`。部署前运行 `npm run security:check` 和 `npm run build`，在你的托管平台配置相同环境变量。

首次管理员设置（只在自己的 Supabase SQL Editor 执行，先替换邮箱）：

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'your-account@example.com'
);
```

SQL 执行者拥有数据库管理权限；普通用户不能通过网页修改自己的角色。检查目标账号已注册、邮箱唯一且语句只匹配预期用户。

## 可选功能与数据处理

- AI 问答当前使用 OpenCode 兼容接口；配置你自己的 `OPENCODE_API_KEY` 和账号有权使用的 `OPENCODE_CHAT_MODEL`。订阅、模型可用性和费用由服务商决定。密钥只用于服务端，缺省不发送 AI 请求。
- AI 使用关键词检索提供站内参考，不需要向量数据库。提问、相关片段和近期对话可能发送给 AI 服务商。默认数据库策略允许用户管理自己的记录，也允许管理员审阅；部署者应在使用前明确告知用户。
- 学习数据采集默认关闭。只有主动设置前后端两个开关为 `true` 才开启。启用前需确定目的、保留时间、访问权限、删除流程，并完善 `/privacy`。IP 哈希不等于匿名数据。
- 用户账号、评论、收藏与问答记录属于你自己的 Supabase 实例，不在 Git 中。**Git 备份不能代替数据库备份。**

## 内容结构

| 位置 | 用途 |
| --- | --- |
| `content/methods/sample-research-question.md` | 示例一：把研究兴趣转化为问题 |
| `content/corpus/sample-evidence-note.md` | 示例二：记录可追溯的证据 |
| `data/knowledgeRelations.js` | 两篇示例的前置与后续关联 |
| `data/learningPaths.js` | 一条两步示例学习路径 |
| `data/terms.js`、`data/researchMethods.js` | 精简示例术语与方法卡 |
| `app/`、`components/`、`lib/` | Next.js 页面、界面组件与业务逻辑 |
| `supabase/` | 数据库结构和权限 SQL，不含用户数据 |

笔记采用 Markdown 与双语元数据。标题结构可以按内容安排，不需要套用固定章节模板。加入自己的内容后运行 `npm run content:verify` 检查引用与测试。本开源发布的 `security:check` 特意限制为两篇示例；改造成自己的内容站时，应有意识地调整这个发布边界。

## 检查命令

```sh
npm run content:verify
npm run security:check
npm audit --registry=https://registry.npmjs.org
npm run build
```

`security:check` 是发布文件与常见密钥的静态检查，不是漏洞扫描器，也不能证明不存在漏洞。上线前仍应测试新数据库的多账号隔离、部署权限、邮件与限流。参阅 [SECURITY.md](SECURITY.md)。

技术栈：Next.js App Router、React、JavaScript、CSS、Markdown、PostgreSQL/Supabase。`package.json` 的 `private: true` 只用于阻止误发布到 npm，不影响 GitHub 代码公开。

## 许可

本仓库原创代码和两篇示例采用 [MIT](LICENSE)。依赖与字体保留各自许可，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。项目名称不代表对衍生站点的认可或担保。
