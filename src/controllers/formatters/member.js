const options = {
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric',
  hour12: false
};

function timeFormatFunc(timestampStr) {
  const timestamp = Number(timestampStr);
  if (!timestamp) return timestamp;
  const localeStr = new Date(timestamp).toLocaleString('zh-CN', options);
  const formatLocaleStr = localeStr.replace(/^(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
  return formatLocaleStr;
}
// const valueFormatFunc = {
//   creationTime: timeFormatFunc,
//   lastAuthorizedTime: timeFormatFunc,
//   lastDeauthorizedTime: timeFormatFunc,
// }
const formatterMaps = [
  {
    key: 'creationTime',
    newKey: 'creationTimeStr',
    formatter: timeFormatFunc,
  },
  {
    key: 'lastAuthorizedTime',
    newKey: 'lastAuthorizedTimeStr',
    formatter: timeFormatFunc,
  },
  {
    key: 'lastDeauthorizedTime',
    newKey: 'lastDeauthorizedTimeStr',
    formatter: timeFormatFunc,
  },
]
exports.get = function formatMemberInfo(member) {
  formatterMaps.forEach((item) => {
    const key = item.key || '';
    const newKey = item.newKey;
    const formatter = item.formatter;
    const originalValue = member[key];
    if (originalValue && formatter) {
      const newValue = formatter(originalValue);
      member[newKey] = newValue;
    }
  })
  return member;
}
