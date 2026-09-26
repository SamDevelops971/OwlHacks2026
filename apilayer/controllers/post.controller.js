const postService = require('../services/post.service');
const voteService = require('../services/vote.service');
const commentService = require('../services/comment.service');
const { catchAsync } = require('../middleware/errorHandler');

const createPost = catchAsync(async (req, res) => {
  const { title, body } = req.body;
  const post = await postService.createPost(req.params.clubId, req.user.id, { title, body });
  res.status(201).json({ data: post, error: null });
});

const listPostsInClub = catchAsync(async (req, res) => {
  const { cursor, limit } = req.query;
  const feed = await postService.listPosts({
    clubId: req.params.clubId,
    cursor: cursor ? parseInt(cursor, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    viewerId: req.user?.id,
  });
  res.status(200).json({ data: feed, error: null });
});

// General feed across every club, newest first — the closest equivalent
// to the old "following" feed, since this schema has no follow relationships.
const listAllPosts = catchAsync(async (req, res) => {
  const { cursor, limit } = req.query;
  const feed = await postService.listPosts({
    cursor: cursor ? parseInt(cursor, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    viewerId: req.user?.id,
  });
  res.status(200).json({ data: feed, error: null });
});

const getPost = catchAsync(async (req, res) => {
  const post = await postService.getPost(req.params.id, req.user?.id);
  res.status(200).json({ data: post, error: null });
});

const deletePost = catchAsync(async (req, res) => {
  const result = await postService.deletePost(req.params.id, req.user.id);
  res.status(200).json({ data: result, error: null });
});

const upvote = catchAsync(async (req, res) => {
  const result = await voteService.castVote(req.params.id, req.user.id, 1);
  res.status(200).json({ data: result, error: null });
});

const downvote = catchAsync(async (req, res) => {
  const result = await voteService.castVote(req.params.id, req.user.id, -1);
  res.status(200).json({ data: result, error: null });
});

const removeVote = catchAsync(async (req, res) => {
  const result = await voteService.removeVote(req.params.id, req.user.id);
  res.status(200).json({ data: result, error: null });
});

const addComment = catchAsync(async (req, res) => {
  const comment = await commentService.addComment(req.params.id, req.user.id, req.body.body);
  res.status(201).json({ data: comment, error: null });
});

const getComments = catchAsync(async (req, res) => {
  const list = await commentService.getComments(req.params.id);
  res.status(200).json({ data: list, error: null });
});

module.exports = {
  createPost,
  listPostsInClub,
  listAllPosts,
  getPost,
  deletePost,
  upvote,
  downvote,
  removeVote,
  addComment,
  getComments,
};
