
const REF_PITCH = 440;
const SCALE_COUNT = 12;
const SCALES = new Map([
    ['英・米式', ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#']],
    ['ドレミ式', ['ラ', 'ラ#', 'シ', 'ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#']],
    ['ドレミ式(12音階)', ['ラ', 'チ', 'シ', 'ド', 'デ', 'レ', 'リ', 'ミ', 'ファ', 'フィ', 'ソ', 'サ']],
]);
const SCALE_KEYS = Array.from(SCALES.keys());

const scaleText = document.createElement('span');
const lampL = document.createElement('span');
const lampR = document.createElement('span');

let scaleKeyIndex = parseInt(localStorage.getItem('scale_key_index'));
scaleKeyIndex = isNaN(scaleKeyIndex) ? 0 : scaleKeyIndex;

scaleText.onclick = function (e) {
    scaleKeyIndex = (scaleKeyIndex + 1) % SCALE_KEYS.length;
    localStorage.setItem('scale_key_index', scaleKeyIndex);
};

let stream;
async function appStart(display) {
    if (stream) return;

    display.innerHTML = '';

    scaleText.innerText = '？'
    lampL.innerText = '♭'
    lampR.innerText = '♯'
    display.append(lampL, scaleText, lampR);

    try {

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32768; // 最大サイズ(2^15)
        analyser.smoothingTimeConstant = 0.3;
        analyser.minDecibels = -100;
        analyser.maxDecibels = 0;

        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                noiseSuppression: false
            }
        });

        let src = audioCtx.createMediaStreamSource(stream);
        src.connect(analyser);

        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);

        setInterval(function () {

            analyser.getByteFrequencyData(data);

            const maxIndex = data.reduce(function (iMax, x, i, arr) { return x > arr[iMax] ? i : iMax })

            // 両端は無視してしまう
            if (!maxIndex || maxIndex === bufLen - 1) {
                Array.from(display.children).forEach(function (e) { e.classList = [] });
                scaleText.innerText = '？'
                return;
            }

            const slopeA = data[maxIndex] - data[maxIndex - 1];
            const slopeB = data[maxIndex] - data[maxIndex + 1];
            let delta = 0.0;
            if (slopeA != slopeB) {
                if (slopeA > slopeB) {
                    delta = 0.5 * (1 - slopeB / slopeA);
                } else {
                    delta = -0.5 * (1 - slopeA / slopeB);
                }
            }

            const freq = (maxIndex + delta) * audioCtx.sampleRate / analyser.fftSize;

            const temparament = Math.log2(Math.pow(freq / REF_PITCH, SCALE_COUNT)) + 48;
            const scaleIndex = temparament.toFixed();
            const accu = (temparament - scaleIndex).toFixed(2);

            const scaleArray = SCALES.get(SCALE_KEYS[scaleKeyIndex]);
            let scaleHtml = scaleArray[(scaleIndex) % SCALE_COUNT] + Math.abs(parseInt((scaleIndex) / SCALE_COUNT));
            scaleHtml = scaleHtml.replaceAll('#', '<span class="sup">#</span>');
            scaleText.innerHTML = scaleHtml;

            Array.from(display.children).forEach(function (e) { e.classList = [] });

            if (accu < -0.025) {
                lampL.classList.add('text-red');
            } else if (accu > 0.025) {
                lampR.classList.add('text-red');
            } else {
                scaleText.classList.add('text-green');
            }
        }, 300)
    } catch (err) {
        console.log(err);
    }
};