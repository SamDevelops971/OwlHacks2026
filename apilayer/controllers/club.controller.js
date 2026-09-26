const clubService = require('../services/club.service');
const { catchAsync } = require('../middleware/errorHandler');

const createClub = catchAsync(async (req, res) => {
  const club = await clubService.createClub(req.body);
  res.status(201).json({ data: club, error: null });
});

const listClubs = catchAsync(async (req, res) => {
  const clubs = await clubService.listClubs();
  res.status(200).json({ data: clubs, error: null });
});

const getClub = catchAsync(async (req, res) => {
  const club = await clubService.getClubById(req.params.id);
  res.status(200).json({ data: club, error: null });
});

module.exports = { createClub, listClubs, getClub };
