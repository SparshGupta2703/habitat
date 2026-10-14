export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Administrator access is required.' })
  if (req.user.mustChangePassword) return res.status(403).json({ success: false, message: 'Change the initial administrator password before using admin tools.' })
  next()
}
