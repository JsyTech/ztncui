/*
  ztncui - ZeroTier network controller UI
  Copyright (C) 2017-2021  Key Networks (https://key-networks.com)
  Licensed under GPLv3 - see LICENSE for details.
*/

const express = require('express');
// const auth = require('../controllers/auth');
// const restrict = auth.restrict;
const router = express.Router();

const apiController = require('../controllers/apiController');

// Members routes
router.get('/networks/:nwid/members', apiController.getMembers);
router.post('/networks/:nwid/members', apiController.updateMember);

// IP assignments
router.post('/networks/:nwid/members/:id/ip/add', apiController.addIpAssignment);
router.post('/networks/:nwid/members/:id/ip/delete', apiController.deleteIpAssignment);

// Member management
router.post('/networks/:nwid/members/:id/delete', apiController.deleteMember);

module.exports = router;
