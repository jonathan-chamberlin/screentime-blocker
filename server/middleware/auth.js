const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

// Required auth — rejects requests without valid JWT
const requireAuth = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

// Optional auth — attaches req.auth if valid token present, continues regardless
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.auth = null;
    return next();
  }

  requireAuth(req, res, (err) => {
    if (err) {
      // Token was provided but invalid — still continue, just no auth
      req.auth = null;
    }
    next();
  });
};

module.exports = { requireAuth, optionalAuth };
