// 화면이 처음 열릴 때, 서버가 어떤 방식으로 설정되어 있는지 알려 준다(키 값은 절대 보내지 않는다).
//   serverKey: 서버에 운영자 키가 들어 있어, 교사가 키를 입력하지 않아도 되는지
//   needCode : 방을 만들 때 교사 코드가 필요한지

const { serverKey, teacherCode } = require('./_serverkey');

module.exports = function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.status(200).json({ serverKey: !!serverKey(), needCode: !!serverKey() && !!teacherCode() });
};
