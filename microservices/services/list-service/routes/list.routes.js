const express = require('express');
const controller = require('../list.controller');
const router = express.Router();

router.post('/', controller.createList);
router.get('/:id', controller.getList);
router.post('/:id/checkout', controller.checkoutList);

module.exports = router;