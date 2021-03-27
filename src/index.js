// Our input frames will come from here.
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const controlsElement = document.getElementsByClassName('control-panel')[0];
const canvasCtx = canvasElement.getContext('2d');

// We'll add this to our control panel later, but we'll save it here so we can
// call tick() each time the graph runs.
const fpsControl = new FPS();

// Optimization: Turn off animated spinner after its hiding animation is done.
const spinner = document.querySelector('.loading');
spinner.ontransitionend = () => {
    spinner.style.display = 'none';
};

function zColor(data) {
    const z = clamp(data.from.z + 0.5, 0, 1);
    return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}

function onResults(results) {
    initialized = true;
    canvasElement.height = canvasElement.width * 9 / 16
    // Hide the spinner.
    document.body.classList.add('loaded');

    // Update the frame rate.
    fpsControl.tick();

    // Draw the overlays.
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (!results.poseLandmarks) {
        return;
    }
    //console.log(results.poseLandmarks[0]);

    character_pos = results.poseLandmarks[0]

    drawConnectors(
        canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
            visibilityMin: 0.65,
            color: (data) => {
                const x0 = canvasElement.width * data.from.x;
                const y0 = canvasElement.height * data.from.y;
                const x1 = canvasElement.width * data.to.x;
                const y1 = canvasElement.height * data.to.y;

                const z0 = clamp(data.from.z + 0.5, 0, 1);
                const z1 = clamp(data.to.z + 0.5, 0, 1);

                const gradient = canvasCtx.createLinearGradient(x0, y0, x1, y1);
                gradient.addColorStop(
                    0, `rgba(0, ${255 * z0}, ${255 * (1 - z0)}, 1)`);
                gradient.addColorStop(
                    1.0, `rgba(0, ${255 * z1}, ${255 * (1 - z1)}, 1)`);
                return gradient;
            }
        });
    drawLandmarks(
        canvasCtx,
        Object.values(POSE_LANDMARKS_LEFT)
        .map(index => results.poseLandmarks[index]), {
            visibilityMin: 0.65,
            color: zColor,
            fillColor: '#FF0000'
        });
    drawLandmarks(
        canvasCtx,
        Object.values(POSE_LANDMARKS_RIGHT)
        .map(index => results.poseLandmarks[index]), {
            visibilityMin: 0.65,
            color: zColor,
            fillColor: '#00FF00'
        });
    drawLandmarks(
        canvasCtx,
        Object.values(POSE_LANDMARKS_NEUTRAL)
        .map(index => results.poseLandmarks[index]), {
            visibilityMin: 0.65,
            color: zColor,
            fillColor: '#AAAAAA'
        });
    canvasCtx.restore();
}

const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
    }
});
pose.onResults(onResults);

/**
 * Instantiate a camera. We'll feed each frame we receive into the solution.
 */
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await pose.send({
            image: videoElement
        });
    },
    width: 1280,
    height: 720
});
camera.start();

// Present a control panel through which the user can manipulate the solution
// options.
new ControlPanel(controlsElement, {
        selfieMode: true,
        upperBodyOnly: false,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    })
    .add([
        new StaticText({
            title: 'MediaPipe Pose'
        }),
        fpsControl,
        new Toggle({
            title: 'Selfie Mode',
            field: 'selfieMode'
        }),
        new Toggle({
            title: 'Upper-body Only',
            field: 'upperBodyOnly'
        }),
        new Toggle({
            title: 'Smooth Landmarks',
            field: 'smoothLandmarks'
        }),
        new Slider({
            title: 'Min Detection Confidence',
            field: 'minDetectionConfidence',
            range: [0, 1],
            step: 0.01
        }),
        new Slider({
            title: 'Min Tracking Confidence',
            field: 'minTrackingConfidence',
            range: [0, 1],
            step: 0.01
        }),
    ])
    .on(options => {
        videoElement.classList.toggle('selfie', options.selfieMode);
        pose.setOptions(options);
    });

let character_pos = {
    x: 0,
    y: 0,
    z: 0
}

let initialized = false
let started = true;

const s = p => {
    p.setup = () => {
        const canvas = p.createCanvas(400, 400)
        canvas.parent("sketch-holder")
        console.log("setup")
    }

    let particles = []
    let count = 30

    p.draw = () => {
        if (initialized && started) {
            const width = p.windowWidth / 2;
            const height = width * 9 / 16
            p.resizeCanvas(width, height)
            p.background(50)
            const x = character_pos.x * width;
            const y = character_pos.y * height
            p.fill(255)
            p.ellipse(x, y, 30, 30)



            if (count < 0) {
                count = 10
                const r = Math.random() * (width + height) * 2
                let char_pos = {
                    x: 0,
                    y: 0
                }
                if (r < width) {
                    char_pos.x = r
                } else if (r < width + height) {
                    char_pos.y = r - width
                } else if (r < width * 2 + height) {
                    char_pos.x = r - width - height
                    char_pos.y = height
                } else {
                    char_pos.y = r - width * 2 - height
                    char_pos.x = width
                }
                particles.push({
                    x: char_pos.x,
                    y: char_pos.y,
                    dx: (x - char_pos.x) / 50,
                    dy: (y - char_pos.y) / 50
                })
            } else {
                count -= 1;
            }

            if (particles.length > 100) {
                particles.shift()
            }
            //console.log(particles)
            p.fill(100, 100, 255)
            for (let i = 0; i < particles.length; i++) {
                particles[i].x += particles[i].dx
                particles[i].y += particles[i].dy
                p.ellipse(particles[i].x, particles[i].y, 10, 10)
                if (Math.pow(particles[i].x - x, 2) + Math.pow(particles[i].y - y, 2) < Math.pow(15 + 5, 2)) {
                    const gameover = document.getElementById("gameover")
                    gameover.style.display = "block"
                    started = false
                }
            }
        } else {
            particles = []
        }
    }
}

const myp5 = new p5(s);

const replay = document.getElementById("replay")
replay.onclick = () => {
    const gameover = document.getElementById("gameover")
    gameover.style.display = "none";
    started = true;
}