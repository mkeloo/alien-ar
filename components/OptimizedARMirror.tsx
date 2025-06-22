'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

interface PoseResults {
    poseLandmarks: PoseLandmark[];
    image: HTMLVideoElement;
}

const RobustARMirror: React.FC = () => {
    // Video and pose detection refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 3D Scene refs
    const avatarContainerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const avatarBonesRef = useRef<{
        head: THREE.Object3D;
        torso: THREE.Object3D;
        leftArm: THREE.Object3D;
        rightArm: THREE.Object3D;
        leftElbow: THREE.Object3D;
        rightElbow: THREE.Object3D;
        leftWrist: THREE.Object3D;
        rightWrist: THREE.Object3D;
        leftHip: THREE.Object3D;
        rightHip: THREE.Object3D;
        leftKnee: THREE.Object3D;
        rightKnee: THREE.Object3D;
        leftAnkle: THREE.Object3D;
        rightAnkle: THREE.Object3D;
        // Face parts
        leftEye: THREE.Object3D;
        rightEye: THREE.Object3D;
        nose: THREE.Object3D;
        mouth: THREE.Object3D;
        // Hand parts
        leftThumb: THREE.Object3D;
        leftIndex: THREE.Object3D;
        leftMiddle: THREE.Object3D;
        leftRing: THREE.Object3D;
        leftPinky: THREE.Object3D;
        rightThumb: THREE.Object3D;
        rightIndex: THREE.Object3D;
        rightMiddle: THREE.Object3D;
        rightRing: THREE.Object3D;
        rightPinky: THREE.Object3D;
    } | null>(null);
    const animationIdRef = useRef<number | null>(null);

    // State
    const [initStep, setInitStep] = useState<string>('Starting...');
    const [avatarReady, setAvatarReady] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [personDetected, setPersonDetected] = useState(false);
    const [poseData, setPoseData] = useState<PoseLandmark[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Initialize camera first
    useEffect(() => {
        const initCamera = async () => {
            try {
                setInitStep('Requesting camera access...');

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 640,
                        height: 480,
                        facingMode: 'user'
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();

                    videoRef.current.onloadedmetadata = () => {
                        setCameraReady(true);
                        setInitStep('Camera ready!');
                    };
                }

            } catch (err) {
                console.error('Camera error:', err);
                setError(`Camera access failed: ${(err as Error).message}`);
                setInitStep('Camera failed');
            }
        };

        initCamera();

        return () => {
            if (videoRef.current?.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Create detailed humanoid avatar with face, fingers, and feet
    const createMoveableAvatar = useCallback(() => {
        const group = new THREE.Group();
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff88 });
        const faceMaterial = new THREE.MeshLambertMaterial({ color: 0x00cc66 });

        // === HEAD & FACE ===
        const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 1.8, 0);

        // Face features
        const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const leftEye = new THREE.Mesh(eyeGeometry, new THREE.MeshLambertMaterial({ color: 0x000000 }));
        leftEye.position.set(-0.06, 0.05, 0.15);
        head.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, new THREE.MeshLambertMaterial({ color: 0x000000 }));
        rightEye.position.set(0.06, 0.05, 0.15);
        head.add(rightEye);

        // Nose
        const noseGeometry = new THREE.ConeGeometry(0.02, 0.06, 6);
        const nose = new THREE.Mesh(noseGeometry, faceMaterial);
        nose.position.set(0, 0, 0.18);
        nose.rotation.x = Math.PI / 2;
        head.add(nose);

        // Mouth
        const mouthGeometry = new THREE.SphereGeometry(0.04, 8, 8);
        const mouth = new THREE.Mesh(mouthGeometry, new THREE.MeshLambertMaterial({ color: 0x440000 }));
        mouth.position.set(0, -0.05, 0.15);
        mouth.scale.set(1.5, 0.5, 0.5);
        head.add(mouth);

        group.add(head);

        // === TORSO ===
        const torsoGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
        const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
        torso.position.set(0, 1, 0);
        group.add(torso);

        // === LEFT ARM WITH DETAILED HAND ===
        const leftShoulder = new THREE.Object3D();
        leftShoulder.position.set(-0.3, 1.4, 0);

        const upperArmGeometry = new THREE.CapsuleGeometry(0.06, 0.25, 8, 16);
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, bodyMaterial);
        leftUpperArm.position.set(0, -0.125, 0);
        leftShoulder.add(leftUpperArm);

        const leftElbow = new THREE.Object3D();
        leftElbow.position.set(0, -0.25, 0);

        const forearmGeometry = new THREE.CapsuleGeometry(0.05, 0.22, 8, 16);
        const leftForearm = new THREE.Mesh(forearmGeometry, bodyMaterial);
        leftForearm.position.set(0, -0.11, 0);
        leftElbow.add(leftForearm);

        const leftWrist = new THREE.Object3D();
        leftWrist.position.set(0, -0.22, 0);

        const palmGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.04);
        const leftPalm = new THREE.Mesh(palmGeometry, bodyMaterial);
        leftPalm.position.set(0, -0.06, 0);
        leftWrist.add(leftPalm);

        // Create fingers
        const createFinger = (length: number) => {
            const fingerGeometry = new THREE.CapsuleGeometry(0.008, length, 4, 8);
            return new THREE.Mesh(fingerGeometry, bodyMaterial);
        };

        // Left hand fingers
        const leftThumb = createFinger(0.06);
        leftThumb.position.set(-0.04, -0.08, 0.02);
        leftWrist.add(leftThumb);

        const leftIndex = createFinger(0.08);
        leftIndex.position.set(-0.025, -0.12, 0);
        leftWrist.add(leftIndex);

        const leftMiddle = createFinger(0.09);
        leftMiddle.position.set(-0.008, -0.12, 0);
        leftWrist.add(leftMiddle);

        const leftRing = createFinger(0.08);
        leftRing.position.set(0.008, -0.12, 0);
        leftWrist.add(leftRing);

        const leftPinky = createFinger(0.07);
        leftPinky.position.set(0.025, -0.12, 0);
        leftWrist.add(leftPinky);

        leftElbow.add(leftWrist);
        leftShoulder.add(leftElbow);
        group.add(leftShoulder);

        // === RIGHT ARM (mirrored) ===
        const rightShoulder = new THREE.Object3D();
        rightShoulder.position.set(0.3, 1.4, 0);

        const rightUpperArm = new THREE.Mesh(upperArmGeometry, bodyMaterial);
        rightUpperArm.position.set(0, -0.125, 0);
        rightShoulder.add(rightUpperArm);

        const rightElbow = new THREE.Object3D();
        rightElbow.position.set(0, -0.25, 0);

        const rightForearm = new THREE.Mesh(forearmGeometry, bodyMaterial);
        rightForearm.position.set(0, -0.11, 0);
        rightElbow.add(rightForearm);

        const rightWrist = new THREE.Object3D();
        rightWrist.position.set(0, -0.22, 0);

        const rightPalm = new THREE.Mesh(palmGeometry, bodyMaterial);
        rightPalm.position.set(0, -0.06, 0);
        rightWrist.add(rightPalm);

        // Right hand fingers
        const rightThumb = createFinger(0.06);
        rightThumb.position.set(0.04, -0.08, 0.02);
        rightWrist.add(rightThumb);

        const rightIndex = createFinger(0.08);
        rightIndex.position.set(0.025, -0.12, 0);
        rightWrist.add(rightIndex);

        const rightMiddle = createFinger(0.09);
        rightMiddle.position.set(0.008, -0.12, 0);
        rightWrist.add(rightMiddle);

        const rightRing = createFinger(0.08);
        rightRing.position.set(-0.008, -0.12, 0);
        rightWrist.add(rightRing);

        const rightPinky = createFinger(0.07);
        rightPinky.position.set(-0.025, -0.12, 0);
        rightWrist.add(rightPinky);

        rightElbow.add(rightWrist);
        rightShoulder.add(rightElbow);
        group.add(rightShoulder);

        // === LEGS ===
        const leftHip = new THREE.Object3D();
        leftHip.position.set(-0.15, 0.4, 0);

        const thighGeometry = new THREE.CapsuleGeometry(0.08, 0.35, 8, 16);
        const leftThigh = new THREE.Mesh(thighGeometry, bodyMaterial);
        leftThigh.position.set(0, -0.175, 0);
        leftHip.add(leftThigh);

        const leftKnee = new THREE.Object3D();
        leftKnee.position.set(0, -0.35, 0);

        const shinGeometry = new THREE.CapsuleGeometry(0.06, 0.32, 8, 16);
        const leftShin = new THREE.Mesh(shinGeometry, bodyMaterial);
        leftShin.position.set(0, -0.16, 0);
        leftKnee.add(leftShin);

        const leftAnkle = new THREE.Object3D();
        leftAnkle.position.set(0, -0.32, 0);

        const footGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.2);
        const leftFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        leftFoot.position.set(0, -0.03, 0.08);
        leftAnkle.add(leftFoot);

        leftKnee.add(leftAnkle);
        leftHip.add(leftKnee);
        group.add(leftHip);

        // Right leg (mirrored)
        const rightHip = new THREE.Object3D();
        rightHip.position.set(0.15, 0.4, 0);

        const rightThigh = new THREE.Mesh(thighGeometry, bodyMaterial);
        rightThigh.position.set(0, -0.175, 0);
        rightHip.add(rightThigh);

        const rightKnee = new THREE.Object3D();
        rightKnee.position.set(0, -0.35, 0);

        const rightShin = new THREE.Mesh(shinGeometry, bodyMaterial);
        rightShin.position.set(0, -0.16, 0);
        rightKnee.add(rightShin);

        const rightAnkle = new THREE.Object3D();
        rightAnkle.position.set(0, -0.32, 0);

        const rightFoot = new THREE.Mesh(footGeometry, bodyMaterial);
        rightFoot.position.set(0, -0.03, 0.08);
        rightAnkle.add(rightFoot);

        rightKnee.add(rightAnkle);
        rightHip.add(rightKnee);
        group.add(rightHip);

        return {
            group,
            bones: {
                head,
                torso,
                leftArm: leftShoulder,
                rightArm: rightShoulder,
                leftElbow,
                rightElbow,
                leftWrist,
                rightWrist,
                leftHip,
                rightHip,
                leftKnee,
                rightKnee,
                leftAnkle,
                rightAnkle,
                leftEye,
                rightEye,
                nose,
                mouth,
                leftThumb,
                leftIndex,
                leftMiddle,
                leftRing,
                leftPinky,
                rightThumb,
                rightIndex,
                rightMiddle,
                rightRing,
                rightPinky
            }
        };
    }, []);

    // Step 2: Initialize 3D Avatar after camera works
    useEffect(() => {
        if (!cameraReady || !avatarContainerRef.current) return;

        try {
            setInitStep('Creating 3D avatar...');

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x222222);
            sceneRef.current = scene;

            const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
            camera.position.set(0, 1.6, 3);
            camera.lookAt(0, 1.6, 0);
            cameraRef.current = camera;

            const renderer = new THREE.WebGLRenderer({
                antialias: false,
                powerPreference: "default"
            });
            renderer.setSize(640, 480);
            renderer.shadowMap.enabled = false;
            avatarContainerRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            directionalLight.position.set(2, 5, 2);
            scene.add(directionalLight);

            const avatar = createMoveableAvatar();
            scene.add(avatar.group);
            avatarBonesRef.current = avatar.bones;

            const animate = () => {
                if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

                animationIdRef.current = requestAnimationFrame(animate);
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            };

            animate();
            setAvatarReady(true);
            setInitStep('Avatar ready!');

        } catch (err) {
            console.error('Avatar error:', err);
            setError(`3D Avatar failed: ${(err as Error).message}`);
        }

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (avatarContainerRef.current && rendererRef.current?.domElement) {
                avatarContainerRef.current.removeChild(rendererRef.current.domElement);
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();
            }

            if (sceneRef.current) {
                sceneRef.current.clear();
            }
        };
    }, [cameraReady, createMoveableAvatar]);

    // Update avatar pose with detailed full-body mapping (FIXED COORDINATES)
    const updateAvatarPose = useCallback((landmarks: PoseLandmark[]) => {
        if (!avatarBonesRef.current) return;

        const bones = avatarBonesRef.current;

        // Head tracking (nose) - fixed coordinate mapping
        if (landmarks[0]) {
            const noseX = (landmarks[0].x - 0.5) * 2; // -1 to 1 range
            const noseY = -(landmarks[0].y - 0.5) * 2; // Flip Y, -1 to 1 range

            bones.head.rotation.y += (noseX * 0.3 - bones.head.rotation.y) * 0.15;
            bones.head.rotation.x += (noseY * 0.2 - bones.head.rotation.x) * 0.15;
        }

        // Torso tilt based on shoulders
        if (landmarks[11] && landmarks[12]) {
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];

            const shoulderTilt = (rightShoulder.y - leftShoulder.y) * 3; // More sensitive
            bones.torso.rotation.z += (shoulderTilt - bones.torso.rotation.z) * 0.15;
        }

        // LEFT ARM - Fixed mapping
        if (landmarks[11] && landmarks[13]) { // Shoulder to elbow
            const shoulder = landmarks[11];
            const elbow = landmarks[13];

            // Calculate relative position from shoulder to elbow
            const deltaX = elbow.x - shoulder.x;
            const deltaY = elbow.y - shoulder.y;

            // Convert to arm rotation 
            // When arm is down (deltaY > 0), rotation should be around 0
            // When arm is up (deltaY < 0), rotation should be negative
            let targetRotation = Math.atan2(-deltaY, Math.abs(deltaX)) - Math.PI / 2;

            // If hand is on left side of body, adjust rotation
            if (deltaX > 0) {
                targetRotation = -targetRotation;
            }

            // Smooth interpolation
            bones.leftArm.rotation.z += (targetRotation - bones.leftArm.rotation.z) * 0.2;
        }

        // RIGHT ARM - Fixed mapping (mirrored)
        if (landmarks[12] && landmarks[14]) { // Shoulder to elbow
            const shoulder = landmarks[12];
            const elbow = landmarks[14];

            // Calculate relative position from shoulder to elbow
            const deltaX = elbow.x - shoulder.x;
            const deltaY = elbow.y - shoulder.y;

            // Convert to arm rotation (mirrored for right side)
            let targetRotation = Math.atan2(-deltaY, Math.abs(deltaX)) - Math.PI / 2;

            // If hand is on right side of body, adjust rotation
            if (deltaX < 0) {
                targetRotation = -targetRotation;
            } else {
                targetRotation = Math.PI + targetRotation;
            }

            // Smooth interpolation
            bones.rightArm.rotation.z += (targetRotation - bones.rightArm.rotation.z) * 0.2;
        }

        // ELBOW BENDING - Left arm
        if (landmarks[11] && landmarks[13] && landmarks[15]) { // Shoulder, elbow, wrist
            const shoulder = landmarks[11];
            const elbow = landmarks[13];
            const wrist = landmarks[15];

            // Calculate elbow bend angle
            const upperArm = {
                x: elbow.x - shoulder.x,
                y: elbow.y - shoulder.y
            };

            const forearm = {
                x: wrist.x - elbow.x,
                y: wrist.y - elbow.y
            };

            // Calculate angle between upper arm and forearm
            const dot = upperArm.x * forearm.x + upperArm.y * forearm.y;
            const upperArmLength = Math.sqrt(upperArm.x * upperArm.x + upperArm.y * upperArm.y);
            const forearmLength = Math.sqrt(forearm.x * forearm.x + forearm.y * forearm.y);

            let elbowAngle = Math.acos(Math.max(-1, Math.min(1, dot / (upperArmLength * forearmLength))));

            // Convert to elbow rotation (0 = straight, negative = bent)
            const elbowBend = -(Math.PI - elbowAngle);

            bones.leftElbow.rotation.z += (elbowBend - bones.leftElbow.rotation.z) * 0.2;
        }

        // ELBOW BENDING - Right arm
        if (landmarks[12] && landmarks[14] && landmarks[16]) { // Shoulder, elbow, wrist
            const shoulder = landmarks[12];
            const elbow = landmarks[14];
            const wrist = landmarks[16];

            // Calculate elbow bend angle
            const upperArm = {
                x: elbow.x - shoulder.x,
                y: elbow.y - shoulder.y
            };

            const forearm = {
                x: wrist.x - elbow.x,
                y: wrist.y - elbow.y
            };

            // Calculate angle between upper arm and forearm
            const dot = upperArm.x * forearm.x + upperArm.y * forearm.y;
            const upperArmLength = Math.sqrt(upperArm.x * upperArm.x + upperArm.y * upperArm.y);
            const forearmLength = Math.sqrt(forearm.x * forearm.x + forearm.y * forearm.y);

            let elbowAngle = Math.acos(Math.max(-1, Math.min(1, dot / (upperArmLength * forearmLength))));

            // Convert to elbow rotation (positive for right arm)
            const elbowBend = (Math.PI - elbowAngle);

            bones.rightElbow.rotation.z += (elbowBend - bones.rightElbow.rotation.z) * 0.2;
        }

        // LEG TRACKING - Hip positioning
        if (landmarks[23] && landmarks[24]) { // Left and right hips
            const leftHip = landmarks[23];
            const rightHip = landmarks[24];

            // Hip tilt
            const hipTilt = (rightHip.y - leftHip.y) * 2;
            bones.leftHip.rotation.z += (hipTilt - bones.leftHip.rotation.z) * 0.1;
            bones.rightHip.rotation.z += (hipTilt - bones.rightHip.rotation.z) * 0.1;
        }

        // Basic leg stance
        if (landmarks[23] && landmarks[25]) { // Left hip to knee
            const hip = landmarks[23];
            const knee = landmarks[25];

            const legAngle = Math.atan2(knee.x - hip.x, hip.y - knee.y);
            bones.leftHip.rotation.z += (legAngle - bones.leftHip.rotation.z) * 0.1;
        }

        if (landmarks[24] && landmarks[26]) { // Right hip to knee
            const hip = landmarks[24];
            const knee = landmarks[26];

            const legAngle = Math.atan2(knee.x - hip.x, hip.y - knee.y);
            bones.rightHip.rotation.z += (legAngle - bones.rightHip.rotation.z) * 0.1;
        }

    }, []);

    // Reset avatar to neutral pose (matching natural standing position)
    const resetAvatarToNeutral = useCallback(() => {
        if (!avatarBonesRef.current) return;

        const bones = avatarBonesRef.current;

        // Head - looking forward
        bones.head.rotation.y += (0 - bones.head.rotation.y) * 0.05;
        bones.head.rotation.x += (0 - bones.head.rotation.x) * 0.05;

        // Torso - straight
        bones.torso.rotation.z += (0 - bones.torso.rotation.z) * 0.05;

        // Arms - hanging down naturally (like hands in pockets)
        bones.leftArm.rotation.z += (0.1 - bones.leftArm.rotation.z) * 0.05; // Slightly forward
        bones.rightArm.rotation.z += (-0.1 - bones.rightArm.rotation.z) * 0.05; // Slightly forward

        // Elbows - slightly bent (natural hanging position)
        bones.leftElbow.rotation.z += (-0.1 - bones.leftElbow.rotation.z) * 0.05;
        bones.rightElbow.rotation.z += (0.1 - bones.rightElbow.rotation.z) * 0.05;

        // Legs - straight standing
        bones.leftHip.rotation.z += (0 - bones.leftHip.rotation.z) * 0.05;
        bones.rightHip.rotation.z += (0 - bones.rightHip.rotation.z) * 0.05;
    }, []);

    // Step 3: Initialize pose detection last
    useEffect(() => {
        if (!cameraReady || !avatarReady || !videoRef.current) return;

        let pose: any = null;
        let isComponentMounted = true;
        let frameCount = 0;

        const initializePoseDetection = async () => {
            try {
                setInitStep('Loading pose detection...');

                const { Pose } = await import('@mediapipe/pose');

                if (!isComponentMounted) return;

                pose = new Pose({
                    locateFile: (file: string) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });

                await pose.setOptions({
                    modelComplexity: 0,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5
                });

                pose.onResults((results: PoseResults) => {
                    if (!isComponentMounted) return;

                    frameCount++;

                    // Draw video frame first
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');

                    if (canvas && ctx && videoRef.current) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        ctx.save();
                        ctx.scale(-1, 1);
                        ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
                        ctx.restore();
                    }

                    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
                        setPersonDetected(true);
                        setPoseData(results.poseLandmarks);

                        updateAvatarPose(results.poseLandmarks);

                        // Simple debug overlay
                        if (ctx) {
                            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                            ctx.fillRect(10, canvas!.height - 50, 200, 40);
                            ctx.fillStyle = '#FFFFFF';
                            ctx.font = 'bold 16px Arial';
                            ctx.fillText('✅ Pose Detected!', 15, canvas!.height - 25);
                        }
                    } else {
                        setPersonDetected(false);
                        setPoseData(null);

                        if (frameCount % 10 === 0) {
                            resetAvatarToNeutral();
                        }
                    }
                });

                const sendFrame = async () => {
                    if (!isComponentMounted || !videoRef.current || !pose) return;

                    try {
                        await pose.send({ image: videoRef.current });
                    } catch (e) {
                        // Ignore frame errors
                    }

                    setTimeout(sendFrame, 20);
                };

                sendFrame();
                setInitStep('Pose detection ready!');

            } catch (error) {
                console.error('Pose detection error:', error);
                setError(`Pose detection failed: ${(error as Error).message}`);
            }
        };

        initializePoseDetection();

        return () => {
            isComponentMounted = false;

            if (pose) {
                setTimeout(() => {
                    try {
                        pose.close();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }, 100);
            }
        };
    }, [cameraReady, avatarReady, updateAvatarPose, resetAvatarToNeutral]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="bg-red-900 border border-red-500 p-6 rounded-lg max-w-md">
                    <p className="font-bold text-red-200 mb-2">Error:</p>
                    <p className="text-red-300 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-700 hover:bg-red-600 px-4 py-2 rounded text-white"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">
                🚀 Detailed AR Mirror
            </h1>

            <div className="mb-6 bg-gray-800 rounded-lg p-4">
                <p className="text-center text-lg">
                    <span className="text-blue-400">Status:</span> {initStep}
                </p>
            </div>

            <div className="flex gap-6 mb-6">
                <div className="flex flex-col items-center">
                    <h2 className="text-xl font-bold mb-2 text-blue-400">📹 Camera & Pose</h2>
                    <div className="relative">
                        <video
                            ref={videoRef}
                            className="hidden"
                            width="640"
                            height="480"
                            autoPlay
                            muted
                            playsInline
                        />
                        <canvas
                            ref={canvasRef}
                            width="640"
                            height="480"
                            className="border-4 border-blue-500 rounded-lg shadow-lg"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <h2 className="text-xl font-bold mb-2 text-green-400">🤖 Detailed Avatar</h2>
                    <div
                        ref={avatarContainerRef}
                        className="border-4 border-green-500 rounded-lg"
                        style={{ width: '640px', height: '480px' }}
                    />
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${cameraReady ? 'text-green-400' : 'text-yellow-400'}`}>
                            {cameraReady ? '✅' : '⏳'}
                        </div>
                        <p className="text-sm font-medium">Camera Ready</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${avatarReady ? 'text-green-400' : 'text-yellow-400'}`}>
                            {avatarReady ? '✅' : '⏳'}
                        </div>
                        <p className="text-sm font-medium">Avatar Ready</p>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className={`text-2xl mb-2 ${personDetected ? 'text-green-400' : 'text-red-400'}`}>
                            {personDetected ? '✅' : '❌'}
                        </div>
                        <p className="text-sm font-medium">Person Detected</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RobustARMirror;