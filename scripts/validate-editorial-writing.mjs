import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const contentRoots = [
  path.resolve(root, 'src/content/articles'),
  path.resolve(root, 'src/content/archive'),
];

const processMetaPatterns = [
  '운영자 제공',
  '운영자 제작',
  '직접 선별',
  'AI 작업',
  'AI가 작성',
  '자료를 찾아보니',
  '조사해보니',
  '조사 과정에서',
  '사진을 확보',
  '이미지를 확보',
  '저작권을 검토',
  '원고를 바탕으로',
  '개정판에서 수정',
];

const commonForeignNoteTerms = [
  '추가시간',
  '추가 시간',
  '손실 시간',
  '인저리 타임',
  'VAR',
  '오프사이드',
  '페널티킥',
  'AC 밀란',
  '레알 마드리드',
  '리버풀',
  '맨체스터 유나이티드',
  '맨체스터 시티',
  '바이에른 뮌헨',
];

const canonicalTermRules = [
  [/프리미어리그/g, '프리미어 리그'],
  [/UEFA 챔피언스리그/g, 'UEFA 챔피언스 리그'],
  [/UEFA 유로파리그/g, 'UEFA 유로파 리그'],
  [/UEFA 컨퍼런스리그/g, 'UEFA 컨퍼런스 리그'],
  [/(?<!UEFA )(?<!AFC )(?<!여자 )챔피언스 리그/g, 'UEFA 챔피언스 리그'],
  [/(?<!UEFA )유로파 리그/g, 'UEFA 유로파 리그'],
  [/(?<!UEFA )컨퍼런스 리그/g, 'UEFA 컨퍼런스 리그'],
  [/세베시 구스타브/g, '셰베시 구스타브'],
  [/부다이 라슬로/g, '부더이 라슬로'],
  [/란토시/g, '런토시'],
  [/팔로타시/g, '펄로타시'],
  [/젱겔러 줄러/g, '젱겔레르 줄러'],
  [/리뉘스 미헬스/g, '리뉘스 미헐스'],
  [/페렌츠 푸슈카시/g, '푸슈카시 페렌츠'],
  [/매직 머저르/g, '매직 마자르'],
  [/어러니처퍼트/g, '아라니처파트'],
];

const connectiveOpening = /^(?:그러나|하지만|다만|그래서|따라서|그럼에도|반면|한편|실제로|이후|이때|동시에|결국|즉|또한|그러면서|그런데|마침|그제야|반대로|그 사이|이 과정|때문에)/;

