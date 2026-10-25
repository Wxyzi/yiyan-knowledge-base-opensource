import { getAllArticles } from "./markdown.js";

const MAX_CANDIDATE_ARTICLES = 14;
const MAX_SOURCES = 5;
const MAX_SOURCES_PER_ARTICLE = 1;
const MAX_CHUNK_LENGTH = 1800;
const CHUNK_OVERLAP = 120;
const MIN_ARTICLE_RELEVANCE_SCORE = 240;
const MIN_RELATIVE_ARTICLE_SCORE = 0.16;

const englishStopWords = new Set([
  "about",
  "and",
  "are",
  "can",
  "could",
  "explain",
  "for",
  "from",
  "how",
  "into",
  "is",
  "of",
  "please",
  "research",
  "the",
  "their",
  "this",
  "to",
  "what",
  "when",
  "where",
  "which",
  "why",
  "with",
  "would"
]);

const chineseQuestionWords = /(?:请问|请介绍|介绍一下|简要介绍|什么是|是什么|如何|为什么|怎样|怎么|哪些|有什么|能不能|可不可以|是否|解释一下|比较一下|之间的|中的)/g;

const chineseGenericConcepts = new Set([
  "案例",
  "例子",
  "作用",
  "优势",
  "内容",
  "区别",
  "原理",
  "局限",
  "意义",
  "应用",
  "方法",
  "框架",
  "概念",
  "步骤",
  "特点",
  "理论",
  "类型",
  "类别",
  "联系",
  "领域",
  "问题"
]);

const englishGenericConcepts = new Set([
  "advantage",
  "advantages",
  "application",
  "applications",
  "area",
  "areas",
  "example",
  "examples",
  "field",
  "fields",
  "framework",
  "frameworks",
  "limitation",
  "limitations",
  "method",
  "methods",
  "principle",
  "principles",
  "step",
  "steps",
  "theories",
  "theory",
  "type",
  "types"
]);

const conceptAliases = new Map([
  ["任务型教学", ["任务型语言教学"]],
  ["大模型", ["大语言模型"]],
  ["二外", ["第二外语"]],
  ["critical discourse analysis", ["cda"]],
  ["task based teaching", ["task based language teaching", "tblt"]]
]);

const chineseFollowUpPattern = /^(?:那|那么|这些|它们?|这个|这种|上述|前面提到的)?(?:还|又|也|都)?(?:有|是|包括|可以|应该)?(?:哪些|什么|如何|怎么|为什么|有何|能否|是否|可以)?(?:主要|重要|常见|核心)?(?:理论|框架|方法|特点|优点|缺点|局限|步骤|应用|例子|案例|区别|联系|依据|作用|意义|原理|类型|领域|方向|问题)(?:呢|吗|？|\?)*$/u;

