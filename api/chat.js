// 학생(또는 테스트 중인 교사)의 브라우저는 이 엔드포인트만 호출한다.
// 여기서 방 코드로 저장된 교사의 Claude(Anthropic) API 키를 찾아, 서버가 대신 AI를 호출한다.
// 실제 API 키는 이 서버 함수 밖으로 절대 나가지 않는다.

const { generate } = require('./_anthropic');
const { findRedisConfig, redisEnvNames, MISSING_MESSAGE } = require('./_redis');
const { findStrictPersonalInfo } = require('./_privacy');

const MAX_PROMPT_CHARS = 12000; // 정상적인 수업 요청은 이보다 훨씬 짧다(방 코드를 이용한 남용 방지)
const MAX_TOKENS = { default: 1024, quick: 300 };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    return;
  }

  const { roomCode, prompt, tier } = req.body || {};
  if (!roomCode || !prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: '잘못된 요청이에요.' });
    return;
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    res.status(400).json({ error: '요청이 너무 길어요.' });
    return;
  }

  // AI 회사로 보내기 전 개인정보 이중 확인
  const pi = findStrictPersonalInfo(prompt);
  if (pi) {
    res.status(400).json({ error: `${pi}처럼 보이는 개인정보가 있어서 보내지 않았어요.`, code: 'privacy' });
    return;
  }

  const redis = findRedisConfig();
  if (!redis) {
    console.error('저장소 환경변수를 찾지 못함. 저장소 관련 환경변수 이름:', redisEnvNames().join(', ') || '(없음)');
    res.status(500).json({ error: MISSING_MESSAGE, envNames: redisEnvNames() });
    return;
  }
  const redisUrl = redis.url;
  const redisToken = redis.token;

  let apiKey;
  try {
    const getRes = await fetch(`${redisUrl}/get/room:${String(roomCode).toUpperCase()}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const getData = await getRes.json();
    apiKey = getData && getData.result;
  } catch (e) {
    res.status(500).json({ error: '방 정보를 확인하는 데 실패했어요.' });
    return;
  }
  if (!apiKey) {
    res.status(404).json({ error: '이 방은 만료되었거나 존재하지 않아요. 선생님께 새 링크를 요청해 주세요.' });
    return;
  }

  const result = await generate(apiKey, prompt, MAX_TOKENS[tier] || MAX_TOKENS.default);
  if (result.ok) {
    res.status(200).json({ text: result.text, modelUsed: result.model });
    return;
  }

  const messages = {
    auth: '선생님의 AI 키가 더 이상 유효하지 않아요. 선생님께 알려 주세요. (선생님: Claude Console에서 키를 확인한 뒤 방을 새로 만들어 주세요.)',
    credit: 'AI 사용 크레딧이 부족해요. 선생님께 알려 주세요. (선생님: Claude Console의 결제(Billing) 화면에서 크레딧을 충전해 주세요.)',
    busy: '지금 AI가 붐벼요. 잠시 후 다시 시도해 주세요.',
    model: '사용 가능한 AI 모델을 찾지 못했어요. 관리자에게 문의해 주세요.',
    other: 'AI 응답에 실패했어요. 잠시 후 다시 시도해 주세요.',
  };
  const status = result.kind === 'busy' ? 429 : 502;
  res.status(status).json({ error: messages[result.kind] || messages.other, detail: result.detail || '' });
};
