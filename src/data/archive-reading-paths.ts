import type { CollectionEntry } from 'astro:content';

export interface ArchiveReadingPath {
  id: string;
  title: string;
  description: string;
  stops: { articleId: string; note: string }[];
}

// 순서는 편집자가 정한다. 대표 경로를 교체해도 이전 경로는 목록에 남는다.
export const featuredReadingPathId = 'dutch-football-two-generations';
export const archiveReadingPaths: ArchiveReadingPath[] = [
  {
    id: 'dutch-football-two-generations',
    title: '네덜란드, 두 세대의 유럽 무대',
    description: '페예노르트와 안데를레흐트에서 PSV까지. 중원을 지배한 왼발, 측면의 드리블, 문전의 헤더를 따라 서로 다른 클럽과 대표팀의 이야기를 잇습니다.',
    stops: [
      { articleId: 'willem-van-hanegem', note: '하펠의 페예노르트와 1974 네덜란드. 중원을 읽는 왼발에서 출발합니다.' },
      { articleId: 'rob-rensenbrink', note: '안데를레흐트의 유럽 결승과 두 차례 월드컵. 시선을 왼쪽 측면으로 옮깁니다.' },
      { articleId: 'wim-kieft', note: '열아홉 살 골든슈에서 PSV 트레블까지. 다음 세대의 문전을 살펴봅니다.' },
      { articleId: 'gerald-vanenburg', note: '같은 PSV의 측면에서 드리블과 연결을 맡은 파넨뷔르흐로 이어집니다.' },
    ],
  },
];

export function resolveReadingPaths(records: CollectionEntry<'archive'>[]) {
  const published = new Map(records.filter(r => !r.data.draft).map(r => [r.id, r]));
  const ids = new Set<string>();
  const paths = archiveReadingPaths.map(path => {
    if (!/^[a-z0-9-]+$/.test(path.id) || ids.has(path.id) || path.stops.length < 2) throw new Error(`독서 경로 구성 확인: ${path.id}`);
    ids.add(path.id);
    const used = new Set<string>();
    return {...path, stops: path.stops.map(stop => {
      const record = published.get(stop.articleId);
      if (!record || used.has(stop.articleId)) throw new Error(`독서 경로의 공개 글·중복 확인: ${path.id}/${stop.articleId}`);
      used.add(stop.articleId);
      return {...stop, record};
    })};
  });
  if (paths.length && !ids.has(featuredReadingPathId)) throw new Error('대표 독서 경로 ID를 확인하세요.');
  return paths;
}
