const express = require('express');
const { body } = require('express-validator');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const verifyCsrf = require('../middleware/csrf');
const postController = require('../controllers/post.controller');

const router = express.Router();
router.use(verifyCsrf); // no-op on GET requests

// General feed across all clubs — GET /posts?cursor=&limit=
// Must come before "/:id" so Express doesn't treat nothing-here as an id.
router.get('/', optionalAuth, postController.listAllPosts);

router.get('/:id', optionalAuth, postController.getPost);
router.delete('/:id', authenticate, postController.deletePost);

router.post('/:id/upvote', authenticate, postController.upvote);
router.post('/:id/downvote', authenticate, postController.downvote);
router.delete('/:id/vote', authenticate, postController.removeVote);

router.post(
  '/:id/comments',
  authenticate,
  [body('body').trim().isLength({ min: 1, max: 1000 }).withMessage('1-1000 characters')],
  validate,
  postController.addComment
);
router.get('/:id/comments', postController.getComments);

module.exports = router;
