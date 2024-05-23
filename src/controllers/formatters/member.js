function timeFormatFunc(timestamp) {
  if (!timestamp) return timestamp;
  const localeStr = new Date(timestamp).toLocaleString();
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