const integrationRequirements = new Map([
  ['EDITORIAL_WRITING_RULES.md', [
    'VOICE-OWNER',
    'HEADING-NO-FORCED-CONTRAST',
    'PROSE-FLOW',
    'FOREIGN-NOTE-SELECTIVE',
    'NO-PROCESS-META',
    'HISTORY-PREVIEW-PROMISE',
    'WRITING-GATE-1',
  ]],
  ['AGENTS.md', ['EDITORIAL_WRITING_RULES.md', 'npm run test:writing-rules', 'npm run validate:writing']],
  ['CLAUDE.md', ['EDITORIAL_WRITING_RULES.md', 'npm run test:writing-rules']],
  ['HANDOFF.md', ['EDITORIAL_WRITING_RULES.md', 'validate-editorial-writing.mjs']],
  ['package.json', ['validate:writing', 'test:writing-rules', 'validate-editorial-writing.mjs']],
  ['.github/workflows/quality-gate.yml', ['npm run test:writing-rules', 'npm run validate:writing']],
  ['src/content.config.ts', ['previewTitle', 'previewDescription']],
  ['public/admin/config.yml', ['name: previewTitle', 'name: previewDescription']],
  ['src/components/HistoryCategoryPage.astro', ['previewTitleFor', 'previewDescriptionFor']],
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function preserveLinesWithoutFrontmatter(source) {
  return source.replace(/^---[\s\S]*?---(?=\s|$)/, (frontmatter) => frontmatter.replace(/[^\n]/g, ' '));
}

function visibleText(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function sentenceParts(text) {
  return (text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function letterCount(text) {
  return (text.match(/[가-힣A-Za-z0-9]/g) ?? []).length;
}

function frontmatterScalar(source, key) {
  const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---(?:\s|$)/)?.[1] ?? '';
  const match = frontmatter.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.*?)\\s*$`, 'm'));
  if (!match) return undefined;
  const value = match[1].trim();
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

function normalizedPreviewText(value) {
  return value.replace(/[\s'"“”‘’·:,.!?()\-]/g, '').toLowerCase();
}

function historyPreviewIssues(source, relative) {
  const category = frontmatterScalar(source, 'category');
  const isDraft = frontmatterScalar(source, 'draft') === 'true';
  if (category !== 'history' || isDraft) return [];

  const issues = [];
  const title = frontmatterScalar(source, 'title') ?? '';
  const description = frontmatterScalar(source, 'description') ?? '';
  const previewTitle = frontmatterScalar(source, 'previewTitle') ?? '';
  const previewDescription = frontmatterScalar(source, 'previewDescription') ?? '';
  const lineFor = (key) => {
    const index = source.search(new RegExp(`^${escapeRegExp(key)}:`, 'm'));
    return index >= 0 ? lineAt(source, index) : 1;
  };

  if (!previewTitle) {
    issues.push({ code: 'HISTORY-PREVIEW-PROMISE', message: '축세 발행 글에는 목록 전용 previewTitle이 필요합니다.', line: 1, relative });
  } else {
    const length = letterCount(previewTitle);
    if (length < 12 || length > 42) {
      issues.push({ code: 'HISTORY-PREVIEW-PROMISE', message: `previewTitle은 12~42자 안에서 한 가지 읽을 이유를 보여야 합니다. 현재 ${length}자입니다.`, line: lineFor('previewTitle'), relative });
    }
    if (normalizedPreviewText(previewTitle) === normalizedPreviewText(title)) {
      issues.push({ code: 'HISTORY-PREVIEW-PROMISE', message: 'previewTitle에 상세 제목을 그대로 복사하지 말고 클릭 후 얻을 답을 앞세우십시오.', line: lineFor('previewTitle'), relative });
    }
  }

  if (!previewDescription) {
    issues.push({ code: 'HISTORY-PREVIEW-PROMISE', message: '축세 발행 글에는 목록 전용 previewDescription이 필요합니다.', line: 1, relative });
  } else {
    const length = letterCount(previewDescription);
    if (length < 35 || length > 110) {
      issues.push({ code: 'HISTORY-PREVIEW-PROMISE', message: `previewDescription은 35~110자 안에서 제목의 약속을 구체화해야 합니다. 현재 ${length}자입니다.`, line: lineFor('previewDescription'), relative });
    }
    if (normalizedPreviewText(previewDescription) === normalizedPreviewText(description)) {
      issues.push({ code: 'HISTORY-PREVIEW-PROMISE', message: 'previewDescription에 검색 설명을 그대로 복사하지 말고 카드에서 읽을 이유를 구체화하십시오.', line: lineFor('previewDescription'), relative });
    }
  }

  return issues;
}

function isShortSentence(sentence, maximum = 30) {
  const length = letterCount(sentence);
  return length >= 6 && length <= maximum;
}

function staccatoIssues(body, relative) {
  const issues = [];
  const withoutCode = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const blockPattern = /(?:^|\n\s*\n)([\s\S]*?)(?=\n\s*\n|$)/g;
  const shortParagraphRun = [];

  for (const match of withoutCode.matchAll(blockPattern)) {
    const rawBlock = match[1].trim();
    const startIndex = match.index + match[0].indexOf(match[1]);
    const excluded = !rawBlock
      || /^(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||:::)/.test(rawBlock)
      || /<(?:section|div|figure|figcaption|aside|article|header|footer|ul|ol|li|table|style|script|iframe|details|summary)\b/i.test(rawBlock);

    if (excluded) {
      shortParagraphRun.length = 0;
      continue;
    }

    const text = visibleText(rawBlock.replace(/^<p\b[^>]*>|<\/p>$/gi, ''));
    const sentences = sentenceParts(text);

    let sentenceRun = [];
    sentences.forEach((sentence, index) => {
      if (!isShortSentence(sentence) || (sentenceRun.length > 0 && connectiveOpening.test(sentence))) {
        sentenceRun = isShortSentence(sentence) ? [sentence] : [];
        return;
      }
      sentenceRun.push(sentence);
      if (sentenceRun.length === 6) {
        issues.push({
          code: 'PROSE-FLOW',
          message: '연결어와 전개 없이 짧은 문장 6개가 연속됩니다. 원인·장면·결과가 한 흐름으로 읽히도록 연결하십시오.',
          line: lineAt(body, startIndex),
          relative,
        });
      }
      if (index === sentences.length - 1 && sentenceRun.length > 6) sentenceRun.shift();
    });

    const isSingleShortParagraph = sentences.length === 1 && isShortSentence(sentences[0], 38);
    if (isSingleShortParagraph) {
      shortParagraphRun.push({ line: lineAt(body, startIndex), text });
      if (shortParagraphRun.length === 5) {
        issues.push({
          code: 'PROSE-FLOW',
          message: '짧은 한 문장짜리 문단 5개가 연속됩니다. 리듬용 단문을 줄이고 문단 안의 관계를 연결하십시오.',
          line: shortParagraphRun[0].line,
          relative,
        });
      }
      if (shortParagraphRun.length > 5) shortParagraphRun.shift();
    } else {
      shortParagraphRun.length = 0;
    }
  }

  return issues;
}

function validateSource(source, relative = 'fixture.md') {
  const body = preserveLinesWithoutFrontmatter(source);
  const issues = [];

  for (const phrase of processMetaPatterns) {
    let index = source.indexOf(phrase);
    while (index !== -1) {
      issues.push({
        code: 'NO-PROCESS-META',
        message: `공개 원고에 내부 제작 과정 '${phrase}'이 남아 있습니다.`,
        line: lineAt(source, index),
        relative,
      });
      index = source.indexOf(phrase, index + phrase.length);
    }
  }

  for (const [rule, replacement] of canonicalTermRules) {
    const pattern = new RegExp(rule.source, rule.flags);
    for (const match of source.matchAll(pattern)) {
      issues.push({
        code: 'CANONICAL-TERMINOLOGY',
        message: `비표준 표기 '${match[0]}'를 '${replacement}'로 교정하십시오.`,
        line: lineAt(source, match.index),
        relative,
      });
    }
  }

  const headings = [];
  for (const match of body.matchAll(/^#{2,4}\s+(.+)$/gm)) {
    headings.push({ text: visibleText(match[1]), index: match.index });
  }
  for (const match of body.matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    headings.push({ text: visibleText(match[2]), index: match.index });
  }

  for (const heading of headings) {
    if (/(?:이|가|은|는)\s+아니라(?:[\s,]|$)/.test(heading.text)
      || /이전이\s+아니라(?:[\s,]|$)/.test(heading.text)) {
      issues.push({
        code: 'HEADING-NO-FORCED-CONTRAST',
        message: `대비형 소제목 '${heading.text}'을 장면·쟁점 중심 표현으로 바꾸십시오.`,
        line: lineAt(body, heading.index),
        relative,
      });
    }
  }

  for (const term of commonForeignNoteTerms) {
    const pattern = new RegExp(`${escapeRegExp(term)}\\s*<span\\b[^>]*class=["'][^"']*foreign-note`, 'gi');
    for (const match of body.matchAll(pattern)) {
      issues.push({
        code: 'FOREIGN-NOTE-SELECTIVE',
        message: `대중적인 용어·구단 '${term}'에 불필요한 원어 풀이가 붙었습니다.`,
        line: lineAt(body, match.index),
        relative,
      });
    }
  }

  issues.push(...staccatoIssues(body, relative));
  issues.push(...historyPreviewIssues(source, relative));
  return issues;
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(target);
    return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
  }));
  return nested.flat();
}

