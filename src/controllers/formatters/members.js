const ipaddr = require('ip-address');

function sortByIP (prev,  next) {
  const prevIPBigInteger = new ipaddr.Address4(prev.ipAssignments[0]).bigInteger();
  const nextIPBigInteger = new ipaddr.Address4(next.ipAssignments[0]).bigInteger();
  return nextIPBigInteger - prevIPBigInteger;
}
exports.getGroups = function getGroups(network, members) {
  const noIPMembers = members.filter((member) => {
    if (member.ipAssignments && member.ipAssignments.length) {
      return false;
    }
    return true;
  });
  const hasIPMembers = members.filter((member) => {
    if (member.ipAssignments && member.ipAssignments.length) {
      return true;
    }
    return false;
  });

  const groups = [
    {
      key: 0,
      title: 'Wait for IP Assignment',
      members: noIPMembers
    }
  ];

  const routes = network.routes || [];
  routes.forEach((route, index) => {
    const routeTarget = route.target;
    const routeTargetAddr = new ipaddr.Address4(route.target);
    const _members = hasIPMembers.filter(_member => {
      return _member.ipAssignments.some(ipAssignment => {
        const memberIP = new ipaddr.Address4(ipAssignment);
        return memberIP.isInSubnet(routeTargetAddr);
      });
    });

    const _membersSortByIP = _members.sort(sortByIP);
    const newGroup = {
      key: index + 1,
      title: routeTarget,
      members: _membersSortByIP
    }
    groups.push(newGroup);
  });
  return groups;
}

