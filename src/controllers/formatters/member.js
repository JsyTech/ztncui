const options = {
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric',
  hour12: false
};

function timeFormatFunc(timestamp) {
  if (!timestamp) return timestamp;
  const localeStr = new Date(timestamp).toLocaleString('zh-CN', options);
  return localeStr + '(' + timestamp + ')';
}
const valueFormatFunc = {
  creationTime: timeFormatFunc,
  lastAuthorizedTime: timeFormatFunc,
  lastDeauthorizedTime: timeFormatFunc,
}
exports.get = function formatMemberInfo(member) {
  const cloneMember = JSON.parse(JSON.stringify(member));
  Object.entries(valueFormatFunc).forEach((item) => {
    const key = item[0];
    const func = item[1];
    if (cloneMember[key] && func) {
      const newValue = func(cloneMember[key]);
      cloneMember[key] = newValue;
    }
  })
  return cloneMember;
}
