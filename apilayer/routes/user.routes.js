const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const verifyCsrf = require('../middleware/csrf');
const userController = require('../controllers/user.controller');

const router = express.Router();
router.use(verifyCsrf); // no-op on GET routes; enforced on PATCH/POST/DELETE below

router.get('/:id', userController.getUser);

router.patch(
  '/:id',
  authenticate,
  [body('bio').optional().isLength({ max: 160 }), body('username').optional().trim().isLength({ min: 3, max: 20 })],
  validate,
  userController.updateUser
);

router.post('/:id/follow', authenticate, userController.followUser);
router.delete('/:id/follow', authenticate, userController.unfollowUser);
router.get('/:id/following', userController.getFollowing);
router.get('/:id/followers', userController.getFollowers);

module.exports = router;
