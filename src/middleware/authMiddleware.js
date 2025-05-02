const jwt = require("jsonwebtoken");

// Middleware to verify JWT token
const authMiddleware = (req, res, next) => {
  // Retrieve token from request headers
  const token = req.header("Authorization");

  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: "❌ No token, authorization denied" });
  }

  try {
    // Verify and decode JWT token (Remove "Bearer " prefix if present)
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);

    // Attach decoded user data to the request object
    req.user = decoded;

    // Move to the next middleware/route handler
    next();
  } catch (error) {
    res.status(401).json({ message: "❌ Invalid token" });
  }
};

module.exports = authMiddleware;
