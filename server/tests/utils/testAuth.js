const jwt = require('jsonwebtoken');

const testAuth = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No auth token, access denied' });
    }

    // For testing purposes, if the token is a MongoDB ObjectId string,
    // we'll use it directly as the user ID
    if (token.match(/^[0-9a-fA-F]{24}$/)) {
      req.user = { _id: token };
      return next();
    }

    // Verify token (fallback for non-test tokens)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = testAuth; 