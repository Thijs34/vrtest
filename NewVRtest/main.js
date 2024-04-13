import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// AUDIO ELEMENTS
const audioElement = new Audio(''); //MUSIC
const soundEffect = new Audio('/hitlerr.mp3'); //EFFECT

let objectSeen = false; // CHECK IF SOMETHING HAS BEEN SEEN BEFORE

function playSoundEffect() {
    soundEffect.play();
}

// PLAY MUSIC WHEN ENTERING VR
function playAudioOnEnterVR() {
    audioElement.play();
}

// CREATING THREEJS SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x505050);

// SETUP THE CAMERA
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 3);
scene.add(camera);

// SETUP THE LIGHTS
const light = new THREE.DirectionalLight(0xffffff, 1); // Increase intensity to 1
light.position.set(1, 1, 1).normalize();
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 1)); // Increase ambient light intensity to 1

// Add an update function to change the light color over time
function updateLight() {
    // Calculate color
    const time = Date.now() * 0.01; // Decrease factor to make color change faster
    const r = Math.sin(time * 0.7);
    const g = Math.sin(time * 0.3);
    const b = Math.sin(time * 0.2);

    // Assign color to light
    light.color.setRGB(r, g, b);
}

// SCENERY (THIS IS THE ROOM, CHANGE GLB TO ANOTHER ROOM TO TEST)
const loader = new GLTFLoader();
loader.load('/realism.glb', function (gltf) { //CHANGE THE GLB FILE HERE
    gltf.scene.position.set(0, 0, 1);       //POSITION OF THE ROOM
    gltf.scene.rotation.set(0, Math.PI, 0);  //ROTATION OF THE ROOM
    gltf.scene.scale.set(1, 1, 1); //SCALE OF THE ROOM
    scene.add(gltf.scene);
}, undefined, function (error) {
    console.error(error);
});

// THIS IS THE ZUCC MODEL, ANIMATION IS ALREADY PLAYING. SWAP OUT WITH OTHER ANIMATED GLBS TO TEST (FIND ON SKETCHFAB)
let zuccModel;
loader.load('/adolf_twerk.glb', function (gltf) { //CHANGE THE GLB FILE HERE
    zuccModel = gltf.scene;
    zuccModel.position.set(0, -0.01, 1.5); // Even closer position
    zuccModel.rotation.set(0, 2.5, 0);
    zuccModel.scale.set(0.025, 0.025, 0.025); // Way smaller scale
    scene.add(zuccModel);

    const mixer = new THREE.AnimationMixer(zuccModel);
    const action = mixer.clipAction(gltf.animations[0]); // PLAYING THE ANIMATION (THE FIRST ONE FOUND)

    // PLAY THE FOUND ANIMATION ON REPEAT
    if (action) {
        action.setLoop(THREE.LoopRepeat);
        action.play();
    } else {
        console.error("No animation found in the GLB file.");
    }

    //ANIMATION LOOP
    renderer.setAnimationLoop(() => {
        updateLight(); // Update the light color
        mixer.update(0.01);
        renderer.render(scene, camera);
        checkIntersection(); // Call raycasting function during rendering
    });
}, undefined, function (error) {
    console.error(error);
});

// RENDERER 
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// ADD VR CONTROLLERS
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);

const controllerModelFactory = new XRControllerModelFactory();

const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));

scene.add(controllerGrip1);
scene.add(controllerGrip2);

// EVENT LISTENER FOR ENTERING VR
document.querySelector('button#VRButton').addEventListener('click', function() {
    playAudioOnEnterVR();
    document.getElementById('fullscreen-video').pause(); // Pause the video when entering VR
});

// Handle window resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// FUNCTION TO CHECK INTERSECTION WITH ZUCC (RAYCASTER)
function checkIntersection() {
    if (!zuccModel) return; // Ensure ZUCC model is loaded

    // Get the direction the user is looking
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Define a new origin point for the raycaster closer to the camera position
    const raycasterOrigin = new THREE.Vector3();
    camera.getWorldPosition(raycasterOrigin);
    const distance = 0.2; // Adjust this value to make the raycaster more sensitive
    raycasterOrigin.addScaledVector(direction, distance);

    // Increase the number of rays for better accuracy
    const raycaster = new THREE.Raycaster();
    raycaster.set(raycasterOrigin, direction);
    raycaster.params.Points.threshold = 10; // Adjust threshold for raycaster sensitivity

    // Check for intersections with ZUCC model
    const intersects = raycaster.intersectObject(zuccModel, true);

    // If ZUCC model is intersected and VR is presenting, and the sound effect hasn't been played yet, play sound effect
    if (intersects.length > 0 && renderer.xr.isPresenting && !soundEffect.playedOnce) {
        playSoundEffect();
        soundEffect.playedOnce = true; // Set flag to indicate that the sound effect has been played once
    }
}

// Load the axe model
let axeModel;
let axeGrabbed = false;
let axeGroup = new THREE.Group();
scene.add(axeGroup);

loader.load('/battle_axe.glb', function (gltf) {
    axeModel = gltf.scene;
    axeGroup.add(axeModel);
    // Set the initial position of the axe to the controller's starting position
    axeModel.position.copy(controller1.position);
}, undefined, function (error) {
    console.error(error);
});

// Add event listener for the squeeze button
let triggerPressed = false;
controller1.addEventListener('squeezestart', function () {
    console.log('Squeeze start event triggered');
    triggerPressed = true;
});

controller1.addEventListener('squeezeend', function () {
    console.log('Squeeze end event triggered');
    triggerPressed = false;
});

//ANIMATION LOOP
renderer.setAnimationLoop(() => {
    updateLight(); // Update the light color
    mixer.update(0.01);
    renderer.render(scene, camera);
    checkIntersection(); // Call raycasting function during rendering

    // If the trigger is pressed, make the axe follow the controller
    if (triggerPressed) {
        axeGroup.position.copy(controller1.position);
        axeGroup.rotation.copy(controller1.rotation);
    } else {
        // If the trigger is released, make the axe fall to the ground
        axeGroup.position.y -= 0.01; // Adjust this value to control the speed of falling
    }
});
