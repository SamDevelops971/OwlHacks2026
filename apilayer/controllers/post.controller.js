const postService = require('../services/post.service');
const { catchAsync } = require('../middleware/errorHandler');

const createPost = catchAsync(async (req, res) => {
  const post = postService.createPost(req.user.id, req.body.text);
  res.status(201).json({ data: post, error: null });
});

const getPost = catchAsync(async (req, res) => {
  const post = postService.getPost(req.params.id, req.user?.id);
  res.status(200).json({ data: post, error: null });
});

const deletePost = catchAsync(async (req, res) => {
  const result = postService.deletePost(req.params.id, req.user.id);
  res.status(200).json({ data: result, error: null });
});

const getFeed = catchAsync(async (req, res) => {
  // Pagination params come from the query string: /feed?cursor=xyz&limit=10
  const { cursor, limit } = req.query;
  const feed = postService.getFeed(req.user.id, {
    cursor,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.status(200).json({ data: feed, error: null });
});

const likePost = catchAsync(async (req, res) => {
  const result = postService.likePost(req.params.id, req.user.id);
  res.status(200).json({ data: result, error: null });
});

const unlikePost = catchAsync(async (req, res) => {
  const result = postService.unlikePost(req.params.id, req.user.id);
  res.status(200).json({ data: result, error: null });
});

const addComment = catchAsync(async (req, res) => {
  const comment = postService.addComment(req.params.id, req.user.id, req.body.text);
  res.status(201).json({ data: comment, error: null });
});

const getComments = catchAsync(async (req, res) => {
  const list = postService.getComments(req.params.id);
  res.status(200).json({ data: list, error: null });
});

module.exports = {
  createPost,
  getPost,
  deletePost,
  getFeed,
  likePost,
  unlikePost,
  addComment,
  getComments,
};
