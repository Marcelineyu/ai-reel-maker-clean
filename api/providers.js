const { requirePost, handleApiError } = require('./_lib/validation');
const { getAvailableProviders } = require('./_lib/providers');

module.exports = async function handler(req, res) {
  if (!requirePost(req, res)) return;

  try {
    return res.status(200).json(getAvailableProviders());
  } catch (err) {
    return handleApiError(res, err, 'providers');
  }
};