function runSelfTest() {
  const fixtures = [
    ['대비형 소제목', '## 스타가 아니라 시스템이었다\n\n본문입니다.', 'HEADING-NO-FORCED-CONTRAST'],
    ['제작 과정', '자료를 찾아보니 이 기록이 나왔다.', 'NO-PROCESS-META'],
    ['비표준 대회명', '프리미어리그와 챔피언스 리그를 우승했다.', 'CANONICAL-TERMINOLOGY'],
    ['비표준 인명', '세베시 구스타브와 리뉘스 미헬스가 남긴 전술을 비교했다.', 'CANONICAL-TERMINOLOGY'],
    ['대중 용어 원어 풀이', '추가시간<span class="foreign-note" lang="en">(additional time)</span>은 주심이 정한다.', 'FOREIGN-NOTE-SELECTIVE'],
    ['짧은 문단 연타', '경기가 다시 시작됐다.\n\n관중은 시계를 바라봤다.\n\n벤치는 항의를 이어갔다.\n\n주심은 손목을 가리켰다.\n\n휘슬은 아직 울리지 않았다.', 'PROSE-FLOW'],
    ['축세 미리보기 누락', '---\ntitle: 축구 역사의 오래된 질문을 다시 읽는다\ndescription: 검색을 위한 충분히 긴 설명입니다.\ncategory: history\ndraft: false\n---\n\n본문입니다.', 'HISTORY-PREVIEW-PROMISE'],
    ['축세 상세 제목 복사', '---\ntitle: 축구 역사는 왜 영국 중심으로 쓰였나\ndescription: 검색을 위한 설명은 상세 페이지와 검색 결과에 사용됩니다.\npreviewTitle: 축구 역사는 왜 영국 중심으로 쓰였나\npreviewDescription: 영국과 남미가 서로 다른 사회에서 축구를 발전시킨 과정을 구체적인 사건과 함께 읽습니다.\ncategory: history\ndraft: false\n---\n\n본문입니다.', 'HISTORY-PREVIEW-PROMISE'],
  ];

  for (const [label, source, expectedCode] of fixtures) {
    if (!validateSource(source).some((issue) => issue.code === expectedCode)) {
      console.error(`글쓰기 규칙 자체 시험 실패: ${label} 위반을 차단하지 못했습니다.`);
      process.exit(1);
    }
  }

  const allowed = [
    '## 이것만 보시면 됩니다\n\n공식 타임라인에는 표시 뒤에 발생한 교체와 득점이 함께 남아 있다.',
    '## 빨강과 검정 사이, 어떤 장면을 먼저 입고 싶을까요?\n\n솔직히, 이건 못 참지 ㅋㅋ. 다만 캠페인의 핵심은 재킷과 셔츠가 겹치는 방식에 있다.',
  ];
  for (const source of allowed) {
    const issues = validateSource(source);
    if (issues.length > 0) {
      console.error(`글쓰기 규칙 자체 시험 실패: 허용 문장을 오탐했습니다. ${issues.map((issue) => issue.code).join(', ')}`);
      process.exit(1);
    }
  }

  console.log('글쓰기 규칙 자체 시험 통과');
}

