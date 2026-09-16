import playersFile from '../../../src/data/goat-players.json';

export const PLAYER_IDS = new Set(playersFile.players.map((player) => player.id));
export const ROUND_COUNTS = new Map([[32, 16], [16, 8], [8, 4], [4, 2], [2, 1]]);

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function cleanText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function validSessionId(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateResult(body) {
  if (!body || typeof body !== 'object') return '요청 형식이 올바르지 않습니다.';
  if (typeof body.seed !== 'string' || !/^[a-z0-9_-]{1,64}$/i.test(body.seed)) return 'seed가 올바르지 않습니다.';
  if (!validSessionId(body.anonymousSessionId)) return '익명 세션이 올바르지 않습니다.';
  if (![body.winner, body.runnerUp].every((id) => PLAYER_IDS.has(id)) || body.winner === body.runnerUp) return '결승 결과가 올바르지 않습니다.';
  if (!Array.isArray(body.semifinalists) || body.semifinalists.length !== 2 || new Set(body.semifinalists).size !== 2) return '4강 결과가 올바르지 않습니다.';
  if (!body.semifinalists.every((id) => PLAYER_IDS.has(id) && id !== body.winner && id !== body.runnerUp)) return '4강 선수 ID가 올바르지 않습니다.';
  if (!Array.isArray(body.matches) || body.matches.length !== 31) return '완주 기록은 31경기여야 합니다.';

  const roundCounts = new Map();
  for (const match of body.matches) {
    const round = Number(match?.round);
    if (!ROUND_COUNTS.has(round)) return '라운드 값이 올바르지 않습니다.';
    if (![match.playerA, match.playerB, match.winner].every((id) => PLAYER_IDS.has(id))) return '선수 ID가 올바르지 않습니다.';
    if (match.playerA === match.playerB || (match.winner !== match.playerA && match.winner !== match.playerB)) return '맞대결 결과가 올바르지 않습니다.';
    roundCounts.set(round, (roundCounts.get(round) ?? 0) + 1);
  }
  for (const [round, count] of ROUND_COUNTS) {
    if (roundCounts.get(round) !== count) return `${round}강 경기 수가 올바르지 않습니다.`;
  }
  const rounds = [32, 16, 8, 4, 2];
  for (let index = 0; index < rounds.length; index += 1) {
    const round = rounds[index];
    const matches = body.matches.filter((match) => Number(match.round) === round);
    const participants = matches.flatMap((match) => [match.playerA, match.playerB]);
    if (new Set(participants).size !== round) return `${round}강 대진에 중복 선수가 있습니다.`;
    if (index < rounds.length - 1) {
      const nextParticipants = new Set(body.matches.filter((match) => Number(match.round) === rounds[index + 1]).flatMap((match) => [match.playerA, match.playerB]));
      if (matches.some((match) => !nextParticipants.has(match.winner)) || nextParticipants.size !== matches.length) return `${round}강 승자와 다음 라운드가 일치하지 않습니다.`;
    }
  }
  const final = body.matches.find((match) => Number(match.round) === 2);
  if (!final || final.winner !== body.winner || ![final.playerA, final.playerB].includes(body.runnerUp)) return '최종 결승 기록이 일치하지 않습니다.';
  const semifinalParticipants = new Set(body.matches.filter((match) => Number(match.round) === 4).flatMap((match) => [match.playerA, match.playerB]));
  if (![body.winner, body.runnerUp, ...body.semifinalists].every((id) => semifinalParticipants.has(id))) return '4강 명단이 실제 대진과 일치하지 않습니다.';
  return null;
}

export function requireDb(env) {
  if (!env?.GOAT_DB) throw new Error('GOAT_DB binding is missing');
  return env.GOAT_DB;
}
