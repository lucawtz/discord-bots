const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const MAX_DURATION = 10; // Sekunden

function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    // ffmpeg -i file -f null - gibt die Dauer in stderr aus
    execFile(ffmpegPath, ['-i', filePath, '-f', 'null', '-'], { timeout: 10000 }, (err, stdout, stderr) => {
      // ffmpeg schreibt immer nach stderr, auch bei Erfolg
      const output = stderr || '';
      const match = output.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (!match) return reject(new Error('Dauer konnte nicht ermittelt werden'));
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const ms = parseInt(match[4]);
      resolve(hours * 3600 + minutes * 60 + seconds + ms / 100);
    });
  });
}

module.exports = { getDuration, MAX_DURATION };
