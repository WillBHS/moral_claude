// Upstash Redis(저장소) 접속 정보 찾기.
// Vercel에서 저장소를 프로젝트에 연결할 때 환경변수 이름 앞부분(접두사)을 바꿀 수 있어서,
// 이름이 KV_REST_API_URL이 아니어도(예: UPSTASH_REDIS_REST_URL, STORAGE_KV_REST_API_URL) 찾아 쓴다.

function findRedisConfig(env = process.env) {
  const names = Object.keys(env);
  const urlSuffixes = ['KV_REST_API_URL', 'REDIS_REST_URL'];
  const tokenFor = { KV_REST_API_URL: 'KV_REST_API_TOKEN', REDIS_REST_URL: 'REDIS_REST_TOKEN' };

  for (const suffix of urlSuffixes) {
    // 정확히 그 이름인 것을 먼저, 그다음 접두사가 붙은 것을 찾는다.
    const candidates = names.filter((n) => n === suffix || n.endsWith('_' + suffix));
    candidates.sort((a, b) => a.length - b.length);
    for (const urlName of candidates) {
      const prefix = urlName.slice(0, urlName.length - suffix.length);
      const tokenName = prefix + tokenFor[suffix];
      if (env[urlName] && env[tokenName]) {
        return { url: env[urlName].replace(/\/+$/, ''), token: env[tokenName], urlName, tokenName };
      }
    }
  }
  return null;
}

// 설정이 없을 때 원인을 찾기 쉽도록, 저장소 관련으로 보이는 환경변수 "이름"만 모은다(값은 절대 포함하지 않음).
function redisEnvNames(env = process.env) {
  return Object.keys(env).filter((n) => /KV_|REDIS|UPSTASH/i.test(n)).sort();
}

const MISSING_MESSAGE = '서버 저장소 설정이 되어있지 않습니다. (관리자: Vercel 프로젝트에 Upstash 저장소가 연결되어 있는지, 연결 후 Redeploy 했는지 확인해 주세요.)';

module.exports = { findRedisConfig, redisEnvNames, MISSING_MESSAGE };
