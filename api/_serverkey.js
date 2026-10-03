// "서버 키 모드": Vercel 환경변수 ANTHROPIC_API_KEY에 운영자(선생님)의 Claude API 키를 넣어 두면,
// 교사는 키를 입력하지 않고 방을 만들 수 있다. 환경변수를 지우면 원래대로 "교사가 자기 키를 입력하는 방식"으로 돌아간다.
// 파일 이름이 밑줄(_)로 시작하므로 공개 주소(API)로 만들어지지 않는다.

const crypto = require('crypto');

// 서버 키로 만든 방은 저장소에 실제 키 대신 이 표시만 저장한다(키는 환경변수에만 있다).
const SERVER_ROOM_MARKER = '@SERVER_KEY';
const DEFAULT_ROOM_CALL_LIMIT = 6000; // 방 하나에서 쓸 수 있는 AI 호출 횟수(한 학급 2시간 수업의 약 4배)

function serverKey(env = process.env) {
  const k = (env.ANTHROPIC_API_KEY || '').trim();
  return k.length >= 10 ? k : null;
}

// 교사 코드(선택): TEACHER_CODE를 정해 두면, 이 코드를 아는 사람만 방을 만들 수 있다.
function teacherCode(env = process.env) {
  const c = (env.TEACHER_CODE || '').trim();
  return c || null;
}

function teacherCodeMatches(input, env = process.env) {
  const expected = teacherCode(env);
  if (!expected) return true; // 코드를 정해 두지 않았으면 확인하지 않는다
  const a = crypto.createHash('sha256').update(String(input || '').trim()).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function roomCallLimit(env = process.env) {
  const n = parseInt(env.ROOM_CALL_LIMIT || '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_ROOM_CALL_LIMIT;
}

module.exports = { SERVER_ROOM_MARKER, serverKey, teacherCode, teacherCodeMatches, roomCallLimit };
