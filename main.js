import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GUI} from 'three/addons/libs/lil-gui.module.min.js';

// Global variables to maintain animation states
var right_swim_oscillator = 1;
var left_swim_oscillator = -1;
var jump_counter = 0;
var jump_speed = 0;

// Shader variables
var uniforms = {
    u_time: {type: "f", value: 1.0},
    colorA: {type: 'vec3', value: new THREE.Color(0x00ff00)},
    colorB: {type: 'vec3', value: new THREE.Color(0xB536DA)}
}
var guiObject = {
    emissive : false,
    neon_wave : false,
    shadow : false,
}
var prevShader = -1;
var currShader = -1;

function main() {
    // Canvas and renderer
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({antialias: true, canvas});

    // Camera attributes
    const fov = 75;
    const aspect = 2;
    const near = 0.1;
    const far = 50;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    // Orbit Controls - To move around on the webpage
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 5, 0);
    controls.update();

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    // Green checkerboard ground pattern
    const planeSize = 40;
    const loader = new THREE.TextureLoader();
    const texture = loader.load('assets/green_checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);
    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
        map: texture,
        side: THREE.DoubleSide,
        opacity: 0.6, // sets transparency of object.
    });
    planeMat.transparent = true;
    const groundMesh = new THREE.Mesh(planeGeo, planeMat);
    groundMesh.rotation.x = Math.PI * -.5;
    groundMesh.position.y -= 0.2;
    scene.add(groundMesh);

    // Resizes renderer to canvas display size
    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if(needResize) {
            renderer.setSize(width, height, false);
        }  
        return needResize;
    };

    // Lighting
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 5, 0);
    scene.add(light);

    // Get hierarchy of "obj" in the scenegraph (stored in "lines")
    // See output in skeleton_hierarchy.txt
    function dumpObject(obj, lines = [], isLast = true, prefix = '') {
        const localPrefix = isLast ? '└─' : '├─';
        lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
        const newPrefix = prefix + (isLast ? '  ' : '│ ');
        const lastNdx = obj.children.length - 1;
        obj.children.forEach((child, ndx) => {
            const isLast = ndx === lastNdx;
            dumpObject(child, lines, isLast, newPrefix);
        });
        return lines;
    }

    // Define variables to later become object references
    let model_root;
    let frog;
    let mouth;
    let lower_jaw;
    let upper_jaw;
    let left_leg;
    let left_knee;
    let left_ankle;
    let left_foot;
    let right_leg;
    let right_knee;
    let right_ankle;
    let right_foot;
    let left_arm;
    let left_elbow;
    let left_wrist;
    let left_hand;
    let right_arm;
    let right_elbow;
    let right_wrist;
    let right_hand;

    // Custom Shader Material
    function customShader() {
        let material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
            vertexShader: document.getElementById( 'vertexShader' ).textContent,
        })
        return material;
    }
    // Phong Shader Material
    function phongShader() {
        let material = new THREE.MeshPhongMaterial({
            emissive: 0x049EF4,
            shininess: 30,
        });
        return material;
    }
    // Phong Shader with Shadows
    function shadowShader() {
        let material = new THREE.MeshPhongMaterial({
            color: 0xE6E6FA
        });
        return material;
    }
    // Add Custom Shader to entire frog skeleton
    function addCustomShader(obj, shader) {
        obj.material = shader;
        obj.children.forEach((child) => {
            addCustomShader(child, shader);
        });
    }

    // Load GLTF model 
    const gltfloader = new GLTFLoader();
    const url = 'assets/skeleton_3.glb';
    gltfloader.load(url, (gltf) => {
        const root = gltf.scene;
        root.scale.set(0.4, 0.4, 0.4);

        // Save object references from GLTF model
        model_root = root;
        frog = root.getObjectByName('Frog');
        mouth = frog.getObjectByName('Mouth');
        lower_jaw = mouth.getObjectByName('Lower_Jaw');
        upper_jaw = mouth.getObjectByName('Upper_Jaw');
        left_leg = frog.getObjectByName("Left_Leg");
        left_knee = left_leg.getObjectByName("Knee_Joint");
        left_ankle = left_knee.getObjectByName("Ankle_Joint");
        left_foot = left_ankle.getObjectByName("Foot");
        right_leg = frog.getObjectByName("Right_Leg");
        right_knee = right_leg.getObjectByName("Knee_Joint001");
        right_ankle = right_knee.getObjectByName("Ankle_Joint001");
        right_foot = right_ankle.getObjectByName("Foot001");
        left_arm = frog.getObjectByName("Left_Arm").getObjectByName("Shoulder_Joint001");
        left_elbow = left_arm.getObjectByName("Elbow_Joint001");
        left_wrist = left_elbow.getObjectByName("Wrist_Joint001");
        left_hand = left_wrist.getObjectByName("Hand001");
        right_arm = frog.getObjectByName("Right_Arm").getObjectByName("Shoulder_Joint");
        right_elbow = right_arm.getObjectByName("Elbow_Joint");
        right_wrist = right_elbow.getObjectByName("Wrist_Joint");
        right_hand = right_wrist.getObjectByName("Hand");

        scene.add(root);
        console.log("Frog skeleton bones hierarchy:\n");
        console.log(dumpObject(root).join('\n'));
    });

    // (L) Lower Jaw Mouth Opening+Closing Animation (extra; not in specifications!)
    var lower_jaw_rotation_oscillator = -1;
    const lower_jaw_rotation_speed = 0.03;
    const lower_jaw_up_rotation_limit = 0.0;
    const lower_jaw_down_rotation_limit = -Math.PI / 8;
    function lower_jaw_animation() {
        lower_jaw.rotateX(lower_jaw_rotation_speed * lower_jaw_rotation_oscillator);
        if(lower_jaw_rotation_oscillator == -1 && lower_jaw.rotation.x <= lower_jaw_down_rotation_limit) {
            lower_jaw_rotation_oscillator *= -1;
        } else if(lower_jaw_rotation_oscillator == 1 && lower_jaw.rotation.x >= lower_jaw_up_rotation_limit) {
            lower_jaw_rotation_oscillator *= -1;
        }
    }

    // (G) Toggle ground visibility (Extra)
    var ground_visible = 1;
    function toggle_ground_visibility() {
        if(ground_visible == 1) {
            ground_visible = 0;
            scene.remove(groundMesh);
        } else {
            ground_visible = 1;
            scene.add(groundMesh);
        }
    }

    // (A/D) Make the skeleton "look" left and right.
    const head_tilt_speed = 0.08;
    const head_tilt_limit = Math.PI / 3;
    function look_left() {
        if(mouth.rotation.y <= head_tilt_limit) {
            mouth.rotateY(head_tilt_speed);
        }
    }
    function look_right() {
        if(mouth.rotation.y >= -head_tilt_limit) {
            mouth.rotateY(-head_tilt_speed);
        }
    }

    // (Arrow Keys) Translate the skeleton in corresponding direction.
    const translation_speed = 0.5;
    function translate_forward() {
        frog.translateZ(-translation_speed);
    }
    function translate_backward() {
        frog.translateZ(translation_speed);
    }
    function translate_right() {
        frog.translateX(translation_speed);
    }
    function translate_left() {
        frog.translateX(-translation_speed);
    }

    // (Shift + Arrow Keys) Rotate the skeleton (axes as given in specifications).
    const rotation_speed = 0.03;
    function rotate_forward() {
        frog.rotateX(-rotation_speed);
    }
    function rotate_backward() {
        frog.rotateX(rotation_speed);
    }
    function rotate_right() {
        frog.rotateZ(-rotation_speed);
    }
    function rotate_left() {
        frog.rotateZ(rotation_speed);
    }

    // (S) Move back legs backward.
    const thigh_movement_speed = 0.05;
    const knee_x_movement_speed = 0.01;
    const knee_y_movement_speed = 0.02;
    const ankle_movement_speed = 0.05;
    const foot_movement_speed = 0.04;
    const global_leg_movement_speed = 1;
    const leg_rotation_limit = Math.PI / 4;
    function move_leg(thigh, knee, ankle, foot, reverse, right) {
        if(thigh.rotation.x >= -2.8) {
            thigh.rotateX(-0.1);
            thigh.rotateY(0.03 * right);
            knee.rotateX(0.04);
            knee.rotateY(-0.0267 * right);
            ankle.rotateX(-0.02);
            ankle.rotateY(0.012 * right);
        } else {
            if(knee.rotation.x <= 2.2) {
                knee.rotateX(0.06);
                knee.rotateY(-0.04 * right);
                ankle.rotateX(-0.02);
                ankle.rotateY(0.012 * right);
            } else {
                if(ankle.rotation.x >= -2.40) {
                    ankle.rotateX(-0.05);
                    ankle.rotateY(0.03 * right);
                }
            }
        }
    }
    function move_legs_backward(reverse) {
        move_leg(left_leg, left_knee, left_ankle, left_foot, reverse, -1);
        move_leg(right_leg, right_knee, right_ankle, right_foot, reverse, 1);
    }

    // (W) Move front legs forward.
    // (Shift + W) Reverse forward movement of front legs. (Extra)
    const global_arm_movement_speed = 1.5;
    const shoulder_rotation_limit = Math.PI / 6;
    const shoulder_rotation_speed = 0.03;
    const elbow_rotation_limit = Math.PI / 4;
    const elbow_rotation_speed = 0.03;
    const wrist_rotation_limit = Math.PI / 6;
    const wrist_rotation_speed = 0.03;
    const hand_z_rotation_limit = Math.PI / 4;
    const hand_z_rotation_speed = 0.05;
    const hand_y_rotation_limit = Math.PI / 6;
    const hand_y_rotation_speed = 0.03;
    function move_arm(shoulder, elbow, wrist, hand, reverse, right) {
        if(reverse) {
            if(hand.rotation.y * right * -1 > 0) {
                hand.rotateY(hand_y_rotation_speed * right * global_arm_movement_speed);
            } else if(hand.rotation.z * right * -1 > 0) {
                hand.rotateZ(hand_z_rotation_speed * right * global_arm_movement_speed);
            } else if(wrist.rotation.z * right > 0) {
                wrist.rotateZ(wrist_rotation_speed * right * -1 * global_arm_movement_speed);
            } else if(elbow.rotation.y * right > 0) {
                elbow.rotateY(elbow_rotation_speed * right * -1 * global_arm_movement_speed);
            } else if(shoulder.rotation.x > 0) {
                shoulder.rotateX(shoulder_rotation_speed * -1 * global_arm_movement_speed);
            }
        } else {
            if(shoulder.rotation.x <= shoulder_rotation_limit) {
                shoulder.rotateX(shoulder_rotation_speed * global_arm_movement_speed);
            } else if(Math.abs(elbow.rotation.y) <= elbow_rotation_limit) {
                elbow.rotateY(elbow_rotation_speed * right * global_arm_movement_speed);
            } else if(Math.abs(wrist.rotation.z) <= wrist_rotation_limit) {
                wrist.rotateZ(wrist_rotation_speed * right * global_arm_movement_speed);
            } else if(Math.abs(hand.rotation.z) <= hand_z_rotation_limit) {
                hand.rotateZ(hand_z_rotation_speed * right * -1 * global_arm_movement_speed);
            } else if(Math.abs(hand.rotation.y) <= hand_y_rotation_limit) {
                hand.rotateY(hand_y_rotation_speed * right * -1 * global_arm_movement_speed);
            }
        }
    }
    function move_arms_forward(reverse) {
        move_arm(left_arm, left_elbow, left_wrist, left_hand, reverse, -1);
        move_arm(right_arm, right_elbow, right_wrist, right_hand, reverse, 1);
    }

    // (X) Swim (Bonus Feature)
    const global_swim_start_speed = 1.5;
    function swim_start_arm(shoulder, elbow, wrist, hand, right) {
        if(shoulder.rotation.x > shoulder_rotation_limit) {
            return false;
        }
        if(Math.abs(elbow.rotation.y) <= elbow_rotation_limit) {
            elbow.rotateY(elbow_rotation_speed * right * global_swim_start_speed);
        } 
        if(Math.abs(wrist.rotation.z) <= wrist_rotation_limit) {
            wrist.rotateZ(wrist_rotation_speed * right * global_swim_start_speed);
        } 
        if(Math.abs(hand.rotation.z) <= hand_z_rotation_limit) {
            hand.rotateZ(0.025 * right * global_swim_start_speed);
        } 
        if(shoulder.rotation.x <= shoulder_rotation_limit) {
            shoulder.rotateX(0.015 * global_swim_start_speed);
        }
        return true;
    }
    function swim_arm_1(shoulder, elbow, wrist, hand, right) {
        if(Math.abs(elbow.rotation.y) <= 1.185) {
            // console.log(elbow.rotation.x + " " + elbow.rotation.y + " " + elbow.rotation.z + " " + hand.rotation.x + " " + hand.rotation.y + " " + hand.rotation.z);
            shoulder.rotateZ(0.008 * right);
            elbow.rotateY(-0.05 * right);
            elbow.rotateX(-0.03);
            hand.rotateX(-0.04);
            return true;
        }
        return false;
    }
    function swim_arm_2(shoulder, elbow, wrist, hand, right) {
        if(elbow.rotation.z * -right > 0 || elbow.rotation.z * -right <= -2.30) {
            shoulder.rotateZ(-0.01 * right);
            elbow.rotateZ(-0.1 * right);
            hand.rotateX(-0.008);
            return true;
        }
        return false;
    }
    function swim_arm_3(shoulder, elbow, wrist, hand, right) {
        elbow.rotation.x = 0;
        elbow.rotation.y = 0.81 * right;
        elbow.rotation.z = 0;
        hand.rotation.x = 0;
        hand.rotation.y = 0;
        hand.rotation.z = 0.80 * right;
        shoulder.rotation.z = 0;
    }
    const global_leg_swim_start_speed = 1.75;
    function swim_start_leg(thigh, knee, ankle, foot, right) {
        if(thigh.rotation.x >= -2.8) {
            thigh.rotateX(-0.1 * global_leg_swim_start_speed);
            thigh.rotateY(0.03 * right * global_leg_swim_start_speed);
            knee.rotateX(0.06 * global_leg_swim_start_speed);
            knee.rotateY(-0.04 * right * global_leg_swim_start_speed);
            ankle.rotateX(-0.05 * global_leg_swim_start_speed);
            ankle.rotateY(0.02 * right * global_leg_swim_start_speed);
        } else {
            if(knee.rotation.x <= 2.2) {
                knee.rotateX(0.06 * global_leg_swim_start_speed);
                knee.rotateY(-0.04 * right * global_leg_swim_start_speed);
                ankle.rotateX(-0.05 * global_leg_swim_start_speed);
                ankle.rotateY(0.03 * right * global_leg_swim_start_speed);
            } else {
                if(ankle.rotation.x >= -2.40) {
                    ankle.rotateX(-0.05 * global_leg_swim_start_speed);
                    ankle.rotateY(0.03 * right * global_leg_swim_start_speed);
                    // ankle.rotateZ(-0.05 * right);
                    ankle.rotateZ(-0.1 * 3/8 * right);
                }
            }
        }
    }
    function swim_leg(thigh, knee, ankle, foot, right) {
        var oscillator = left_swim_oscillator;
        if(right == 1) oscillator = right_swim_oscillator;
        ankle.rotateX(0.09 * oscillator);
        if(ankle.rotation.x >= -1.70 || ankle.rotation.x <= -2.95) {
            if(right == 1) right_swim_oscillator *= -1;
            else left_swim_oscillator *= -1;
        }
    }
    function swim() {
        var x1 = swim_start_arm(left_arm, left_elbow, left_wrist, left_hand, -1);
        swim_start_arm(right_arm, right_elbow, right_wrist, right_hand, 1);
        if(x1 == true) {
            swim_start_leg(left_leg, left_knee, left_ankle, left_foot, -1);
            swim_start_leg(right_leg, right_knee, right_ankle, right_foot, 1);
            return 0;
        }
        swim_leg(left_leg, left_knee, left_ankle, left_foot, -1);
        swim_leg(right_leg, right_knee, right_ankle, right_foot, 1);
        var x2 = swim_arm_1(left_arm, left_elbow, left_wrist, left_hand, -1);
        swim_arm_1(right_arm, right_elbow, right_wrist, right_hand, 1);
        if(x2 == true) return 0;
        var x3 = swim_arm_2(left_arm, left_elbow, left_wrist, left_hand, -1);
        swim_arm_2(right_arm, right_elbow, right_wrist, right_hand, 1);
        if(x3 == true) return 0;
        swim_arm_3(left_arm, left_elbow, left_wrist, left_hand, -1);
        swim_arm_3(right_arm, right_elbow, right_wrist, right_hand, 1);
    }

    // (J) Jump (Bonus Feature)
    const jump_counter_limit = 100;
    const jump_start_limit = 30;
    const jump_duration = jump_counter_limit - 2 * jump_start_limit;
    const jump_start_speed = 0.3;
    const jump_forward_speed = 0.35;
    function jump_start(start) {
        const speed = 50/30;
        frog.translateY(0.27 * start * speed);
        left_leg.rotateX(-0.02 * start * speed);
        left_knee.rotateX(0.03 * start * speed);
        left_ankle.rotateX(-0.02 * start * speed);
        left_foot.rotateX(0.01 * start * speed);
        right_leg.rotateX(-0.02 * start * speed);
        right_knee.rotateX(0.03 * start * speed);
        right_ankle.rotateX(-0.02 * start * speed);
        right_foot.rotateX(0.01 * start * speed);
    }
    function jump() {
        jump_counter--;
        if(jump_counter >= jump_counter_limit - jump_start_limit) {
            jump_start(1);
            jump_speed = jump_start_speed;
            return 0;
        }
        if(jump_counter < jump_start_limit) {
            jump_start(-1);
            return 0;
        }
        jump_speed -= (2 * jump_start_speed - 0.0165) / (jump_duration);
        frog.translateZ(-jump_forward_speed);
        frog.translateY(jump_speed);
    }

    // (R) Reset movements (Extra)
    function reset_component(x) {
        x.rotation.set(0, 0, 0);
    }
    function reset() {
        reset_component(frog);
        reset_component(mouth);
        reset_component(lower_jaw);
        reset_component(upper_jaw);
        reset_component(left_leg);
        reset_component(left_knee);
        reset_component(left_ankle);
        reset_component(left_foot);
        reset_component(right_leg);
        reset_component(right_knee);
        reset_component(right_ankle);
        reset_component(right_foot);
        reset_component(left_arm);
        reset_component(left_elbow);
        reset_component(left_wrist);
        reset_component(left_hand);
        reset_component(right_arm);
        reset_component(right_elbow);
        reset_component(right_wrist);
        reset_component(right_hand);

        frog.position.set(0, 0, 0);
    }

    // Add event listeners to start animation.
    // https://www.toptal.com/developers/keycode for reference keycodes.
    // https://www.gavsblog.com/blog/detect-single-and-multiple-keypress-events-javascript for multiple key presses.
    let keysPressed = {};
    document.addEventListener("keypress", function onEvent(event) {
        if(event.key == "g") {
            toggle_ground_visibility();
        }
    });
    document.addEventListener("keydown", function onEvent(event) {
        keysPressed[event.key] = true;
        if(event.key == "l") {
            lower_jaw_animation();
        }
        if(event.key == "d") {
            look_right();
        }
        if(event.key == "a") {
            look_left();
        }
        if(event.key == "ArrowUp") {
            if(keysPressed["Shift"]) {
                rotate_forward();
            } else {
                translate_forward();
            }
        }
        if(event.key == "ArrowDown") {
            if(keysPressed["Shift"]) {
                rotate_backward();
            } else {
                translate_backward();
            }
        }
        if(event.key == "ArrowRight") {
            if(keysPressed["Shift"]) {
                rotate_right();
            } else {
                translate_right();
            }
        }
        if(event.key == "ArrowLeft") {
            if(keysPressed["Shift"]) {
                rotate_left();
            } else {
                translate_left();
            }
        }
        if(event.key == "s") {
            move_legs_backward(false);
        }
        if(event.key == "w") {
            move_arms_forward(false);
        }
        if(event.key == "W") {
            move_arms_forward(true);
        }
        if(event.key == "x") {
            swim();
        }
        if(event.key == "r") {
            reset();
        }
        if(event.key == "j") {
            if(jump_counter == 0) {
                jump_counter = jump_counter_limit;
            }
        }
    });
    document.addEventListener("keyup", function onEvent(event) {
        delete keysPressed[event.key];
    });

    // GUI to change shader colors
    // https://github.com/georgealways/lil-gui
    const gui = new GUI();
    gui.title("Shader Options (Check only one)");
    gui.add(guiObject, 'emissive');
    gui.add(guiObject, 'neon_wave');
    gui.add(guiObject, 'shadow');

    // Render loop
    function render(time) {
        time *= 0.001; // time in seconds

        // Resize renderer to display size
        if(resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        if(frog && jump_counter > 0) {
            jump();
        }

        uniforms.u_time.value += 0.05;

        // Change shader based on input
        currShader = -1;
        if(guiObject.emissive == true) currShader = 0;
        if(guiObject.neon_wave == true) currShader = 1;
        if(guiObject.shadow == true) currShader = 2;
        if(currShader != prevShader) {
            // if(currShader == -1) addCustomShader(model_root, defaultShader());
            if(currShader == 0) addCustomShader(model_root, phongShader());
            if(currShader == 1) addCustomShader(model_root, customShader());
            if(currShader == 2) addCustomShader(model_root, shadowShader());
            prevShader = currShader;
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();