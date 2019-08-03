// detect charset from "encoding" attribute of XML
// convert using iconv

const stream = require('stream');
const { Iconv } = require('iconv');
const debug = require('debug')('hubot-rss-reader:charset-convert-stream');

module.exports = function ExportedCharsetConvertStream() {
  let iconv = null;
  let charset = null;

  const charsetConvertStream = stream.Transform();

  // eslint-disable-next-line no-underscore-dangle
  charsetConvertStream._transform = function Transform(chunk, enc, next) {
    if (charset === null) {
      const m = chunk.toString().match(/<\?xml[^>]* encoding=['"]([^'"]+)['"]/);
      if (m) {
        // eslint-disable-next-line prefer-destructuring
        charset = m[1];
        debug(`charset: ${charset}`);
        if (charset.toUpperCase() !== 'UTF-8') {
          iconv = new Iconv(charset, 'UTF-8//TRANSLIT//IGNORE');
        }
      }
    }
    if (iconv != null) {
      this.push(iconv.convert(chunk));
    } else {
      this.push(chunk);
    }
    return next();
  };

  return charsetConvertStream;
};
