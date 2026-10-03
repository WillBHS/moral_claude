// 서버 쪽 개인정보 이중 확인.
// 학생 화면에서 먼저 걸러내지만, 화면을 거치지 않고 요청을 직접 보내는 경우까지 대비해
// AI 회사로 보내기 직전에 한 번 더 확인한다. 오탐을 피하려고 형식이 분명한 것만 본다
// (AI가 만든 이야기가 함께 들어 있으므로, 이름·학교처럼 애매한 것은 화면 쪽에서만 확인한다).

const STRICT_PATTERNS = [
  { name: '전화번호', re: /(?:01[016789]|0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}/ },
  { name: '이메일', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { name: '주민등록번호', re: /\d{6}\s?[-–]\s?[1-8]\d{6}/ },
];

function findStrictPersonalInfo(text) {
  const t = String(text || '');
  const hit = STRICT_PATTERNS.find((p) => p.re.test(t));
  return hit ? hit.name : null;
}

module.exports = { findStrictPersonalInfo };
