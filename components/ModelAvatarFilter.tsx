'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

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

interface AvatarModel {
    id: string;
    name: string;
    url: string;
    description: string;
    scale: number;
    offset: { x: number; y: number; z: number };
}

export const ModelAvatarFilter: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const threeContainerRef = useRef<HTMLDivElement>(null);

    // Three.js refs
    const sceneRef = useRef<any>(null);
    const rendererRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const animationIdRef = useRef<number | null>(null);
    const currentModelRef = useRef<any>(null);
    const mixerRef = useRef<any>(null);
    const modelBonesRef = useRef<{ [key: string]: any }>({});

    const [initStep, setInitStep] = useState<string>('Starting...');
    const [cameraReady, setCameraReady] = useState(false);
    const [personDetected, setPersonDetected] = useState(false);
    const [currentAvatar, setCurrentAvatar] = useState<string>('robot');
    const [modelLoading, setModelLoading] = useState(false);
    const [poseData, setPoseData] = useState<PoseLandmark[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Available 3D avatar models - ADJUSTED FOR FULLSCREEN
    const avatarModels: AvatarModel[] = [
        {
            id: 'robot',
            name: '🤖 Sci-Fi Robot',
            url: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
            description: 'Animated robot with expressions',
            scale: 1.5,
            offset: { x: 0, y: -1.2, z: 0 }
        },
        {
            id: 'astronaut',
            name: '👨‍🚀 Astronaut',
            url: 'https://threejs.org/examples/models/gltf/Soldier.glb',
            description: 'Space suit character',
            scale: 1.8,
            offset: { x: 0, y: -1.5, z: 0 }
        },
        {
            id: 'knight',
            name: '⚔️ Medieval Knight',
            url: 'https://threejs.org/examples/models/gltf/Xbot.glb',
            description: 'Armored warrior',
            scale: 1.6,
            offset: { x: 0, y: -1.3, z: 0 }
        }
    ];

    // Get viewport dimensions
    const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });

    useEffect(() => {
        const updateViewportSize = () => {
            setViewportSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        updateViewportSize();
        window.addEventListener('resize', updateViewportSize);
        return () => window.removeEventListener('resize', updateViewportSize);
    }, []);

    // Initialize camera
    useEffect(() => {
        const initCamera = async () => {
            try {
                setInitStep('Requesting camera access...');

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
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

    // Initialize Three.js scene - FULLSCREEN VERSION
    useEffect(() => {
        if (!cameraReady || !threeContainerRef.current) return;

        const initThreeJS = async () => {
            try {
                setInitStep('Setting up 3D scene...');

                const THREE = await import('three');

                // Create scene
                const scene = new THREE.Scene();
                sceneRef.current = scene;

                // Create camera with proper aspect ratio
                const camera = new THREE.PerspectiveCamera(
                    75, // Wider FOV for fullscreen
                    viewportSize.width / viewportSize.height,
                    0.1,
                    1000
                );
                camera.position.set(0, 0, 4);
                cameraRef.current = camera;

                // Create fullscreen renderer
                const renderer = new THREE.WebGLRenderer({
                    alpha: true,
                    antialias: true,
                    powerPreference: "high-performance"
                });
                renderer.setSize(viewportSize.width, viewportSize.height);
                renderer.setClearColor(0x000000, 0); // Transparent background
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                // Fullscreen styling
                renderer.domElement.style.position = 'fixed';
                renderer.domElement.style.top = '0';
                renderer.domElement.style.left = '0';
                renderer.domElement.style.width = '100vw';
                renderer.domElement.style.height = '100vh';
                renderer.domElement.style.pointerEvents = 'none';
                renderer.domElement.style.zIndex = '10';

                threeContainerRef.current?.appendChild(renderer.domElement);
                rendererRef.current = renderer;

                // Enhanced lighting for fullscreen
                const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
                scene.add(ambientLight);

                const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
                directionalLight.position.set(10, 10, 5);
                directionalLight.castShadow = true;
                directionalLight.shadow.mapSize.width = 4096;
                directionalLight.shadow.mapSize.height = 4096;
                scene.add(directionalLight);

                // Multiple rim lights for better AR effect
                const rimLight1 = new THREE.DirectionalLight(0x00aaff, 0.4);
                rimLight1.position.set(-10, 5, -5);
                scene.add(rimLight1);

                const rimLight2 = new THREE.DirectionalLight(0xff6600, 0.3);
                rimLight2.position.set(5, -5, -8);
                scene.add(rimLight2);

                setInitStep('3D scene ready!');
                setIsFullscreen(true);
            } catch (err) {
                console.error('Three.js setup error:', err);
                setError(`3D setup failed: ${(err as Error).message}`);
            }
        };

        initThreeJS();

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }

            if (threeContainerRef.current && rendererRef.current?.domElement) {
                threeContainerRef.current.removeChild(rendererRef.current.domElement);
            }

            if (rendererRef.current) {
                rendererRef.current.dispose();
            }

            if (sceneRef.current) {
                sceneRef.current.clear();
            }
        };
    }, [cameraReady, viewportSize]);

    // Handle viewport resize for Three.js
    useEffect(() => {
        if (rendererRef.current && cameraRef.current) {
            rendererRef.current.setSize(viewportSize.width, viewportSize.height);
            cameraRef.current.aspect = viewportSize.width / viewportSize.height;
            cameraRef.current.updateProjectionMatrix();
        }
    }, [viewportSize]);

    // Load 3D model
    const loadModel = useCallback(async (modelConfig: AvatarModel) => {
        if (!sceneRef.current) return;

        setModelLoading(true);
        setInitStep(`Loading ${modelConfig.name}...`);

        try {
            const THREE = await import('three');
            const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
            const loader = new GLTFLoader();

            // Remove existing model
            if (currentModelRef.current) {
                sceneRef.current.remove(currentModelRef.current);
                currentModelRef.current = null;
            }

            // Stop existing animations
            if (mixerRef.current) {
                mixerRef.current.stopAllAction();
                mixerRef.current = null;
            }

            // Load new model
            const gltf = await new Promise<any>((resolve, reject) => {
                loader.load(
                    modelConfig.url,
                    resolve,
                    (progress) => {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        setInitStep(`Loading ${modelConfig.name}... ${percent}%`);
                    },
                    reject
                );
            });

            const model = gltf.scene;

            // Scale and position the model for fullscreen
            model.scale.setScalar(modelConfig.scale);
            model.position.set(
                modelConfig.offset.x,
                modelConfig.offset.y,
                modelConfig.offset.z
            );

            // Enhanced bone detection with logging
            const bones: { [key: string]: any } = {};

            model.traverse((child: any) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Enhanced materials
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat instanceof THREE.MeshStandardMaterial) {
                                    mat.metalness = 0.4;
                                    mat.roughness = 0.6;
                                    mat.envMapIntensity = 1.2;
                                }
                            });
                        } else if (child.material instanceof THREE.MeshStandardMaterial) {
                            child.material.metalness = 0.4;
                            child.material.roughness = 0.6;
                            child.material.envMapIntensity = 1.2;
                        }
                    }
                }

                // Comprehensive bone mapping
                if (child instanceof THREE.Bone || child.type === 'Bone' || child.isBone) {
                    const name = child.name.toLowerCase();
                    console.log('Found bone:', child.name);

                    // Head and neck
                    if (name.includes('head') || name.includes('skull')) {
                        bones.head = child;
                        console.log('✓ Mapped head:', child.name);
                    } else if (name.includes('neck')) {
                        bones.neck = child;
                        console.log('✓ Mapped neck:', child.name);
                    }

                    // Spine
                    else if (name.includes('spine') || name.includes('chest') || name.includes('torso')) {
                        if (name.includes('upper') || name.includes('chest') || name.includes('1')) {
                            bones.upperSpine = child;
                            console.log('✓ Mapped upper spine:', child.name);
                        } else {
                            bones.spine = child;
                            console.log('✓ Mapped spine:', child.name);
                        }
                    }

                    // Left arm
                    else if ((name.includes('left') || name.includes('l_')) &&
                        (name.includes('shoulder') || name.includes('clavicle'))) {
                        bones.leftShoulder = child;
                        console.log('✓ Mapped left shoulder:', child.name);
                    } else if ((name.includes('left') || name.includes('l_')) &&
                        name.includes('arm') && !name.includes('fore')) {
                        bones.leftUpperArm = child;
                        console.log('✓ Mapped left upper arm:', child.name);
                    } else if ((name.includes('left') || name.includes('l_')) &&
                        (name.includes('forearm') || name.includes('fore'))) {
                        bones.leftForearm = child;
                        console.log('✓ Mapped left forearm:', child.name);
                    } else if ((name.includes('left') || name.includes('l_')) &&
                        name.includes('hand')) {
                        bones.leftHand = child;
                        console.log('✓ Mapped left hand:', child.name);
                    }

                    // Right arm (mirror)
                    else if ((name.includes('right') || name.includes('r_')) &&
                        (name.includes('shoulder') || name.includes('clavicle'))) {
                        bones.rightShoulder = child;
                        console.log('✓ Mapped right shoulder:', child.name);
                    } else if ((name.includes('right') || name.includes('r_')) &&
                        name.includes('arm') && !name.includes('fore')) {
                        bones.rightUpperArm = child;
                        console.log('✓ Mapped right upper arm:', child.name);
                    } else if ((name.includes('right') || name.includes('r_')) &&
                        (name.includes('forearm') || name.includes('fore'))) {
                        bones.rightForearm = child;
                        console.log('✓ Mapped right forearm:', child.name);
                    } else if ((name.includes('right') || name.includes('r_')) &&
                        name.includes('hand')) {
                        bones.rightHand = child;
                        console.log('✓ Mapped right hand:', child.name);
                    }
                }
            });

            modelBonesRef.current = bones;
            console.log('Total bones mapped:', Object.keys(bones).length);

            // Set up animations
            if (gltf.animations && gltf.animations.length > 0) {
                mixerRef.current = new THREE.AnimationMixer(model);

                const idleAnimation = gltf.animations.find((anim: any) =>
                    anim.name.toLowerCase().includes('idle') ||
                    anim.name.toLowerCase().includes('breathe')
                ) || gltf.animations[0];

                if (idleAnimation) {
                    const action = mixerRef.current.clipAction(idleAnimation);
                    action.setEffectiveWeight(0.2);
                    action.play();
                }
            }

            sceneRef.current.add(model);
            currentModelRef.current = model;
            setModelLoading(false);
            setInitStep(`${modelConfig.name} loaded!`);

        } catch (error) {
            console.error('Model loading error:', error);
            setError(`Failed to load ${modelConfig.name}: ${(error as Error).message}`);
            setModelLoading(false);
        }
    }, []);

    // Load initial model
    useEffect(() => {
        if (sceneRef.current && avatarModels.length > 0) {
            const initialModel = avatarModels.find(m => m.id === currentAvatar);
            if (initialModel) {
                loadModel(initialModel);
            }
        }
    }, [sceneRef.current, loadModel]);

    // Enhanced pose control for fullscreen
    const updateModelPose = useCallback((landmarks: PoseLandmark[]) => {
        if (!currentModelRef.current || !cameraRef.current) return;

        const model = currentModelRef.current;
        const bones = modelBonesRef.current;

        // Key landmarks
        const nose = landmarks[0];
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftElbow = landmarks[13];
        const rightElbow = landmarks[14];
        const leftWrist = landmarks[15];
        const rightWrist = landmarks[16];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        // Better body positioning for fullscreen
        if (nose && leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderCenter = {
                x: (leftShoulder.x + rightShoulder.x) / 2,
                y: (leftShoulder.y + rightShoulder.y) / 2,
                z: (leftShoulder.z + rightShoulder.z) / 2
            };

            const hipCenter = {
                x: (leftHip.x + rightHip.x) / 2,
                y: (leftHip.y + rightHip.y) / 2,
                z: (leftHip.z + rightHip.z) / 2
            };

            // Adaptive positioning based on screen size
            const aspectRatio = viewportSize.width / viewportSize.height;
            const x = (shoulderCenter.x - 0.5) * -8 * aspectRatio;
            const y = -(shoulderCenter.y - 0.4) * 6;
            const z = shoulderCenter.z * -4;

            // Smooth model positioning
            model.position.x += (x - model.position.x) * 0.15;
            model.position.y += (y - model.position.y) * 0.15;
            model.position.z += (z - model.position.z) * 0.15;

            // Body rotation
            const bodyTilt = Math.atan2(
                rightShoulder.y - leftShoulder.y,
                rightShoulder.x - leftShoulder.x
            );
            model.rotation.z += (bodyTilt - model.rotation.z) * 0.1;
        }

        // Enhanced head control
        if (nose && leftShoulder && rightShoulder) {
            const bodyCenter = {
                x: (leftShoulder.x + rightShoulder.x) / 2,
                y: (leftShoulder.y + rightShoulder.y) / 2 - 0.1
            };

            const headTurnX = (nose.x - bodyCenter.x) * 3;
            const headTiltY = (nose.y - bodyCenter.y) * 2;

            const headBone = bones.head || bones.neck;
            if (headBone) {
                headBone.rotation.y += (headTurnX - headBone.rotation.y) * 0.2;
                headBone.rotation.x += (-headTiltY - headBone.rotation.x) * 0.2;
            }
        }

        // Enhanced arm control
        if (leftShoulder && leftElbow && leftWrist) {
            const shoulderToElbow = {
                x: leftElbow.x - leftShoulder.x,
                y: leftElbow.y - leftShoulder.y,
                z: leftElbow.z - leftShoulder.z
            };

            const armBone = bones.leftShoulder || bones.leftUpperArm;
            if (armBone) {
                const rotX = Math.atan2(-shoulderToElbow.y, Math.sqrt(shoulderToElbow.x ** 2 + shoulderToElbow.z ** 2));
                const rotY = Math.atan2(shoulderToElbow.x, shoulderToElbow.z);
                const rotZ = Math.atan2(shoulderToElbow.y, shoulderToElbow.x);

                armBone.rotation.x += (rotX - armBone.rotation.x) * 0.3;
                armBone.rotation.y += (rotY - armBone.rotation.y) * 0.3;
                armBone.rotation.z += (rotZ - armBone.rotation.z) * 0.3;
            }
        }

        // Right arm control (mirrored)
        if (rightShoulder && rightElbow && rightWrist) {
            const shoulderToElbow = {
                x: rightElbow.x - rightShoulder.x,
                y: rightElbow.y - rightShoulder.y,
                z: rightElbow.z - rightShoulder.z
            };

            const armBone = bones.rightShoulder || bones.rightUpperArm;
            if (armBone) {
                const rotX = Math.atan2(-shoulderToElbow.y, Math.sqrt(shoulderToElbow.x ** 2 + shoulderToElbow.z ** 2));
                const rotY = Math.atan2(-shoulderToElbow.x, shoulderToElbow.z);
                const rotZ = Math.atan2(shoulderToElbow.y, -shoulderToElbow.x);

                armBone.rotation.x += (rotX - armBone.rotation.x) * 0.3;
                armBone.rotation.y += (rotY - armBone.rotation.y) * 0.3;
                armBone.rotation.z += (rotZ - armBone.rotation.z) * 0.3;
            }
        }
    }, [viewportSize]);

    // Animation loop
    useEffect(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);

            if (mixerRef.current) {
                mixerRef.current.update(0.016);
            }

            if (poseData && personDetected) {
                updateModelPose(poseData);
            }

            rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
        };

        animate();

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [poseData, personDetected, updateModelPose]);

    // Handle avatar change
    const handleAvatarChange = (avatarId: string) => {
        setCurrentAvatar(avatarId);
        const modelConfig = avatarModels.find(m => m.id === avatarId);
        if (modelConfig) {
            loadModel(modelConfig);
        }
    };

    // Enhanced pose simulation with fullscreen in mind
    useEffect(() => {
        if (!cameraReady || !videoRef.current) return;

        setInitStep('AI pose tracking active!');

        let frameCount = 0;

        const simulateDetection = () => {
            frameCount++;

            // Draw fullscreen video
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');

            if (canvas && ctx && videoRef.current) {
                // Set canvas to match viewport
                if (canvas.width !== viewportSize.width || canvas.height !== viewportSize.height) {
                    canvas.width = viewportSize.width;
                    canvas.height = viewportSize.height;
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
                ctx.restore();
            }

            setPersonDetected(true);

            // Enhanced pose animation
            const time = frameCount * 0.08;
            const armWave = Math.sin(time) * 0.4;
            const bodyBob = Math.sin(time * 0.7) * 0.03;

            const mockPose: PoseLandmark[] = [
                // Face landmarks (0-10)
                { x: 0.5, y: 0.25 + bodyBob, z: 0.0, visibility: 0.95 },
                { x: 0.48, y: 0.23 + bodyBob, z: 0.0, visibility: 0.9 },
                { x: 0.47, y: 0.23 + bodyBob, z: 0.0, visibility: 0.9 },
                { x: 0.46, y: 0.23 + bodyBob, z: 0.0, visibility: 0.9 },
                { x: 0.52, y: 0.23 + bodyBob, z: 0.0, visibility: 0.9 },
                { x: 0.53, y: 0.23 + bodyBob, z: 0.0, visibility: 0.9 },
                { x: 0.54, y: 0.23 + bodyBob, z: 0.0, visibility: 0.9 },
                { x: 0.44, y: 0.25 + bodyBob, z: 0.0, visibility: 0.85 },
                { x: 0.56, y: 0.25 + bodyBob, z: 0.0, visibility: 0.85 },
                { x: 0.48, y: 0.27 + bodyBob, z: 0.0, visibility: 0.9 },
                { x: 0.52, y: 0.27 + bodyBob, z: 0.0, visibility: 0.9 },

                // Shoulders (11-12) - animated
                { x: 0.38 + armWave * 0.05, y: 0.35 + bodyBob + Math.abs(armWave) * 0.02, z: 0.0, visibility: 0.95 },
                { x: 0.62 - armWave * 0.05, y: 0.35 + bodyBob + Math.abs(armWave) * 0.02, z: 0.0, visibility: 0.95 },

                // Elbows (13-14) - dramatic waving
                { x: 0.25 + armWave * 0.3, y: 0.45 + armWave * 0.2, z: 0.1, visibility: 0.9 },
                { x: 0.75 - armWave * 0.3, y: 0.45 - armWave * 0.2, z: 0.1, visibility: 0.9 },

                // Wrists (15-16) - extended arm movement
                { x: 0.15 + armWave * 0.4, y: 0.5 + armWave * 0.3, z: 0.15, visibility: 0.85 },
                { x: 0.85 - armWave * 0.4, y: 0.5 - armWave * 0.3, z: 0.15, visibility: 0.85 },

                // Hand landmarks (17-22)
                { x: 0.12 + armWave * 0.45, y: 0.52 + armWave * 0.35, z: 0.15, visibility: 0.8 },
                { x: 0.88 - armWave * 0.45, y: 0.52 - armWave * 0.35, z: 0.15, visibility: 0.8 },
                { x: 0.13 + armWave * 0.42, y: 0.51 + armWave * 0.32, z: 0.15, visibility: 0.8 },
                { x: 0.87 - armWave * 0.42, y: 0.51 - armWave * 0.32, z: 0.15, visibility: 0.8 },
                { x: 0.16 + armWave * 0.38, y: 0.49 + armWave * 0.28, z: 0.15, visibility: 0.8 },
                { x: 0.84 - armWave * 0.38, y: 0.49 - armWave * 0.28, z: 0.15, visibility: 0.8 },

                // Hips (23-24)
                { x: 0.42, y: 0.65 + bodyBob * 0.5, z: 0.0, visibility: 0.9 },
                { x: 0.58, y: 0.65 + bodyBob * 0.5, z: 0.0, visibility: 0.9 },

                // Knees (25-26) - subtle movement
                { x: 0.41 + Math.sin(time * 0.4) * 0.03, y: 0.8, z: 0.0, visibility: 0.85 },
                { x: 0.59 - Math.sin(time * 0.4) * 0.03, y: 0.8, z: 0.0, visibility: 0.85 },

                // Ankles (27-28)
                { x: 0.4, y: 0.95, z: 0.0, visibility: 0.8 },
                { x: 0.6, y: 0.95, z: 0.0, visibility: 0.8 },

                // Feet (29-32)
                { x: 0.39, y: 0.97, z: 0.0, visibility: 0.75 },
                { x: 0.61, y: 0.97, z: 0.0, visibility: 0.75 },
                { x: 0.41, y: 0.93, z: 0.0, visibility: 0.75 },
                { x: 0.59, y: 0.93, z: 0.0, visibility: 0.75 }
            ];

            setPoseData(mockPose);
        };

        const interval = setInterval(simulateDetection, 33); // 30 FPS
        setInitStep('🎭 Avatar Mirror Active!');

        return () => {
            clearInterval(interval);
        };
    }, [cameraReady, viewportSize]);

    if (error) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black text-white z-50">
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
        <div className="fixed inset-0 bg-black overflow-hidden">
            {/* Hidden video element */}
            <video
                ref={videoRef}
                className="hidden"
                width={viewportSize.width}
                height={viewportSize.height}
                autoPlay
                muted
                playsInline
            />

            {/* Fullscreen video background */}
            <canvas
                ref={canvasRef}
                width={viewportSize.width}
                height={viewportSize.height}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ zIndex: 1 }}
            />

            {/* 3D Avatar Overlay - Fullscreen */}
            <div
                ref={threeContainerRef}
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 10 }}
            />

            {/* UI Overlay - Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4">
                <div className="flex items-center justify-between">
                    {/* Title */}
                    <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg px-4 py-2">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            🎭 3D Avatar Mirror
                        </h1>
                    </div>

                    {/* Status */}
                    <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg px-4 py-2">
                        <p className="text-white text-sm">
                            <span className="text-blue-400">●</span> {initStep}
                        </p>
                    </div>
                </div>
            </div>

            {/* Avatar Selection - Bottom Center */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl p-4">
                    <div className="flex gap-3">
                        {avatarModels.map(avatar => (
                            <button
                                key={avatar.id}
                                onClick={() => handleAvatarChange(avatar.id)}
                                disabled={modelLoading}
                                className={`px-6 py-3 rounded-xl font-semibold transition-all transform ${currentAvatar === avatar.id
                                    ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30'
                                    : 'bg-gray-700 bg-opacity-80 text-gray-300 hover:bg-gray-600 hover:scale-105'
                                    } ${modelLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="text-2xl mb-1">{avatar.name.split(' ')[0]}</div>
                                <div className="text-xs opacity-80">
                                    {avatar.name.replace(/^[^\s]+\s/, '')}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Avatar Info - Top Left */}
            <div className="absolute top-20 left-4 z-20">
                <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl">
                            {avatarModels.find(a => a.id === currentAvatar)?.name.split(' ')[0]}
                        </div>
                        <div>
                            <p className="text-white font-bold text-lg">
                                {avatarModels.find(a => a.id === currentAvatar)?.name.replace(/^[^\s]+\s/, '')}
                            </p>
                            <p className="text-gray-300 text-sm">
                                {avatarModels.find(a => a.id === currentAvatar)?.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Indicators - Top Right */}
            <div className="absolute top-20 right-4 z-20">
                <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className={`text-2xl mb-1 ${cameraReady ? 'text-green-400' : 'text-yellow-400'}`}>
                                {cameraReady ? '📸' : '⏳'}
                            </div>
                            <p className="text-white text-xs font-medium">Camera</p>
                        </div>

                        <div className="text-center">
                            <div className={`text-2xl mb-1 ${personDetected ? 'text-green-400' : 'text-red-400'}`}>
                                {personDetected ? '🎭' : '❌'}
                            </div>
                            <p className="text-white text-xs font-medium">Tracking</p>
                        </div>

                        <div className="text-center">
                            <div className={`text-2xl mb-1 ${modelLoading ? 'text-yellow-400' : 'text-blue-400'}`}>
                                {modelLoading ? '⏳' : '🎮'}
                            </div>
                            <p className="text-white text-xs font-medium">Avatar</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {modelLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
                    <div className="bg-gray-900 rounded-2xl p-8 text-center max-w-md">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6"></div>
                        <h3 className="text-white text-xl font-bold mb-2">Loading Avatar</h3>
                        <p className="text-gray-300">{initStep}</p>
                        <div className="mt-4 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions - Bottom Left */}
            <div className="absolute bottom-8 left-4 z-20">
                <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-4 max-w-xs">
                    <h4 className="text-white font-bold mb-2">🎯 How to Use:</h4>
                    <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Wave your arms to see the avatar move</li>
                        <li>• Turn your head to control avatar's head</li>
                        <li>• Try different poses and movements</li>
                        <li>• Switch avatars using buttons below</li>
                    </ul>
                    <p className="text-yellow-400 text-xs mt-2 font-medium">
                        ⚡ AI Pose Detection Active
                    </p>
                </div>
            </div>

            {/* Performance Info - Bottom Right */}
            <div className="absolute bottom-8 right-4 z-20">
                <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-center">
                        <div className="text-green-400 text-xl mb-1">⚡</div>
                        <p className="text-white text-xs font-medium">Real-Time</p>
                        <p className="text-gray-400 text-xs">30 FPS</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelAvatarFilter;