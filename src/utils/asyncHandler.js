// Helper for wrapping async route handlers.
// This avoids repeating try/catch in each controller method.
module.exports = function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
