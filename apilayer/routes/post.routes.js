const express = require('express');
const { body } = require('express-validator');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const verifyCsrf = require('../middleware/csrf');
const postController = require('../controllers/post.controller');

const router = express.Router();

// Applies to every route below. Internally a no-op for GET requests —
// only POST/PATCH/DELETE need the CSRF check, since only those change data.
router.use(verifyCsrf);

// Feed must come before "/:id" so Express doesn't treat "feed" as a post ID
router.get('/feed', authenticate, postController.getFeed);

router.post(
  '/',
  authenticate,
  [body('text').trim().isLength({ min: 1, max: 500 }).withMessage('1-500 characters')],
  validate,
  postController.createPost
);

router.get('/:id', optionalAuth, postController.getPost);
router.delete('/:id', authenticate, postController.deletePost);

router.post('/:id/like', authenticate, postController.likePost);
router.delete('/:id/like', authenticate, postController.unlikePost);

router.post(
  '/:id/comments',
  authenticate,
  [body('text').trim().isLength({ min: 1, max: 300 }).withMessage('1-300 characters')],
  validate,
  postController.addComment
);
router.get('/:id/comments', postController.getComments);

module.exports = router;
