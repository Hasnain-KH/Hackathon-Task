export default function auditContext(req, res, next) {
  req.auditMeta = {
    ip: req.ip || '',
    userAgent: req.headers['user-agent'] || '',
  };
  next();
}
