// 교사가 자신의 Claude(Anthropic) API 키를 입력하면, 그 키를 서버(Upstash Redis)에 저장하고
// 학생에게 공유할 짧은 "방 코드"를 발급한다. 학생 쪽에는 이 코드만 전달되고,
// 실제 API 키는 절대 클라이언트로 노출되지 않는다.

const { generate } = require('./_anthropic');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0/O, 1/I 제외
const TTL_SECONDS = 60 * 60 * 48; // 방 유효기간: 48시간

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    return;
  }

  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    res.status(400).json({ error: '올바른 Claude API 키를 입력해 주세요.' });
    return;
  }

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  if (!redisUrl || !redisToken) {
    res.status(500).json({ error: '서버 저장소 설정이 되어있지 않습니다. 관리자에게 문의하세요.' });
    return;
  }

  const roomCode = generateRoomCode();
  const trimmedKey = apiKey.trim();

  // 키가 실제로 작동하는지(키가 맞는지, 크레딧이 남아 있는지) 방을 만들기 전에 아주 짧은 요청으로 확인한다.
  // (여기서 안 걸러지면, 학생들이 쓰는 도중에야 실패해서 원인 찾기가 훨씬 어려워진다.)
  const test = await generate(trimmedKey, '안녕', 1);
  if (!test.ok) {
    const messages = {
      auth: '이 API 키가 유효하지 않은 것 같아요. Claude Console에서 키를 다시 확인해 주세요.',
      credit: '이 키의 계정에 사용 크레딧이 없어요. Claude Console의 결제(Billing) 화면에서 크레딧을 먼저 충전해 주세요.',
      busy: 'AI 서버가 잠시 붐벼요. 잠시 후 다시 시도해 주세요.',
      model: '사용 가능한 AI 모델을 찾지 못했어요. 관리자에게 문의해 주세요.',
      other: `키 확인 중 문제가 발생했어요. (상태 코드 ${test.status})`,
    };
    res.status(400).json({ error: messages[test.kind] || messages.other });
    return;
  }

  try {
    const setUrl = `${redisUrl}/set/room:${roomCode}/${encodeURIComponent(trimmedKey)}?EX=${TTL_SECONDS}`;
    const setRes = await fetch(setUrl, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    if (!setRes.ok) {
      res.status(500).json({ error: '방을 만드는 데 실패했어요. 잠시 후 다시 시도해 주세요.' });
      return;
    }
    res.status(200).json({ roomCode, expiresInHours: 48 });
  } catch (e) {
    res.status(500).json({ error: '서버 오류가 발생했어요.' });
  }
};