let articleIndexCache = null;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function markdownToPlainText(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongText(text, maxLength = MAX_CHUNK_LENGTH) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks = [];
  let current = "";

  function pushCurrent() {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      pushCurrent();
      let start = 0;
      while (start < paragraph.length) {
        const end = Math.min(paragraph.length, start + maxLength);
        chunks.push(paragraph.slice(start, end).trim());
        if (end >= paragraph.length) break;
        start = Math.max(end - CHUNK_OVERLAP, start + 1);
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxLength) {
      pushCurrent();
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  pushCurrent();
  return chunks;
}

function buildArticleIndex() {
  return getAllArticles().map((article) => {
    const plainZh = markdownToPlainText(article.contentZh);
    const plainEn = markdownToPlainText(article.contentEn || article.contentZh);
    const tags = article.tags.join(" ");

    return {
      slug: article.slug,
      titleZh: article.titleZh,
      titleEn: article.titleEn,
      summaryZh: article.summaryZh,
      summaryEn: article.summaryEn,
      category: article.category,
      tags: article.tags,
      date: article.date,
      normalized: {
        titleZh: normalizeText(article.titleZh),
        titleEn: normalizeText(article.titleEn),
        summaryZh: normalizeText(article.summaryZh),
        summaryEn: normalizeText(article.summaryEn),
        tags: normalizeText(tags),
        contentZh: normalizeText(plainZh),
        contentEn: normalizeText(plainEn)
      },
      chunksZh: splitLongText(plainZh),
      chunksEn: splitLongText(plainEn)
    };
  });
}

function getArticleIndex() {
  if (!articleIndexCache) articleIndexCache = buildArticleIndex();
  return articleIndexCache;
}

function addTerm(terms, value, weight = 1) {
  const normalized = normalizeText(value).replace(/^\s+|\s+$/g, "");
  if (normalized.length < 2 || terms.has(normalized)) return;
  terms.set(normalized, Math.max(weight, terms.get(normalized) || 0));
}

function getQueryTerms(query) {
  const normalized = normalizeText(query);
  const terms = new Map();
  const latinTerms = normalized.match(/[a-z0-9][a-z0-9+.#-]{1,}/g) || [];

  for (const term of latinTerms) {
    if (!englishStopWords.has(term)) addTerm(terms, term, Math.min(term.length, 10));
  }

  const hanSequences = normalized.match(/\p{Script=Han}{2,}/gu) || [];
  for (const rawSequence of hanSequences) {
    const sequence = rawSequence.replace(chineseQuestionWords, "").trim();
    if (sequence.length < 2) continue;

    if (sequence.length <= 18) addTerm(terms, sequence, Math.min(sequence.length * 1.6, 14));

    for (let size = Math.min(6, sequence.length); size >= 2; size -= 1) {
      for (let index = 0; index <= sequence.length - size; index += 1) {
        addTerm(terms, sequence.slice(index, index + size), size);
        if (terms.size >= 64) break;
      }
      if (terms.size >= 64) break;
    }
  }

  if (normalized.length >= 2 && normalized.length <= 80) {
    addTerm(terms, normalized, 12);
  }

  return Array.from(terms, ([value, weight]) => ({ value, weight }));
}

function isContextDependentQuestion(question, language = "zh") {
  const normalized = normalizeText(question).replace(/\s+/g, " ").trim();
  if (!normalized) return false;

  if (language !== "en") {
    return normalized.length <= 30 && (
      chineseFollowUpPattern.test(normalized)
      || /^(?:那|那么|这些|它们?|这个|这种|上述|前面提到的)/u.test(normalized)
      || /^(?:继续|展开|详细说说|再解释一下|举例说明)(?:吧|呢|。|！|？|\?)*$/u.test(normalized)
    );
  }

  const words = normalized.match(/[a-z0-9'-]+/g) || [];
  if (words.length > 12) return false;
  return /\b(it|its|they|them|their|this|that|these|those|above|former|latter)\b/.test(normalized)
    || /^(?:continue|go on|tell me more|what|which|how|why)\b.*\b(?:theories?|frameworks?|methods?|examples?|limitations?|applications?|differences?|steps?)\b/.test(normalized);
}

export function buildContextualRetrievalQuery(question, conversationHistory = [], language = "zh") {
  const cleanCurrent = String(question || "").trim();
  if (!cleanCurrent || !isContextDependentQuestion(cleanCurrent, language)) return cleanCurrent;

  const anchorTurn = [...conversationHistory]
    .reverse()
    .find((turn) => {
      const previousQuestion = String(turn?.question || "").trim();
      return previousQuestion && !isContextDependentQuestion(previousQuestion, language);
    });

  if (!anchorTurn) return cleanCurrent;
  return `${String(anchorTurn.question).trim()}\n${cleanCurrent}`.slice(0, 900);
}

function stripChineseQuestionFrame(value) {
  return String(value || "")
    .replace(/[？?！!。]/g, "")
    .replace(/^(?:请问|请介绍|介绍一下|简要介绍|解释一下|比较一下)/u, "")
    .replace(/^(?:如何|怎么|怎样)(?:进行|使用|应用|理解|学习|分析|研究|操作|实现|评价|评估|比较)?/u, "")
    .replace(/(?:有)?哪些(?:重要|主要|常见|核心|代表性)?(?:的)?(?:理论|框架|方法|特点|类型|类别|领域|方向|步骤|应用|作用|优势|局限|问题|流派|模型)?$/u, "")
    .replace(/(?:有什么|有何)(?:主要|重要|常见|核心)?(?:区别|联系|特点|作用|优势|局限|意义|问题|方法|理论|框架|应用|类型)?$/u, "")
    .replace(/(?:是)?什么(?:意思|概念)?$/u, "")
    .replace(/(?:适合)?(?:用来)?(?:解决|研究|分析)什么(?:研究)?问题$/u, "")
    .trim();
}

function getConceptAnchors(query, language = "zh") {
  const anchors = new Set();
  const lines = String(query || "").split(/[\r\n]+/).map((line) => normalizeText(line)).filter(Boolean);

  for (const line of lines) {
    if (language === "en") {
      const tokens = line.match(/[a-z0-9][a-z0-9+.#-]*/g) || [];
      for (const token of tokens) {
        if (token.length < 2 || englishStopWords.has(token) || englishGenericConcepts.has(token)) continue;
        anchors.add(token);
      }
      continue;
    }

    const framed = stripChineseQuestionFrame(line);
    const pieces = [
      framed,
      ...framed.split(/(?:中的|里的|关于|以及|和|与|及)|[\s、，,；;：:/]+/u)
    ];

    for (const rawPiece of pieces) {
      const piece = rawPiece.trim();
      if (piece.length < 2 || chineseGenericConcepts.has(piece)) continue;
      if (/^[\p{Script=Han}]+$/u.test(piece) && piece.length > 24) continue;
      anchors.add(piece);
    }
  }

  return [...anchors]
    .sort((a, b) => b.length - a.length)
    .slice(0, 12);
}

function scoreConceptMatch(article, anchors, isZh) {
  if (!anchors.length) return 0;
  const metadataFields = [
    isZh ? article.titleZh : article.titleEn,
    isZh ? article.titleEn : article.titleZh,
    ...article.tags,
    isZh ? article.summaryZh : article.summaryEn
  ].map((value) => normalizeText(value)).filter(Boolean);
  const compactFields = metadataFields.map((value) => value.replace(/\s+/g, ""));
  const strictFields = metadataFields.slice(0, 2 + article.tags.length);

  return anchors.reduce((bestScore, anchor) => {
    const normalizedAnchor = normalizeText(anchor);
    if (!normalizedAnchor) return bestScore;
    const variants = [normalizedAnchor, ...(conceptAliases.get(normalizedAnchor) || [])];
    const isShortHanAnchor = /^[\p{Script=Han}]{2}$/u.test(normalizedAnchor);
    const matched = variants.some((variant) => {
      const compactVariant = variant.replace(/\s+/g, "");
      if (isShortHanAnchor) {
        return strictFields.some((field) => {
          const compactField = field.replace(/\s+/g, "");
          return compactField === compactVariant
            || compactField.startsWith(compactVariant)
            || compactField.endsWith(compactVariant);
        });
      }
      return metadataFields.some((field, index) => (
        field.includes(variant) || compactFields[index].includes(compactVariant)
      ));
    });
    if (!matched) return bestScore;

    const anchorLength = Math.min(normalizedAnchor.replace(/\s+/g, "").length, 12);
    return Math.max(bestScore, Math.min(6000, anchorLength ** 3 * 20));
  }, 0);
}

function countOccurrences(text, term, maxCount = 2) {
  if (!text || !term) return 0;
  let count = 0;
  let index = text.indexOf(term);

  while (index !== -1 && count < maxCount) {
    count += 1;
    index = text.indexOf(term, index + term.length);
  }

  return count;
}

function scoreText(text, terms, multiplier, maxCount = 2) {
  return terms.reduce(
    (score, term) => score + countOccurrences(text, term.value, maxCount) * term.weight * multiplier,
    0
  );
}

function scoreArticle(article, terms, isZh, normalizedQuery) {
  const title = isZh ? article.normalized.titleZh : article.normalized.titleEn;
  const otherTitle = isZh ? article.normalized.titleEn : article.normalized.titleZh;
  const summary = isZh ? article.normalized.summaryZh : article.normalized.summaryEn;
  const content = isZh ? article.normalized.contentZh : article.normalized.contentEn;
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactTitle = title.replace(/\s+/g, "");
  let score = 0;

  score += Math.min(scoreText(title, terms, 42, 2), 520);
  score += Math.min(scoreText(otherTitle, terms, 18, 2), 220);
  score += Math.min(scoreText(article.normalized.tags, terms, 28, 2), 280);
  score += Math.min(scoreText(summary, terms, 11, 3), 320);
  score += Math.min(scoreText(content, terms, 1.4, 3), 180);

  for (const rawTag of article.tags) {
    const tag = normalizeText(rawTag).replace(/\s+/g, "");
    if (tag.length >= 2 && compactQuery.includes(tag)) {
      score += 220 + Math.min(tag.length, 10) * 80;
    }
  }

  if (compactTitle.length >= 2 && compactQuery.includes(compactTitle)) score += 1200;
  if (compactQuery.length >= 2 && compactQuery.length <= 24 && compactTitle.includes(compactQuery)) score += 260;

  return score;
}

function scoreChunk(chunk, terms) {
  const normalized = normalizeText(chunk);
  return scoreText(normalized, terms, 8, 4);
}

function createExcerpt(text, terms, maxLength = 280) {
  const normalized = normalizeText(text);
  const matched = terms
    .slice()
    .sort((a, b) => b.value.length - a.value.length)
    .find((term) => normalized.includes(term.value));
  const center = matched ? normalized.indexOf(matched.value) : 0;
  const start = Math.max(0, center - Math.floor(maxLength * 0.28));
  const end = Math.min(text.length, start + maxLength);

  return `${start > 0 ? "..." : ""}${text.slice(start, end).trim()}${end < text.length ? "..." : ""}`;
}

export function retrieveKnowledgeSources(query, language = "zh") {
  const normalizedQuery = normalizeText(query);
  const terms = getQueryTerms(query);
  const isZh = language !== "en";
  const conceptAnchors = getConceptAnchors(query, language);

  if (!normalizedQuery || !terms.length || !conceptAnchors.length) return [];

  const scoredCandidates = getArticleIndex()
    .map((article) => {
      const conceptScore = scoreConceptMatch(article, conceptAnchors, isZh);
      return {
        article,
        conceptScore,
        score: scoreArticle(article, terms, isZh, normalizedQuery) + conceptScore
      };
    })
    .filter((candidate) => candidate.conceptScore > 0)
    .sort((a, b) => b.score - a.score || String(b.article.date).localeCompare(String(a.article.date)));

  const topScore = scoredCandidates[0]?.score || 0;
  const relevanceFloor = Math.max(MIN_ARTICLE_RELEVANCE_SCORE, topScore * MIN_RELATIVE_ARTICLE_SCORE);
  const candidates = scoredCandidates
    .filter((candidate) => candidate.score >= relevanceFloor)
    .slice(0, MAX_CANDIDATE_ARTICLES);

  const rankedChunks = candidates.flatMap(({ article, score: articleScore }) => {
    const chunks = isZh ? article.chunksZh : article.chunksEn;
    const fallbackSummary = isZh ? article.summaryZh : article.summaryEn || article.summaryZh;
    const sourceChunks = chunks.length ? chunks : [fallbackSummary];

    return sourceChunks.map((text, chunkIndex) => ({
      article,
      text,
      chunkIndex,
      score: Math.min(scoreChunk(text, terms), 560) + articleScore * 0.72
    }));
  });

  rankedChunks.sort((a, b) => b.score - a.score);

  const perArticleCount = new Map();
  const sources = [];

  for (const item of rankedChunks) {
    const count = perArticleCount.get(item.article.slug) || 0;
    if (count >= MAX_SOURCES_PER_ARTICLE) continue;

    perArticleCount.set(item.article.slug, count + 1);
    sources.push({
      id: sources.length + 1,
      slug: item.article.slug,
      title: isZh ? item.article.titleZh : item.article.titleEn || item.article.titleZh,
      titleZh: item.article.titleZh,
      titleEn: item.article.titleEn,
      category: item.article.category,
      excerpt: createExcerpt(item.text, terms),
      content: item.text.slice(0, MAX_CHUNK_LENGTH)
    });

    if (sources.length >= MAX_SOURCES) break;
  }

  return sources;
}
