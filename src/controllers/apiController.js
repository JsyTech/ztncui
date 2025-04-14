/*
  ztncui - ZeroTier network controller UI
  Copyright (C) 2017-2021  Key Networks (https://key-networks.com)
  Licensed under GPLv3 - see LICENSE for details.
*/

const zt = require('./zt');
const storage = require('node-persist');
const ipaddr = require('ip-address');
const memberFormatter = require('./formatters/member');
const membersFormatter = require('./formatters/members');

// Simple in-memory lock for IP assignment
const ipAssignmentLock = {};

storage.initSync({dir: 'etc/storage'});

exports.getMembers = async function(req, res) {
  try {
    const nwid = req.params.nwid;
    let members = await zt.members(nwid);
    
    // Fix weird data returned by ZeroTier 1.12
    if (Array.isArray(members)) {
      let obj = {};
      for (let id of members) {
        let key = Object.keys(id)[0];
        let value = Object.values(id)[0];
        obj[key] = value;
      }
      members = obj;
    }

    // Get details for each member
    const memberDetails = await Promise.all(
      Object.keys(members).map(id => 
        Promise.all([
          zt.member_detail(nwid, id),
          storage.getItem(id)
        ])
      )
    );

    // Format members data
    const formattedMembers = memberDetails.map(([member, name]) => {
      member.name = name || '';
      return memberFormatter.get(member);
    });

    res.json(membersFormatter.getGroups({}, formattedMembers));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addIpAssignment = async function(req, res) {
  try {
    const nwid = req.params.nwid;
    const memberId = req.params.id;
    const { ipAddress, routeTarget } = req.body;

    if (!ipAddress && !routeTarget) {
      return res.status(400).json({ error: 'Either ipAddress or routeTarget is required' });
    }

    let assignedIp = ipAddress;

    if (routeTarget) {
      // Parse route target (e.g. "192.168.1.0/24")
      const [network, prefix] = routeTarget.split('/');
      const prefixNum = parseInt(prefix);
      
      if (prefixNum < 16 || prefixNum > 30) {
        return res.status(400).json({ error: 'Invalid prefix length (16-30)' });
      }

      // Use network ID as lock key
      const lockKey = nwid;
      
      // Wait for lock
      while (ipAssignmentLock[lockKey]) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      try {
        ipAssignmentLock[lockKey] = true;
        
        // Get all assigned IPs in network (with fresh data)
        const members = await zt.members(nwid);
        const assignedIps = [];
        for (const id in members) {
          const m = await zt.member_detail(nwid, id);
          if (m.ipAssignments) {
            assignedIps.push(...m.ipAssignments);
          }
        }

        // Find first available IP in subnet (skip network and broadcast)
        const subnet = new ipaddr.Address4(routeTarget);
        const startIpHexStr = subnet.startAddress().toHex();
        const endIpHexStr = subnet.endAddress().toHex();
        const startIpHexNum = parseInt(startIpHexStr.replaceAll(':', ''), 16);
        const endIpHexNum = parseInt(endIpHexStr.replaceAll(':', ''), 16);

        for (let ip = startIpHexNum + 1; ip < endIpHexNum; ip++) {
          const ipStr = new ipaddr.Address4(ip).address;
          if (!assignedIps.includes(ipStr)) {
            assignedIp = ipStr;
            break;
          }
        }

        if (!assignedIp) {
          return res.status(400).json({ error: 'No available IP addresses in this subnet' });
        }

        // Double check IP is still available before assigning
        const currentMember = await zt.member_detail(nwid, memberId);
        if (currentMember.ipAssignments && currentMember.ipAssignments.includes(assignedIp)) {
          return res.status(409).json({ error: 'IP address was just assigned to another member' });
        }
      } finally {
        // Release lock
        ipAssignmentLock[lockKey] = false;
      }
    }

    await zt.ipAssignmentAdd(nwid, memberId, { ipAddress: assignedIp });
    res.json({ 
      success: true,
      ipAddress: assignedIp,
      autoAssigned: !!routeTarget 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteIpAssignment = async function(req, res) {
  try {
    const nwid = req.params.nwid;
    const memberId = req.params.id;
    const { ipAddress } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    // Get member details to find IP assignment index
    const member = await zt.member_detail(nwid, memberId);
    const index = member.ipAssignments?.findIndex(ip => ip === ipAddress);
    
    if (index === -1 || index === undefined) {
      return res.status(404).json({ error: 'IP address not found for this member' });
    }

    await zt.ipAssignmentDelete(nwid, memberId, index);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMember = async function(req, res) {
  try {
    const nwid = req.params.nwid;
    const memberId = req.params.id;

    const result = await zt.member_delete(nwid, memberId);
    if (result.deleted) {
      await storage.removeItem(memberId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMember = async function(req, res) {
  try {
    const nwid = req.params.nwid;
    const { memberId, authorized, name } = req.body;
    
    if (!memberId) {
      return res.status(400).json({ error: 'Member ID is required' });
    }

    if (authorized !== undefined) {
      const auth = { authorized: authorized };
      await zt.member_object(nwid, memberId, auth);
    }

    if (name !== undefined) {
      await storage.setItem(memberId, name);
    }

    res.json({ code: 0, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