if (process.argv.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const failures = [];
for (const [relativePath, markers] of integrationRequirements) {
  const source = await readFile(path.resolve(root, relativePath), 'utf8');
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push({
        relative: relativePath,
        line: 1,
        code: 'WRITING-GATE-1',
        message: `필수 규약 연결 또는 표식 '${marker}'이 누락됐습니다.`,
      });
    }
  }
}

for (const contentRoot of contentRoots) {
  for (const file of await markdownFiles(contentRoot)) {
    const source = await readFile(file, 'utf8');
    const relative = path.relative(root, file);
    failures.push(...validateSource(source, relative));
  }
}

if (failures.length > 0) {
  console.error('삥이FC 글쓰기 규칙 검수 실패');
  failures.forEach((failure) => {
    console.error(`- ${failure.relative}:${failure.line} [${failure.code}] ${failure.message}`);
  });
  console.error('\n발행 중단: 원고와 규약 연결을 수정한 뒤 npm run test:writing-rules, npm run validate:writing, npm run build를 다시 실행하십시오. 검사 우회는 금지됩니다.');
  process.exit(1);
}

console.log('삥이FC 글쓰기 규칙 검수 통과');
console.log('자동 차단: 제작 과정 노출 · 비표준 대회명·인명 · 대비형 소제목 · 불필요한 대중 용어 원어 풀이 · 연결 없는 짧은 문장 연타 · 축세 미리보기 위반');
