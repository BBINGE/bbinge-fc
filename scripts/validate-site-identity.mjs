import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const builtMode = process.argv.includes('--built');

function fail(message) {
  console.error(`사이트·저자 식별 검수 실패: ${message}`);
  process.exitCode = 1;
}

if (!builtMode) {
  const siteSource = fs.readFileSync(path.join(root, 'src/config/site.ts'), 'utf8');
  const layoutSource = fs.readFileSync(path.join(root, 'src/layouts/Layout.astro'), 'utf8');

  for (const value of ['BBINGE FC', 'BBinge FC', '삥이FC(풋볼N컬처)_official', 'bbingefc.com']) {
    if (!siteSource.includes(`'${value}'`)) fail(`WebSite 대체 이름에서 ${value} 누락`);
  }

  for (const value of ['삥이', 'BBinge', 'BBingStory', 'Park Seongho', '朴誠護']) {
    if (!siteSource.includes(`'${value}'`)) fail(`Person 대체 이름에서 ${value} 누락`);
  }

  const requiredLayoutSignals = [
    'alternateName: site.alternateNames',
    'description: site.homeDescription',
    "author: { '@id': `${site.url}/#author` }",
    "creator: { '@id': `${site.url}/#author` }",
    "publisher: { '@id': `${site.url}/#organization` }",
    "'@type': 'Organization'",
    "founder: { '@id': `${site.url}/#author` }",
    "affiliation: { '@id': `${site.url}/#organization` }",
    'alternateName: site.authorAlternateNames',
    'description: site.authorDescription',
  ];

  for (const signal of requiredLayoutSignals) {
    if (!layoutSource.includes(signal)) fail(`Layout 구조화 데이터 연결 누락: ${signal}`);
  }
} else {
  const htmlPath = path.join(root, 'dist/index.html');
  if (!fs.existsSync(htmlPath)) {
    fail('dist/index.html이 없습니다. Astro 빌드 뒤 검수해야 합니다.');
  } else {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((match) => JSON.parse(match[1]));
    const website = schemas.find((schema) => schema['@type'] === 'WebSite');
    const organization = schemas.find((schema) => schema['@type'] === 'Organization' && schema['@id'] === 'https://bbingefc.com/#organization');
    const author = schemas.find((schema) => schema['@type'] === 'Person' && schema['@id'] === 'https://bbingefc.com/#author');

    if (!website) fail('빌드 결과에서 WebSite JSON-LD 누락');
    if (!organization) fail('빌드 결과에서 매거진 Organization JSON-LD 누락');
    if (!author) fail('빌드 결과에서 저자 Person JSON-LD 누락');

    if (website) {
      const alternateNames = Array.isArray(website.alternateName) ? website.alternateName : [website.alternateName];
      for (const value of ['BBINGE FC', 'BBinge FC', '삥이FC(풋볼N컬처)_official', 'bbingefc.com']) {
        if (!alternateNames.includes(value)) fail(`빌드된 WebSite 대체 이름에서 ${value} 누락`);
      }
      for (const relation of ['author', 'creator']) {
        if (website[relation]?.['@id'] !== 'https://bbingefc.com/#author') {
          fail(`빌드된 WebSite.${relation}가 저자 Person을 참조하지 않음`);
        }
      }
      if (website.publisher?.['@id'] !== 'https://bbingefc.com/#organization') {
        fail('빌드된 WebSite.publisher가 매거진 Organization을 참조하지 않음');
      }
    }

    if (organization) {
      if (organization.founder?.['@id'] !== 'https://bbingefc.com/#author') fail('매거진 Organization과 저자 Person 연결 누락');
      if (!organization.logo?.url) fail('매거진 Organization 로고 누락');
    }

    if (author) {
      if (author.affiliation?.['@id'] !== 'https://bbingefc.com/#organization') fail('저자 Person과 매거진 Organization 소속 연결 누락');
      if (!author.alternateName?.includes('삥이') || !author.alternateName?.includes('BBinge')) {
        fail('빌드된 Person에서 삥이·BBinge 연결 누락');
      }
      if (!author.description?.includes('삥이FC')) fail('빌드된 Person 설명에서 삥이FC 연결 누락');
    }
  }
}

if (!process.exitCode) {
  console.log(`사이트·저자 식별 검수 통과 (${builtMode ? '빌드 결과' : '소스'})`);
}
