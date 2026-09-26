const userService = require('../services/user.service');
const { catchAsync } = require('../middleware/errorHandler');

const getUser = catchAsync(async (req, res) => {
  const user = userService.getUserById(req.params.id);
  res.status(200).json({ data: user, error: null });
});

const updateUser = catchAsync(async (req, res) => {
  // A user can only update their OWN profile — this authorization
  // check belongs in the controller because it's about the HTTP
  // request's identity (req.user, from the auth middleware) vs.
  // the resource in the URL (req.params.id).
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ data: null, error: { message: 'Forbidden', status: 403 } });
  }
  const updated = userService.updateUser(req.params.id, req.body);
  res.status(200).json({ data: updated, error: null });
});

const followUser = catchAsync(async (req, res) => {
  const result = userService.follow(req.user.id, req.params.id);
  res.status(200).json({ data: result, error: null });
});

const unfollowUser = catchAsync(async (req, res) => {
  const result = userService.unfollow(req.user.id, req.params.id);
  res.status(200).json({ data: result, error: null });
});

const getFollowing = catchAsync(async (req, res) => {
  const list = userService.getFollowing(req.params.id);
  res.status(200).json({ data: list, error: null });
});

const getFollowers = catchAsync(async (req, res) => {
  const list = userService.getFollowers(req.params.id);
  res.status(200).json({ data: list, error: null });
});

module.exports = {
  getUser,
  updateUser,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
};
