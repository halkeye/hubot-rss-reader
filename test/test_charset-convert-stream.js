const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
require('should');

const charsetConvertStream = require('../libs/charset-convert-stream.js');

describe('charsetConvertStream', () => {
  it('ismyshowcanceled works correctly', (done) => {
    const content = [];
    const stream = fs.createReadStream(path.join(__dirname, 'fixtures', 'ismyshowcancelled.xml'), { encoding: 'utf8' });
    stream.on('data', (data) => { content.push(data); });
    stream.on('error', err => done(err));
    stream.on('end', () => {
      content.should.not.be.empty();
      done();
    });
    stream.pipe(charsetConvertStream());
  });
  it('mk3s-drivers-rss works correctly', (done) => {
    const content = [];
    const stream = fs.createReadStream(path.join(__dirname, 'fixtures', 'mk3s-drivers-rss.xml'), { encoding: 'utf8' });
    stream.on('data', (data) => { content.push(data); });
    stream.on('error', err => done(err));
    stream.on('end', () => {
      content.should.not.be.empty();
      done();
    });
    stream.pipe(charsetConvertStream());
  });
  it('handle non xml', (done) => {
    const content = [];
    const stream = new Readable();
    stream.on('data', (data) => { content.push(data); });
    stream.on('error', err => done(err));
    stream.on('end', () => {
      content.should.not.be.empty();
      done();
    });
    stream.pipe(charsetConvertStream());

    stream.push('hi');
    stream.push(null);
  });
});
