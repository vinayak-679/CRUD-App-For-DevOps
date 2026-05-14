const morgan = require('morgan');

// Use 'combined' format for production-style logging
// Logs: remote-addr - remote-user [date] "method url HTTP/version" status content-length "referrer" "user-agent"
const logger = morgan('combined');

module.exports = logger;
